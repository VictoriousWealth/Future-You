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
    interpretation: {
      kind: "CREATE_ONE_OFF_PURCHASE",
      amount: { quote: "£650", currency: "GBP" },
      timing: {
        quote: "next month", kind: "NEXT_MONTH",
        monthNumber: null, year: null, offsetMonths: 1
      },
      purposeQuote: "trip",
      ...overrides
    }
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
      output: [{ type: "function_call", name: "submit_conversation_interpretation_v4", arguments: JSON.stringify(envelope()) }],
      usage: { input_tokens: 101, output_tokens: 19, total_tokens: 120 }
    });
    const provider = new OpenAIResponsesConversationModelProvider("test-key", "gpt-test");
    const result = await provider.interpret(request);
    expect(result.value).toMatchObject({
      kind: "CREATE_ONE_OFF_PURCHASE",
      amount: { quote: "£650", currency: "GBP" },
      timing: { kind: "NEXT_MONTH", quote: "next month" }
    });
    expect(result.metadata).toMatchObject({
      provider: "openai",
      model: "gpt-test",
      attempts: 1,
      inputTokens: 101,
      outputTokens: 19,
      totalTokens: 120
    });
    expect(result.metadata.latencyMs).toEqual(expect.any(Number));
    expect(openai.create).toHaveBeenCalledTimes(1);
    const call = openai.create.mock.calls[0]![0];
    expect(call).toMatchObject({
      model: "gpt-test",
      store: false,
      parallel_tool_calls: false,
      tool_choice: { type: "function", name: "submit_conversation_interpretation_v4" },
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

  it("repairs one invalid nested branch with minimal state and the same strict schema", async () => {
    openai.create
      .mockResolvedValueOnce({
        output: [{ type: "function_call", name: "submit_conversation_interpretation_v4", arguments: JSON.stringify(envelope({ amount: null })) }]
      })
      .mockResolvedValueOnce({
        output: [{ type: "function_call", name: "submit_conversation_interpretation_v4", arguments: JSON.stringify(envelope()) }]
      });
    const provider = new OpenAIResponsesConversationModelProvider("test-key", "gpt-test");
    await expect(provider.interpret(request)).resolves.toMatchObject({
      value: { kind: "CREATE_ONE_OFF_PURCHASE" },
      metadata: { attempts: 2 }
    });
    const first = openai.create.mock.calls[0]![0];
    const second = openai.create.mock.calls[1]![0];
    expect(second.tools).toEqual(first.tools);
    expect(second.model).toBe(first.model);
    expect(JSON.parse(second.input)).toMatchObject({
      mode: "BOUNDED_REPAIR",
      originalRequest: {
        userMessage: request.userMessage,
        selectedScenarioType: null,
        availableScenarioLabels: []
      },
      validationErrors: expect.any(Array),
      permittedIdentifiers: { intents: expect.arrayContaining(["CREATE_ONE_OFF_PURCHASE", "UNSUPPORTED"]) }
    });
    expect(second.input).not.toContain("financialContext");
    expect(second.input).not.toContain("expectedIntent");
    expect(second.input).not.toContain("invalidInterpretation");
  });

  it("rejects unknown and multiple tool calls without accepting either", async () => {
    const provider = new OpenAIResponsesConversationModelProvider("test-key", "gpt-test");
    openai.create.mockResolvedValueOnce({
      output: [{ type: "function_call", name: "wrong_tool", arguments: JSON.stringify(envelope()) }]
    });
    await expect(provider.interpret(request)).rejects.toMatchObject({ category: "UNKNOWN_TOOL", attempts: 1 });
    openai.create.mockResolvedValueOnce({
      output: [
        { type: "function_call", name: "submit_conversation_interpretation_v4", arguments: JSON.stringify(envelope()) },
        { type: "function_call", name: "submit_conversation_interpretation_v4", arguments: JSON.stringify(envelope()) }
      ]
    });
    await expect(provider.interpret(request)).rejects.toMatchObject({ category: "MULTIPLE_TOOL_CALLS", attempts: 1 });
  });

  it("rejects function arguments that fail the runtime schema", async () => {
    openai.create.mockResolvedValue({
      output: [{ type: "function_call", name: "submit_conversation_interpretation_v4", arguments: JSON.stringify(envelope({ amount: { quote: 650, currency: "GBP" } })) }]
    });
    const provider = new OpenAIResponsesConversationModelProvider("test-key", "gpt-test");
    await expect(provider.interpret(request)).rejects.toMatchObject({ category: "INVALID_OUTPUT", attempts: 2 });
  });

  it("uses the narrow amount clarification contract instead of the full intent contract", async () => {
    openai.create.mockResolvedValue({
      output: [{
        type: "function_call",
        name: "submit_clarification_resolution_v2",
        arguments: JSON.stringify({ resolution: { kind: "RESOLVE_PURCHASE_AMOUNT", amount: { quote: "£650", currency: "GBP" } } })
      }]
    });
    const provider = new OpenAIResponsesConversationModelProvider("test-key", "gpt-test");
    await expect(provider.resolveClarification({
      ...request,
      pendingClarification: {
        type: "PURCHASE_AMOUNT",
        originalMessageId: "original-message",
        partialPurpose: "trip",
        partialTiming: { quote: "next month", kind: "NEXT_MONTH", monthNumber: null, year: null, offsetMonths: 1 }
      },
      userMessage: "£650"
    })).resolves.toMatchObject({ value: { kind: "RESOLVE_PURCHASE_AMOUNT", amount: { quote: "£650" } } });
    const call = openai.create.mock.calls[0]![0];
    expect(call.tool_choice).toEqual({ type: "function", name: "submit_clarification_resolution_v2" });
    const alternatives = call.tools[0].parameters.properties.resolution.anyOf;
    expect(alternatives.map((branch: { properties: { kind: { enum: string[] } } }) => branch.properties.kind.enum[0]))
      .toEqual(["RESOLVE_PURCHASE_AMOUNT", "UNSUPPORTED", "AMBIGUOUS"]);
  });

  it("applies an explicit reasoning setting and honours a zero-retry configuration", async () => {
    openai.create.mockResolvedValue({ output: [{ type: "message", content: [] }] });
    const provider = new OpenAIResponsesConversationModelProvider("test-key", "gpt-test", {
      reasoningEffort: "low",
      timeoutMs: 8_000,
      maxRetries: 0
    });
    await expect(provider.interpret(request)).rejects.toMatchObject({
      category: "INVALID_OUTPUT",
      attempts: 1
    });
    expect(openai.create).toHaveBeenCalledTimes(1);
    expect(openai.create.mock.calls[0]![0]).toMatchObject({ reasoning: { effort: "low" } });
  });
});
