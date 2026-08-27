import type {
  BaselineResponseDTO,
  OneOffPurchaseResponseDTO,
  ScenarioPresentationDTO
} from "../dto/contracts";
import type {
  AmbiguityId,
  ExplanationTargetId,
  InterpretationIntentId,
  ScenarioFollowUpId,
  ScenarioReferenceStrategyId,
  ScenarioSelectionTargetId,
  UnsupportedCategoryId
} from "./interpretation-policy";
import type { CompleteTimingInterpretation } from "./timing-policy";

export const CONVERSATION_ORCHESTRATION_VERSION = "fy-conversation-orchestration/1.0.0" as const;
export const INTERPRETATION_PROMPT_VERSION_V1 = "fy-conversation-interpretation/1.0.0" as const;
export const INTERPRETATION_SCHEMA_VERSION_V1 = "fy-conversation-intent/1.0.0" as const;
export const INTERPRETATION_PROMPT_VERSION_V2 = "fy-conversation-interpretation/2.0.0" as const;
export const INTERPRETATION_SCHEMA_VERSION_V2 = "fy-conversation-intent/2.0.0" as const;
export const INTERPRETATION_PROMPT_VERSION_V3 = "fy-conversation-interpretation/3.0.0" as const;
export const INTERPRETATION_SCHEMA_VERSION_V3 = "fy-conversation-intent/3.0.0" as const;
export const INTERPRETATION_PROMPT_VERSION = "fy-conversation-interpretation/4.0.0" as const;
export const INTERPRETATION_SCHEMA_VERSION = "fy-conversation-intent/4.0.0" as const;
export const CLARIFICATION_RESOLUTION_PROMPT_VERSION_V1 = "fy-clarification-resolution-prompt/1.0.0" as const;
export const CLARIFICATION_RESOLUTION_SCHEMA_VERSION_V1 = "fy-clarification-resolution-schema/1.0.0" as const;
export const CLARIFICATION_RESOLUTION_PROMPT_VERSION = "fy-clarification-resolution-prompt/2.0.0" as const;
export const CLARIFICATION_RESOLUTION_SCHEMA_VERSION = "fy-clarification-resolution-schema/2.0.0" as const;
export const EXPLANATION_PROMPT_VERSION = "fy-conversation-explanation/1.0.0" as const;
export const EXPLANATION_SCHEMA_VERSION = "fy-explanation-plan/1.0.0" as const;
export const CONVERSATION_RESPONSE_SCHEMA = "conversation/1.0.0" as const;
export const CONVERSATION_LIST_RESPONSE_SCHEMA = "conversation-list/1.0.0" as const;
export const CONVERSATION_TURN_RESPONSE_SCHEMA = "conversation-turn/1.0.0" as const;
export const CONVERSATION_TIMEZONE = "Europe/London" as const;

export type ConversationIntentKind = InterpretationIntentId;

export interface AmountInterpretation {
  readonly quote: string;
  readonly currency: "GBP" | "UNSUPPORTED";
}

export interface TimingInterpretation {
  readonly quote: string | null;
  readonly kind:
    | "NEXT_MONTH"
    | "MONTHS_AFTER_SELECTED"
    | "NAMED_MONTH"
    | "EXPLICIT_YEAR_MONTH"
    | "MISSING"
    | "AMBIGUOUS";
  readonly monthNumber: number | null;
  readonly year: number | null;
  readonly offsetMonths: number | null;
}

export type ExplanationTarget =
  | "OVERALL_CLASSIFICATION"
  | "SAFETY_BUFFER"
  | "BUFFER_RECOVERY"
  | "GOAL_DELAY"
  | "BILLS"
  | "BORROWING"
  | "ASSUMPTIONS"
  | "TIMING_EFFECT"
  | "OTHER_SUPPORTED_EXPLANATION";

export type { CompleteTimingInterpretation } from "./timing-policy";

