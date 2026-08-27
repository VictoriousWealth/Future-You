import "server-only";
import type { ConversationModelProvider } from "../../application/conversation/contracts";
import type { DemoConversationModelProvider } from "../../application/conversation/demo-contracts";
import { ConversationProviderError } from "../../application/conversation/provider-error";
import {
  FakeConversationModelProvider,
  type FakeProviderMode
} from "./fake-conversation-model-provider";
import { OpenAIResponsesConversationModelProvider } from "./openai/openai-responses-conversation-provider";
import { requireEnabledOpenAIRuntimeConfiguration } from "./openai/openai-runtime-configuration";

const FAKE_MODES = new Set<FakeProviderMode>([
  "normal", "timeout", "rate_limit", "provider_failure", "invalid_schema",
  "unknown_tool", "multiple_tool_calls", "explanation_failure"
]);

export interface ResolvedConversationProvider {
  readonly provider: ConversationModelProvider & DemoConversationModelProvider;
  readonly providerIdentifier: string;
  readonly modelIdentifier: string;
}

export type AskConversationMode = "strict" | "trusted_demo";

/** Server-only feature switch. The browser cannot opt itself into demo orchestration. */
export function resolveAskConversationMode(
  environment: Readonly<Record<string, string | undefined>> = process.env
): AskConversationMode {
  const configured = environment["FUTURE_YOU_ASK_MODE"]?.trim().toLowerCase();
  if (!configured || configured === "strict") return "strict";
  if (configured === "trusted_demo") return "trusted_demo";
  throw new Error("FUTURE_YOU_ASK_MODE must be strict or trusted_demo.");
}

export function resolveConversationProvider(): ResolvedConversationProvider {
  const configured = process.env.CONVERSATION_PROVIDER?.trim().toLowerCase();
  const appEnvironment = process.env.APP_ENV?.trim().toLowerCase();
  const useFake = configured === "fake" || (!configured && (appEnvironment === "local" || appEnvironment === "test"));
  if (useFake) {
    const requestedMode = (process.env.CONVERSATION_FAKE_MODE?.trim() || "normal") as FakeProviderMode;
    const mode = FAKE_MODES.has(requestedMode) ? requestedMode : "normal";
    return {
      provider: new FakeConversationModelProvider(mode),
      providerIdentifier: "fake",
      modelIdentifier: "fake-conversation/2.0.0"
    };
  }
  if (configured === "openai") {
    const configuration = requireEnabledOpenAIRuntimeConfiguration();
    return {
      provider: new OpenAIResponsesConversationModelProvider(configuration.apiKey, configuration.model, {
        timeoutMs: configuration.timeoutMs,
        maxRetries: configuration.maxRetries,
        reasoningEffort: configuration.reasoningEffort
      }),
      providerIdentifier: "openai",
      modelIdentifier: configuration.model
    };
  }
  throw new Error("Set CONVERSATION_PROVIDER to openai, or explicitly use fake in local/test mode.");
}

const windows = new Map<string, { startedAt: number; count: number }>();

export function userScopedProviderAllowance(userId: string, now = Date.now()): void {
  const windowMs = 60_000;
  const configuredMaximum = Number(process.env.CONVERSATION_PROVIDER_RATE_LIMIT_MAX ?? "20");
  const maximumCalls = Number.isSafeInteger(configuredMaximum) && configuredMaximum > 0 && configuredMaximum <= 200
    ? configuredMaximum
    : 20;
  const existing = windows.get(userId);
  if (!existing || now - existing.startedAt >= windowMs) {
    windows.set(userId, { startedAt: now, count: 1 });
    return;
  }
  if (existing.count >= maximumCalls) {
    throw new ConversationProviderError("RATE_LIMIT", true, "The user-scoped provider limit was reached.");
  }
  existing.count += 1;
}
