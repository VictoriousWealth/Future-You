import { describe, expect, it } from "vitest";
import type { InterpretationProviderRequest } from "../src/application/conversation/contracts";
import {
  FakeConversationModelProvider,
  type FakeProviderMode
} from "../src/infrastructure/ai/fake-conversation-model-provider";

const interpretationRequest: InterpretationProviderRequest = {
  userMessage: "Can I afford a £650 trip next month?",
  pendingClarification: null,
  availableScenarios: [],
  selectedScenarioType: null,
  trustedDate: "2026-08-24",
  timezone: "Europe/London"
};

describe("deterministic fake conversation provider modes", () => {
  it("returns the canonical strict interpretation in normal mode", async () => {
    const provider = new FakeConversationModelProvider("normal");
    await expect(provider.interpret(interpretationRequest)).resolves.toMatchObject({
      value: { kind: "CREATE_ONE_OFF_PURCHASE" },
      metadata: { provider: "fake", model: "fake-conversation/2.0.0", attempts: 1 }
    });
  });

  for (const [mode, category, retryable] of [
    ["timeout", "TIMEOUT", true],
    ["rate_limit", "RATE_LIMIT", true],
    ["provider_failure", "UNAVAILABLE", true],
    ["invalid_schema", "INVALID_OUTPUT", true],
    ["unknown_tool", "UNKNOWN_TOOL", false],
    ["multiple_tool_calls", "MULTIPLE_TOOL_CALLS", false]
  ] as const satisfies readonly (readonly [FakeProviderMode, string, boolean])[]) {
    it(`forces ${mode}`, async () => {
      const provider = new FakeConversationModelProvider(mode);
      await expect(provider.interpret(interpretationRequest)).rejects.toMatchObject({
        category,
        retryable
      });
    });
  }

  it("forces explanation-plan failure without breaking interpretation", async () => {
    const provider = new FakeConversationModelProvider("explanation_failure");
    await expect(provider.interpret(interpretationRequest)).resolves.toMatchObject({
      value: { kind: "CREATE_ONE_OFF_PURCHASE" }
    });
    await expect(provider.planExplanation({
      explanationTarget: "GOAL_DELAY",
      availableFactKeys: ["GOAL_DELAY"],
      availableTemplateIds: ["GOAL_DELAY_EXPLANATION"],
      availableFollowUpActionKeys: ["VIEW_CURRENT_PATH"]
    })).rejects.toMatchObject({ category: "UNAVAILABLE", retryable: true });
  });
});
