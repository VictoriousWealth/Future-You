import type {
  ConversationInterpretation,
  ConversationIntentKind,
  InterpretationProviderRequest,
  ProviderResult
} from "./contracts";

export const DEMO_CONVERSATION_ORCHESTRATION_VERSION =
  "fy-conversation-orchestration/trusted-demo-1.0.0" as const;
export const DEMO_INTERPRETATION_PROMPT_VERSION =
  "fy-demo-conversation-interpretation/1.0.0" as const;
export const DEMO_INTERPRETATION_SCHEMA_VERSION =
  "fy-demo-conversation-intent/1.0.0" as const;
export const DEMO_RESPONSE_PROMPT_VERSION =
  "fy-demo-trusted-response/1.0.0" as const;
export const DEMO_RESPONSE_SCHEMA_VERSION =
  "fy-demo-trusted-response-plan/1.0.0" as const;

export const DEMO_RETRIEVAL_INTENT_IDS = [
  "RETRIEVE_GOALS",
  "RETRIEVE_WORK_BENEFITS"
] as const;

export type DemoRetrievalIntentKind = typeof DEMO_RETRIEVAL_INTENT_IDS[number];
export type RecordedConversationIntentKind = ConversationIntentKind | DemoRetrievalIntentKind;

export type DemoConversationInterpretation =
  | ConversationInterpretation
  | Readonly<{ kind: "RETRIEVE_GOALS" }>
  | Readonly<{ kind: "RETRIEVE_WORK_BENEFITS" }>;

export type DemoAnswerKind =
  | "PURCHASE_RESULT"
  | "RESULT_EXPLANATION"
  | "GOALS"
  | "WORK_BENEFITS";

/** A presentation-ready fact with no database, authentication or ownership identity. */
export interface DemoTrustedFact {
  readonly key: string;
  readonly text: string;
}

export interface DemoResponseProviderRequest {
  readonly answerKind: DemoAnswerKind;
  readonly facts: readonly DemoTrustedFact[];
}

export interface DemoResponsePlan {
  /** Natural connective prose plus {{SERVER_FACT_KEY}} placeholders. */
  readonly template: string;
}

export interface DemoConversationModelProvider {
  interpretDemo(
    request: InterpretationProviderRequest
  ): Promise<ProviderResult<DemoConversationInterpretation>>;

  writeDemoResponse(
    request: DemoResponseProviderRequest
  ): Promise<ProviderResult<DemoResponsePlan>>;
}

export interface DemoConversationTrustedDataSource {
  goals(contextVersionId: string): Promise<readonly DemoTrustedFact[]>;
  workBenefits(contextVersionId: string): Promise<readonly DemoTrustedFact[]>;
}

