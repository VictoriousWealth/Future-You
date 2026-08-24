import { createClient } from "@supabase/supabase-js";
import WebSocket from "ws";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { AuthenticatedPrincipal } from "../../src/application/auth/authenticated-principal";
import type { OneOffPurchaseRequestDTO } from "../../src/application/dto/contracts";
import { createOnboardingApplication } from "../../src/application/onboarding/application";
import { financialContextToCorrectionDraft } from "../../src/application/onboarding/context-to-draft";
import { SupabaseFinancialContextSource } from "../../src/infrastructure/context/supabase-financial-context-source";
import { SupabaseFinancialContextVersionRepository } from "../../src/infrastructure/context/supabase-financial-context-version-repository";
import { SupabaseSimulationRunStore } from "../../src/infrastructure/runs/supabase-simulation-run-store";
import type { Database } from "../../src/infrastructure/supabase/database.types";
import type { RequestSupabaseClient } from "../../src/infrastructure/supabase/server-client";
import { SLICE_1_RULES } from "../../src/domain/simulator/engine";
import {
  ENGLAND_WALES_CALENDAR_METADATA,
  ENGLAND_WALES_WORKING_DAY_CALENDAR
} from "../../src/fixtures/calendar/england-wales-bank-holidays";
import { SARAH_V1_CONTEXT, SARAH_V1_EXPECTED } from "../../src/fixtures/sarah-v1";
import { SARAH_V1_ONBOARDING_DRAFT } from "../../src/fixtures/sarah-v1-onboarding";
import { createSimulatorApplication } from "../../src/server/simulator-application";

const USER: AuthenticatedPrincipal = { userId: "33333333-3333-4333-8333-333333333333" };
const ALEX: AuthenticatedPrincipal = { userId: "22222222-2222-4222-8222-222222222222" };
const URL = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_PUBLISHABLE_KEY;

function client(): RequestSupabaseClient {
  if (!URL || !KEY) throw new Error("Local Supabase integration environment is not configured.");
  return createClient<Database>(URL, KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    realtime: { transport: WebSocket as never }
  }) as unknown as RequestSupabaseClient;
}

async function signedIn(email: string, password: string): Promise<RequestSupabaseClient> {
  const value = client();
  const { error } = await value.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`Local fixture sign-in failed: ${error.name}.`);
  return value;
}

function onboardingApplication(requestClient: RequestSupabaseClient) {
  const contextSource = new SupabaseFinancialContextSource(requestClient, USER);
  return createOnboardingApplication({
    contextSource,
    versionRepository: new SupabaseFinancialContextVersionRepository(requestClient, USER),
    rules: SLICE_1_RULES,
    calendar: ENGLAND_WALES_WORKING_DAY_CALENDAR,
    calendarMetadata: ENGLAND_WALES_CALENDAR_METADATA
  });
}

function simulatorApplication(requestClient: RequestSupabaseClient) {
  return createSimulatorApplication({
    contextSource: new SupabaseFinancialContextSource(requestClient, USER),
    runStore: new SupabaseSimulationRunStore(requestClient, USER),
    rules: SLICE_1_RULES,
    calendar: ENGLAND_WALES_WORKING_DAY_CALENDAR,
    calendarMetadata: ENGLAND_WALES_CALENDAR_METADATA
  });
}

function tripRequest(requestId: string, contextVersion: string): OneOffPurchaseRequestDTO {
  return {
    requestId,
    expectedContextVersionId: contextVersion,
    change: {
      type: "one_off_purchase",
      amount: { currency: "GBP", minorUnits: "65000" },
      purpose: "friends trip",
      paymentPeriod: "2026-09",
      paymentTiming: "assumed_conservative",
      paymentDate: null,
      datePrecision: "month",
      fundingSource: "current_account",
      paymentPattern: "single",
      costTreatment: "additional_to_routine_spending"
    },
    assumptionConfirmations: []
  };
}

