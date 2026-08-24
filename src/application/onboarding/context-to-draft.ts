import type { FinancialContextSnapshot, PlanningValue } from "../../domain/simulator/types";
import type { Money } from "../../domain/shared/money";
import type {
  EvidencedMoneyInputDTO,
  FinancialOnboardingDraftDTO
} from "./contracts";
import type { WorkplaceAssociation } from "../ports/financial-context-version-repository";

function amount(money: Money): string {
  const negative = money.minor < 0n;
  const absolute = negative ? -money.minor : money.minor;
  return `${negative ? "-" : ""}${absolute / 100n}.${String(absolute % 100n).padStart(2, "0")}`;
}

function moneyInput(money: Money) {
  return { currency: "GBP" as const, amount: amount(money) };
}

function evidenced(planning: PlanningValue<Money>): EvidencedMoneyInputDTO {
  if (planning.value === null) throw new TypeError("A correction draft requires material money.");
  return {
    ...moneyInput(planning.value),
    evidenceState: planning.evidence.state === "ESTIMATED" ? "estimated" : "confirmed",
    evidenceSource: planning.evidence.source
  };
}

export function financialContextToCorrectionDraft(
  context: FinancialContextSnapshot,
  workplace: WorkplaceAssociation | null
): FinancialOnboardingDraftDTO {
  const slotByGoal = new Map(
    context.goalAllocationPolicy.orderedSlots.map((slot) => [slot.goalId, slot])
  );
  return {
    identity: {
      contextId: context.id,
      contextVersion: `${context.version}.revision`,
      currentAccountId: context.currentAccount.id,
      incomeId: context.income.id
    },
    snapshotDate: context.snapshotDate,
    currentAccount: {
      actualClearedBalance: evidenced(context.currentAccount.clearedBalance),
      remainingCurrentCycleReserve: evidenced(context.currentAccount.reservedSpending),
      overdraftLimit: moneyInput(context.currentAccount.overdraftLimit)
    },
    desiredSafetyBuffer: evidenced(context.desiredSafetyBuffer),
    income: {
      monthlyNetIncome: evidenced(context.income.amount),
      paydayRule:
        context.income.paydayRule.type === "LAST_WORKING_DAY"
          ? { type: "last_working_day" }
          : { type: "fixed_day", day: context.income.paydayRule.day }
    },
    routineSpending: {
      futureMonthlyTotal: evidenced(context.routineSpending.total),
      items: context.routineSpending.items.map((item) => ({
        id: item.id,
        label: item.label,
        amount: moneyInput(item.amount),
        required: item.required
      }))
    },
    requiredObligations:
      context.requiredObligations.length === 0
        ? { declaration: "none", items: [] }
        : {
            declaration: "provided",
            items: context.requiredObligations.map((obligation) => ({
              id: obligation.id,
              label: obligation.label,
              amount: evidenced(obligation.amount),
              due:
                obligation.due.type === "MONTH_ONLY"
                  ? { type: "month_only" }
                  : { type: "day_of_month", day: obligation.due.day },
              includedInRoutineEnvelope: obligation.includedInRoutineEnvelope
            }))
          },
    goals: context.goals.map((goal) => ({
      id: goal.id,
      label: goal.label,
      currentBalance: evidenced(goal.openingBalance),
      targetBalance: evidenced(goal.targetBalance),
      normalContribution: moneyInput(slotByGoal.get(goal.id)?.normalCap ?? { currency: "GBP", minor: 0n }),
      paused: goal.paused
    })),
    goalPolicy: {
      contributionBudgetEvidenceSource:
        context.goalAllocationPolicy.normalContributionBudget.evidence.source,
      allocationOrder: context.goalAllocationPolicy.orderedSlots.map((slot) => slot.goalId),
      overflowGoalId: context.goalAllocationPolicy.overflowGoalId
    },
    committedGoalTransfers:
      context.goalAllocationPolicy.lockedAllocations.length === 0
        ? { declaration: "none", items: [] }
        : {
            declaration: "provided",
            items: context.goalAllocationPolicy.lockedAllocations.map((allocation) => ({
              goalId: allocation.goalId,
              amount: moneyInput(allocation.amount),
              timing: "after_next_funding_event",
              evidenceState: allocation.evidenceState === "ESTIMATED" ? "estimated" : "confirmed"
            }))
          },
    confirmedOneOffEvents: [],
    informationalContext: context.informationalContext.map((information) =>
      information.kind === "PENSION_INFORMATION"
        ? {
            kind: "pension_information",
            employeeContributionPercent: information.employeeContributionPercent,
            employerContributionPercent: information.employerContributionPercent
          }
        : {
            kind: "payroll_deductions_information",
            takeHomeAlreadyNetOfStudentLoan: true
          }
    ),
    workplace
  };
}
