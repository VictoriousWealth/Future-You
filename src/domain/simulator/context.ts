import { deepFreeze } from "../shared/immutable";
import type { Money } from "../shared/money";
import { err, ok, type Result } from "../shared/result";
import type {
  Evidence,
  FinancialContextSnapshot,
  PlanningValue,
  SimulationError
} from "./types";

export function confirmed<T>(value: T, source: string, lastConfirmedDate: Evidence["lastConfirmedDate"]): PlanningValue<T> {
  return deepFreeze({
    value,
    evidence: {
      state: "CONFIRMED",
      source,
      scope: "CURRENT_PATH",
      acceptedForPlanning: true,
      lastConfirmedDate
    }
  });
}

export function estimated<T>(
  value: T,
  source: string,
  acceptedForPlanning: boolean,
  lastConfirmedDate: Evidence["lastConfirmedDate"]
): PlanningValue<T> {
  return deepFreeze({
    value,
    evidence: {
      state: "ESTIMATED",
      source,
      scope: "CURRENT_PATH",
      acceptedForPlanning,
      lastConfirmedDate
    }
  });
}

export function unknown<T>(source: string): PlanningValue<T> {
  return deepFreeze({
    value: null,
    evidence: {
      state: "UNKNOWN",
      source,
      scope: "CURRENT_PATH",
      acceptedForPlanning: false,
      lastConfirmedDate: null
    }
  });
}

function validateMoney(money: Money, field: string, problems: string[]): void {
  if (money.currency !== "GBP") problems.push(`${field} must use GBP.`);
  if (money.minor < 0n) problems.push(`${field} cannot be negative.`);
}

function validatePlanningMoney(value: PlanningValue<Money>, field: string, problems: string[]): void {
  if (value.value !== null) validateMoney(value.value, field, problems);
  if (value.evidence.state === "HYPOTHETICAL") {
    problems.push(`${field} cannot be hypothetical in confirmed context.`);
  }
}

export function createFinancialContext(
  input: FinancialContextSnapshot
): Result<FinancialContextSnapshot, SimulationError> {
  const problems: string[] = [];
  const goalIds = new Set<string>();

  if (
    input.currentAccount.clearedBalance.value !== null &&
    input.currentAccount.clearedBalance.value.currency !== "GBP"
  ) {
    problems.push("currentAccount.clearedBalance must use GBP.");
  }
  if (input.currentAccount.clearedBalance.evidence.state === "HYPOTHETICAL") {
    problems.push("currentAccount.clearedBalance cannot be hypothetical in confirmed context.");
  }
  validatePlanningMoney(input.currentAccount.reservedSpending, "currentAccount.reservedSpending", problems);
  validatePlanningMoney(input.desiredSafetyBuffer, "desiredSafetyBuffer", problems);
  validatePlanningMoney(input.income.amount, "income.amount", problems);
  validatePlanningMoney(input.routineSpending.total, "routineSpending.total", problems);
  validatePlanningMoney(
    input.goalAllocationPolicy.normalContributionBudget,
    "goalAllocationPolicy.normalContributionBudget",
    problems
  );
  validateMoney(input.currentAccount.overdraftLimit, "currentAccount.overdraftLimit", problems);

  for (const item of input.routineSpending.items) validateMoney(item.amount, `spending.${item.id}`, problems);
  for (const obligation of input.requiredObligations) {
    validatePlanningMoney(obligation.amount, `obligation.${obligation.id}`, problems);
  }
  for (const goal of input.goals) {
    if (goalIds.has(goal.id)) problems.push(`Duplicate goal id ${goal.id}.`);
    goalIds.add(goal.id);
    validatePlanningMoney(goal.openingBalance, `goal.${goal.id}.openingBalance`, problems);
    validatePlanningMoney(goal.targetBalance, `goal.${goal.id}.targetBalance`, problems);
  }
  for (const slot of input.goalAllocationPolicy.orderedSlots) {
    if (!goalIds.has(slot.goalId)) problems.push(`Allocation slot references unknown goal ${slot.goalId}.`);
    validateMoney(slot.normalCap, `slot.${slot.goalId}.normalCap`, problems);
  }
  const activeGoalIds = new Set(input.goals.filter((goal) => !goal.paused).map((goal) => goal.id));
  const activeSlots = input.goalAllocationPolicy.orderedSlots.filter((slot) =>
    activeGoalIds.has(slot.goalId)
  );
  const activeSlotGoalIds = new Set(activeSlots.map((slot) => slot.goalId));
  if (activeSlotGoalIds.size !== activeSlots.length) {
    problems.push("Each active goal may have only one normal-contribution slot.");
  }
  for (const goalId of activeGoalIds) {
    if (!activeSlotGoalIds.has(goalId)) {
      problems.push(`Active goal ${goalId} must have a normal-contribution slot.`);
    }
  }
  const normalContributionBudget = input.goalAllocationPolicy.normalContributionBudget.value;
  if (normalContributionBudget !== null) {
    const derivedBudgetMinor = activeSlots.reduce((sum, slot) => sum + slot.normalCap.minor, 0n);
    if (normalContributionBudget.minor !== derivedBudgetMinor) {
      problems.push(
        "Normal contribution budget must equal the sum of active per-goal contribution caps."
      );
    }
  }
  if (
    input.goalAllocationPolicy.overflowGoalId !== null &&
    !goalIds.has(input.goalAllocationPolicy.overflowGoalId)
  ) {
    problems.push("Overflow goal does not exist.");
  }
  for (const allocation of input.goalAllocationPolicy.lockedAllocations) {
    if (!goalIds.has(allocation.goalId)) problems.push(`Locked allocation references ${allocation.goalId}.`);
    validateMoney(allocation.amount, `lockedAllocation.${allocation.goalId}`, problems);
  }
  for (const oneOff of input.confirmedOneOffEvents) {
    validatePlanningMoney(oneOff.amount, `confirmedOneOff.${oneOff.id}`, problems);
  }

  const total = input.routineSpending.total.value;
  if (total !== null && input.routineSpending.items.length > 0) {
    const itemTotal = input.routineSpending.items.reduce((sum, item) => sum + item.amount.minor, 0n);
    if (itemTotal !== total.minor) {
      problems.push("Routine-spending items must reconcile to the envelope total.");
    }
  }

  if (problems.length > 0) {
    return err({ code: "INVALID_CONTEXT", message: problems.join(" "), missingFields: [] });
  }

  return ok(deepFreeze(input) as FinancialContextSnapshot);
}