export type ConversationInterpretation =
  | Readonly<{
      kind: "CREATE_ONE_OFF_PURCHASE";
      amount: AmountInterpretation;
      timing: CompleteTimingInterpretation;
      purposeQuote: string | null;
    }>
  | Readonly<{
      kind: "CHANGE_PURCHASE_AMOUNT";
      amount: AmountInterpretation;
      scenarioReferenceStrategy: ScenarioReferenceStrategyId;
      scenarioReferenceQuote: string | null;
    }>
  | Readonly<{
      kind: "CHANGE_PURCHASE_MONTH";
      timing: CompleteTimingInterpretation;
      scenarioReferenceStrategy: ScenarioReferenceStrategyId;
      scenarioReferenceQuote: string | null;
    }>
  | Readonly<{
      kind: "EXPLAIN_SELECTED_RESULT";
      explanationTarget: ExplanationTargetId;
      goalReferenceQuote: string | null;
      scenarioReferenceStrategy: ScenarioReferenceStrategyId;
      scenarioReferenceQuote: string | null;
    }>
  | Readonly<{
      kind: "SELECT_EXISTING_SCENARIO";
      selectionTarget: ScenarioSelectionTargetId;
      scenarioLabelQuote: string | null;
    }>
  | Readonly<{
      kind: "CLARIFY_PURCHASE_AMOUNT";
      purposeQuote: string | null;
      timing: CompleteTimingInterpretation | null;
    }>
  | Readonly<{
      kind: "CLARIFY_PURCHASE_MONTH";
      amount: AmountInterpretation;
      purposeQuote: string | null;
    }>
  | Readonly<{
      kind: "CLARIFY_SCENARIO_REFERENCE";
      attemptedOperation:
        | Readonly<{ kind: "CHANGE_PURCHASE_AMOUNT"; amount: AmountInterpretation }>
        | Readonly<{ kind: "CHANGE_PURCHASE_MONTH"; timing: CompleteTimingInterpretation }>
        | Readonly<{ kind: "EXPLAIN_SELECTED_RESULT"; explanationTarget: ExplanationTargetId; goalReferenceQuote: string | null }>
        | Readonly<{ kind: "SELECT_EXISTING_SCENARIO" }>;
    }>
  | Readonly<{ kind: "HELP" }>
  | Readonly<{ kind: "GREETING" }>
  | Readonly<{
      kind: "UNSUPPORTED";
      category: UnsupportedCategoryId;
    }>
  | Readonly<{
      kind: "AMBIGUOUS";
      ambiguity: AmbiguityId;
    }>;

/** Frozen shape retained only for C0 evidence and historical contract comparison. */
export type ConversationInterpretationV1 =
  | Readonly<{
      kind: "CREATE_ONE_OFF_PURCHASE";
      amount: { quote: string | null; currency: "GBP" | "UNSUPPORTED" | null };
      timing: TimingInterpretation;
      purposeQuote: string | null;
      missingFields: readonly string[];
      unsupportedFeatures: readonly string[];
    }>
  | Readonly<{
      kind: "CHANGE_PURCHASE_AMOUNT";
      amount: { quote: string | null; currency: "GBP" | "UNSUPPORTED" | null };
      referencedScenarioLabel: string | null;
      missingFields: readonly string[];
      unsupportedFeatures: readonly string[];
    }>
  | Readonly<{
      kind: "CHANGE_PURCHASE_MONTH";
      timing: TimingInterpretation;
      referencedScenarioLabel: string | null;
      missingFields: readonly string[];
      unsupportedFeatures: readonly string[];
    }>
  | Readonly<{
      kind: "EXPLAIN_SELECTED_RESULT";
      explanationTarget: "OVERALL_CLASSIFICATION" | "SAFETY_BUFFER" | "BUFFER_RECOVERY" | "GOAL_DELAY" | "BILLS" | "BORROWING" | "ASSUMPTIONS" | "OTHER";
      goalReferenceQuote: string | null;
    }>
  | Readonly<{ kind: "SELECT_EXISTING_SCENARIO"; scenarioReferenceQuote: string | null }>
  | Readonly<{ kind: "HELP" | "GREETING" }>
  | Readonly<{ kind: "UNSUPPORTED"; category: string; userGoalSummary: string | null }>
  | Readonly<{ kind: "AMBIGUOUS"; ambiguity: string; clarificationKey: string }>;

export type ClarificationResolution =
  | Readonly<{ kind: "RESOLVE_PURCHASE_AMOUNT"; amount: AmountInterpretation }>
  | Readonly<{ kind: "RESOLVE_PURCHASE_MONTH"; timing: CompleteTimingInterpretation }>
  | Readonly<{
      kind: "RESOLVE_SCENARIO_REFERENCE";
      selectionTarget: ScenarioSelectionTargetId;
      scenarioLabelQuote: string | null;
    }>
  | Readonly<{ kind: "UNSUPPORTED"; category: UnsupportedCategoryId }>
  | Readonly<{ kind: "AMBIGUOUS"; ambiguity: AmbiguityId }>;

