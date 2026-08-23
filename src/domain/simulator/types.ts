import type { WorkingDayCalendar } from "../calendar/working-day-calendar";
import type { LocalDate, YearMonth } from "../shared/date";
import type { Money } from "../shared/money";
import type { Result } from "../shared/result";

export type EvidenceState = "CONFIRMED" | "ESTIMATED" | "UNKNOWN" | "HYPOTHETICAL";
export type InputScope = "CURRENT_PATH" | Readonly<{ type: "SCENARIO"; scenarioId: string }>;

export interface Evidence {
  readonly state: EvidenceState;
  readonly source: string;
  readonly scope: InputScope;
  readonly acceptedForPlanning: boolean;
  readonly lastConfirmedDate: LocalDate | null;
}

export type PlanningValue<T> =
  | Readonly<{ value: T; evidence: Evidence }>
  | Readonly<{ value: null; evidence: Evidence & { state: "UNKNOWN" } }>;

export type DatePrecision = "EXACT" | "MONTH";

export interface ParticipatingCurrentAccount {
  readonly id: string;
  readonly clearedBalance: PlanningValue<Money>;
  readonly reservedSpending: PlanningValue<Money>;
  readonly overdraftLimit: Money;
  readonly overdraftIncludedAsCash: false;
}

export type PaydayRule =
  | Readonly<{ type: "LAST_WORKING_DAY" }>
  | Readonly<{ type: "FIXED_DAY"; day: number }>;

export interface NetIncome {
  readonly id: string;
  readonly amount: PlanningValue<Money>;
  readonly paydayRule: PaydayRule;
  readonly recurrence: "MONTHLY";
}

export interface RoutineSpendingItem {
  readonly id: string;
  readonly label: string;
  readonly amount: Money;
  readonly required: boolean;
}

export interface RoutineSpendingEnvelope {
  readonly total: PlanningValue<Money>;
  readonly items: readonly RoutineSpendingItem[];
}

export type ObligationDueRule =
  | Readonly<{ type: "MONTH_ONLY" }>
  | Readonly<{ type: "DAY_OF_MONTH"; day: number }>;

export interface RequiredObligation {
  readonly id: string;
  readonly label: string;
  readonly amount: PlanningValue<Money>;
  readonly recurrence: "MONTHLY";
  readonly due: ObligationDueRule;
  readonly includedInRoutineEnvelope: boolean;
}

export interface Goal {
  readonly id: string;
  readonly label: string;
  readonly openingBalance: PlanningValue<Money>;
  readonly targetBalance: PlanningValue<Money>;
  readonly paused: boolean;
}

export interface GoalAllocationSlot {
  readonly goalId: string;
  readonly normalCap: Money;
}

export interface LockedGoalAllocation {
  readonly period: YearMonth;
  readonly goalId: string;
  readonly amount: Money;
}

export interface GoalAllocationPolicy {
  readonly normalContributionBudget: PlanningValue<Money>;
  readonly orderedSlots: readonly GoalAllocationSlot[];
  readonly overflowGoalId: string | null;
  readonly lockedAllocations: readonly LockedGoalAllocation[];
}

export interface ConfirmedOneOffEvent {
  readonly id: string;
  readonly label: string;
  readonly amount: PlanningValue<Money>;
  readonly period: YearMonth;
  readonly date: LocalDate | null;
  readonly datePrecision: DatePrecision;
  readonly additionalToRoutineSpending: true;
}

export interface InformationalPensionContext {
  readonly kind: "PENSION_INFORMATION";
  readonly employeeContributionPercent: number;
  readonly employerContributionPercent: number;
  readonly includedInNetIncomeAlready: true;
  readonly employerContributionSpendable: false;
}

export interface InformationalPayrollDeductionsContext {
  readonly kind: "PAYROLL_DEDUCTIONS_INFORMATION";
  readonly takeHomeAlreadyNetOfStudentLoan: true;
}

export type InformationalFinancialContext =
  | InformationalPensionContext
  | InformationalPayrollDeductionsContext;

export interface FinancialContextSnapshot {
  readonly id: string;
  readonly version: string;
  readonly schemaVersion: string;
  readonly snapshotDate: LocalDate;
  readonly projectionStartPeriod: YearMonth;
  readonly jurisdiction: "ENGLAND_AND_WALES";
  readonly currentAccount: ParticipatingCurrentAccount;
  readonly desiredSafetyBuffer: PlanningValue<Money>;
  readonly income: NetIncome;
  readonly routineSpending: RoutineSpendingEnvelope;
  readonly requiredObligationsConfirmed: boolean;
  readonly requiredObligations: readonly RequiredObligation[];
  readonly goals: readonly Goal[];
  readonly goalAllocationPolicy: GoalAllocationPolicy;
  readonly confirmedOneOffEvents: readonly ConfirmedOneOffEvent[];
  readonly informationalContext: readonly InformationalFinancialContext[];
}

