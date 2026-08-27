import type { WorkplaceAssociation } from "../ports/financial-context-version-repository";
import type {
  EvidenceState,
  FinancialContextSnapshot,
  PlanningValue
} from "../../domain/simulator/types";
import { signedGbp, type Money } from "../../domain/shared/money";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December"
] as const;

export interface SummaryMoneyValue {
  readonly display: string;
  readonly status: "Confirmed" | "Estimate" | "Not supplied" | "What-if only";
}

export interface FinancialContextSummary {
  readonly asOfDate: string;
  readonly planningFrom: string;
  readonly region: string;
  readonly workplace: Readonly<{
    name: string;
    status: "Verified workplace" | "Added by you";
  }> | null;
  readonly moneyToday: {
    readonly currentAccountBalance: SummaryMoneyValue;
    readonly currentCycleReserve: SummaryMoneyValue;
    readonly availableSafetyBuffer: SummaryMoneyValue;
    readonly preferredSafetyBuffer: SummaryMoneyValue;
    readonly overdraftLimit: string;
  };
  readonly income: {
    readonly monthlyTakeHome: SummaryMoneyValue;
    readonly payday: string;
    readonly pension: Readonly<{
      employeeContribution: string;
      employerContribution: string;
    }> | null;
    readonly studentLoanDeductedFromTakeHome: boolean | null;
  };
  readonly monthlySpending: {
    readonly total: SummaryMoneyValue;
    readonly items: readonly Readonly<{
      label: string;
      amount: string;
      protectedPayment: boolean;
    }>[];
  };
  readonly requiredPayments: {
    readonly declarationConfirmed: boolean;
    readonly items: readonly Readonly<{
      label: string;
      amount: SummaryMoneyValue;
      due: string;
      includedInMonthlySpending: boolean;
    }>[];
  };
  readonly goals: {
    readonly monthlyBudget: SummaryMoneyValue;
    readonly items: readonly Readonly<{
      label: string;
      currentBalance: SummaryMoneyValue;
      targetBalance: SummaryMoneyValue;
      monthlyContribution: string;
      status: "Active" | "Paused";
    }>[];
    readonly allocationOrder: readonly string[];
    readonly overflowGoal: string | null;
    readonly committedTransfers: readonly Readonly<{
      goal: string;
      amount: string;
      month: string;
      status: "Confirmed" | "Estimate";
    }>[];
  };
  readonly confirmedOneOffs: readonly Readonly<{
    label: string;
    amount: SummaryMoneyValue;
    timing: string;
  }>[];
}

function monthName(month: number): string {
  return MONTHS[month - 1] ?? "Unknown month";
}

function formatLocalDate(value: string): string {
  const [year = "", month = "", day = ""] = value.split("-");
  return `${Number(day)} ${monthName(Number(month))} ${year}`;
}

function formatYearMonth(value: string): string {
  const [year = "", month = ""] = value.split("-");
  return `${monthName(Number(month))} ${year}`;
}

function evidenceStatus(state: EvidenceState): SummaryMoneyValue["status"] {
  if (state === "CONFIRMED") return "Confirmed";
  if (state === "ESTIMATED") return "Estimate";
  if (state === "HYPOTHETICAL") return "What-if only";
  return "Not supplied";
}

