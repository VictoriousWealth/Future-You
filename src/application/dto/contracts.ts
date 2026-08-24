export const API_VERSION = "future-you.api/v1" as const;
export const CONTEXT_RESPONSE_SCHEMA = "financial-context-current/1.0.0" as const;
export const BASELINE_RESPONSE_SCHEMA = "baseline-result/1.0.0" as const;
export const SCENARIO_RESPONSE_SCHEMA = "one-off-purchase-result/1.0.0" as const;
export const AMOUNT_ALTERNATIVES_RESPONSE_SCHEMA = "amount-alternatives-result/1.0.0" as const;
export const TIMING_ALTERNATIVE_RESPONSE_SCHEMA = "timing-alternative-result/1.0.0" as const;
export const SCENARIO_OPTIONS_RESPONSE_SCHEMA = "scenario-options-result/1.0.0" as const;
export const COMPARISON_RESPONSE_SCHEMA = "scenario-comparison-result/1.0.0" as const;
export const ERROR_RESPONSE_SCHEMA = "error/1.0.0" as const;

export interface MoneyInputDTO {
  readonly currency: "GBP";
  readonly minorUnits: string;
}

export interface MoneyDTO extends MoneyInputDTO {
  readonly display: string;
}

export interface RatioDTO {
  readonly numerator: string;
  readonly denominator: string;
  readonly basisPoints: number;
  readonly display: string;
}

export type ScopeDTO = "current_path" | Readonly<{ scenarioId: string }>;

export interface AssumptionDTO {
  readonly id: string;
  readonly category:
    | "confirmed_fact"
    | "accepted_estimate"
    | "system_assumption"
    | "hypothetical_change"
    | "unknown_or_excluded";
  readonly description: string;
  readonly source: string;
  readonly material: boolean;
  readonly editable: boolean;
  readonly likelyEffect: string;
  readonly scope: ScopeDTO;
  readonly affectedPeriods: readonly string[];
}

export interface AssumptionManifestDTO {
  readonly confirmedFacts: readonly AssumptionDTO[];
  readonly acceptedEstimates: readonly AssumptionDTO[];
  readonly systemAssumptions: readonly AssumptionDTO[];
  readonly hypotheticalChanges: readonly AssumptionDTO[];
  readonly unknownOrExcluded: readonly AssumptionDTO[];
}

export interface GoalPeriodStateDTO {
  readonly goalId: string;
  readonly openingBalance: MoneyDTO;
  readonly contribution: MoneyDTO;
  readonly closingBalance: MoneyDTO;
}

export interface ProjectionPeriodDTO {
  readonly period: string;
  readonly openingCash: MoneyDTO;
  readonly openingReservedCash: MoneyDTO;
  readonly income: MoneyDTO;
  readonly routineSpending: MoneyDTO;
  readonly requiredObligations: MoneyDTO;
  readonly confirmedOneOffs: MoneyDTO;
  readonly hypotheticalOneOffs: MoneyDTO;
  readonly bufferRestoration: MoneyDTO;
  readonly goalContributions: readonly GoalPeriodStateDTO[];
  readonly closingCash: MoneyDTO;
  readonly closingReservedCash: MoneyDTO;
  readonly closingSafetyBuffer: MoneyDTO;
  readonly lowestClearedCash: MoneyDTO;
  readonly lowestSafetyBuffer: MoneyDTO;
  readonly lowestBalanceEventId: string | null;
  readonly lowestBalanceDate: string | null;
  readonly requiredPaymentsCovered: boolean;
  readonly bufferAtAllocation: MoneyDTO;
}

export type GoalCompletionDTO =
  | Readonly<{
      status: "COMPLETED";
      goalId: string;
      date: string;
      month: string;
      calendarSource: "COMMITTED_FIXTURE" | "WEEKDAY_FALLBACK";
    }>
  | Readonly<{
      status: "NOT_REACHED_WITHIN_HORIZON";
      goalId: string;
      projectedThrough: string;
      horizonAllocationEvents: number;
    }>;

