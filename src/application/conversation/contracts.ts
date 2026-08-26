import type {
  BaselineResponseDTO,
  OneOffPurchaseResponseDTO,
  ScenarioPresentationDTO
} from "../dto/contracts";

export const CONVERSATION_ORCHESTRATION_VERSION = "fy-conversation-orchestration/1.0.0" as const;
export const INTERPRETATION_PROMPT_VERSION = "fy-conversation-interpretation/1.0.0" as const;
export const INTERPRETATION_SCHEMA_VERSION = "fy-conversation-intent/1.0.0" as const;
export const EXPLANATION_PROMPT_VERSION = "fy-conversation-explanation/1.0.0" as const;
export const EXPLANATION_SCHEMA_VERSION = "fy-explanation-plan/1.0.0" as const;
export const CONVERSATION_RESPONSE_SCHEMA = "conversation/1.0.0" as const;
export const CONVERSATION_LIST_RESPONSE_SCHEMA = "conversation-list/1.0.0" as const;
export const CONVERSATION_TURN_RESPONSE_SCHEMA = "conversation-turn/1.0.0" as const;
export const CONVERSATION_TIMEZONE = "Europe/London" as const;

export type ConversationIntentKind =
  | "CREATE_ONE_OFF_PURCHASE"
  | "CHANGE_PURCHASE_AMOUNT"
  | "CHANGE_PURCHASE_MONTH"
  | "EXPLAIN_SELECTED_RESULT"
  | "SELECT_EXISTING_SCENARIO"
  | "HELP"
  | "GREETING"
  | "UNSUPPORTED"
  | "AMBIGUOUS";

export interface AmountInterpretation {
  readonly quote: string | null;
  readonly currency: "GBP" | "UNSUPPORTED" | null;
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
  | "OTHER";

interface InterpretationCommon {
  readonly missingFields: readonly string[];
  readonly unsupportedFeatures: readonly string[];
}

export type ConversationInterpretation =
  | (InterpretationCommon & Readonly<{
      kind: "CREATE_ONE_OFF_PURCHASE";
      amount: AmountInterpretation;
      timing: TimingInterpretation;
      purposeQuote: string | null;
    }>)
  | (InterpretationCommon & Readonly<{
      kind: "CHANGE_PURCHASE_AMOUNT";
      amount: AmountInterpretation;
      referencedScenarioLabel: string | null;
    }>)
  | (InterpretationCommon & Readonly<{
      kind: "CHANGE_PURCHASE_MONTH";
      timing: TimingInterpretation;
      referencedScenarioLabel: string | null;
    }>)
  | Readonly<{
      kind: "EXPLAIN_SELECTED_RESULT";
      explanationTarget: ExplanationTarget;
      goalReferenceQuote: string | null;
    }>
  | Readonly<{
      kind: "SELECT_EXISTING_SCENARIO";
      scenarioReferenceQuote: string | null;
    }>
  | Readonly<{ kind: "HELP" | "GREETING" }>
  | Readonly<{
      kind: "UNSUPPORTED";
      category: string;
      userGoalSummary: string | null;
    }>
  | Readonly<{
      kind: "AMBIGUOUS";
      ambiguity: string;
      clarificationKey: string;
    }>;

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
    }>
  | Readonly<{
      type: "PURCHASE_MONTH";
      originalMessageId: string;
      amountQuote: string;
      partialPurpose: string | null;
    }>
  | Readonly<{
      type: "SCENARIO_REFERENCE";
      originalMessageId: string;
      availableRunIds: readonly string[];
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

export interface InterpretationProviderRequest {
  readonly userMessage: string;
  readonly pendingClarification: PendingClarification | null;
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
  planExplanation(request: ExplanationProviderRequest): Promise<ProviderResult<ExplanationPlan>>;
}
