import { monthDifference, type YearMonth } from "../shared/date";
import { gbp, type Money } from "../shared/money";
import type {
  ClassificationResult,
  GoalCompletion,
  GoalImpact,
  Projection,
  ScenarioComparison,
  ScenarioDefinition,
  Severity,
  SimulationRules
} from "./types";

function completionFor(projection: Projection, goalId: string): GoalCompletion {
  const completion = projection.goalCompletions.find((item) => item.goalId === goalId);
  if (!completion) throw new Error(`Missing completion for goal ${goalId}.`);
  return completion;
}

function delayMonths(baseline: GoalCompletion, scenario: GoalCompletion): number | null {
  if (baseline.status === "COMPLETED" && scenario.status === "COMPLETED") {
    return monthDifference(baseline.period, scenario.period);
  }
  return null;
}

function severityRank(severity: Severity): number {
  return { MINIMAL: 0, NOTICEABLE: 1, SIGNIFICANT: 2, RISKY: 3 }[severity];
}

function safetySeverity(
  minimumBuffer: bigint,
  desiredBuffer: bigint,
  recoveryCycles: number | null
): Severity {
  if (desiredBuffer <= 0n) return minimumBuffer > 0n ? "MINIMAL" : "RISKY";
  if (minimumBuffer <= 0n || recoveryCycles === null || recoveryCycles > 3) return "RISKY";
  if (minimumBuffer * 10n >= desiredBuffer * 9n && recoveryCycles === 0) return "MINIMAL";
  if (minimumBuffer * 2n >= desiredBuffer && recoveryCycles <= 1) return "NOTICEABLE";
  return "SIGNIFICANT";
}

function futureSeverity(
  impacts: readonly GoalImpact[],
  shortfall: bigint,
  normalBudget: bigint
): Severity {
  const delayedBeyondHorizon = impacts.some(
    (impact) =>
      impact.baselineCompletion.status === "COMPLETED" &&
      impact.scenarioCompletion.status === "NOT_REACHED_WITHIN_HORIZON"
  );
  if (delayedBeyondHorizon) return "RISKY";

  const delays = impacts.map((impact) => impact.delayMonths).filter((value): value is number => value !== null);
  const maximumDelay = delays.length === 0 ? 0 : Math.max(...delays);
  if (maximumDelay > 3 || (normalBudget > 0n && shortfall > normalBudget * 3n)) return "RISKY";
  if (maximumDelay >= 2 || (normalBudget > 0n && shortfall >= normalBudget)) return "SIGNIFICANT";
  if (maximumDelay <= 0 && (normalBudget === 0n ? shortfall === 0n : shortfall * 4n < normalBudget)) {
    return "MINIMAL";
  }
  return "NOTICEABLE";
}

function recoveryCycles(
  projection: Projection,
  decisionPeriod: YearMonth,
  desiredBuffer: bigint,
  classificationEvents: number
): number | null {
  const start = projection.allocationHistory.findIndex((entry) => entry.period === decisionPeriod);
  if (start < 0) return null;
  if (projection.allocationHistory[start]!.safetyBufferAfterAllocationMinor >= desiredBuffer) return 0;
  const end = Math.min(projection.allocationHistory.length - 1, start + classificationEvents);
  for (let index = start + 1; index <= end; index += 1) {
    if (projection.allocationHistory[index]!.safetyBufferAfterAllocationMinor >= desiredBuffer) {
      return index - start;
    }
  }
  return null;
}

function balancesAtWindowEnd(
  projection: Projection,
  decisionPeriod: YearMonth,
  classificationEvents: number
): ReadonlyMap<string, bigint> {
  const start = projection.allocationHistory.findIndex((entry) => entry.period === decisionPeriod);
  if (start < 0) throw new Error(`Decision period ${decisionPeriod} is outside the projection.`);
  const end = Math.min(projection.allocationHistory.length - 1, start + classificationEvents - 1);
  return new Map(
    projection.allocationHistory[end]!.goalBalances.map((item) => [item.goalId, item.balance.minor])
  );
}

export interface ClassifyScenarioInput {
  readonly baseline: Projection;
  readonly scenario: Projection;
  readonly definition: ScenarioDefinition;
  readonly desiredSafetyBuffer: Money;
  readonly normalGoalBudget: Money;
  readonly rules: SimulationRules;
}