export interface LedgerTraceEventDTO {
  readonly id: string;
  readonly period: string;
  readonly date: string;
  readonly datePrecision: "exact" | "month";
  readonly type: string;
  readonly signedCash: MoneyDTO;
  readonly reserveDelta: MoneyDTO;
  readonly required: boolean;
  readonly evidenceState: "confirmed" | "estimated" | "unknown" | "hypothetical";
  readonly scope: ScopeDTO;
  readonly dependsOn: readonly string[];
  readonly goalId: string | null;
  readonly description: string;
  readonly runningCash: MoneyDTO;
  readonly remainingReserved: MoneyDTO;
  readonly safetyBuffer: MoneyDTO;
}

export interface ProjectionDTO {
  readonly identity: {
    readonly baselineId: string;
    readonly scenarioId: string | null;
    readonly parentScenarioId: string | null;
    readonly contextId: string;
    readonly contextVersion: string;
    readonly inputIdentity: string;
  };
  readonly versions: {
    readonly rules: string;
    readonly calendar: string;
    readonly application: string;
  };
  readonly horizon: {
    readonly classificationAllocationEvents: number;
    readonly detailedPeriods: number;
    readonly maxGoalProjectionAllocationEvents: number;
    readonly projectedAllocationEvents: number;
    readonly projectedThrough: string;
  };
  readonly periods: readonly ProjectionPeriodDTO[];
  readonly goalCompletions: readonly GoalCompletionDTO[];
  readonly goalBalancesAtClassificationHorizon: readonly Readonly<{
    goalId: string;
    balance: MoneyDTO;
  }>[];
  readonly assumptions: AssumptionManifestDTO;
  readonly confidence: "high" | "medium" | "low" | "insufficient_information";
  readonly hardConsequences: {
    readonly requiredPaymentsCovered: boolean;
    readonly cashBecameNegative: boolean;
    readonly creditRequired: boolean;
    readonly creditUsed: MoneyDTO;
  };
  readonly minimumClearedCash: MoneyDTO;
  readonly minimumSafetyBuffer: MoneyDTO;
  readonly minimumBalanceEventId: string | null;
  readonly minimumBalanceDate: string | null;
  readonly trace: readonly LedgerTraceEventDTO[];
}

export interface GoalImpactDTO {
  readonly goalId: string;
  readonly baselineCompletion: GoalCompletionDTO;
  readonly scenarioCompletion: GoalCompletionDTO;
  readonly delayMonths: number | null;
}

export interface ClassificationDTO {
  readonly code:
    | "NOT_CURRENTLY_AFFORDABLE"
    | "FINANCIALLY_RISKY"
    | "AFFORDABLE_SIGNIFICANT_TRADE_OFF"
    | "AFFORDABLE_NOTICEABLE_TRADE_OFF"
    | "AFFORDABLE_MINIMAL_IMPACT";
  readonly safetySeverity: "minimal" | "noticeable" | "significant" | "risky";
  readonly futureSeverity: "minimal" | "noticeable" | "significant" | "risky";
  readonly requiredPaymentFailure: boolean;
  readonly negativeCash: boolean;
  readonly creditRequired: boolean;
  readonly minimumSafetyBuffer: MoneyDTO;
  readonly desiredSafetyBuffer: MoneyDTO;
  readonly minimumBufferRatio: RatioDTO;
  readonly recoveryCycles: number | null;
  readonly goalShortfall: MoneyDTO;
  readonly goalBudgetEquivalent: RatioDTO;
  readonly maximumGoalDelayMonths: number | null;
  readonly reasonCodes: readonly string[];
}

export interface ScenarioComparisonDTO {
  readonly baselineId: string;
  readonly scenarioId: string;
  readonly goalImpacts: readonly GoalImpactDTO[];
  readonly goalShortfallAtClassificationHorizon: MoneyDTO;
  readonly classification: ClassificationDTO;
}

