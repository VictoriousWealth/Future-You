import { ENGLAND_WALES_WORKING_DAY_CALENDAR } from "./calendar/england-wales-bank-holidays";
import { confirmed, createFinancialContext } from "../domain/simulator/context";
import {
  createOneOffPurchaseScenario,
  generateBaseline,
  simulateOneOffPurchase,
  SLICE_1_RULES
} from "../domain/simulator/engine";
import { withPurchaseAmount, withPurchasePeriod } from "../domain/simulator/alternatives";
import { mustLocalDate, mustYearMonth } from "../domain/shared/date";
import { deepFreeze } from "../domain/shared/immutable";
import { gbp } from "../domain/shared/money";
import { unwrap } from "../domain/shared/result";
import type {
  FinancialContextSnapshot,
  Projection,
  ScenarioDefinition,
  ScenarioSimulationResult
} from "../domain/simulator/types";

export const SARAH_V1_PROFILE = deepFreeze({
  name: "Sarah Wonk",
  age: 25,
  location: "Manchester",
  employment: "Customer Insights Analyst at OniBank",
  grossSalaryMinor: 3_850_000n,
  consumerDebt: "NONE",
  takeHomeIncludesCurrentPensionContribution: true,
  takeHomeIncludesStudentLoanDeduction: true,
  studentLoanPlan: "PLAN_2",
  taxOpportunityProfileVersion: "sarah-tax-opportunity-profile@2026-09-01"
});

export const SARAH_V1_IDS = deepFreeze({
  context: "context-sarah-v1",
  baseline: "baseline-sarah-v1",
  emergencyFund: "goal-emergency-fund",
  houseDeposit: "goal-house-deposit",
  holiday: "goal-holiday",
  trip650September: "scenario-trip-650-september",
  trip500September: "scenario-trip-500-september",
  trip400September: "scenario-trip-400-september",
  trip650October: "scenario-trip-650-october"
});

const SNAPSHOT_DATE = mustLocalDate("2026-09-01");
const SEPTEMBER_2026 = mustYearMonth("2026-09");

function fact<T>(value: T, source: string) {
  return confirmed(value, source, SNAPSHOT_DATE);
}

export function createSarahV1Context(): FinancialContextSnapshot {
  const input: FinancialContextSnapshot = {
    id: SARAH_V1_IDS.context,
    version: "sarah-v1@2026-09-01",
    schemaVersion: "financial-context/1.0.0",
    snapshotDate: SNAPSHOT_DATE,
    projectionStartPeriod: SEPTEMBER_2026,
    jurisdiction: "ENGLAND_AND_WALES",
    currentAccount: {
      id: "sarah-current-account",
      clearedBalance: fact(gbp(275_000), "Sarah v1 confirmed current-account balance"),
      reservedSpending: fact(gbp(185_000), "Sarah v1 September spending-cycle reserve"),
      overdraftLimit: gbp(50_000),
      overdraftIncludedAsCash: false
    },
    desiredSafetyBuffer: fact(gbp(90_000), "Sarah v1 preferred safety level"),
    income: {
      id: "sarah-net-salary",
      amount: fact(gbp(245_000), "Sarah v1 confirmed take-home pay"),
      paydayRule: { type: "LAST_WORKING_DAY" },
      recurrence: "MONTHLY"
    },
    routineSpending: {
      total: fact(gbp(185_000), "Sarah v1 frozen routine-spending envelope"),
      items: [
        { id: "rent", label: "Rent", amount: gbp(82_500), required: true },
        { id: "council-tax", label: "Council tax", amount: gbp(9_000), required: true },
        { id: "utilities-internet", label: "Utilities and internet", amount: gbp(9_500), required: true },
        { id: "groceries", label: "Groceries", amount: gbp(24_000), required: false },
        { id: "transport", label: "Transport", amount: gbp(17_000), required: false },
        { id: "phone", label: "Phone", amount: gbp(2_200), required: true },
        { id: "insurance", label: "Insurance", amount: gbp(1_800), required: true },
        { id: "subscriptions", label: "Subscriptions", amount: gbp(3_000), required: false },
        { id: "flexible", label: "Flexible spending", amount: gbp(36_000), required: false }
      ]
    },
    requiredObligationsConfirmed: true,
    requiredObligations: [
      ["rent", "Rent", 82_500],
      ["council-tax", "Council tax", 9_000],
      ["utilities-internet", "Utilities and internet", 9_500],
      ["phone", "Phone", 2_200],
      ["insurance", "Insurance", 1_800]
    ].map(([id, label, minor]) => ({
      id: String(id),
      label: String(label),
      amount: fact(gbp(Number(minor)), `Sarah v1 confirmed ${String(label).toLowerCase()}`),
      recurrence: "MONTHLY" as const,
      due: { type: "MONTH_ONLY" as const },
      includedInRoutineEnvelope: true
    })),
    goals: [
      {
        id: SARAH_V1_IDS.emergencyFund,
        label: "Emergency fund",
        openingBalance: fact(gbp(330_000), "Sarah v1 confirmed goal balance"),
        targetBalance: fact(gbp(450_000), "Sarah v1 confirmed goal target"),
        paused: false
      },
      {
        id: SARAH_V1_IDS.houseDeposit,
        label: "House deposit",
        openingBalance: fact(gbp(720_000), "Sarah v1 confirmed goal balance"),
        targetBalance: fact(gbp(2_500_000), "Sarah v1 confirmed goal target"),
        paused: false
      },
      {
        id: SARAH_V1_IDS.holiday,
        label: "Holiday",
        openingBalance: fact(gbp(35_000), "Sarah v1 confirmed goal balance"),
        targetBalance: fact(gbp(120_000), "Sarah v1 confirmed goal target"),
        paused: false
      }
    ],
    goalAllocationPolicy: {
      normalContributionBudget: fact(gbp(60_000), "Sarah v1 confirmed monthly goal budget"),
      orderedSlots: [
        { goalId: SARAH_V1_IDS.houseDeposit, normalCap: gbp(20_000) },
        { goalId: SARAH_V1_IDS.holiday, normalCap: gbp(10_000) },
        { goalId: SARAH_V1_IDS.emergencyFund, normalCap: gbp(30_000) }
      ],
      overflowGoalId: SARAH_V1_IDS.houseDeposit,
      lockedAllocations: [
        { period: SEPTEMBER_2026, goalId: SARAH_V1_IDS.houseDeposit, amount: gbp(20_000) },
        { period: SEPTEMBER_2026, goalId: SARAH_V1_IDS.holiday, amount: gbp(10_000) },
        { period: SEPTEMBER_2026, goalId: SARAH_V1_IDS.emergencyFund, amount: gbp(30_000) }
      ]
    },
    confirmedOneOffEvents: [],
    informationalContext: [
      {
        kind: "PENSION_INFORMATION",
        employeeContributionPercent: 3,
        employerContributionPercent: 3,
        includedInNetIncomeAlready: true,
        employerContributionSpendable: false
      },
      {
        kind: "PAYROLL_DEDUCTIONS_INFORMATION",
        takeHomeAlreadyNetOfStudentLoan: true
      }
    ]
  };

  return unwrap(createFinancialContext(input));
}

