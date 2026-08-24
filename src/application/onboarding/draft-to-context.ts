import { estimated, confirmed, createFinancialContext } from "../../domain/simulator/context";
import { mustLocalDate, mustYearMonth } from "../../domain/shared/date";
import { gbp, type Money } from "../../domain/shared/money";
import type {
  FinancialContextSnapshot,
  PlanningValue
} from "../../domain/simulator/types";
import type { FinancialOnboardingDraftDTO, EvidencedMoneyInputDTO } from "./contracts";
import { parseExactGbpInput, type MoneySignRule } from "./exact-gbp-input";
import type { OnboardingValidationIssue } from "./validation";

export type CandidateContextErrorCode =
  | "MONEY_INPUT_INVALID"
  | "CURRENT_CYCLE_RESERVE_INVALID"
  | "GOAL_POLICY_INVALID"
  | "ONBOARDING_INPUT_INVALID"
  | "ONBOARDING_INFORMATION_INSUFFICIENT";

export type CandidateContextResult =
  | Readonly<{ ok: true; context: FinancialContextSnapshot }>
  | Readonly<{
      ok: false;
      code: CandidateContextErrorCode;
      issues: readonly OnboardingValidationIssue[];
    }>;

function issue(path: string, message: string): OnboardingValidationIssue {
  return { path, message };
}

function parseMoney(
  value: { currency: string; amount: string },
  path: string,
  signRule: MoneySignRule,
  issues: OnboardingValidationIssue[]
): Money | null {
  const result = parseExactGbpInput(value, path, signRule);
  if (!result.ok) {
    issues.push(issue(result.error.field, result.error.message));
    return null;
  }
  return result.value;
}

function planningMoney(
  input: EvidencedMoneyInputDTO,
  value: Money,
  snapshotDate: ReturnType<typeof mustLocalDate>
): PlanningValue<Money> {
  return input.evidenceState === "confirmed"
    ? confirmed(value, input.evidenceSource, snapshotDate)
    : estimated(value, input.evidenceSource, true, snapshotDate);
}

