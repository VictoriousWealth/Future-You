import { beforeAll, describe, expect, it } from "vitest";
import { canonicalStringify } from "../src/domain/shared/identity";
import { generateAmountAlternativeCandidates } from "../src/domain/simulator/alternatives";
import { periodByMonth } from "../src/domain/simulator/engine";
import {
  SARAH_V1_CONTEXT,
  SARAH_V1_EXPECTED,
  SARAH_V1_IDS,
  SARAH_V1_SCENARIOS,
  runSarahV1Baseline,
  runSarahV1Scenario
} from "../src/fixtures/sarah-v1";
import { gbp } from "../src/domain/shared/money";
import type { Projection, ScenarioSimulationResult } from "../src/domain/simulator/types";

function completionPeriod(projection: Projection, goalId: string): string {
  const completion = projection.goalCompletions.find((item) => item.goalId === goalId);
  if (!completion || completion.status !== "COMPLETED") throw new Error(`${goalId} not completed.`);
  return completion.period;
}

function firstRestoredPeriod(result: ScenarioSimulationResult, decisionPeriod: string): string | undefined {
  return result.scenario.allocationHistory.find(
    (entry) => entry.period > decisionPeriod && entry.safetyBufferAfterAllocationMinor >= 90_000n
  )?.period;
}