describe("Supabase manual onboarding and immutable revisions", () => {
  let onboardingClient: RequestSupabaseClient;
  let alexClient: RequestSupabaseClient;

  beforeAll(async () => {
    [onboardingClient, alexClient] = await Promise.all([
      signedIn("onboarding@example.test", "Onboarding-Local-Only-2026!"),
      signedIn("alex@example.test", "Alex-Local-Only-2026!")
    ]);
  });

  afterAll(async () => {
    await Promise.all([onboardingClient.auth.signOut(), alexClient.auth.signOut()]);
  });

  it("confirms canonical Sarah input atomically, isolates it, and preserves versions and runs", async () => {
    const onboarding = onboardingApplication(onboardingClient);
    expect(await onboarding.getStatus.execute()).toMatchObject({
      status: "NOT_STARTED",
      currentContextVersionId: null
    });
    const previewRequest = {
      draft: SARAH_V1_ONBOARDING_DRAFT,
      mode: "initial" as const,
      expectedCurrentContextVersionId: null
    };
    const preview = onboarding.preview.execute(previewRequest);
    if (!preview.ok) throw new Error(preview.error.code);
    const confirmation = {
      ...previewRequest,
      requestId: "slice4-onboarding-confirm",
      reviewedCanonicalRequestHash: preview.value.candidate.canonicalRequestHash
    };
    const [left, right] = await Promise.all([
      onboarding.confirm.execute(confirmation),
      onboarding.confirm.execute(confirmation)
    ]);
    expect(left.ok && left.value.contextVersionId).toBe(SARAH_V1_CONTEXT.version);
    expect(right.ok && right.value.contextVersionId).toBe(SARAH_V1_CONTEXT.version);
    const { count: contextCount } = await onboardingClient
      .from("financial_context_versions")
      .select("version_id", { count: "exact", head: true });
    expect(contextCount).toBe(1);

    const contextSource = new SupabaseFinancialContextSource(onboardingClient, USER);
    expect(await contextSource.getContextVersion(SARAH_V1_CONTEXT.version)).toEqual(SARAH_V1_CONTEXT);
    expect(await new SupabaseFinancialContextSource(alexClient, ALEX)
      .getContextVersion(SARAH_V1_CONTEXT.version)).toBeNull();

    const changedDraft = {
      ...SARAH_V1_ONBOARDING_DRAFT,
      identity: {
        ...SARAH_V1_ONBOARDING_DRAFT.identity,
        contextVersion: "conflicting-onboarding-version"
      },
      currentAccount: {
        ...SARAH_V1_ONBOARDING_DRAFT.currentAccount,
        actualClearedBalance: {
          ...SARAH_V1_ONBOARDING_DRAFT.currentAccount.actualClearedBalance,
          amount: "2800"
        }
      }
    };
    const changedPreview = onboarding.preview.execute({
      draft: changedDraft,
      mode: "initial",
      expectedCurrentContextVersionId: null
    });
    if (!changedPreview.ok) throw new Error(changedPreview.error.code);
    const conflicting = await onboarding.confirm.execute({
      draft: changedDraft,
      mode: "initial",
      expectedCurrentContextVersionId: null,
      requestId: confirmation.requestId,
      reviewedCanonicalRequestHash: changedPreview.value.candidate.canonicalRequestHash
    });
    expect(conflicting).toMatchObject({ ok: false, error: { code: "IDEMPOTENCY_KEY_REUSED" } });

    const simulator = simulatorApplication(onboardingClient);
    const oldRun = await simulator.simulateOneOffPurchase.execute(
      tripRequest("slice4-trip-v1", SARAH_V1_CONTEXT.version)
    );
    if (!oldRun.ok) throw new Error(oldRun.error.code);
    expect(oldRun.value.presentation.immediateImpact.safetyBufferAfter).toBe("£250");
    expect(oldRun.value.result.comparison.classification.code).toBe(
      SARAH_V1_EXPECTED.trip650September.classification
    );

    const revisionDraft = financialContextToCorrectionDraft(SARAH_V1_CONTEXT, null);
    const revised = {
      ...revisionDraft,
      identity: { ...revisionDraft.identity, contextVersion: "sarah-v2@2026-09-01" },
      currentAccount: {
        ...revisionDraft.currentAccount,
        actualClearedBalance: {
          ...revisionDraft.currentAccount.actualClearedBalance,
          amount: "2800"
        }
      }
    };
    const revisionPreview = onboarding.preview.execute({
      draft: revised,
      mode: "revision",
      expectedCurrentContextVersionId: SARAH_V1_CONTEXT.version
    });
    if (!revisionPreview.ok) throw new Error(revisionPreview.error.code);
    const revision = await onboarding.confirm.execute({
      draft: revised,
      mode: "revision",
      expectedCurrentContextVersionId: SARAH_V1_CONTEXT.version,
      requestId: "slice4-revision-confirm",
      reviewedCanonicalRequestHash: revisionPreview.value.candidate.canonicalRequestHash
    });
    expect(revision.ok && revision.value.contextVersionId).toBe("sarah-v2@2026-09-01");
    expect(await contextSource.getContextVersion(SARAH_V1_CONTEXT.version)).toEqual(SARAH_V1_CONTEXT);
    expect((await contextSource.getContextVersion("sarah-v2@2026-09-01"))
      ?.currentAccount.clearedBalance.value?.minor).toBe(280_000n);

    const storedOldRun = await simulator.getSimulationRun.execute(oldRun.value.calculation.runId);
    expect(storedOldRun).toEqual(oldRun);
    const newBaseline = await simulator.generateBaseline.execute({
      requestId: "slice4-baseline-v2",
      expectedContextVersionId: "sarah-v2@2026-09-01"
    });
    expect(newBaseline.ok && newBaseline.value.context.version).toBe("sarah-v2@2026-09-01");
    expect(oldRun.value.context.version).toBe(SARAH_V1_CONTEXT.version);
  });

  it("keeps optional workplace data separate and numerically inert", async () => {
    const repository = new SupabaseFinancialContextVersionRepository(onboardingClient, USER);
    const onboarding = onboardingApplication(onboardingClient);
    const withoutWorkplace = onboarding.preview.execute({
      draft: {
        ...SARAH_V1_ONBOARDING_DRAFT,
        identity: {
          ...SARAH_V1_ONBOARDING_DRAFT.identity,
          contextVersion: "workplace-preview-only"
        }
      },
      mode: "revision",
      expectedCurrentContextVersionId: "sarah-v2@2026-09-01"
    });
    const withWorkplace = onboarding.preview.execute({
      draft: {
        ...SARAH_V1_ONBOARDING_DRAFT,
        identity: {
          ...SARAH_V1_ONBOARDING_DRAFT.identity,
          contextVersion: "workplace-preview-only"
        },
        workplace: {
          name: "OniBank",
          associationSource: "user_provided",
          verificationStatus: "unverified"
        }
      },
      mode: "revision",
      expectedCurrentContextVersionId: "sarah-v2@2026-09-01"
    });
    if (!withoutWorkplace.ok || !withWorkplace.ok) throw new Error("Workplace preview failed.");
    expect(withWorkplace.value.contextSummary).toEqual(withoutWorkplace.value.contextSummary);
    expect(withWorkplace.value.goals).toEqual(withoutWorkplace.value.goals);
    await repository.saveWorkplace({
      name: "OniBank",
      associationSource: "user_provided",
      verificationStatus: "unverified"
    });
    expect(await repository.getWorkplace()).toEqual({
      name: "OniBank",
      associationSource: "user_provided",
      verificationStatus: "unverified"
    });
  });
});
