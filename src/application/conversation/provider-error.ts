export type ConversationProviderFailureCategory =
  | "TIMEOUT"
  | "RATE_LIMIT"
  | "UNAVAILABLE"
  | "INVALID_OUTPUT"
  | "UNKNOWN_TOOL"
  | "MULTIPLE_TOOL_CALLS";

export class ConversationProviderError extends Error {
  constructor(
    readonly category: ConversationProviderFailureCategory,
    readonly retryable: boolean,
    message: string,
    readonly attempts = 1
  ) {
    super(message);
    this.name = "ConversationProviderError";
  }
}