describe("Sarah v1 golden-path alternatives", () => {
  let baseline: Projection;
  let trip650: ScenarioSimulationResult;
  let trip500: ScenarioSimulationResult;
  let trip400: ScenarioSimulationResult;
  let tripOctober: ScenarioSimulationResult;
  let originalState: string;

  beforeAll(() => {
    baseline = runSarahV1Baseline();
    originalState = canonicalStringify({ baseline, context: SARAH_V1_CONTEXT, scenarios: SARAH_V1_SCENARIOS });
    trip650 = runSarahV1Scenario(SARAH_V1_SCENARIOS.trip650September, baseline);
    trip500 = runSarahV1Scenario(SARAH_V1_SCENARIOS.trip500September, baseline);
    trip400 = runSarahV1Scenario(SARAH_V1_SCENARIOS.trip400September, baseline);
    tripOctober = runSarahV1Scenario(SARAH_V1_SCENARIOS.trip650October, baseline);
  });

  it("SARAH-A-AMOUNTS-001 — £650 generates £650, £500 and £400 candidates", () => {
    expect(generateAmountAlternativeCandidates(gbp(65_000)).map((amount) => amount.minor)).toEqual([
      65_000n,
      50_000n,
      40_000n
    ]);
  });

  it("SARAH-A-500-001 — £500 is a separate sibling from the same baseline", () => {
    expect(trip500.scenario.scenarioId).toBe(SARAH_V1_IDS.trip500September);
    expect(SARAH_V1_SCENARIOS.trip500September.parentScenarioId).toBeNull();
    expect(SARAH_V1_SCENARIOS.trip500September.baselineId).toBe(SARAH_V1_IDS.baseline);
    expect(SARAH_V1_SCENARIOS.trip500September.derivedFromScenarioId).toBe(
      SARAH_V1_IDS.trip650September
    );
  });

  it("SARAH-A-500-002 — £500 leaves £400 and restores the buffer in October", () => {
    expect(trip500.scenario.minimumClearedCash.minor).toBe(
      SARAH_V1_EXPECTED.trip500September.lowestCashMinor
    );
    expect(firstRestoredPeriod(trip500, "2026-09")).toBe(
      SARAH_V1_EXPECTED.trip500September.bufferRestoredPeriod
    );
  });

  it("SARAH-A-500-003 — £500 completes emergency fund in January and stays significant", () => {
    expect(completionPeriod(trip500.scenario, SARAH_V1_IDS.emergencyFund)).toBe(
      SARAH_V1_EXPECTED.trip500September.emergencyFundCompletionPeriod
    );
    expect(trip500.comparison.classification.code).toBe(
      SARAH_V1_EXPECTED.trip500September.classification
    );
  });

  it("SARAH-A-400-001 — £400 is a separate sibling from the same baseline", () => {
    expect(trip400.scenario.scenarioId).toBe(SARAH_V1_IDS.trip400September);
    expect(SARAH_V1_SCENARIOS.trip400September.parentScenarioId).toBeNull();
    expect(SARAH_V1_SCENARIOS.trip400September.baselineId).toBe(SARAH_V1_IDS.baseline);
  });

  it("SARAH-A-400-002 — £400 leaves £500 and restores the buffer in October", () => {
    expect(trip400.scenario.minimumClearedCash.minor).toBe(
      SARAH_V1_EXPECTED.trip400September.lowestCashMinor
    );
    expect(firstRestoredPeriod(trip400, "2026-09")).toBe(
      SARAH_V1_EXPECTED.trip400September.bufferRestoredPeriod
    );
  });

  it("SARAH-A-400-003 — £400 completes emergency fund in January and becomes noticeable", () => {
    expect(completionPeriod(trip400.scenario, SARAH_V1_IDS.emergencyFund)).toBe(
      SARAH_V1_EXPECTED.trip400September.emergencyFundCompletionPeriod
    );
    expect(trip400.comparison.classification.code).toBe(
      SARAH_V1_EXPECTED.trip400September.classification
    );
  });

  it("SARAH-A-OCT-001 — October is a separate timing sibling and September stays current-path", () => {
    expect(tripOctober.scenario.scenarioId).toBe(SARAH_V1_IDS.trip650October);
    expect(SARAH_V1_SCENARIOS.trip650October.parentScenarioId).toBeNull();
    expect(periodByMonth(tripOctober.scenario, "2026-09")).toEqual(
      periodByMonth(baseline, "2026-09")
    );
  });

  it("SARAH-A-OCT-002 — pressure moves to October, reaches £250, and restores in November", () => {
    const tripEvent = tripOctober.scenario.ledger.find((event) => event.type === "HYPOTHETICAL_ONE_OFF");
    expect(tripEvent?.period).toBe("2026-10");
    expect(tripOctober.scenario.minimumClearedCash.minor).toBe(
      SARAH_V1_EXPECTED.trip650October.lowestCashMinor
    );
    expect(firstRestoredPeriod(tripOctober, "2026-10")).toBe(
      SARAH_V1_EXPECTED.trip650October.bufferRestoredPeriod
    );
  });

  it("SARAH-A-OCT-003 — October retains the frozen goal completion dates", () => {
    expect(completionPeriod(tripOctober.scenario, SARAH_V1_IDS.emergencyFund)).toBe(
      SARAH_V1_EXPECTED.trip650October.completionPeriods.emergencyFund
    );
    expect(completionPeriod(tripOctober.scenario, SARAH_V1_IDS.holiday)).toBe(
      SARAH_V1_EXPECTED.trip650October.completionPeriods.holiday
    );
    expect(completionPeriod(tripOctober.scenario, SARAH_V1_IDS.houseDeposit)).toBe(
      SARAH_V1_EXPECTED.trip650October.completionPeriods.houseDeposit
    );
  });

  it("SARAH-A-OCT-004 — waiting is not labelled financially better merely because it is later", () => {
    expect(tripOctober.comparison.classification.code).toBe(
      SARAH_V1_EXPECTED.trip650October.classification
    );
    expect(tripOctober.comparison.classification.code).toBe(trip650.comparison.classification.code);
  });

  it("SARAH-A-ISOLATION-001 — all alternatives leave baseline, context, and siblings unchanged", () => {
    expect(canonicalStringify({ baseline, context: SARAH_V1_CONTEXT, scenarios: SARAH_V1_SCENARIOS })).toBe(
      originalState
    );
    expect(new Set([trip650.scenario.inputIdentity, trip500.scenario.inputIdentity, trip400.scenario.inputIdentity, tripOctober.scenario.inputIdentity]).size).toBe(4);
  });
});
