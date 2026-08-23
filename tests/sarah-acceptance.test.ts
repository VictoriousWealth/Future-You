import { beforeAll, describe, expect, it } from "vitest";
import { canonicalClassificationSummary } from "../src/domain/simulator/result-summary";
import { periodByMonth } from "../src/domain/simulator/engine";
import {
  SARAH_V1_EXPECTED,
  SARAH_V1_IDS,
  SARAH_V1_SCENARIOS,
  runSarahV1Baseline,
  runSarahV1Scenario
} from "../src/fixtures/sarah-v1";
import type {
  GoalCompletion,
  Projection,
  ProjectionPeriod,
  ScenarioSimulationResult
} from "../src/domain/simulator/types";

function completion(projection: Projection, goalId: string): GoalCompletion {
  const value = projection.goalCompletions.find((item) => item.goalId === goalId);
  if (!value) throw new Error(`Missing completion for ${goalId}.`);
  return value;
}

function completedPeriod(projection: Projection, goalId: string): string {
  const value = completion(projection, goalId);
  if (value.status !== "COMPLETED") throw new Error(`${goalId} did not complete.`);
  return value.period;
}

function contribution(period: ProjectionPeriod, goalId: string): bigint {
  const state = period.goalContributions.find((item) => item.goalId === goalId);
  if (!state) throw new Error(`Missing ${goalId} in ${period.period}.`);
  return state.contribution.minor;
}

function goalTotal(period: ProjectionPeriod): bigint {
  return period.goalContributions.reduce((sum, goal) => sum + goal.closingBalance.minor, 0n);
}