export interface OneOffPurchaseRequestDTO {
  readonly requestId: string;
  readonly expectedContextVersionId: string;
  readonly change: {
    readonly type: "one_off_purchase";
    readonly amount: MoneyInputDTO;
    readonly purpose: string;
    readonly paymentPeriod: string;
    readonly paymentTiming: "assumed_conservative";
    readonly paymentDate: string | null;
    readonly datePrecision: "exact" | "month";
    readonly fundingSource: "current_account";
    readonly paymentPattern: "single";
    readonly costTreatment: "additional_to_routine_spending";
  };
  readonly assumptionConfirmations: readonly string[];
}

export interface BaselineRequestDTO {
  readonly requestId: string;
  readonly expectedContextVersionId: string;
}

export interface AmountAlternativesRequestDTO {
  readonly requestId: string;
  readonly source: OneOffPurchaseRequestDTO;
}

export interface TimingAlternativeRequestDTO {
  readonly requestId: string;
  readonly source: OneOffPurchaseRequestDTO;
  readonly targetPaymentPeriod: string;
}

export interface ScenarioOptionsRequestDTO {
  readonly requestId: string;
  readonly source: OneOffPurchaseRequestDTO;
  readonly timingAlternativePeriod: string;
}

export interface CalendarCoverageDTO {
  readonly jurisdiction: "ENGLAND_AND_WALES";
  readonly start: string;
  readonly end: string;
  readonly source: "COMMITTED_FIXTURE";
}

export interface CalendarUsageDTO {
  readonly version: string;
  readonly coverage: CalendarCoverageDTO;
  readonly committedFixtureUsed: boolean;
  readonly fallbackUsed: boolean;
  readonly firstFallbackPeriod: string | null;
}

export interface CalculationMetadataDTO {
  readonly runId: string;
  readonly rulesVersion: string;
  readonly calendarVersion: string;
  readonly contextVersion: string;
  readonly baselineId: string;
  readonly scenarioId: string | null;
  readonly parentScenarioId: string | null;
  readonly projectionHorizon: {
    readonly detailedPeriods: number;
    readonly classificationAllocationEvents: number;
    readonly maximumGoalAllocationEvents: number;
  };
  readonly calendar: CalendarUsageDTO;
}

export interface ScenarioPresentationDTO {
  readonly scenarioLabel: string;
  readonly classificationLabel: string;
  readonly summary: string;
  readonly headlineKey: string;
  readonly immediateImpact: {
    readonly cashBefore: string;
    readonly cashAfter: string;
    readonly safetyBufferBefore: string;
    readonly safetyBufferAfter: string;
    readonly requiredPayments: string;
    readonly borrowing: string;
    readonly recovery: string;
  };
  readonly goalImpacts: readonly Readonly<{
    goalId: string;
    label: string;
    baselineCompletion: string;
    scenarioCompletion: string;
    delay: string;
  }>[];
  readonly monthlyPath: readonly Readonly<{
    period: string;
    closingCash: string;
    closingSafetyBuffer: string;
    bufferRestoration: string;
    goalContribution: string;
  }>[];
  readonly assumptionGroups: readonly Readonly<{
    key: keyof AssumptionManifestDTO;
    label: string;
    items: readonly string[];
  }>[];
  readonly confidence: string;
  readonly availableActions: readonly string[];
}

export interface ScenarioSummaryDTO {
  readonly id: string;
  readonly label: string;
  readonly status: "evaluated";
  readonly baselineId: string;
  readonly parentScenarioId: string | null;
  readonly derivedFromScenarioId: string | null;
  readonly contextVersion: string;
  readonly isCurrent: false;
  readonly isHypothetical: true;
  readonly selectionAffectsFinancialState: false;
  readonly change: OneOffPurchaseRequestDTO["change"];
}

export interface ExcludedOpportunityDTO {
  readonly id: string;
  readonly label: string;
  readonly includedInCalculation: false;
  readonly status: "not_modelled";
  readonly reason: string;
}