export const SARAH_V1_CONTEXT = createSarahV1Context();

function createTrip650September(): ScenarioDefinition {
  return unwrap(
    createOneOffPurchaseScenario({
      id: SARAH_V1_IDS.trip650September,
      baselineId: SARAH_V1_IDS.baseline,
      amount: gbp(65_000),
      purpose: "friends trip",
      paymentPeriod: SEPTEMBER_2026,
      datePrecision: "MONTH"
    })
  );
}

export const SARAH_V1_SCENARIOS = (() => {
  const trip650September = createTrip650September();
  return deepFreeze({
    trip650September,
    trip500September: withPurchaseAmount(
      trip650September,
      SARAH_V1_IDS.trip500September,
      gbp(50_000)
    ),
    trip400September: withPurchaseAmount(
      trip650September,
      SARAH_V1_IDS.trip400September,
      gbp(40_000)
    ),
    trip650October: withPurchasePeriod(
      trip650September,
      SARAH_V1_IDS.trip650October,
      mustYearMonth("2026-10")
    )
  });
})();

export const SARAH_V1_EXPECTED = deepFreeze({
  baseline: {
    closingCashMinor: 275_000n,
    closingSafetyBufferMinor: 90_000n,
    completionPeriods: {
      emergencyFund: "2026-12",
      holiday: "2027-05",
      houseDeposit: "2029-06"
    }
  },
  trip650September: {
    lowestCashMinor: 25_000n,
    bufferRestoredPeriod: "2026-11",
    completionPeriods: {
      emergencyFund: "2027-02",
      holiday: "2027-06",
      houseDeposit: "2029-07"
    },
    classification: "AFFORDABLE_SIGNIFICANT_TRADE_OFF",
    summary: "Affordable, but with a meaningful short-term safety-buffer trade-off."
  },
  trip500September: {
    lowestCashMinor: 40_000n,
    bufferRestoredPeriod: "2026-10",
    emergencyFundCompletionPeriod: "2027-01",
    classification: "AFFORDABLE_SIGNIFICANT_TRADE_OFF"
  },
  trip400September: {
    lowestCashMinor: 50_000n,
    bufferRestoredPeriod: "2026-10",
    emergencyFundCompletionPeriod: "2027-01",
    classification: "AFFORDABLE_NOTICEABLE_TRADE_OFF"
  },
  trip650October: {
    lowestCashMinor: 25_000n,
    bufferRestoredPeriod: "2026-11",
    completionPeriods: {
      emergencyFund: "2027-02",
      holiday: "2027-06",
      houseDeposit: "2029-07"
    },
    classification: "AFFORDABLE_SIGNIFICANT_TRADE_OFF"
  }
});

export function runSarahV1Baseline(): Projection {
  return unwrap(
    generateBaseline({
      baselineId: SARAH_V1_IDS.baseline,
      context: SARAH_V1_CONTEXT,
      rules: SLICE_1_RULES,
      calendar: ENGLAND_WALES_WORKING_DAY_CALENDAR
    })
  );
}

export function runSarahV1Scenario(
  scenario: ScenarioDefinition,
  baseline: Projection = runSarahV1Baseline()
): ScenarioSimulationResult {
  return unwrap(
    simulateOneOffPurchase({
      baselineId: SARAH_V1_IDS.baseline,
      baseline,
      context: SARAH_V1_CONTEXT,
      rules: SLICE_1_RULES,
      calendar: ENGLAND_WALES_WORKING_DAY_CALENDAR,
      scenario
    })
  );
}
