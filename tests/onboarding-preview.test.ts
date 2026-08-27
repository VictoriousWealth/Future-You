import { describe, expect, it } from "vitest";
import { financialOnboardingDraftToContext } from "../src/application/onboarding/draft-to-context";
import { PreviewFinancialContextUseCase } from "../src/application/onboarding/preview-financial-context";
import { SLICE_1_RULES } from "../src/domain/simulator/engine";
import {
  ENGLAND_WALES_CALENDAR_METADATA,
  ENGLAND_WALES_WORKING_DAY_CALENDAR
} from "../src/fixtures/calendar/england-wales-bank-holidays";
import { SARAH_V1_CONTEXT, SARAH_V1_EXPECTED } from "../src/fixtures/sarah-v1";
import { SARAH_V1_ONBOARDING_DRAFT } from "../src/fixtures/sarah-v1-onboarding";

const dependencies = {
  rules: SLICE_1_RULES,
  calendar: ENGLAND_WALES_WORKING_DAY_CALENDAR,
  calendarMetadata: ENGLAND_WALES_CALENDAR_METADATA
};

describe("manual financial-context preview", () => {
  it("recreates the canonical Sarah v1 domain snapshot exactly", () => {
    const result = financialOnboardingDraftToContext(SARAH_V1_ONBOARDING_DRAFT);
    expect(result).toMatchObject({ ok: true });
    if (result.ok) expect(result.context).toEqual(SARAH_V1_CONTEXT);
  });

  it("returns a deterministic JSON-safe server preview and writes nothing", () => {
    const useCase = new PreviewFinancialContextUseCase(dependencies);
    const request = {
      draft: SARAH_V1_ONBOARDING_DRAFT,
      mode: "initial" as const,
      expectedCurrentContextVersionId: null
    };
    const first = useCase.execute(request);
    const second = useCase.execute(request);
    expect(first).toEqual(second);
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    expect(first.value.contextSummary).toMatchObject({
      actualCash: { minorUnits: "275000", display: "£2750.00" },
      remainingReserve: { minorUnits: "185000", display: "£1850.00" },
      currentSafetyBuffer: { minorUnits: "90000", display: "£900.00" },
      desiredSafetyBuffer: { minorUnits: "90000", display: "£900.00" },
      monthlyNetIncome: { minorUnits: "245000", display: "£2450.00" },
      monthlyContributionCapacity: { minorUnits: "60000", display: "£600.00" }
    });
    expect(Object.fromEntries(first.value.goals.map((goal) => [goal.goalId, goal.completion.status === "COMPLETED" ? goal.completion.month : null]))).toMatchObject({
      "goal-emergency-fund": SARAH_V1_EXPECTED.baseline.completionPeriods.emergencyFund,
      "goal-house-deposit": SARAH_V1_EXPECTED.baseline.completionPeriods.houseDeposit,
      "goal-holiday": SARAH_V1_EXPECTED.baseline.completionPeriods.holiday
    });
    expect(() => JSON.stringify(first.value)).not.toThrow();
    expect(JSON.stringify(first.value)).not.toContain("bigint");
    expect(first.value.baseline.existingPressure).toBe(false);
    expect(first.value.baseline.warnings).toContainEqual({
      code: "CALENDAR_FALLBACK_WARNING",
      message: "Some projections extend beyond our current bank-holiday calendar. Future You used weekdays for those later paydays. Your monthly goal estimates are unchanged."
    });
  });

  it("uses the next month's funding event when the snapshot follows this month's payday", () => {
    const result = new PreviewFinancialContextUseCase(dependencies).execute({
      draft: {
        ...SARAH_V1_ONBOARDING_DRAFT,
        identity: {
          ...SARAH_V1_ONBOARDING_DRAFT.identity,
          contextId: "context-after-payday",
          contextVersion: "after-payday@2026-10-31"
        },
        snapshotDate: "2026-10-31",
        currentAccount: {
          ...SARAH_V1_ONBOARDING_DRAFT.currentAccount,
          remainingCurrentCycleReserve: {
            ...SARAH_V1_ONBOARDING_DRAFT.currentAccount.remainingCurrentCycleReserve,
            amount: "500"
          }
        }
      },
      mode: "initial",
      expectedCurrentContextVersionId: null
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.baseline.projection.periods[0]?.period).toBe("2026-11");
    expect(result.value.baseline.projection.periods[0]?.routineSpending.minorUnits).toBe("50000");
    expect(
      result.value.baseline.projection.trace
        .filter((event) => event.period === "2026-11")
        .every((event) => event.date >= "2026-10-31")
    ).toBe(true);
  });

  it("returns an honest pressured baseline for negative cleared cash", () => {
    const result = new PreviewFinancialContextUseCase(dependencies).execute({
      draft: {
        ...SARAH_V1_ONBOARDING_DRAFT,
        snapshotDate: "2026-09-15",
        identity: {
          ...SARAH_V1_ONBOARDING_DRAFT.identity,
          contextId: "context-pressured-baseline",
          contextVersion: "pressured@2026-09-15"
        },
        currentAccount: {
          ...SARAH_V1_ONBOARDING_DRAFT.currentAccount,
          actualClearedBalance: {
            ...SARAH_V1_ONBOARDING_DRAFT.currentAccount.actualClearedBalance,
            amount: "-50"
          },
          remainingCurrentCycleReserve: {
            ...SARAH_V1_ONBOARDING_DRAFT.currentAccount.remainingCurrentCycleReserve,
            amount: "0"
          }
        },
        committedGoalTransfers: { declaration: "none", items: [] }
      },
      mode: "initial",
      expectedCurrentContextVersionId: null
    });
    if (!result.ok) throw new Error(JSON.stringify(result.error));
    expect(result.value.contextSummary.currentSafetyBuffer.minorUnits).toBe("-5000");
    expect(result.value.baseline.existingPressure).toBe(true);
    expect(result.value.baseline.warnings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "BASELINE_BUFFER_BELOW_PREFERENCE" })
      ])
    );
  });

  it("returns typed horizon exhaustion instead of inventing a completion month", () => {
    const goal = {
      ...SARAH_V1_ONBOARDING_DRAFT.goals[0]!,
      id: "goal-no-contribution",
      label: "Long-term goal",
      targetBalance: {
        ...SARAH_V1_ONBOARDING_DRAFT.goals[0]!.targetBalance,
        amount: "999999"
      },
      normalContribution: { currency: "GBP" as const, amount: "0" }
    };
    const result = new PreviewFinancialContextUseCase(dependencies).execute({
      draft: {
        ...SARAH_V1_ONBOARDING_DRAFT,
        goals: [goal],
        goalPolicy: {
          ...SARAH_V1_ONBOARDING_DRAFT.goalPolicy,
          allocationOrder: [goal.id],
          overflowGoalId: null
        },
        committedGoalTransfers: { declaration: "none", items: [] }
      },
      mode: "initial",
      expectedCurrentContextVersionId: null
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.goals[0]?.completion).toMatchObject({
      status: "NOT_REACHED_WITHIN_HORIZON",
      horizonAllocationEvents: 120
    });
  });
});
