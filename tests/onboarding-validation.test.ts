import { describe, expect, it } from "vitest";
import { createOnboardingApplication } from "../src/application/onboarding/application";
import { financialContextToCorrectionDraft } from "../src/application/onboarding/context-to-draft";
import { financialOnboardingDraftToContext } from "../src/application/onboarding/draft-to-context";
import { parsePreviewFinancialContextRequest } from "../src/application/onboarding/validation";
import type { FinancialContextSource } from "../src/application/ports/financial-context-source";
import type { FinancialContextVersionRepository } from "../src/application/ports/financial-context-version-repository";
import { SLICE_1_RULES } from "../src/domain/simulator/engine";
import {
  ENGLAND_WALES_CALENDAR_METADATA,
  ENGLAND_WALES_WORKING_DAY_CALENDAR
} from "../src/fixtures/calendar/england-wales-bank-holidays";
import { SARAH_V1_CONTEXT } from "../src/fixtures/sarah-v1";
import { SARAH_V1_ONBOARDING_DRAFT } from "../src/fixtures/sarah-v1-onboarding";

describe("manual onboarding validation and correction mapping", () => {
  it("rejects missing fields, unsupported payday rules, unstable goal policies and omitted declarations", () => {
    const base = {
      draft: SARAH_V1_ONBOARDING_DRAFT,
      mode: "initial",
      expectedCurrentContextVersionId: null
    };
    const cases = [
      { ...base, draft: { ...base.draft, currentAccount: { ...base.draft.currentAccount, actualClearedBalance: undefined } } },
      { ...base, draft: { ...base.draft, income: { ...base.draft.income, paydayRule: { type: "weekly" } } } },
      { ...base, draft: { ...base.draft, goalPolicy: { ...base.draft.goalPolicy, allocationOrder: ["missing-goal"] } } },
      { ...base, draft: { ...base.draft, committedGoalTransfers: undefined } }
    ];
    for (const value of cases) expect(parsePreviewFinancialContextRequest(value).ok).toBe(false);
  });

  it("accepts omitted or supplied optional workplace without adding a financial value", () => {
    const base = {
      mode: "initial" as const,
      expectedCurrentContextVersionId: null
    };
    expect(parsePreviewFinancialContextRequest({
      ...base,
      draft: SARAH_V1_ONBOARDING_DRAFT
    }).ok).toBe(true);
    expect(parsePreviewFinancialContextRequest({
      ...base,
      draft: {
        ...SARAH_V1_ONBOARDING_DRAFT,
        workplace: {
          name: "OniBank",
          associationSource: "user_provided",
          verificationStatus: "unverified"
        }
      }
    }).ok).toBe(true);
  });

  it("rejects negative reserves, targets below balances and unreconciled spending items", () => {
    const negativeReserve = financialOnboardingDraftToContext({
      ...SARAH_V1_ONBOARDING_DRAFT,
      currentAccount: {
        ...SARAH_V1_ONBOARDING_DRAFT.currentAccount,
        remainingCurrentCycleReserve: {
          ...SARAH_V1_ONBOARDING_DRAFT.currentAccount.remainingCurrentCycleReserve,
          amount: "-1"
        }
      }
    });
    expect(negativeReserve).toMatchObject({ ok: false, code: "CURRENT_CYCLE_RESERVE_INVALID" });

    const invalidTarget = financialOnboardingDraftToContext({
      ...SARAH_V1_ONBOARDING_DRAFT,
      goals: SARAH_V1_ONBOARDING_DRAFT.goals.map((goal, index) =>
        index === 0
          ? { ...goal, targetBalance: { ...goal.targetBalance, amount: "1" } }
          : goal
      )
    });
    expect(invalidTarget).toMatchObject({ ok: false, code: "GOAL_POLICY_INVALID" });

    const unreconciled = financialOnboardingDraftToContext({
      ...SARAH_V1_ONBOARDING_DRAFT,
      routineSpending: {
        ...SARAH_V1_ONBOARDING_DRAFT.routineSpending,
        items: SARAH_V1_ONBOARDING_DRAFT.routineSpending.items.slice(1)
      }
    });
    expect(unreconciled).toMatchObject({ ok: false, code: "ONBOARDING_INPUT_INVALID" });
  });

  it("prefills every confirmed value for a correction and keeps workplace separate", () => {
    const draft = financialContextToCorrectionDraft(SARAH_V1_CONTEXT, {
      name: "OniBank",
      associationSource: "user_provided",
      verificationStatus: "unverified"
    });
    expect(draft).toMatchObject({
      identity: {
        contextId: SARAH_V1_CONTEXT.id,
        contextVersion: `${SARAH_V1_CONTEXT.version}.revision`
      },
      currentAccount: {
        actualClearedBalance: { amount: "2750.00" },
        remainingCurrentCycleReserve: { amount: "1850.00" },
        overdraftLimit: { amount: "500.00" }
      },
      income: { monthlyNetIncome: { amount: "2450.00" } },
      committedGoalTransfers: { declaration: "provided" },
      workplace: { name: "OniBank", verificationStatus: "unverified" }
    });
    expect(draft.routineSpending.items).toHaveLength(9);
    expect(draft.requiredObligations.items).toHaveLength(5);
    expect(draft.informationalContext).toHaveLength(2);
  });

  it("returns required status without context and a complete correction draft with context", async () => {
    let context = null as typeof SARAH_V1_CONTEXT | null;
    const source: FinancialContextSource = {
      async getCurrentContextVersionId() { return context?.version ?? null; },
      async getContextVersion() { return context; }
    };
    const repository: FinancialContextVersionRepository = {
      async confirm() { return { status: "context_conflict", contextVersionId: null }; },
      async saveWorkplace() {},
      async getWorkplace() { return null; }
    };
    const application = createOnboardingApplication({
      contextSource: source,
      versionRepository: repository,
      rules: SLICE_1_RULES,
      calendar: ENGLAND_WALES_WORKING_DAY_CALENDAR,
      calendarMetadata: ENGLAND_WALES_CALENDAR_METADATA
    });
    expect(await application.getCorrectionDraft.execute()).toMatchObject({
      ok: false,
      error: { code: "FINANCIAL_CONTEXT_REQUIRED" }
    });
    context = SARAH_V1_CONTEXT;
    expect(await application.getCorrectionDraft.execute()).toMatchObject({
      ok: true,
      value: {
        currentContextVersionId: SARAH_V1_CONTEXT.version,
        draft: { currentAccount: { actualClearedBalance: { amount: "2750.00" } } }
      }
    });
  });
});
