export type ConversationApplicationErrorCode =
  | "FINANCIAL_CONTEXT_REQUIRED"
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
  | "SIMULATION_REJECTED"
  | "PERSISTENCE_FAILURE";

export class ConversationApplicationError extends Error {
  constructor(
    readonly code: ConversationApplicationErrorCode,
    message: string,
    readonly retryable = false
  ) {
    super(message);
    this.name = "ConversationApplicationError";
  }
}