export interface OneOffPurchaseResponseDTO {
  readonly apiVersion: typeof API_VERSION;
  readonly schemaVersion: typeof SCENARIO_RESPONSE_SCHEMA;
  readonly kind: "one_off_purchase_simulation";
  readonly requestId: string;
  readonly correlationId: string;
  readonly calculation: CalculationMetadataDTO;
  readonly context: { readonly id: string; readonly version: string };
  readonly scenario: ScenarioSummaryDTO;
  readonly baseline: ProjectionDTO;
  readonly result: {
    readonly projection: ProjectionDTO;
    readonly comparison: ScenarioComparisonDTO;
  };
  readonly presentation: ScenarioPresentationDTO;
  readonly excludedOpportunities: readonly ExcludedOpportunityDTO[];
  readonly reproducibility: {
    readonly inputIdentity: string;
    readonly outputIdentity: string;
  };
}

export interface BaselineResponseDTO {
  readonly apiVersion: typeof API_VERSION;
  readonly schemaVersion: typeof BASELINE_RESPONSE_SCHEMA;
  readonly kind: "baseline_projection";
  readonly requestId: string;
  readonly correlationId: string;
  readonly calculation: CalculationMetadataDTO;
  readonly context: { readonly id: string; readonly version: string };
  readonly baseline: ProjectionDTO;
}

export interface AmountAlternativesResponseDTO {
  readonly apiVersion: typeof API_VERSION;
  readonly schemaVersion: typeof AMOUNT_ALTERNATIVES_RESPONSE_SCHEMA;
  readonly kind: "amount_alternatives";
  readonly requestId: string;
  readonly correlationId: string;
  readonly sourceScenarioId: string;
  readonly baselineId: string;
  readonly contextVersion: string;
  readonly options: readonly OneOffPurchaseResponseDTO[];
}

export interface TimingAlternativeResponseDTO {
  readonly apiVersion: typeof API_VERSION;
  readonly schemaVersion: typeof TIMING_ALTERNATIVE_RESPONSE_SCHEMA;
  readonly kind: "timing_alternative";
  readonly requestId: string;
  readonly correlationId: string;
  readonly sourceScenarioId: string;
  readonly baselineId: string;
  readonly contextVersion: string;
  readonly option: OneOffPurchaseResponseDTO;
}

export interface ScenarioOptionDTO {
  readonly id: string;
  readonly label: string;
  readonly status: "current" | "evaluated";
  readonly baselineId: string;
  readonly parentScenarioId: string | null;
  readonly derivedFromScenarioId: string | null;
  readonly contextVersion: string;
  readonly isCurrent: boolean;
  readonly isHypothetical: boolean;
  readonly initiallySelected: boolean;
  readonly selectionAffectsFinancialState: false;
  readonly runId: string;
  readonly rulesVersion: string;
  readonly calendarVersion: string;
  readonly presentation: ScenarioPresentationDTO;
  readonly simulation: OneOffPurchaseResponseDTO | null;
}

export interface ScenarioOptionsResponseDTO {
  readonly apiVersion: typeof API_VERSION;
  readonly schemaVersion: typeof SCENARIO_OPTIONS_RESPONSE_SCHEMA;
  readonly kind: "scenario_options";
  readonly requestId: string;
  readonly correlationId: string;
  readonly baselineId: string;
  readonly contextVersion: string;
  readonly selectedScenarioId: string;
  readonly selectionAffectsFinancialState: false;
  readonly options: readonly ScenarioOptionDTO[];
}

export interface ScenarioComparisonResponseDTO {
  readonly apiVersion: typeof API_VERSION;
  readonly schemaVersion: typeof COMPARISON_RESPONSE_SCHEMA;
  readonly kind: "scenario_comparison";
  readonly requestId: string;
  readonly correlationId: string;
  readonly calculation: CalculationMetadataDTO;
  readonly scenario: ScenarioSummaryDTO;
  readonly comparison: ScenarioComparisonDTO;
  readonly presentation: ScenarioPresentationDTO;
}