function formatDisplayMoney(money: Money): string {
  const negative = money.minor < 0n;
  const absolute = negative ? -money.minor : money.minor;
  const pounds = (absolute / 100n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const pennies = absolute % 100n;
  return `${negative ? "-" : ""}£${pounds}${
    pennies === 0n ? "" : `.${pennies.toString().padStart(2, "0")}`
  }`;
}

function summaryMoney(value: PlanningValue<Money>): SummaryMoneyValue {
  return {
    display: value.value ? formatDisplayMoney(value.value) : "Not supplied",
    status: evidenceStatus(value.evidence.state)
  };
}

function combinedStatus(
  left: PlanningValue<Money>,
  right: PlanningValue<Money>
): SummaryMoneyValue["status"] {
  if (!left.value || !right.value) return "Not supplied";
  if (left.evidence.state === "ESTIMATED" || right.evidence.state === "ESTIMATED") {
    return "Estimate";
  }
  return "Confirmed";
}

export function buildFinancialContextSummary(
  context: FinancialContextSnapshot,
  workplace: WorkplaceAssociation | null
): FinancialContextSummary {
  const actualCash = context.currentAccount.clearedBalance;
  const reservedCash = context.currentAccount.reservedSpending;
  const allocationByGoal = new Map(
    context.goalAllocationPolicy.orderedSlots.map((slot) => [slot.goalId, slot])
  );
  const goalLabels = new Map(context.goals.map((goal) => [goal.id, goal.label]));
  const pension = context.informationalContext.find(
    (item) => item.kind === "PENSION_INFORMATION"
  );
  const studentLoan = context.informationalContext.find(
    (item) => item.kind === "PAYROLL_DEDUCTIONS_INFORMATION"
  );

  const availableSafetyBuffer: SummaryMoneyValue = actualCash.value && reservedCash.value
    ? {
        display: formatDisplayMoney(signedGbp(actualCash.value.minor - reservedCash.value.minor)),
        status: combinedStatus(actualCash, reservedCash)
      }
    : { display: "Not supplied", status: "Not supplied" };

  return {
    asOfDate: formatLocalDate(context.snapshotDate),
    planningFrom: formatYearMonth(context.projectionStartPeriod),
    region: context.jurisdiction === "ENGLAND_AND_WALES" ? "England and Wales" : context.jurisdiction,
    workplace: workplace
      ? {
          name: workplace.name,
          status: workplace.verificationStatus === "verified" ? "Verified workplace" : "Added by you"
        }
      : null,
    moneyToday: {
      currentAccountBalance: summaryMoney(actualCash),
      currentCycleReserve: summaryMoney(reservedCash),
      availableSafetyBuffer,
      preferredSafetyBuffer: summaryMoney(context.desiredSafetyBuffer),
      overdraftLimit: formatDisplayMoney(context.currentAccount.overdraftLimit)
    },
    income: {
      monthlyTakeHome: summaryMoney(context.income.amount),
      payday: context.income.paydayRule.type === "LAST_WORKING_DAY"
        ? "Last working day of each month"
        : `Day ${context.income.paydayRule.day} of each month`,
      pension: pension?.kind === "PENSION_INFORMATION"
        ? {
            employeeContribution: `${pension.employeeContributionPercent}%`,
            employerContribution: `${pension.employerContributionPercent}%`
          }
        : null,
      studentLoanDeductedFromTakeHome: studentLoan?.kind === "PAYROLL_DEDUCTIONS_INFORMATION"
        ? studentLoan.takeHomeAlreadyNetOfStudentLoan
        : null
    },
    monthlySpending: {
      total: summaryMoney(context.routineSpending.total),
      items: context.routineSpending.items.map((item) => ({
        label: item.label,
        amount: formatDisplayMoney(item.amount),
        protectedPayment: item.required
      }))
    },
    requiredPayments: {
      declarationConfirmed: context.requiredObligationsConfirmed,
      items: context.requiredObligations.map((item) => ({
        label: item.label,
        amount: summaryMoney(item.amount),
        due: item.due.type === "DAY_OF_MONTH"
          ? `Day ${item.due.day} each month`
          : "Due during the month",
        includedInMonthlySpending: item.includedInRoutineEnvelope
      }))
    },
    goals: {
      monthlyBudget: summaryMoney(context.goalAllocationPolicy.normalContributionBudget),
      items: context.goals.map((goal) => ({
        label: goal.label,
        currentBalance: summaryMoney(goal.openingBalance),
        targetBalance: summaryMoney(goal.targetBalance),
        monthlyContribution: formatDisplayMoney(
          allocationByGoal.get(goal.id)?.normalCap ?? { currency: "GBP", minor: 0n }
        ),
        status: goal.paused ? "Paused" : "Active"
      })),
      allocationOrder: context.goalAllocationPolicy.orderedSlots.map(
        (slot) => goalLabels.get(slot.goalId) ?? "Unknown goal"
      ),
      overflowGoal: context.goalAllocationPolicy.overflowGoalId
        ? goalLabels.get(context.goalAllocationPolicy.overflowGoalId) ?? null
        : null,
      committedTransfers: context.goalAllocationPolicy.lockedAllocations.map((transfer) => ({
        goal: goalLabels.get(transfer.goalId) ?? "Unknown goal",
        amount: formatDisplayMoney(transfer.amount),
        month: formatYearMonth(transfer.period),
        status: transfer.evidenceState === "ESTIMATED" ? "Estimate" : "Confirmed"
      }))
    },
    confirmedOneOffs: context.confirmedOneOffEvents.map((event) => ({
      label: event.label,
      amount: summaryMoney(event.amount),
      timing: event.date ? formatLocalDate(event.date) : formatYearMonth(event.period)
    }))
  };
}
