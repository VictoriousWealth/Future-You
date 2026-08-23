import { describe, expect, it } from "vitest";
import { ENGLAND_WALES_WORKING_DAY_CALENDAR } from "../src/fixtures/calendar/england-wales-bank-holidays";
import {
  SARAH_V1_CONTEXT,
  SARAH_V1_IDS,
  SARAH_V1_SCENARIOS,
  createSarahV1Context,
  runSarahV1Baseline,
  runSarahV1Scenario
} from "../src/fixtures/sarah-v1";
import { confirmed, createFinancialContext, unknown } from "../src/domain/simulator/context";
import {
  createOneOffPurchaseScenario,
  generateBaseline,
  simulateOneOffPurchase,
  SLICE_1_RULES
} from "../src/domain/simulator/engine";
import { canonicalStringify } from "../src/domain/shared/identity";
import { gbp, signedGbp, type Money } from "../src/domain/shared/money";
import { unwrap } from "../src/domain/shared/result";
import type {
  FinancialContextSnapshot,
  ScenarioDefinition
} from "../src/domain/simulator/types";

const BASELINE_REQUEST = {
  baselineId: SARAH_V1_IDS.baseline,
  context: SARAH_V1_CONTEXT,
  rules: SLICE_1_RULES,
  calendar: ENGLAND_WALES_WORKING_DAY_CALENDAR
} as const;

function variant(
  context: FinancialContextSnapshot,
  changes: Partial<FinancialContextSnapshot>
): FinancialContextSnapshot {
  return unwrap(
    createFinancialContext({
      ...context,
      id: `${context.id}-variant`,
      version: `${context.version}-variant`,
      ...changes
    })
  );
}