export type TrustedFactKey =
  | "OVERALL_CLASSIFICATION"
  | "BUFFER_REDUCTION"
  | "BILLS_COVERED"
  | "NO_BORROWING"
  | "BUFFER_RECOVERY"
  | "GOAL_DELAY"
  | "TIMING_NO_IMPROVEMENT"
  | "ASSUMPTIONS"
  | "CURRENT_PATH";

export type ExplanationTemplateId =
  | "PURCHASE_RESULT_SIGNIFICANT"
  | "PURCHASE_RESULT_NOTICEABLE"
  | "PURCHASE_RESULT_MINIMAL"
  | "PURCHASE_RESULT_RISKY"
  | "BUFFER_EXPLANATION"
  | "GOAL_DELAY_EXPLANATION"
  | "TIMING_NO_IMPROVEMENT"
  | "CURRENT_PATH_SUMMARY";

export interface ExplanationPlan {
  readonly templateId: ExplanationTemplateId;
  readonly primaryFactKey: TrustedFactKey;
  readonly orderedFactKeys: readonly TrustedFactKey[];
  readonly caveatKeys: readonly ("ASSUMED_TIMING" | "HYPOTHETICAL_ONLY" | "CALENDAR_FALLBACK")[];
  readonly followUpActionKeys: readonly ("TRY_LOWER_AMOUNT" | "TRY_ANOTHER_MONTH" | "VIEW_ASSUMPTIONS" | "VIEW_CURRENT_PATH")[];
  readonly tone: "CLEAR" | "SUPPORTIVE" | "DIRECT";
}

export type PendingClarification =
  | Readonly<{
      type: "PURCHASE_AMOUNT";
      originalMessageId: string;
      partialPurpose: string | null;
      partialTiming: TimingInterpretation;
      attemptedOperation?: "CREATE_ONE_OFF_PURCHASE" | "CHANGE_PURCHASE_AMOUNT" | undefined;
    }>
  | Readonly<{
      type: "PURCHASE_MONTH";
      originalMessageId: string;
      amountQuote: string;
      partialPurpose: string | null;
      attemptedOperation?: "CREATE_ONE_OFF_PURCHASE" | "CHANGE_PURCHASE_MONTH" | undefined;
    }>
  | Readonly<{
      type: "SCENARIO_REFERENCE";
      originalMessageId: string;
      availableRunIds: readonly string[];
      attemptedOperation?: ScenarioFollowUpId | undefined;
      amount?: AmountInterpretation | undefined;
      amountMinorUnits?: string | undefined;
      timing?: CompleteTimingInterpretation | undefined;
      explanationTarget?: ExplanationTargetId | undefined;
      goalReferenceQuote?: string | null | undefined;
    }>;

export type ConversationMessageKind =
  | "USER_TEXT"
  | "ASSISTANT_CLARIFICATION"
  | "ASSISTANT_RESULT"
  | "ASSISTANT_EXPLANATION"
  | "ASSISTANT_SCOPE"
  | "ASSISTANT_ERROR";

export interface ConversationMessageDTO {
  readonly id: string;
  readonly sequence: string;
  readonly kind: ConversationMessageKind;
  readonly text: string;
  readonly templateId: string | null;
  readonly explanationFallbackUsed: boolean;
  readonly runId: string | null;
  readonly result: OneOffPurchaseResponseDTO | null;
  readonly createdAt: string;
}

export interface ConversationScenarioDTO {
  readonly runId: string;
  readonly scenarioId: string;
  readonly label: string;
  readonly paymentPeriod: string;
  readonly amount: string;
  readonly presentation: ScenarioPresentationDTO;
}

export interface ConversationSummaryDTO {
  readonly id: string;
  readonly title: string;
  readonly contextVersionId: string;
  readonly contextIsCurrent: boolean;
  readonly selectedRunId: string | null;
  readonly hasPendingClarification: boolean;
  readonly createdAt: string;
  readonly latestActivityAt: string;
}