export interface SimulationRules {
  readonly version: string;
  readonly classificationAllocationEvents: 6;
  readonly detailedPeriods: 6;
  readonly maxGoalProjectionAllocationEvents: 120;
}

export interface OneOffPurchaseChange {
  readonly type: "ONE_OFF_PURCHASE";
  readonly amount: Money;
  readonly purpose: string;
  readonly paymentPeriod: YearMonth;
  readonly paymentDate: LocalDate | null;
  readonly datePrecision: DatePrecision;
  readonly fundingSource: "CURRENT_ACCOUNT";
  readonly paymentPattern: "SINGLE";
  readonly costTreatment: "ADDITIONAL_TO_ROUTINE_SPENDING";
}

export interface UnsupportedScenarioChange {
  readonly type: "UNSUPPORTED";
  readonly requestedType: string;
}

export interface ScenarioDefinition {
  readonly id: string;
  readonly baselineId: string;
  readonly parentScenarioId: string | null;
  readonly derivedFromScenarioId: string | null;
  readonly change: OneOffPurchaseChange | UnsupportedScenarioChange;
}

export type LedgerEventType =
  | "REQUIRED_OBLIGATION"
  | "ROUTINE_SPENDING"
  | "CONFIRMED_ONE_OFF"
  | "HYPOTHETICAL_ONE_OFF"
  | "INCOME"
  | "NEXT_CYCLE_RESERVE"
  | "GOAL_TRANSFER";

export interface LedgerEvent {
  readonly id: string;
  readonly period: YearMonth;
  readonly date: LocalDate;
  readonly datePrecision: DatePrecision;
  readonly time: string | null;
  readonly type: LedgerEventType;
  readonly signedCashMinor: bigint;
  readonly reserveDeltaMinor: bigint;
  readonly required: boolean;
  readonly evidenceState: EvidenceState;
  readonly scope: InputScope;
  readonly dependsOn: readonly string[];
  readonly sourceOrder: number;
  readonly goalId: string | null;
  readonly description: string;
  readonly runningCashMinor: bigint;
  readonly remainingReservedMinor: bigint;
  readonly safetyBufferMinor: bigint;
}

export interface GoalPeriodState {
  readonly goalId: string;
  readonly openingBalance: Money;
  readonly contribution: Money;
  readonly closingBalance: Money;
}

export interface ProjectionPeriod {
  readonly period: YearMonth;
  readonly openingCash: Money;
  readonly openingReservedCash: Money;
  readonly income: Money;
  readonly routineSpending: Money;
  readonly requiredObligations: Money;
  readonly confirmedOneOffs: Money;
  readonly hypotheticalOneOffs: Money;
  readonly bufferRestoration: Money;
  readonly goalContributions: readonly GoalPeriodState[];
  readonly closingCash: Money;
  readonly closingReservedCash: Money;
  readonly closingSafetyBuffer: Money;
  readonly lowestClearedCash: Money;
  readonly lowestSafetyBufferMinor: bigint;
  readonly lowestBalanceEventId: string | null;
  readonly lowestBalanceDate: LocalDate | null;
  readonly requiredPaymentsCovered: boolean;
  readonly bufferAtAllocationMinor: bigint;
}

export type GoalCompletion =
  | Readonly<{
      status: "COMPLETED";
      goalId: string;
      date: LocalDate;
      period: YearMonth;
    }>
  | Readonly<{
      status: "NOT_REACHED_WITHIN_HORIZON";
      goalId: string;
      projectedThrough: YearMonth;
      allocationEventsEvaluated: number;
    }>;

export type AssumptionCategory =
  | "CONFIRMED_FACT"
  | "ACCEPTED_ESTIMATE"
  | "SYSTEM_ASSUMPTION"
  | "HYPOTHETICAL_CHANGE"
  | "UNKNOWN_OR_EXCLUDED";

export interface Assumption {
  readonly id: string;
  readonly category: AssumptionCategory;
  readonly description: string;
  readonly source: string;
  readonly material: boolean;
  readonly likelyEffect: string;
  readonly scope: InputScope;
  readonly affectedPeriods: readonly YearMonth[];
}

export interface AssumptionManifest {
  readonly confirmedFacts: readonly Assumption[];
  readonly acceptedEstimates: readonly Assumption[];
  readonly systemAssumptions: readonly Assumption[];
  readonly hypotheticalChanges: readonly Assumption[];
  readonly unknownOrExcluded: readonly Assumption[];
}