export function compareAndClassify(input: ClassifyScenarioInput): ScenarioComparison {
  if (input.definition.change.type !== "ONE_OFF_PURCHASE") {
    throw new TypeError("Only a one-off purchase can be classified in Slice 1.");
  }
  const change = input.definition.change;

  const goalIds = input.baseline.goalCompletions.map((completion) => completion.goalId);
  const impacts: GoalImpact[] = goalIds.map((goalId) => {
    const baselineCompletion = completionFor(input.baseline, goalId);
    const scenarioCompletion = completionFor(input.scenario, goalId);
    return {
      goalId,
      baselineCompletion,
      scenarioCompletion,
      delayMonths: delayMonths(baselineCompletion, scenarioCompletion)
    };
  });

  const baselineBalances = balancesAtWindowEnd(
    input.baseline,
    change.paymentPeriod,
    input.rules.classificationAllocationEvents
  );
  const scenarioBalances = balancesAtWindowEnd(
    input.scenario,
    change.paymentPeriod,
    input.rules.classificationAllocationEvents
  );
  const baselineTotal = [...baselineBalances.values()].reduce((sum, value) => sum + value, 0n);
  const scenarioTotal = [...scenarioBalances.values()].reduce((sum, value) => sum + value, 0n);
  const shortfall = baselineTotal > scenarioTotal ? baselineTotal - scenarioTotal : 0n;

  const windowPeriods = input.scenario.allocationHistory
    .slice(
      input.scenario.allocationHistory.findIndex(
        (entry) => entry.period === change.paymentPeriod
      ),
      input.scenario.allocationHistory.findIndex(
        (entry) => entry.period === change.paymentPeriod
      ) + input.rules.classificationAllocationEvents
    )
    .map((entry) => entry.period);
  const periodSet = new Set(windowPeriods);
  const windowMinimum = input.scenario.ledger
    .filter((event) => periodSet.has(event.period))
    .reduce(
      (minimum, event) => (event.safetyBufferMinor < minimum ? event.safetyBufferMinor : minimum),
      input.scenario.allocationHistory.find(
        (entry) => entry.period === change.paymentPeriod
      )!.safetyBufferAfterAllocationMinor
    );

  const recovery = recoveryCycles(
    input.scenario,
    change.paymentPeriod,
    input.desiredSafetyBuffer.minor,
    input.rules.classificationAllocationEvents
  );
  const safety = safetySeverity(windowMinimum, input.desiredSafetyBuffer.minor, recovery);
  const future = futureSeverity(impacts, shortfall, input.normalGoalBudget.minor);
  const delays = impacts.map((impact) => impact.delayMonths).filter((value): value is number => value !== null);
  const maxDelay = delays.length === 0 ? null : Math.max(...delays);
  const hard =
    !input.scenario.requiredPaymentsCovered ||
    input.scenario.cashBecameNegative ||
    input.scenario.creditRequired;

  let code: ClassificationResult["code"];
  if (hard) code = "NOT_CURRENTLY_AFFORDABLE";
  else if (severityRank(safety) === 3 || severityRank(future) === 3) code = "FINANCIALLY_RISKY";
  else if (severityRank(safety) === 2 || severityRank(future) === 2) {
    code = "AFFORDABLE_SIGNIFICANT_TRADE_OFF";
  } else if (severityRank(safety) === 1 || severityRank(future) === 1) {
    code = "AFFORDABLE_NOTICEABLE_TRADE_OFF";
  } else code = "AFFORDABLE_MINIMAL_IMPACT";

  const reasons: string[] = [];
  if (windowMinimum * 2n < input.desiredSafetyBuffer.minor) reasons.push("BUFFER_RATIO_BELOW_HALF");
  if (recovery !== null && recovery >= 2) reasons.push(`BUFFER_RECOVERY_${recovery}_CYCLES`);
  if (maxDelay !== null && maxDelay > 0) reasons.push(`MAX_GOAL_DELAY_${maxDelay}_MONTHS`);
  if (shortfall >= input.normalGoalBudget.minor) reasons.push("GOAL_SHORTFALL_AT_LEAST_ONE_BUDGET");

  const classification: ClassificationResult = {
    code,
    safetySeverity: safety,
    futureSeverity: future,
    requiredPaymentFailure: !input.scenario.requiredPaymentsCovered,
    negativeCash: input.scenario.cashBecameNegative,
    creditRequired: input.scenario.creditRequired,
    minimumSafetyBufferMinor: windowMinimum,
    desiredSafetyBuffer: input.desiredSafetyBuffer,
    minimumBufferRatio: {
      numerator: windowMinimum,
      denominator: input.desiredSafetyBuffer.minor === 0n ? 1n : input.desiredSafetyBuffer.minor
    },
    recoveryCycles: recovery,
    goalShortfall: gbp(shortfall),
    goalBudgetEquivalent: {
      numerator: shortfall,
      denominator: input.normalGoalBudget.minor === 0n ? 1n : input.normalGoalBudget.minor
    },
    maximumGoalDelayMonths: maxDelay,
    reasonCodes: reasons
  };

  return {
    baselineId: input.baseline.baselineId,
    scenarioId: input.definition.id,
    goalImpacts: impacts,
    goalShortfallAtClassificationHorizon: gbp(shortfall),
    classification
  };
}
