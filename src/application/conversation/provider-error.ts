export type ConversationProviderFailureCategory =
  | "TIMEOUT"
  | "RATE_LIMIT"
  | "UNAVAILABLE"
  | "INVALID_OUTPUT"
  | "UNKNOWN_TOOL"
  | "MULTIPLE_TOOL_CALLS";

export interface ConversationProviderFailureTelemetry {
  readonly latencyMs: number;
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly totalTokens: number;
}

export class ConversationProviderError extends Error {
  constructor(
    readonly category: ConversationProviderFailureCategory,
    readonly retryable: boolean,
    message: string,
    readonly attempts = 1,
    readonly telemetry: ConversationProviderFailureTelemetry | null = null
  ) {
    super(message);
    this.name = "ConversationProviderError";
  }
}