describe("Sarah v1 frozen acceptance specification", () => {
  let baseline: Projection;
  let trip: ScenarioSimulationResult;

  beforeAll(() => {
    baseline = runSarahV1Baseline();
    trip = runSarahV1Scenario(SARAH_V1_SCENARIOS.trip650September, baseline);
  });

  it("SARAH-B-001 — baseline current-account closing balance is £2,750 in every displayed month", () => {
    expect(baseline.periods).toHaveLength(6);
    expect(baseline.periods.map((period) => period.closingCash.minor)).toEqual(
      Array<bigint>(6).fill(SARAH_V1_EXPECTED.baseline.closingCashMinor)
    );
  });

  it("SARAH-B-002 — baseline closing safety buffer is £900 in every displayed month", () => {
    expect(baseline.periods.map((period) => period.closingSafetyBuffer.minor)).toEqual(
      Array<bigint>(6).fill(SARAH_V1_EXPECTED.baseline.closingSafetyBufferMinor)
    );
  });

  it("SARAH-B-003 — baseline emergency fund completes in December 2026", () => {
    expect(completedPeriod(baseline, SARAH_V1_IDS.emergencyFund)).toBe(
      SARAH_V1_EXPECTED.baseline.completionPeriods.emergencyFund
    );
  });

  it("SARAH-B-004 — baseline holiday completes in May 2027", () => {
    expect(completedPeriod(baseline, SARAH_V1_IDS.holiday)).toBe(
      SARAH_V1_EXPECTED.baseline.completionPeriods.holiday
    );
  });

  it("SARAH-B-005 — baseline house deposit completes in June 2029", () => {
    expect(completedPeriod(baseline, SARAH_V1_IDS.houseDeposit)).toBe(
      SARAH_V1_EXPECTED.baseline.completionPeriods.houseDeposit
    );
  });

  it("SARAH-T-001 — trip is an additional £650 September debit", () => {
    const event = trip.scenario.ledger.filter((item) => item.type === "HYPOTHETICAL_ONE_OFF");
    expect(event).toHaveLength(1);
    expect(event[0]).toMatchObject({
      period: "2026-09",
      signedCashMinor: -65_000n,
      evidenceState: "HYPOTHETICAL"
    });
    expect(SARAH_V1_SCENARIOS.trip650September.change).toMatchObject({
      costTreatment: "ADDITIONAL_TO_ROUTINE_SPENDING",
      paymentPattern: "SINGLE"
    });
  });

  it("SARAH-T-002 — September goal transfers remain £600", () => {
    const september = periodByMonth(trip.scenario, "2026-09");
    expect(september.goalContributions.reduce((sum, item) => sum + item.contribution.minor, 0n)).toBe(
      60_000n
    );
  });

  it("SARAH-T-003 — trip-scenario September closing cash is £2,100", () => {
    expect(periodByMonth(trip.scenario, "2026-09").closingCash.minor).toBe(210_000n);
  });

  it("SARAH-T-004 — trip-scenario September closing safety buffer is £250", () => {
    expect(periodByMonth(trip.scenario, "2026-09").closingSafetyBuffer.minor).toBe(25_000n);
  });

  it("SARAH-T-005 — lowest projected cash is £250 and credit use is £0", () => {
    expect(trip.scenario.minimumClearedCash.minor).toBe(25_000n);
    expect(trip.scenario.creditUsed.minor).toBe(0n);
    expect(trip.scenario.creditRequired).toBe(false);
  });

  it("SARAH-T-006 — October restores £600 to the buffer and makes no goal contribution", () => {
    const october = periodByMonth(trip.scenario, "2026-10");
    expect(october.bufferRestoration.minor).toBe(60_000n);
    expect(october.goalContributions.every((item) => item.contribution.minor === 0n)).toBe(true);
  });

  it("SARAH-T-007 — November restores £50 and allocates £250 / £200 / £100", () => {
    const november = periodByMonth(trip.scenario, "2026-11");
    expect(november.bufferRestoration.minor).toBe(5_000n);
    expect(contribution(november, SARAH_V1_IDS.emergencyFund)).toBe(25_000n);
    expect(contribution(november, SARAH_V1_IDS.houseDeposit)).toBe(20_000n);
    expect(contribution(november, SARAH_V1_IDS.holiday)).toBe(10_000n);
  });

  it("SARAH-T-008 — safety buffer first returns to £900 in November 2026", () => {
    const recovered = trip.scenario.allocationHistory.find(
      (entry) => entry.period > "2026-09" && entry.safetyBufferAfterAllocationMinor >= 90_000n
    );
    expect(recovered?.period).toBe(SARAH_V1_EXPECTED.trip650September.bufferRestoredPeriod);
  });

  it("SARAH-T-009 — emergency fund completes in February 2027", () => {
    expect(completedPeriod(trip.scenario, SARAH_V1_IDS.emergencyFund)).toBe(
      SARAH_V1_EXPECTED.trip650September.completionPeriods.emergencyFund
    );
  });

  it("SARAH-T-010 — holiday completes in June 2027", () => {
    expect(completedPeriod(trip.scenario, SARAH_V1_IDS.holiday)).toBe(
      SARAH_V1_EXPECTED.trip650September.completionPeriods.holiday
    );
  });

  it("SARAH-T-011 — house deposit completes in July 2029", () => {
    expect(completedPeriod(trip.scenario, SARAH_V1_IDS.houseDeposit)).toBe(
      SARAH_V1_EXPECTED.trip650September.completionPeriods.houseDeposit
    );
  });

  it("SARAH-T-012 — February goals total £13,800, exactly £650 below baseline", () => {
    const baselineFebruary = goalTotal(periodByMonth(baseline, "2027-02"));
    const scenarioFebruary = goalTotal(periodByMonth(trip.scenario, "2027-02"));
    expect(baselineFebruary).toBe(1_445_000n);
    expect(scenarioFebruary).toBe(1_380_000n);
    expect(baselineFebruary - scenarioFebruary).toBe(65_000n);
    expect(trip.comparison.goalShortfallAtClassificationHorizon.minor).toBe(65_000n);
  });

  it("SARAH-T-013 — classification is Affordable — significant trade-off", () => {
    expect(trip.comparison.classification.code).toBe(
      SARAH_V1_EXPECTED.trip650September.classification
    );
    expect(trip.comparison.classification).toMatchObject({
      safetySeverity: "SIGNIFICANT",
      futureSeverity: "SIGNIFICANT",
      minimumSafetyBufferMinor: 25_000n,
      recoveryCycles: 2,
      maximumGoalDelayMonths: 2
    });
  });

  it("SARAH-T-014 — approved user-facing summary remains exact", () => {
    expect(canonicalClassificationSummary(trip.comparison.classification.code)).toBe(
      SARAH_V1_EXPECTED.trip650September.summary
    );
  });
});
