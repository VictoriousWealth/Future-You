import { createClient } from "@supabase/supabase-js";
import WebSocket from "ws";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { AuthenticatedPrincipal } from "../../src/application/auth/authenticated-principal";
import type { OneOffPurchaseRequestDTO } from "../../src/application/dto/contracts";
import { canonicalStringify } from "../../src/domain/shared/identity";
import { gbp } from "../../src/domain/shared/money";
import { unwrap } from "../../src/domain/shared/result";
import { generateBaseline, simulateOneOffPurchase, SLICE_1_RULES } from "../../src/domain/simulator/engine";
import type { FinancialContextSnapshot } from "../../src/domain/simulator/types";
import {
  ENGLAND_WALES_CALENDAR_METADATA,
  ENGLAND_WALES_WORKING_DAY_CALENDAR
} from "../../src/fixtures/calendar/england-wales-bank-holidays";
import {
  SARAH_V1_CONTEXT,
  SARAH_V1_IDS,
  SARAH_V1_SCENARIOS,
  runSarahV1Baseline,
  runSarahV1Scenario
} from "../../src/fixtures/sarah-v1";
import { SupabaseFinancialContextSource } from "../../src/infrastructure/context/supabase-financial-context-source";
import {
  FINANCIAL_CONTEXT_PERSISTENCE_SCHEMA,
  financialContextFromPersistence,
  financialContextToPersistence
} from "../../src/infrastructure/persistence/financial-context-persistence";
import { PersistenceBoundaryError } from "../../src/infrastructure/persistence/persistence-errors";
import { SupabaseSimulationRunStore } from "../../src/infrastructure/runs/supabase-simulation-run-store";
import type { Database, Json } from "../../src/infrastructure/supabase/database.types";
import type { RequestSupabaseClient } from "../../src/infrastructure/supabase/server-client";
import { createSimulatorApplication } from "../../src/server/simulator-application";

const SARAH: AuthenticatedPrincipal = { userId: "11111111-1111-4111-8111-111111111111" };
const ALEX: AuthenticatedPrincipal = { userId: "22222222-2222-4222-8222-222222222222" };
const URL = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_PUBLISHABLE_KEY;

function configuredClient(): RequestSupabaseClient {
  if (!URL || !KEY) throw new Error("Local Supabase integration environment is not configured.");
  return createClient<Database>(URL, KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    realtime: { transport: WebSocket as never }
  }) as unknown as RequestSupabaseClient;
}

async function signedIn(email: string, password: string): Promise<RequestSupabaseClient> {
  const client = configuredClient();
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`Local fixture sign-in failed: ${error.name}.`);
  return client;
}

function application(client: RequestSupabaseClient, principal: AuthenticatedPrincipal) {
  return createSimulatorApplication({
    contextSource: new SupabaseFinancialContextSource(client, principal),
    runStore: new SupabaseSimulationRunStore(client, principal),
    rules: SLICE_1_RULES,
    calendar: ENGLAND_WALES_WORKING_DAY_CALENDAR,
    calendarMetadata: ENGLAND_WALES_CALENDAR_METADATA
  });
}

