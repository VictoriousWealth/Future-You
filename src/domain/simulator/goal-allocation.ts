import { gbp, type Money } from "../shared/money";

export interface GoalAllocationState {
  readonly goalId: string;
  readonly balanceMinor: bigint;
  readonly targetMinor: bigint;
  readonly paused: boolean;
}

export interface GoalContributionOverride {
  readonly goalId: string;
  readonly paused?: boolean;
  readonly cap?: Money;
}

export interface GoalAllocationInput {
  readonly goalPool: Money;
  readonly goals: readonly GoalAllocationState[];
  readonly slots: readonly Readonly<{ goalId: string; normalCap: Money }>[];
  readonly overflowGoalId: string | null;
  readonly overrides?: readonly GoalContributionOverride[];
}

export interface GoalAllocationOutput {
  readonly allocations: readonly Readonly<{ goalId: string; amount: Money }>[];
  readonly retainedAsCash: Money;
}

export function allocateGoalPool(input: GoalAllocationInput): GoalAllocationOutput {
  const balanceByGoal = new Map(input.goals.map((goal) => [goal.goalId, { ...goal }]));
  const overrideByGoal = new Map((input.overrides ?? []).map((override) => [override.goalId, override]));
  const amounts = new Map<string, bigint>();
  let remaining = input.goalPool.minor;

  function contribute(goalId: string, requested: bigint): void {
    const goal = balanceByGoal.get(goalId);
    const override = overrideByGoal.get(goalId);
    if (!goal || goal.paused || override?.paused || remaining <= 0n) return;
    const needed = goal.targetMinor - goal.balanceMinor;
    if (needed <= 0n) return;
    const amount = [remaining, requested, needed].reduce((minimum, value) =>
      value < minimum ? value : minimum
    );
    if (amount <= 0n) return;
    remaining -= amount;
    goal.balanceMinor += amount;
    amounts.set(goalId, (amounts.get(goalId) ?? 0n) + amount);
  }

  for (const slot of input.slots) {
    const override = overrideByGoal.get(slot.goalId);
    const cap = override?.cap?.minor ?? slot.normalCap.minor;
    contribute(slot.goalId, cap);
  }

  if (input.overflowGoalId !== null && remaining > 0n) {
    contribute(input.overflowGoalId, remaining);
  }

  return {
    allocations: input.goals.map((goal) => ({
      goalId: goal.goalId,
      amount: gbp(amounts.get(goal.goalId) ?? 0n)
    })),
    retainedAsCash: gbp(remaining)
  };
}