export interface ResolvedFinancialContext {
  readonly source: FinancialContextSnapshot;
  readonly clearedBalance: Money;
  readonly reservedSpending: Money;
  readonly desiredSafetyBuffer: Money;
  readonly incomeAmount: Money;
  readonly routineSpendingTotal: Money;
  readonly normalContributionBudget: Money;
  readonly goals: readonly Readonly<{
    id: string;
    label: string;
    openingBalance: Money;
    targetBalance: Money;
    paused: boolean;
  }>[];
}

export function resolveFinancialContext(
  context: FinancialContextSnapshot
): Result<ResolvedFinancialContext, SimulationError> {
  const missing: string[] = [];

  function material<T>(field: string, value: PlanningValue<T>): T | null {
    if (
      value.value === null ||
      value.evidence.state === "UNKNOWN" ||
      (value.evidence.state === "ESTIMATED" && !value.evidence.acceptedForPlanning)
    ) {
      missing.push(field);
      return null;
    }
    return value.value;
  }

  const clearedBalance = material("currentAccount.clearedBalance", context.currentAccount.clearedBalance);
  const reservedSpending = material("currentAccount.reservedSpending", context.currentAccount.reservedSpending);
  const desiredSafetyBuffer = material("desiredSafetyBuffer", context.desiredSafetyBuffer);
  const incomeAmount = material("income.amount", context.income.amount);
  const routineSpendingTotal = material("routineSpending.total", context.routineSpending.total);
  const normalContributionBudget = material(
    "goalAllocationPolicy.normalContributionBudget",
    context.goalAllocationPolicy.normalContributionBudget
  );

  if (!context.requiredObligationsConfirmed) missing.push("requiredObligationsConfirmed");

  const goals = context.goals.map((goal) => ({
    id: goal.id,
    label: goal.label,
    openingBalance: material(`goals.${goal.id}.openingBalance`, goal.openingBalance),
    targetBalance: material(`goals.${goal.id}.targetBalance`, goal.targetBalance),
    paused: goal.paused
  }));

  for (const obligation of context.requiredObligations) {
    material(`requiredObligations.${obligation.id}.amount`, obligation.amount);
  }
  for (const event of context.confirmedOneOffEvents) {
    material(`confirmedOneOffEvents.${event.id}.amount`, event.amount);
  }

  if (missing.length > 0) {
    return err({
      code: "INSUFFICIENT_INFORMATION",
      message: "Material financial context is missing or not accepted for planning.",
      missingFields: [...new Set(missing)]
    });
  }

  return ok({
    source: context,
    clearedBalance: clearedBalance!,
    reservedSpending: reservedSpending!,
    desiredSafetyBuffer: desiredSafetyBuffer!,
    incomeAmount: incomeAmount!,
    routineSpendingTotal: routineSpendingTotal!,
    normalContributionBudget: normalContributionBudget!,
    goals: goals.map((goal) => ({
      ...goal,
      openingBalance: goal.openingBalance!,
      targetBalance: goal.targetBalance!
    }))
  });
}