export function financialOnboardingDraftToContext(
  draft: FinancialOnboardingDraftDTO
): CandidateContextResult {
  const issues: OnboardingValidationIssue[] = [];
  const snapshotDate = mustLocalDate(draft.snapshotDate);
  const cleared = parseMoney(
    draft.currentAccount.actualClearedBalance,
    "draft.currentAccount.actualClearedBalance.amount",
    "SIGNED",
    issues
  );
  const reserve = parseMoney(
    draft.currentAccount.remainingCurrentCycleReserve,
    "draft.currentAccount.remainingCurrentCycleReserve.amount",
    "NON_NEGATIVE",
    issues
  );
  const overdraft = parseMoney(
    draft.currentAccount.overdraftLimit,
    "draft.currentAccount.overdraftLimit.amount",
    "NON_NEGATIVE",
    issues
  );
  const desiredBuffer = parseMoney(
    draft.desiredSafetyBuffer,
    "draft.desiredSafetyBuffer.amount",
    "NON_NEGATIVE",
    issues
  );
  const income = parseMoney(
    draft.income.monthlyNetIncome,
    "draft.income.monthlyNetIncome.amount",
    "POSITIVE",
    issues
  );
  const routineTotal = parseMoney(
    draft.routineSpending.futureMonthlyTotal,
    "draft.routineSpending.futureMonthlyTotal.amount",
    "NON_NEGATIVE",
    issues
  );

  const routineItems = draft.routineSpending.items.map((item, index) => ({
    id: item.id,
    label: item.label,
    amount: parseMoney(
      item.amount,
      `draft.routineSpending.items.${index}.amount.amount`,
      "NON_NEGATIVE",
      issues
    ),
    required: item.required
  }));
  const obligations = draft.requiredObligations.items.map((item, index) => ({
    ...item,
    parsedAmount: parseMoney(
      item.amount,
      `draft.requiredObligations.items.${index}.amount.amount`,
      "POSITIVE",
      issues
    )
  }));
  const goals = draft.goals.map((goal, index) => ({
    ...goal,
    parsedCurrent: parseMoney(
      goal.currentBalance,
      `draft.goals.${index}.currentBalance.amount`,
      "NON_NEGATIVE",
      issues
    ),
    parsedTarget: parseMoney(
      goal.targetBalance,
      `draft.goals.${index}.targetBalance.amount`,
      "POSITIVE",
      issues
    ),
    parsedContribution: parseMoney(
      goal.normalContribution,
      `draft.goals.${index}.normalContribution.amount`,
      "NON_NEGATIVE",
      issues
    )
  }));
  const transfers = draft.committedGoalTransfers.items.map((transfer, index) => ({
    ...transfer,
    parsedAmount: parseMoney(
      transfer.amount,
      `draft.committedGoalTransfers.items.${index}.amount.amount`,
      "POSITIVE",
      issues
    )
  }));

  if (issues.length > 0) {
    return {
      ok: false,
      code: issues.some((item) =>
        item.path === "draft.currentAccount.remainingCurrentCycleReserve.amount"
      )
        ? "CURRENT_CYCLE_RESERVE_INVALID"
        : "MONEY_INPUT_INVALID",
      issues
    };
  }
  for (const [index, goal] of goals.entries()) {
    if (goal.parsedTarget!.minor < goal.parsedCurrent!.minor) {
      issues.push(
        issue(`draft.goals.${index}.targetBalance.amount`, "Target cannot be below the current goal balance.")
      );
    }
  }
  if (issues.length > 0) return { ok: false, code: "GOAL_POLICY_INVALID", issues };

  const goalById = new Map(goals.map((goal) => [goal.id, goal]));
  const contributionBudgetMinor = goals
    .filter((goal) => !goal.paused)
    .reduce((sum, goal) => sum + goal.parsedContribution!.minor, 0n);
  const projectionStartPeriod = mustYearMonth(snapshotDate.slice(0, 7));
  const context: FinancialContextSnapshot = {
    id: draft.identity.contextId,
    version: draft.identity.contextVersion,
    schemaVersion: "financial-context/1.0.0",
    snapshotDate,
    projectionStartPeriod,
    jurisdiction: "ENGLAND_AND_WALES",
    currentAccount: {
      id: draft.identity.currentAccountId,
      clearedBalance: planningMoney(draft.currentAccount.actualClearedBalance, cleared!, snapshotDate),
      reservedSpending: planningMoney(
        draft.currentAccount.remainingCurrentCycleReserve,
        reserve!,
        snapshotDate
      ),
      overdraftLimit: gbp(overdraft!.minor),
      overdraftIncludedAsCash: false
    },
    desiredSafetyBuffer: planningMoney(draft.desiredSafetyBuffer, desiredBuffer!, snapshotDate),
    income: {
      id: draft.identity.incomeId,
      amount: planningMoney(draft.income.monthlyNetIncome, income!, snapshotDate),
      paydayRule:
        draft.income.paydayRule.type === "last_working_day"
          ? { type: "LAST_WORKING_DAY" }
          : { type: "FIXED_DAY", day: draft.income.paydayRule.day },
      recurrence: "MONTHLY"
    },
    routineSpending: {
      total: planningMoney(draft.routineSpending.futureMonthlyTotal, routineTotal!, snapshotDate),
      items: routineItems.map((item) => ({
        id: item.id,
        label: item.label,
        amount: gbp(item.amount!.minor),
        required: item.required
      }))
    },
    requiredObligationsConfirmed: true,
    requiredObligations: obligations.map((obligation) => ({
      id: obligation.id,
      label: obligation.label,
      amount: planningMoney(obligation.amount, obligation.parsedAmount!, snapshotDate),
      recurrence: "MONTHLY",
      due:
        obligation.due.type === "month_only"
          ? { type: "MONTH_ONLY" }
          : { type: "DAY_OF_MONTH", day: obligation.due.day },
      includedInRoutineEnvelope: obligation.includedInRoutineEnvelope
    })),
    goals: goals.map((goal) => ({
      id: goal.id,
      label: goal.label,
      openingBalance: planningMoney(goal.currentBalance, goal.parsedCurrent!, snapshotDate),
      targetBalance: planningMoney(goal.targetBalance, goal.parsedTarget!, snapshotDate),
      paused: goal.paused
    })),
    goalAllocationPolicy: {
      normalContributionBudget: confirmed(
        gbp(contributionBudgetMinor),
        draft.goalPolicy.contributionBudgetEvidenceSource,
        snapshotDate
      ),
      orderedSlots: draft.goalPolicy.allocationOrder.map((goalId) => ({
        goalId,
        normalCap: gbp(goalById.get(goalId)!.parsedContribution!.minor)
      })),
      overflowGoalId: draft.goalPolicy.overflowGoalId,
      lockedAllocations: transfers.map((transfer) => ({
        period: projectionStartPeriod,
        goalId: transfer.goalId,
        amount: gbp(transfer.parsedAmount!.minor),
        ...(transfer.evidenceState === "estimated" ? { evidenceState: "ESTIMATED" as const } : {})
      }))
    },
    confirmedOneOffEvents: [],
    informationalContext: draft.informationalContext.map((information) =>
      information.kind === "pension_information"
        ? {
            kind: "PENSION_INFORMATION" as const,
            employeeContributionPercent: information.employeeContributionPercent,
            employerContributionPercent: information.employerContributionPercent,
            includedInNetIncomeAlready: true as const,
            employerContributionSpendable: false as const
          }
        : {
            kind: "PAYROLL_DEDUCTIONS_INFORMATION" as const,
            takeHomeAlreadyNetOfStudentLoan: true as const
          }
    )
  };

  const validated = createFinancialContext(context);
  if (!validated.ok) {
    const goalPolicy = /goal|allocation|contribution|overflow/i.test(validated.error.message);
    return {
      ok: false,
      code: goalPolicy ? "GOAL_POLICY_INVALID" : "ONBOARDING_INPUT_INVALID",
      issues: [issue("draft", validated.error.message)]
    };
  }
  return { ok: true, context: validated.value };
}
