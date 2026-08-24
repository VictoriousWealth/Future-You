import { beforeEach, describe, expect, it, vi } from "vitest";

const openai = vi.hoisted(() => ({ create: vi.fn() }));

vi.mock("openai", () => ({
  default: class {
    readonly responses = { create: openai.create };
  }
}));

import { OpenAIResponsesConversationModelProvider } from "../src/infrastructure/ai/openai/openai-responses-conversation-provider";

function envelope(overrides: Record<string, unknown> = {}) {
  return {
    kind: "CREATE_ONE_OFF_PURCHASE",
    amountQuote: "£650",
    currency: "GBP",
    timingQuote: "next month",
    timingKind: "NEXT_MONTH",
    timingMonthNumber: null,
    timingYear: null,
    timingOffsetMonths: 1,
    purposeQuote: "trip",
    referencedScenarioLabel: null,
    missingFields: [],
    unsupportedFeatures: [],
    explanationTarget: null,
    goalReferenceQuote: null,
    scenarioReferenceQuote: null,
    category: null,
    userGoalSummary: null,
    ambiguity: null,
    clarificationKey: null,
    ...overrides
  };
}

const request = {
  userMessage: "Can I afford a £650 trip next month?",
  pendingClarification: null,
  availableScenarios: [],
  selectedScenarioType: null,
  trustedDate: "2026-08-24",
  timezone: "Europe/London" as const
};

describe("OpenAI Responses conversation adapter", () => {
  beforeEach(() => openai.create.mockReset());

  it("uses one forced strict function, disables storage and built-in tools, and validates output", async () => {
    openai.create.mockResolvedValue({
      output: [{ type: "function_call", name: "submit_conversation_interpretation", arguments: JSON.stringify(envelope()) }]
    });
    const provider = new OpenAIResponsesConversationModelProvider("test-key", "gpt-test");
    const result = await provider.interpret(request);
    expect(result.value).toMatchObject({
      kind: "CREATE_ONE_OFF_PURCHASE",
      amount: { quote: "£650", currency: "GBP" },
      timing: { kind: "NEXT_MONTH", quote: "next month" }
    });
    expect(openai.create).toHaveBeenCalledTimes(1);
    const call = openai.create.mock.calls[0]![0];
    expect(call).toMatchObject({
      model: "gpt-test",
      store: false,
      parallel_tool_calls: false,
      tool_choice: { type: "function", name: "submit_conversation_interpretation" },
      max_output_tokens: 1200
    });
    expect(call.tools).toHaveLength(1);
    expect(call.tools[0]).toMatchObject({
      type: "function",
      strict: true,
      parameters: { type: "object", additionalProperties: false }
    });
    expect(call).not.toHaveProperty("conversation");
    expect(call).not.toHaveProperty("previous_response_id");
  });

  it("rejects direct model text and performs only one bounded repair retry", async () => {
    openai.create.mockResolvedValue({ output: [{ type: "message", content: [{ type: "output_text", text: "yes" }] }] });
    const provider = new OpenAIResponsesConversationModelProvider("test-key", "gpt-test");
    await expect(provider.interpret(request)).rejects.toMatchObject({
      category: "INVALID_OUTPUT",
      attempts: 2
    });
    expect(openai.create).toHaveBeenCalledTimes(2);
  });

  it("rejects unknown and multiple tool calls without accepting either", async () => {
    const provider = new OpenAIResponsesConversationModelProvider("test-key", "gpt-test");
    openai.create.mockResolvedValueOnce({
      output: [{ type: "function_call", name: "wrong_tool", arguments: JSON.stringify(envelope()) }]
    });
    await expect(provider.interpret(request)).rejects.toMatchObject({ category: "UNKNOWN_TOOL", attempts: 1 });
    openai.create.mockResolvedValueOnce({
      output: [
        { type: "function_call", name: "submit_conversation_interpretation", arguments: JSON.stringify(envelope()) },
        { type: "function_call", name: "submit_conversation_interpretation", arguments: JSON.stringify(envelope()) }
      ]
    });
    await expect(provider.interpret(request)).rejects.toMatchObject({ category: "MULTIPLE_TOOL_CALLS", attempts: 1 });
  });

  it("rejects function arguments that fail the runtime schema", async () => {
    openai.create.mockResolvedValue({
      output: [{ type: "function_call", name: "submit_conversation_interpretation", arguments: JSON.stringify(envelope({ amountQuote: 650 })) }]
    });
    const provider = new OpenAIResponsesConversationModelProvider("test-key", "gpt-test");
    await expect(provider.interpret(request)).rejects.toMatchObject({ category: "INVALID_OUTPUT", attempts: 2 });
  });
});
