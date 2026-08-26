import { readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { resolveConversationProvider } from "../src/infrastructure/ai/provider-configuration";
import {
  OPENAI_BASELINE_MAX_RETRIES,
  OPENAI_BASELINE_TIMEOUT_MS,
  OPENAI_TRACK_C_CANDIDATE_MODELS,
  readOpenAIRuntimeConfiguration,
  requireEnabledOpenAIRuntimeConfiguration
} from "../src/infrastructure/ai/openai/openai-runtime-configuration";

describe("Track C0 OpenAI configuration and readiness boundary", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("keeps the three approved model IDs exact and configuration-driven", () => {
    expect(OPENAI_TRACK_C_CANDIDATE_MODELS).toEqual([
      "gpt-5.6-terra",
      "gpt-5.6-luna",
      "gpt-5.6-sol"
    ]);
    expect(readOpenAIRuntimeConfiguration({})).toMatchObject({
      providerEnabled: false,
      apiKey: null,
      model: null,
      reasoningEffort: null,
      reasoningLabel: "provider_default",
      timeoutMs: OPENAI_BASELINE_TIMEOUT_MS,
      maxRetries: OPENAI_BASELINE_MAX_RETRIES
    });
  });

  it("requires explicit provider enablement, key and model without trusting legacy model configuration", () => {
    const disabled = {
      OPENAI_API_KEY: "test-only-secret",
      OPENAI_MODEL: "gpt-5.6-terra",
      OPENAI_PROVIDER_ENABLED: "false"
    };
    expect(() => requireEnabledOpenAIRuntimeConfiguration(disabled)).toThrow(/OPENAI_PROVIDER_ENABLED/);
    expect(readOpenAIRuntimeConfiguration({ OPENAI_CONVERSATION_MODEL: "gpt-5.6-luna" })).toMatchObject({
      model: null
    });
    expect(requireEnabledOpenAIRuntimeConfiguration({
      ...disabled,
      OPENAI_PROVIDER_ENABLED: "true",
      OPENAI_REASONING_EFFORT: "low",
      OPENAI_TIMEOUT_MS: "9000",
      OPENAI_MAX_RETRIES: "0"
    })).toMatchObject({
      model: "gpt-5.6-terra",
      reasoningEffort: "low",
      timeoutMs: 9_000,
      maxRetries: 0
    });
    expect(() => requireEnabledOpenAIRuntimeConfiguration({
      ...disabled,
      OPENAI_PROVIDER_ENABLED: "true",
      OPENAI_REASONING_EFFORT: "unbounded"
    })).toThrow(/OPENAI_REASONING_EFFORT/);
    expect(() => requireEnabledOpenAIRuntimeConfiguration({
      ...disabled,
      OPENAI_PROVIDER_ENABLED: "true",
      OPENAI_MAX_RETRIES: "99"
    })).toThrow(/OPENAI_MAX_RETRIES/);
  });

  it("uses only server-side environment names and prints only the approved readiness fields", async () => {
    const [example, readiness, runtimeConfiguration, secretBoundary, safeBuild, ignored] = await Promise.all([
      readFile(".env.example", "utf8"),
      readFile("scripts/check-openai-readiness.ts", "utf8"),
      readFile("src/infrastructure/ai/openai/openai-runtime-configuration.ts", "utf8"),
      readFile("scripts/check-openai-secret-boundary.ts", "utf8"),
      readFile("scripts/build-with-runtime-secrets-isolated.ts", "utf8"),
      readFile(".gitignore", "utf8")
    ]);
    expect(example).toContain("OPENAI_PROVIDER_ENABLED=false");
    expect(example).toContain("OPENAI_MODEL=gpt-5.6-terra");
    expect(example).not.toMatch(/NEXT_PUBLIC_OPENAI/);
    expect(ignored).toContain(".env.*");
    expect(readiness).toContain("store: false");
    expect(readiness).toContain("parallel_tool_calls: false");
    expect(readiness).not.toMatch(/Authorization|slice\(|substring\(/);
    expect(runtimeConfiguration).not.toContain("process.env.OPENAI_API_KEY");
    expect(secretBoundary).not.toMatch(/Authorization|slice\(|substring\(/);
    expect(secretBoundary).toContain("Configured key in repository files:");
    expect(secretBoundary).toContain("Configured key in client bundle:");
    expect(safeBuild).toContain("environment[openAISecretName] = \"\"");
    for (const label of [
      "Key configured:",
      "Provider enabled:",
      "Selected model:",
      "Provider reachable:",
      "Model accessible:"
    ]) {
      expect(readiness).toContain(label);
    }
  });

  it("resolves the OpenAI provider from runtime-only environment after module loading", () => {
    const runtimeOnlyKey = `runtime-only-${randomUUID()}`;
    vi.stubEnv("CONVERSATION_PROVIDER", "openai");
    vi.stubEnv("OPENAI_PROVIDER_ENABLED", "true");
    vi.stubEnv("OPENAI_API_KEY", runtimeOnlyKey);
    vi.stubEnv("OPENAI_MODEL", "gpt-5.6-terra");
    vi.stubEnv("OPENAI_REASONING_EFFORT", "low");

    expect(readOpenAIRuntimeConfiguration()).toMatchObject({
      providerEnabled: true,
      apiKey: runtimeOnlyKey,
      model: "gpt-5.6-terra",
      reasoningEffort: "low"
    });
    expect(resolveConversationProvider()).toMatchObject({
      providerIdentifier: "openai",
      modelIdentifier: "gpt-5.6-terra"
    });
  });

  it("keeps disabled readiness output exact and never prints the configured runtime key", () => {
    const runtimeOnlyKey = `readiness-private-${randomUUID()}`;
    const result = spawnSync(
      process.execPath,
      ["--conditions=react-server", "--import", "tsx", "scripts/check-openai-readiness.ts"],
      {
        cwd: process.cwd(),
        encoding: "utf8",
        env: {
          ...process.env,
          OPENAI_API_KEY: runtimeOnlyKey,
          OPENAI_PROVIDER_ENABLED: "false",
          OPENAI_MODEL: ""
        }
      }
    );

    expect(result.status).toBe(2);
    expect(result.stderr).toBe("");
    expect(result.stdout).toBe([
      "Key configured: yes",
      "Provider enabled: no",
      "Selected model: not configured",
      "Provider reachable: no",
      "Model accessible: no",
      ""
    ].join("\n"));
    expect(result.stdout).not.toContain(runtimeOnlyKey);
  });
});
