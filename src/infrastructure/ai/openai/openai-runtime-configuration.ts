import "server-only";

export const OPENAI_TRACK_C_CANDIDATE_MODELS = [
  "gpt-5.6-terra",
  "gpt-5.6-luna",
  "gpt-5.6-sol"
] as const;

export type OpenAITrackCCandidateModel = typeof OPENAI_TRACK_C_CANDIDATE_MODELS[number];
export type OpenAIReasoningEffort = "none" | "low" | "medium" | "high" | "xhigh" | "max";

export const OPENAI_BASELINE_TIMEOUT_MS = 12_000;
export const OPENAI_BASELINE_MAX_RETRIES = 1;
export const OPENAI_BASELINE_MAX_OUTPUT_TOKENS = 1_200;

export interface OpenAIRuntimeConfiguration {
  readonly providerEnabled: boolean;
  readonly apiKey: string | null;
  readonly model: string | null;
  /** Null preserves the pre-Track-C provider-default reasoning behaviour. */
  readonly reasoningEffort: OpenAIReasoningEffort | null;
  readonly reasoningLabel: OpenAIReasoningEffort | "provider_default";
  readonly timeoutMs: number;
  readonly maxRetries: number;
}

type EnvironmentRecord = Readonly<Record<string, string | undefined>>;

function serverRuntimeEnvironment(): EnvironmentRecord {
  // Dynamic access is intentional: Next.js documents that it prevents build-time
  // inlining, so server credentials remain runtime values rather than build inputs.
  const environment = process.env;
  return environment;
}

function integerWithin(value: string | undefined, fallback: number, minimum: number, maximum: number): number {
  if (!value?.trim()) return fallback;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= minimum && parsed <= maximum
    ? parsed
    : fallback;
}

function reasoningEffort(value: string | undefined): OpenAIReasoningEffort | null {
  const normalised = value?.trim().toLowerCase();
  if (!normalised || normalised === "provider_default") return null;
  if (["none", "low", "medium", "high", "xhigh", "max"].includes(normalised)) {
    return normalised as OpenAIReasoningEffort;
  }
  return null;
}

export function readOpenAIRuntimeConfiguration(
  suppliedEnvironment?: EnvironmentRecord
): OpenAIRuntimeConfiguration {
  const environment = suppliedEnvironment ?? serverRuntimeEnvironment();
  const effort = reasoningEffort(environment["OPENAI_REASONING_EFFORT"]);
  return {
    providerEnabled: environment["OPENAI_PROVIDER_ENABLED"]?.trim().toLowerCase() === "true",
    apiKey: environment["OPENAI_API_KEY"]?.trim() || null,
    model: environment["OPENAI_MODEL"]?.trim() || null,
    reasoningEffort: effort,
    reasoningLabel: effort ?? "provider_default",
    timeoutMs: integerWithin(environment["OPENAI_TIMEOUT_MS"], OPENAI_BASELINE_TIMEOUT_MS, 1_000, 60_000),
    maxRetries: integerWithin(environment["OPENAI_MAX_RETRIES"], OPENAI_BASELINE_MAX_RETRIES, 0, 2)
  };
}

export function requireEnabledOpenAIRuntimeConfiguration(
  suppliedEnvironment?: EnvironmentRecord
): OpenAIRuntimeConfiguration & { readonly apiKey: string; readonly model: string } {
  const environment = suppliedEnvironment ?? serverRuntimeEnvironment();
  const configuration = readOpenAIRuntimeConfiguration(environment);
  if (!configuration.providerEnabled) {
    throw new Error("OPENAI_PROVIDER_ENABLED must be true before the OpenAI provider may be used.");
  }
  if (!configuration.apiKey) {
    throw new Error("OPENAI_API_KEY is required when the OpenAI provider is enabled.");
  }
  if (!configuration.model) {
    throw new Error("OPENAI_MODEL is required when the OpenAI provider is enabled.");
  }
  const requestedReasoning = environment["OPENAI_REASONING_EFFORT"]?.trim().toLowerCase();
  if (
    requestedReasoning && requestedReasoning !== "provider_default" &&
    !["none", "low", "medium", "high", "xhigh", "max"].includes(requestedReasoning)
  ) {
    throw new Error("OPENAI_REASONING_EFFORT is outside the bounded supported set.");
  }
  for (const [name, minimum, maximum] of [
    ["OPENAI_TIMEOUT_MS", 1_000, 60_000],
    ["OPENAI_MAX_RETRIES", 0, 2]
  ] as const) {
    const raw = environment[name]?.trim();
    if (!raw) continue;
    const parsed = Number(raw);
    if (!Number.isSafeInteger(parsed) || parsed < minimum || parsed > maximum) {
      throw new Error(`${name} is outside the bounded supported range.`);
    }
  }
  return { ...configuration, apiKey: configuration.apiKey, model: configuration.model };
}
