import nextEnvironment from "@next/env";
import OpenAI from "openai";
import {
  readOpenAIRuntimeConfiguration,
  requireEnabledOpenAIRuntimeConfiguration
} from "../src/infrastructure/ai/openai/openai-runtime-configuration";

nextEnvironment.loadEnvConfig(process.cwd());

const configuration = readOpenAIRuntimeConfiguration();
function configurationIsUsable(): boolean {
  try {
    requireEnabledOpenAIRuntimeConfiguration();
    return true;
  } catch {
    return false;
  }
}
const configurationUsable = configurationIsUsable();
let providerReachable = false;
let modelAccessible = false;

if (configurationUsable && configuration.apiKey && configuration.model) {
  const client = new OpenAI({
    apiKey: configuration.apiKey,
    timeout: configuration.timeoutMs,
    maxRetries: 0
  });
  try {
    await client.responses.create({
      model: configuration.model,
      instructions: "Return the readiness result through the required function exactly once.",
      input: "Future You provider readiness probe.",
      tools: [{
        type: "function",
        name: "submit_readiness_result",
        description: "Return a non-financial provider readiness result.",
        strict: true,
        parameters: {
          type: "object",
          additionalProperties: false,
          properties: { ready: { type: "boolean" } },
          required: ["ready"]
        }
      }],
      tool_choice: { type: "function", name: "submit_readiness_result" },
      parallel_tool_calls: false,
      store: false,
      max_output_tokens: 64,
      ...(configuration.reasoningEffort
        ? { reasoning: { effort: configuration.reasoningEffort } }
        : {})
    });
    providerReachable = true;
    modelAccessible = true;
  } catch (error) {
    providerReachable = typeof error === "object" && error !== null && "status" in error;
    modelAccessible = false;
  }
}

process.stdout.write([
  `Key configured: ${configuration.apiKey ? "yes" : "no"}`,
  `Provider enabled: ${configuration.providerEnabled ? "yes" : "no"}`,
  `Selected model: ${configuration.model ?? "not configured"}`,
  `Provider reachable: ${providerReachable ? "yes" : "no"}`,
  `Model accessible: ${modelAccessible ? "yes" : "no"}`
].join("\n") + "\n");

if (!configuration.apiKey || !configuration.providerEnabled || !configuration.model || !modelAccessible) {
  process.exitCode = 2;
}