export interface CurrentFinancialContextResponseDTO {
  readonly apiVersion: typeof API_VERSION;
  readonly schemaVersion: typeof CONTEXT_RESPONSE_SCHEMA;
  readonly kind: "current_financial_context";
  readonly correlationId: string;
  readonly context: {
    readonly id: string;
    readonly version: string;
    readonly schemaVersion: string;
    readonly snapshotDate: string;
    readonly projectionStartPeriod: string;
    readonly jurisdiction: "england_and_wales";
    readonly currentAccount: {
      readonly clearedBalance: MoneyDTO;
      readonly reservedSpending: MoneyDTO;
      readonly overdraftLimit: MoneyDTO;
      readonly overdraftIncludedAsCash: false;
    };
    readonly desiredSafetyBuffer: MoneyDTO;
    readonly monthlyNetIncome: MoneyDTO;
    readonly goals: readonly Readonly<{
      id: string;
      label: string;
      openingBalance: MoneyDTO;
      targetBalance: MoneyDTO;
    }>[];
  };
  readonly simulatorVersions: {
    readonly rules: string;
    readonly calendar: string;
    readonly application: string;
  };
  readonly calendar: {
    readonly version: string;
    readonly coverage: CalendarCoverageDTO;
  };
}

export type ApiErrorCode =
  | "AUTHENTICATION_REQUIRED"
  | "AUTHENTICATION_INVALID"
  | "INVALID_JSON"
  | "INVALID_REQUEST"
  | "INVALID_MONEY"
  | "UNSUPPORTED_CURRENCY"
  | "UNSUPPORTED_SCENARIO_TYPE"
  | "FINANCIAL_CONTEXT_NOT_FOUND"
  | "FINANCIAL_CONTEXT_REQUIRED"
  | "ONBOARDING_INPUT_INVALID"
  | "ONBOARDING_INFORMATION_INSUFFICIENT"
  | "ONBOARDING_PREVIEW_STALE"
  | "ONBOARDING_PREVIEW_MISMATCH"
  | "CONTEXT_VERSION_CONFLICT"
  | "GOAL_POLICY_INVALID"
  | "PAYDAY_RULE_UNSUPPORTED"
  | "MONEY_INPUT_INVALID"
  | "CURRENT_CYCLE_RESERVE_INVALID"
  | "CONTEXT_VERSION_NOT_FOUND"
  | "CONTEXT_VERSION_MISMATCH"
  | "MATERIAL_INFORMATION_MISSING"
  | "HORIZON_EXHAUSTED"
  | "CALENDAR_FALLBACK_WARNING"
  | "SIMULATION_REJECTED"
  | "RUN_NOT_FOUND"
  | "IDEMPOTENCY_KEY_REUSED"
  | "CONVERSATION_NOT_FOUND"
  | "CONVERSATION_CONTEXT_STALE"
  | "TURN_IDEMPOTENCY_KEY_REUSED"
  | "TURN_PROCESSING"
  | "CONVERSATION_INPUT_INVALID"
  | "SCENARIO_REFERENCE_REQUIRED"
  | "SCENARIO_REFERENCE_NOT_FOUND"
  | "AI_TEMPORARILY_UNAVAILABLE"
  | "AI_INTERPRETATION_INVALID"
  | "RATE_LIMITED"
  | "PERSISTENCE_FAILURE"
  | "PERSISTED_DATA_INVALID"
  | "PERSISTED_SCHEMA_UNSUPPORTED"
  | "INTERNAL_SIMULATOR_FAILURE";

export interface ApiErrorResponseDTO {
  readonly apiVersion: typeof API_VERSION;
  readonly schemaVersion: typeof ERROR_RESPONSE_SCHEMA;
  readonly error: {
    readonly code: ApiErrorCode;
    readonly message: string;
    readonly field?: string;
    readonly details: {
      readonly issues: readonly Readonly<{ path: string; message: string }>[];
      readonly missingFields: readonly string[];
    };
    readonly retryable: boolean;
    readonly correlationId: string;
  };
}
