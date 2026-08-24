import type { FinancialOnboardingDraftDTO } from "../application/onboarding/contracts";
import { deepFreeze } from "../domain/shared/immutable";
import { SARAH_V1_IDS } from "./sarah-v1";

function money(amount: string) {
  return { currency: "GBP" as const, amount };
}

function fact(amount: string, evidenceSource: string) {
  return {
    ...money(amount),
    evidenceState: "confirmed" as const,
    evidenceSource
  };
}

export const SARAH_V1_ONBOARDING_DRAFT: FinancialOnboardingDraftDTO = deepFreeze({
  identity: {
    contextId: SARAH_V1_IDS.context,
    contextVersion: "sarah-v1@2026-09-01",
    currentAccountId: "sarah-current-account",
    incomeId: "sarah-net-salary"
  },
  snapshotDate: "2026-09-01",
  currentAccount: {
    actualClearedBalance: fact("2750", "Sarah v1 confirmed current-account balance"),
    remainingCurrentCycleReserve: fact("1850", "Sarah v1 September spending-cycle reserve"),
    overdraftLimit: money("500")
  },
  desiredSafetyBuffer: fact("900", "Sarah v1 preferred safety level"),
  income: {
    monthlyNetIncome: fact("2450", "Sarah v1 confirmed take-home pay"),
    paydayRule: { type: "last_working_day" }
  },
  routineSpending: {
    futureMonthlyTotal: fact("1850", "Sarah v1 frozen routine-spending envelope"),
    items: [
      ["rent", "Rent", "825", true],
      ["council-tax", "Council tax", "90", true],
      ["utilities-internet", "Utilities and internet", "95", true],
      ["groceries", "Groceries", "240", false],
      ["transport", "Transport", "170", false],
      ["phone", "Phone", "22", true],
      ["insurance", "Insurance", "18", true],
      ["subscriptions", "Subscriptions", "30", false],
      ["flexible", "Flexible spending", "360", false]
    ].map(([id, label, amount, required]) => ({
      id: String(id),
      label: String(label),
      amount: money(String(amount)),
      required: Boolean(required)
    }))
  },
  requiredObligations: {
    declaration: "provided",
    items: [
      ["rent", "Rent", "825"],
      ["council-tax", "Council tax", "90"],
      ["utilities-internet", "Utilities and internet", "95"],
      ["phone", "Phone", "22"],
      ["insurance", "Insurance", "18"]
    ].map(([id, label, amount]) => ({
      id: String(id),
      label: String(label),
      amount: fact(
        String(amount),
        `Sarah v1 confirmed ${String(label).toLowerCase()}`
      ),
      due: { type: "month_only" as const },
      includedInRoutineEnvelope: true
    }))
  },
  goals: [
    {
      id: SARAH_V1_IDS.emergencyFund,
      label: "Emergency fund",
      currentBalance: fact("3300", "Sarah v1 confirmed goal balance"),
      targetBalance: fact("4500", "Sarah v1 confirmed goal target"),
      normalContribution: money("300"),
      paused: false
    },
    {
      id: SARAH_V1_IDS.houseDeposit,
      label: "House deposit",
      currentBalance: fact("7200", "Sarah v1 confirmed goal balance"),
      targetBalance: fact("25000", "Sarah v1 confirmed goal target"),
      normalContribution: money("200"),
      paused: false
    },
    {
      id: SARAH_V1_IDS.holiday,
      label: "Holiday",
      currentBalance: fact("350", "Sarah v1 confirmed goal balance"),
      targetBalance: fact("1200", "Sarah v1 confirmed goal target"),
      normalContribution: money("100"),
      paused: false
    }
  ],
  goalPolicy: {
    contributionBudgetEvidenceSource: "Sarah v1 confirmed monthly goal budget",
    allocationOrder: [
      SARAH_V1_IDS.houseDeposit,
      SARAH_V1_IDS.holiday,
      SARAH_V1_IDS.emergencyFund
    ],
    overflowGoalId: SARAH_V1_IDS.houseDeposit
  },
  committedGoalTransfers: {
    declaration: "provided",
    items: [
      { goalId: SARAH_V1_IDS.houseDeposit, amount: money("200"), timing: "after_next_funding_event", evidenceState: "confirmed" },
      { goalId: SARAH_V1_IDS.holiday, amount: money("100"), timing: "after_next_funding_event", evidenceState: "confirmed" },
      { goalId: SARAH_V1_IDS.emergencyFund, amount: money("300"), timing: "after_next_funding_event", evidenceState: "confirmed" }
    ]
  },
  confirmedOneOffEvents: [],
  informationalContext: [
    {
      kind: "pension_information",
      employeeContributionPercent: 3,
      employerContributionPercent: 3
    },
    {
      kind: "payroll_deductions_information",
      takeHomeAlreadyNetOfStudentLoan: true
    }
  ],
  workplace: null
});