function request(requestId: string, amount = "65000"): OneOffPurchaseRequestDTO {
  return {
    requestId,
    expectedContextVersionId: SARAH_V1_CONTEXT.version,
    change: {
      type: "one_off_purchase",
      amount: { currency: "GBP", minorUnits: amount },
      purpose: "trip",
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

describe("Supabase persistence and RLS adapters", () => {
  let sarahClient: RequestSupabaseClient;
  let alexClient: RequestSupabaseClient;

  beforeAll(async () => {
    [sarahClient, alexClient] = await Promise.all([
      signedIn("sarah@example.test", "Sarah-Local-Only-2026!"),
      signedIn("alex@example.test", "Alex-Local-Only-2026!")
    ]);
  });

  afterAll(async () => {
    await Promise.all([
      sarahClient?.auth.signOut() ?? Promise.resolve(),
      alexClient?.auth.signOut() ?? Promise.resolve()
    ]);
  });

  it("rehydrates canonical Sarah exactly and reproduces every frozen projection", async () => {
    const source = new SupabaseFinancialContextSource(sarahClient, SARAH);
    expect(await source.getCurrentContextVersionId()).toBe(SARAH_V1_CONTEXT.version);
    const persisted = await source.getContextVersion(SARAH_V1_CONTEXT.version);
    expect(canonicalStringify(persisted)).toBe(canonicalStringify(SARAH_V1_CONTEXT));
    expect(persisted).toEqual(SARAH_V1_CONTEXT);
    const baseline = unwrap(generateBaseline({
      baselineId: SARAH_V1_IDS.baseline,
      context: persisted!,
      rules: SLICE_1_RULES,
      calendar: ENGLAND_WALES_WORKING_DAY_CALENDAR
    }));
    expect(baseline).toEqual(runSarahV1Baseline());
    for (const scenario of Object.values(SARAH_V1_SCENARIOS)) {
      const rehydratedResult = unwrap(simulateOneOffPurchase({
        baselineId: SARAH_V1_IDS.baseline,
        baseline,
        context: persisted!,
        rules: SLICE_1_RULES,
        calendar: ENGLAND_WALES_WORKING_DAY_CALENDAR,
        scenario
      }));
      expect(rehydratedResult).toEqual(runSarahV1Scenario(scenario, baseline));
    }
  });

  it("round-trips exact domain money beyond Number.MAX_SAFE_INTEGER through PostgreSQL", async () => {
    const hugeMinor = 9_007_199_254_740_993_00n;
    const hugeContext: FinancialContextSnapshot = {
      ...SARAH_V1_CONTEXT,
      id: "context-sarah-large-money-test",
      version: "sarah-large-money-test@2026-09-01",
      currentAccount: {
        ...SARAH_V1_CONTEXT.currentAccount,
        clearedBalance: {
          ...SARAH_V1_CONTEXT.currentAccount.clearedBalance,
          value: gbp(hugeMinor)
        }
      }
    };
    const payload = financialContextToPersistence(hugeContext);
    const { error } = await sarahClient.from("financial_context_versions").insert({
      user_id: SARAH.userId,
      version_id: hugeContext.version,
      context_id: hugeContext.id,
      predecessor_version_id: SARAH_V1_CONTEXT.version,
      domain_schema_version: hugeContext.schemaVersion,
      persistence_schema_version: FINANCIAL_CONTEXT_PERSISTENCE_SCHEMA,
      payload: payload as unknown as Json,
      source: "integration exact-money test",
      origin: "user_update",
      confirmation_reason: "prove exact money beyond JavaScript safe integer"
    });
    if (error && error.code !== "23505") throw new Error(`Large context insert failed: ${error.code}.`);
    const rehydrated = await new SupabaseFinancialContextSource(sarahClient, SARAH)
      .getContextVersion(hugeContext.version);
    expect(rehydrated?.currentAccount.clearedBalance.value?.minor).toBe(hugeMinor);
    expect(typeof rehydrated?.currentAccount.clearedBalance.value?.minor).toBe("bigint");
    expect(rehydrated?.snapshotDate).toBe("2026-09-01");
    expect(rehydrated?.projectionStartPeriod).toBe("2026-09");
    expect(rehydrated?.currentAccount.clearedBalance.evidence).toEqual(
      hugeContext.currentAccount.clearedBalance.evidence
    );
  });

  it("rejects fractional persisted minor units before they can enter the domain", () => {
    const payload = financialContextToPersistence(SARAH_V1_CONTEXT);
    const malformed = structuredClone(payload);
    malformed.currentAccount.clearedBalance.value!.minorUnits = "1.5";
    expect(() => financialContextFromPersistence(
      malformed,
      FINANCIAL_CONTEXT_PERSISTENCE_SCHEMA
    )).toThrowError(PersistenceBoundaryError);
  });

  it("persists one authoritative concurrent run and enforces user-scoped idempotency", async () => {
    const app = application(sarahClient, SARAH);
    const command = request("req_slice3_integration_concurrent");
    const [left, right] = await Promise.all([
      app.simulateOneOffPurchase.execute(command),
      app.simulateOneOffPurchase.execute(command)
    ]);
    expect(left).toEqual(right);
    expect(left.ok).toBe(true);
    const { count, error } = await sarahClient
      .from("simulation_runs")
      .select("run_id", { count: "exact", head: true })
      .eq("request_id", command.requestId);
    expect(error).toBeNull();
    expect(count).toBe(1);
    const conflict = await app.simulateOneOffPurchase.execute(request(command.requestId, "50000"));
    expect(conflict).toEqual({
      ok: false,
      error: {
        code: "IDEMPOTENCY_KEY_REUSED",
        message: "This request ID has already been used for a different calculation request.",
        missingFields: []
      }
    });
  });

  it("survives client/application/adapter recreation with exact signed and zero money", async () => {
    const firstApplication = application(sarahClient, SARAH);
    const command = request("req_slice3_integration_restart");
    const created = await firstApplication.simulateOneOffPurchase.execute(command);
    if (!created.ok) throw new Error(created.error.code);
    const siblings = await firstApplication.generateAmountAlternatives.execute({
      requestId: "req_slice3_integration_restart_siblings",
      source: command
    });
    if (!siblings.ok) throw new Error(siblings.error.code);
    expect(siblings.value.options).toHaveLength(3);
    expect(siblings.value.options.slice(1).every(
      (option) => option.scenario.derivedFromScenarioId === created.value.scenario.id
    )).toBe(true);

    const recreatedClient = await signedIn(
      "sarah@example.test",
      "Sarah-Local-Only-2026!"
    );
    const recreatedApplication = application(recreatedClient, SARAH);
    const stored = await recreatedApplication.getSimulationRun.execute(
      created.value.calculation.runId
    );
    expect(stored).toEqual(created);
    if (!stored.ok) throw new Error(stored.error.code);
    expect(stored.value.result.projection.trace.some(
      (event) => event.signedCash.minorUnits.startsWith("-")
    )).toBe(true);
    expect(stored.value.result.projection.hardConsequences.creditUsed.minorUnits).toBe("0");
    expect(stored.value.calculation.calendar).toEqual(created.value.calculation.calendar);
    expect(stored.value.calculation.projectionHorizon).toEqual(
      created.value.calculation.projectionHorizon
    );
    const storedSibling = await recreatedApplication.getSimulationRun.execute(
      siblings.value.options[1]!.calculation.runId
    );
    expect(storedSibling).toEqual({ ok: true, value: siblings.value.options[1] });
    await recreatedClient.auth.signOut();
  });

  it("returns foreign contexts and runs as absent through independently authenticated adapters", async () => {
    const sarahApp = application(sarahClient, SARAH);
    const created = await sarahApp.simulateOneOffPurchase.execute(
      request("req_slice3_integration_foreign")
    );
    if (!created.ok) throw new Error(created.error.code);
    const alexContext = new SupabaseFinancialContextSource(alexClient, ALEX);
    const alexRuns = new SupabaseSimulationRunStore(alexClient, ALEX);
    expect(await alexContext.getCurrentContextVersionId()).toBeNull();
    expect(await alexContext.getContextVersion(SARAH_V1_CONTEXT.version)).toBeNull();
    expect(await alexRuns.get(created.value.calculation.runId)).toBeNull();
  });
});