export interface ConversationDetailDTO {
  readonly apiVersion: "future-you.api/v1";
  readonly schemaVersion: typeof CONVERSATION_RESPONSE_SCHEMA;
  readonly kind: "conversation";
  readonly conversation: ConversationSummaryDTO;
  readonly currentPath: BaselineResponseDTO;
  readonly messages: readonly ConversationMessageDTO[];
  readonly scenarios: readonly ConversationScenarioDTO[];
  readonly selectedResult: OneOffPurchaseResponseDTO | null;
  readonly supportedScope: readonly string[];
}

export interface ConversationListResponseDTO {
  readonly apiVersion: "future-you.api/v1";
  readonly schemaVersion: typeof CONVERSATION_LIST_RESPONSE_SCHEMA;
  readonly kind: "conversation_list";
  readonly conversations: readonly ConversationSummaryDTO[];
}

export interface CreateConversationRequestDTO {
  readonly requestId: string;
}

export interface SendConversationMessageRequestDTO {
  readonly requestId: string;
  readonly message: string;
}

export interface SelectConversationScenarioRequestDTO {
  readonly requestId: string;
  readonly runId: string | null;
}

export interface ConversationTurnResponseDTO {
  readonly apiVersion: "future-you.api/v1";
  readonly schemaVersion: typeof CONVERSATION_TURN_RESPONSE_SCHEMA;
  readonly kind: "conversation_turn";
  readonly requestId: string;
  readonly turnId: string;
  readonly intent: ConversationIntentKind | null;
  readonly providerAttempts: number;
  readonly explanationFallbackUsed: boolean;
  readonly conversation: ConversationDetailDTO;
}

export interface ProviderInvocationMetadata {
  readonly provider: string;
  readonly model: string;
  readonly attempts: number;
  readonly latencyMs?: number;
  readonly inputTokens?: number;
  readonly outputTokens?: number;
  readonly totalTokens?: number;
}

export interface AvailableScenarioReference {
  readonly label: string;
  readonly scenarioType: "one_off_purchase";
  readonly selected: boolean;
}

export type SupportedFollowUpEvidence =
  | Readonly<{
      family: "AMOUNT_CHANGE";
      amount: AmountInterpretation;
      amountMinorUnits: string;
    }>
  | Readonly<{
      family: "MONTH_CHANGE";
      timing: CompleteTimingInterpretation;
    }>
  | Readonly<{
      family: "RESULT_EXPLANATION";
      explanationTarget: ExplanationTargetId;
      goalReferenceQuote: string | null;
    }>
  | Readonly<{
      family: "SCENARIO_SELECTION";
      selectionTarget: "CURRENT_PATH";
    }>
  | Readonly<{ family: "NONE" }>
  | Readonly<{ family: "MULTIPLE_OR_UNCERTAIN" }>;

export interface InterpretationProviderRequest {
  readonly userMessage: string;
  readonly pendingClarification: PendingClarification | null;
  readonly availableScenarios: readonly AvailableScenarioReference[];
  readonly selectedScenarioType: "one_off_purchase" | null;
  readonly trustedDate: string;
  readonly timezone: typeof CONVERSATION_TIMEZONE;
  /** Server-owned bounded evidence; optional only for replay of pre-v4 historical fixtures. */
  readonly supportedFollowUpEvidence?: SupportedFollowUpEvidence;
}

export interface ClarificationResolutionProviderRequest {
  readonly userMessage: string;
  readonly pendingClarification: PendingClarification;
  readonly availableScenarios: readonly AvailableScenarioReference[];
  readonly selectedScenarioType: "one_off_purchase" | null;
  readonly trustedDate: string;
  readonly timezone: typeof CONVERSATION_TIMEZONE;
}

export interface ExplanationProviderRequest {
  readonly explanationTarget: ExplanationTarget;
  readonly availableFactKeys: readonly TrustedFactKey[];
  readonly availableTemplateIds: readonly ExplanationTemplateId[];
  readonly availableFollowUpActionKeys: readonly string[];
}

export interface ProviderResult<T> {
  readonly value: T;
  readonly metadata: ProviderInvocationMetadata;
}

export interface ConversationModelProvider {
  interpret(request: InterpretationProviderRequest): Promise<ProviderResult<ConversationInterpretation>>;
  resolveClarification(request: ClarificationResolutionProviderRequest): Promise<ProviderResult<ClarificationResolution>>;
  planExplanation(request: ExplanationProviderRequest): Promise<ProviderResult<ExplanationPlan>>;
}