export type Confidence = "HIGH" | "MEDIUM" | "LOW" | "INSUFFICIENT_INFORMATION";

export interface Projection {
  readonly baselineId: string;
  readonly scenarioId: string | null;
  readonly parentScenarioId: string | null;
  readonly contextId: string;
  readonly contextVersion: string;
  readonly rulesVersion: string;
  readonly calendarVersion: string;
  readonly projectionHorizon: Readonly<{
    classificationAllocationEvents: 6;
    detailedPeriods: 6;
    maxGoalProjectionAllocationEvents: 120;
  }>;
  readonly inputIdentity: string;
  readonly periods: readonly ProjectionPeriod[];
  readonly ledger: readonly LedgerEvent[];
  readonly goalCompletions: readonly GoalCompletion[];
  readonly goalBalancesAtClassificationHorizon: readonly Readonly<{
    goalId: string;
    balance: Money;
  }>[];
  readonly allocationHistory: readonly Readonly<{
    period: YearMonth;
    safetyBufferAfterAllocationMinor: bigint;
    goalBalances: readonly Readonly<{ goalId: string; balance: Money }>[];
  }>[];
  readonly assumptions: AssumptionManifest;
  readonly confidence: Confidence;
  readonly requiredPaymentsCovered: boolean;
  readonly cashBecameNegative: boolean;
  readonly creditRequired: boolean;
  readonly creditUsed: Money;
  readonly minimumClearedCash: Money;
  readonly minimumSafetyBufferMinor: bigint;
  readonly minimumBalanceEventId: string | null;
  readonly minimumBalanceDate: LocalDate | null;
  readonly projectedAllocationEvents: number;
  readonly projectedThrough: YearMonth;
}

export type Severity = "MINIMAL" | "NOTICEABLE" | "SIGNIFICANT" | "RISKY";
export type AffordabilityClass =
  | "NOT_CURRENTLY_AFFORDABLE"
  | "FINANCIALLY_RISKY"
  | "AFFORDABLE_SIGNIFICANT_TRADE_OFF"
  | "AFFORDABLE_NOTICEABLE_TRADE_OFF"
  | "AFFORDABLE_MINIMAL_IMPACT";

export interface GoalImpact {
  readonly goalId: string;
  readonly baselineCompletion: GoalCompletion;
  readonly scenarioCompletion: GoalCompletion;
  readonly delayMonths: number | null;
}

export interface ClassificationResult {
  readonly code: AffordabilityClass;
  readonly safetySeverity: Severity;
  readonly futureSeverity: Severity;
  readonly requiredPaymentFailure: boolean;
  readonly negativeCash: boolean;
  readonly creditRequired: boolean;
  readonly minimumSafetyBufferMinor: bigint;
  readonly desiredSafetyBuffer: Money;
  readonly minimumBufferRatio: Readonly<{ numerator: bigint; denominator: bigint }>;
  readonly recoveryCycles: number | null;
  readonly goalShortfall: Money;
  readonly goalBudgetEquivalent: Readonly<{ numerator: bigint; denominator: bigint }>;
  readonly maximumGoalDelayMonths: number | null;
  readonly reasonCodes: readonly string[];
}

export interface ScenarioComparison {
  readonly baselineId: string;
  readonly scenarioId: string;
  readonly goalImpacts: readonly GoalImpact[];
  readonly goalShortfallAtClassificationHorizon: Money;
  readonly classification: ClassificationResult;
}

export interface ScenarioSimulationResult {
  readonly baseline: Projection;
  readonly scenario: Projection;
  readonly comparison: ScenarioComparison;
}

export type SimulationErrorCode =
  | "INSUFFICIENT_INFORMATION"
  | "INVALID_CONTEXT"
  | "INVALID_MONEY"
  | "UNSUPPORTED_SCENARIO_TYPE"
  | "BASELINE_MISMATCH"
  | "SIMULATION_INVARIANT_FAILED";

export interface SimulationError {
  readonly code: SimulationErrorCode;
  readonly message: string;
  readonly missingFields: readonly string[];
}

export interface BaselineRequest {
  readonly baselineId: string;
  readonly context: FinancialContextSnapshot;
  readonly rules: SimulationRules;
  readonly calendar: WorkingDayCalendar;
}

export interface ScenarioRequest extends BaselineRequest {
  readonly baseline: Projection;
  readonly scenario: ScenarioDefinition;
}

export type SimulationOutcome<T> = Result<T, SimulationError>;