describe("simulator execution invariants", () => {
  it("repeated execution produces byte-equivalent canonical output and identity", () => {
    const first = runSarahV1Baseline();
    const second = runSarahV1Baseline();
    expect(first.inputIdentity).toBe(second.inputIdentity);
    expect(canonicalStringify(first)).toBe(canonicalStringify(second));
  });

  it("baseline generation does not mutate caller inputs or nested goals", () => {
    const context = createSarahV1Context();
    const before = canonicalStringify(context);
    const openingGoal = context.goals[0]?.openingBalance.value?.minor;
    const result = generateBaseline({ ...BASELINE_REQUEST, context });
    expect(result.ok).toBe(true);
    expect(canonicalStringify(context)).toBe(before);
    expect(context.goals[0]?.openingBalance.value?.minor).toBe(openingGoal);
    expect(Object.isFrozen(context)).toBe(true);
    expect(Object.isFrozen(context.goals)).toBe(true);
  });

  it("returned baseline and scenario projections are deeply immutable", () => {
    const baseline = runSarahV1Baseline();
    const scenario = runSarahV1Scenario(SARAH_V1_SCENARIOS.trip650September, baseline).scenario;
    expect(Object.isFrozen(baseline)).toBe(true);
    expect(Object.isFrozen(baseline.periods)).toBe(true);
    expect(Object.isFrozen(baseline.periods[0]?.goalContributions)).toBe(true);
    expect(Object.isFrozen(scenario)).toBe(true);
    expect(Object.isFrozen(scenario.ledger)).toBe(true);
  });

  it("scenario execution retains the unchanged baseline object", () => {
    const baseline = runSarahV1Baseline();
    const before = canonicalStringify(baseline);
    const result = runSarahV1Scenario(SARAH_V1_SCENARIOS.trip650September, baseline);
    expect(result.baseline).toBe(baseline);
    expect(canonicalStringify(baseline)).toBe(before);
    expect(result.scenario.parentScenarioId).toBeNull();
  });

  it("available overdraft never increases cash, reserve, or safety buffer", () => {
    const baseline = runSarahV1Baseline();
    expect(SARAH_V1_CONTEXT.currentAccount.overdraftLimit.minor).toBe(50_000n);
    expect(baseline.periods[0]?.openingCash.minor).toBe(275_000n);
    expect(baseline.periods[0]?.openingReservedCash.minor).toBe(185_000n);
    expect(baseline.periods[0]?.lowestSafetyBufferMinor).toBe(90_000n);
    expect(baseline.creditUsed.minor).toBe(0n);
  });

  it("routine events reduce cash and reserve together, preserving baseline safety", () => {
    const baseline = runSarahV1Baseline();
    const septemberSpend = baseline.ledger.filter(
      (event) =>
        event.period === "2026-09" &&
        (event.type === "ROUTINE_SPENDING" || event.type === "REQUIRED_OBLIGATION")
    );
    expect(septemberSpend.reduce((sum, event) => sum + event.signedCashMinor, 0n)).toBe(-185_000n);
    expect(septemberSpend.reduce((sum, event) => sum + event.reserveDeltaMinor, 0n)).toBe(-185_000n);
    expect(septemberSpend.every((event) => event.safetyBufferMinor === 90_000n)).toBe(true);
    expect(septemberSpend.at(-1)?.remainingReservedMinor).toBe(0n);
  });

  it("records a required debit failure before later payday income", () => {
    const source = createSarahV1Context();
    const context = variant(source, {
      currentAccount: {
        ...source.currentAccount,
        clearedBalance: confirmed(gbp(50_000), "required-debit test", source.snapshotDate),
        reservedSpending: confirmed(gbp(0), "required-debit test", source.snapshotDate)
      },
      desiredSafetyBuffer: confirmed(gbp(0), "required-debit test", source.snapshotDate),
      routineSpending: {
        total: confirmed(gbp(0), "required-debit test", source.snapshotDate),
        items: []
      },
      requiredObligations: [
        {
          id: "early-required-debit",
          label: "Early required debit",
          amount: confirmed(gbp(60_000), "required-debit test", source.snapshotDate),
          recurrence: "MONTHLY",
          due: { type: "MONTH_ONLY" },
          includedInRoutineEnvelope: false
        }
      ],
      goalAllocationPolicy: {
        normalContributionBudget: confirmed(gbp(0), "required-debit test", source.snapshotDate),
        orderedSlots: source.goalAllocationPolicy.orderedSlots.map((slot) => ({
          ...slot,
          normalCap: gbp(0)
        })),
        overflowGoalId: null,
        lockedAllocations: []
      }
    });
    const result = unwrap(
      generateBaseline({
        baselineId: "required-debit-baseline",
        context,
        rules: SLICE_1_RULES,
        calendar: ENGLAND_WALES_WORKING_DAY_CALENDAR
      })
    );
    const debitIndex = result.ledger.findIndex((event) => event.id.includes("early-required-debit"));
    const paydayIndex = result.ledger.findIndex((event) => event.type === "INCOME");
    expect(debitIndex).toBeGreaterThanOrEqual(0);
    expect(paydayIndex).toBeGreaterThan(debitIndex);
    expect(result.requiredPaymentsCovered).toBe(false);
    expect(result.cashBecameNegative).toBe(true);
    expect(result.minimumClearedCash.minor).toBe(-10_000n);
    expect(result.minimumBalanceEventId).toContain("early-required-debit");
    expect(result.minimumBalanceDate).toBe("2026-09-01");
  });

  it("a material unknown returns typed insufficient information", () => {
    const source = createSarahV1Context();
    const context = variant(source, {
      currentAccount: {
        ...source.currentAccount,
        clearedBalance: unknown<Money>("No connected balance")
      }
    });
    expect(generateBaseline({ ...BASELINE_REQUEST, context })).toMatchObject({
      ok: false,
      error: {
        code: "INSUFFICIENT_INFORMATION",
        missingFields: ["currentAccount.clearedBalance"]
      }
    });
  });

  it("goal exhaustion returns NOT_REACHED_WITHIN_HORIZON without inventing a date", () => {
    const source = createSarahV1Context();
    const context = variant(source, {
      goals: source.goals.map((goal) =>
        goal.id === SARAH_V1_IDS.houseDeposit
          ? {
              ...goal,
              targetBalance: confirmed(gbp(999_999_999), "horizon test", source.snapshotDate)
            }
          : goal
      )
    });
    const projection = unwrap(generateBaseline({ ...BASELINE_REQUEST, context }));
    const house = projection.goalCompletions.find(
      (completion) => completion.goalId === SARAH_V1_IDS.houseDeposit
    );
    expect(house).toEqual({
      status: "NOT_REACHED_WITHIN_HORIZON",
      goalId: SARAH_V1_IDS.houseDeposit,
      projectedThrough: "2036-08",
      allocationEventsEvaluated: 120
    });
    expect(projection.projectedAllocationEvents).toBe(120);
  });

  it("rejects unsupported scenario types explicitly", () => {
    const baseline = runSarahV1Baseline();
    const unsupported: ScenarioDefinition = {
      id: "scenario-recurring-outside-slice",
      baselineId: SARAH_V1_IDS.baseline,
      parentScenarioId: null,
      derivedFromScenarioId: null,
      change: { type: "UNSUPPORTED", requestedType: "RECURRING_EXPENSE" }
    };
    expect(
      simulateOneOffPurchase({ ...BASELINE_REQUEST, baseline, scenario: unsupported })
    ).toMatchObject({ ok: false, error: { code: "UNSUPPORTED_SCENARIO_TYPE" } });
  });

  it("rejects negative and mismatched-currency purchase inputs", () => {
    expect(
      createOneOffPurchaseScenario({
        id: "negative",
        baselineId: SARAH_V1_IDS.baseline,
        amount: signedGbp(-1n),
        purpose: "invalid",
        paymentPeriod: SARAH_V1_CONTEXT.projectionStartPeriod
      })
    ).toMatchObject({ ok: false, error: { code: "INVALID_MONEY" } });

    const euros = { currency: "EUR", minor: 100n } as unknown as Money;
    expect(
      createOneOffPurchaseScenario({
        id: "currency",
        baselineId: SARAH_V1_IDS.baseline,
        amount: euros,
        purpose: "invalid",
        paymentPeriod: SARAH_V1_CONTEXT.projectionStartPeriod
      })
    ).toMatchObject({ ok: false, error: { code: "INVALID_MONEY" } });
  });

  it("rejects a scenario paired with a different baseline identity", () => {
    const baseline = runSarahV1Baseline();
    expect(
      simulateOneOffPurchase({
        ...BASELINE_REQUEST,
        baselineId: "wrong-baseline",
        baseline,
        scenario: SARAH_V1_SCENARIOS.trip650September
      })
    ).toMatchObject({ ok: false, error: { code: "BASELINE_MISMATCH" } });
  });

  it("carries separated assumptions with scope, affected periods, and likely effect", () => {
    const baseline = runSarahV1Baseline();
    const scenario = runSarahV1Scenario(SARAH_V1_SCENARIOS.trip650September, baseline).scenario;
    expect(baseline.assumptions.confirmedFacts.length).toBeGreaterThan(0);
    expect(baseline.assumptions.systemAssumptions.length).toBeGreaterThan(0);
    expect(baseline.assumptions.unknownOrExcluded.some((item) => item.id === "credit-excluded")).toBe(
      true
    );
    expect(scenario.assumptions.hypotheticalChanges).toHaveLength(1);
    expect(
      scenario.assumptions.systemAssumptions.every(
        (item) => item.affectedPeriods.length > 0 && item.likelyEffect.length > 0
      )
    ).toBe(true);
  });
});
