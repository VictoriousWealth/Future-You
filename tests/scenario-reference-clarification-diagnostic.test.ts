import { beforeEach, describe, expect, it, vi } from "vitest";

const openai = vi.hoisted(() => ({ create: vi.fn() }));

vi.mock("openai", () => ({
  default: class {
    readonly responses = { create: openai.create };
  }
}));

import {
  INTERPRETATION_PROMPT_VERSION,
  INTERPRETATION_SCHEMA_VERSION,
  type ConversationInterpretation,
  type InterpretationProviderRequest
} from "../src/application/conversation/contracts";
import { INTERPRETATION_INTENT_IDS } from "../src/application/conversation/interpretation-policy";
import { conversationInterpretationSchema } from "../src/application/conversation/schemas";
import { INTERPRETATION_PARAMETERS_V3 } from "../src/infrastructure/ai/openai/provider-json-schemas";
import {
  SanitisedInterpretationDiagnosticCollector,
  successfulInterpretationDiagnostic
} from "../src/infrastructure/ai/openai/interpretation-diagnostics";
import {
  INTERPRET_TOOL,
  OpenAIResponsesConversationModelProvider
} from "../src/infrastructure/ai/openai/openai-responses-conversation-provider";
import { conversationTestApplication } from "./helpers/conversation";
import { conversationEvaluationCorpusV2 } from "./fixtures/conversation-evaluation-corpus-v2";
import {
  missingScenarioDiagnosticFixtures,
  representativeScenarioBranchFixtures
} from "./fixtures/scenario-reference-clarification-diagnostic";

const diagnosticMetadata = {
  modelId: "fake-c1g-diagnostic",
  promptVersion: INTERPRETATION_PROMPT_VERSION,
  schemaVersion: INTERPRETATION_SCHEMA_VERSION,
  attempt: 1,
  repairAttempt: false,
  rootField: "interpretation" as const,
  allowedBranchKinds: INTERPRETATION_INTENT_IDS
};

function providerBranchKinds(): readonly string[] {
  const properties = INTERPRETATION_PARAMETERS_V3.properties as Record<string, unknown>;
  const interpretation = properties.interpretation as { anyOf: readonly Record<string, unknown>[] };
  return interpretation.anyOf.map((branch) => {
    const branchProperties = branch.properties as Record<string, { enum?: readonly string[] }>;
    return branchProperties.kind?.enum?.[0] ?? "UNKNOWN";
  });
}

function providerResponse(value: ConversationInterpretation) {
  return {
    output: [{
      type: "function_call",
      name: INTERPRET_TOOL,
      arguments: JSON.stringify({ interpretation: value })
    }],
    usage: { input_tokens: 10, output_tokens: 5, total_tokens: 15 }
  };
}

describe("Track C1G scenario-reference clarification diagnostic", () => {
  beforeEach(() => openai.create.mockReset());

  it("recovers the exact failed synthetic case and no-scenario provider state", () => {
    const evaluation = conversationEvaluationCorpusV2.find((item) => item.id === "missing-active-scenario");
    expect(evaluation).toEqual({
      id: "missing-active-scenario",
      origin: "FROZEN_C0",
      category: "CLARIFICATION",
      message: "What about £500?",
      providerMethod: "INTERPRET",
      expectedKind: "CLARIFY_SCENARIO_REFERENCE",
      expectedIdentifier: "SCENARIO_REFERENCE",
      expectedSourceQuote: "£500",
      simulatorCallAllowed: false,
      selectedScenario: false
    });
    expect(missingScenarioDiagnosticFixtures[0].request).toEqual({
      userMessage: "What about £500?",
      pendingClarification: null,
      availableScenarios: [],
      selectedScenarioType: null,
      trustedDate: "2026-08-24",
      timezone: "Europe/London"
    });
  });

  it("keeps both conflicting branches in the static provider and runtime schemas", () => {
    expect(providerBranchKinds()).toEqual(expect.arrayContaining([
      "CLARIFY_SCENARIO_REFERENCE",
      "AMBIGUOUS"
    ]));
    for (const fixture of missingScenarioDiagnosticFixtures) {
      expect(conversationInterpretationSchema.safeParse(fixture.exactClarification).success).toBe(true);
      expect(conversationInterpretationSchema.safeParse(fixture.genericAmbiguity).success).toBe(true);
    }
  });

  it.each(missingScenarioDiagnosticFixtures)(
    "accepts exact clarification and generic ambiguity for the same $id no-scenario state",
    (fixture) => {
      const exact = successfulInterpretationDiagnostic(
        diagnosticMetadata,
        fixture.exactClarification,
        fixture.request
      );
      const ambiguous = successfulInterpretationDiagnostic(
        diagnosticMetadata,
        fixture.genericAmbiguity,
        fixture.request
      );
      for (const diagnostic of [exact, ambiguous]) {
        expect(diagnostic).toMatchObject({
          failedStage: null,
          strictSchemaValid: true,
          semanticContractValid: true,
          conversationStateValid: true,
          applicationCommandAuthorized: true,
          simulatorInvoked: false
        });
      }
    }
  );

  it("identifies the overlap across every selected, explicit, unselected and absent scenario state", () => {
    const labelsByOperation = {
      amount: "What about £500 for the £650 trip?",
      timing: "What if I wait until October for the £650 trip?",
      explanation: "Why did the £650 trip delay my goal?"
    } as const;
    for (const fixture of missingScenarioDiagnosticFixtures) {
      const states: readonly Readonly<{
        id: string;
        request: InterpretationProviderRequest;
        normative: "SUPPORTED_FOLLOW_UP" | "CLARIFY_SCENARIO_REFERENCE";
      }>[] = [
        {
          id: "selected",
          request: {
            ...fixture.request,
            availableScenarios: [{ label: "£650 trip", scenarioType: "one_off_purchase", selected: true }],
            selectedScenarioType: "one_off_purchase"
          },
          normative: "SUPPORTED_FOLLOW_UP"
        },
        {
          id: "explicit-label",
          request: {
            ...fixture.request,
            userMessage: labelsByOperation[fixture.id],
            availableScenarios: [{ label: "£650 trip", scenarioType: "one_off_purchase", selected: false }]
          },
          normative: "SUPPORTED_FOLLOW_UP"
        },
        {
          id: "unselected-without-label",
          request: {
            ...fixture.request,
            availableScenarios: [{ label: "£650 trip", scenarioType: "one_off_purchase", selected: false }]
          },
          normative: "CLARIFY_SCENARIO_REFERENCE"
        },
        {
          id: "no-scenarios",
          request: fixture.request,
          normative: "CLARIFY_SCENARIO_REFERENCE"
        }
      ];
      for (const state of states) {
        const exact = successfulInterpretationDiagnostic(
          diagnosticMetadata,
          fixture.exactClarification,
          state.request
        );
        const ambiguous = successfulInterpretationDiagnostic(
          diagnosticMetadata,
          fixture.genericAmbiguity,
          state.request
        );
        expect(
          { operation: fixture.id, state: state.id, normative: state.normative, exact, ambiguous }
        ).toMatchObject({
          exact: { failedStage: null, applicationCommandAuthorized: true },
          ambiguous: { failedStage: null, applicationCommandAuthorized: true }
        });
      }
    }
  });

  it.each(representativeScenarioBranchFixtures)(
    "enumerates provider/runtime/state/authorisation outcome for $id",
    (fixture) => {
      const parsed = conversationInterpretationSchema.safeParse(fixture.value);
      expect(parsed.success).toBe(true);
      if (!parsed.success) return;
      const diagnostic = successfulInterpretationDiagnostic(
        diagnosticMetadata,
        parsed.data,
        fixture.request
      );
      expect(diagnostic.failedStage).toBe(fixture.expectedFailedStage);
      expect(diagnostic.applicationCommandAuthorized).toBe(fixture.expectedApplicationCommandAuthorized);
      expect(diagnostic.simulatorInvoked).toBe(false);
    }
  );

  it.each(missingScenarioDiagnosticFixtures)(
    "reproduces the schema-valid $id ambiguity with one fake OpenAI response and no repair",
    async (fixture) => {
      openai.create.mockResolvedValueOnce(providerResponse(fixture.genericAmbiguity));
      const collector = new SanitisedInterpretationDiagnosticCollector({
        NODE_ENV: "test",
        OPENAI_EVALUATION_DIAGNOSTICS_ENABLED: "true"
      });
      collector.beginCase(`c1g-${fixture.id}-ambiguous`);
      const provider = new OpenAIResponsesConversationModelProvider("test-only-key", "gpt-test", {
        maxRetries: 1,
        diagnosticSink: collector
      });
      await expect(provider.interpret(fixture.request)).resolves.toMatchObject({
        value: fixture.genericAmbiguity,
        metadata: { attempts: 1 }
      });
      expect(openai.create).toHaveBeenCalledTimes(1);
      expect(JSON.parse(openai.create.mock.calls[0]![0].input)).toEqual(fixture.request);
      expect(collector.records()).toEqual([
        expect.objectContaining({
          selectedBranchKind: "AMBIGUOUS",
          failedStage: null,
          repairAttempt: false,
          repairOutcome: "NOT_APPLICABLE",
          applicationCommandAuthorized: true,
          simulatorInvoked: false
        })
      ]);
    }
  );

  it.each(missingScenarioDiagnosticFixtures)(
    "preserves the C1G exact branch while active v4 fails closed for generic $id ambiguity",
    async (fixture) => {
      const exactTest = conversationTestApplication();
      const exactConversation = await exactTest.application.create({ requestId: `c1g_exact_${fixture.id}` });
      vi.spyOn(exactTest.provider, "interpret").mockResolvedValueOnce({
        value: fixture.exactClarification,
        metadata: { provider: "fake", model: "fake-c1g", attempts: 1 }
      });
      const exactSimulation = vi.spyOn(exactTest.simulator.simulateOneOffPurchase, "execute");
      const exact = await exactTest.application.send(exactConversation.conversation.id, {
        requestId: `c1g_exact_turn_${fixture.id}`,
        message: fixture.request.userMessage
      });
      expect(exact.intent).toBe("CLARIFY_SCENARIO_REFERENCE");
      expect(exact.conversation.messages.at(-1)).toMatchObject({
        kind: "ASSISTANT_CLARIFICATION",
        templateId: "SCENARIO_REFERENCE",
        text: "What purchase would you like me to compare?"
      });
      expect(exactTest.repository.conversations.get(exactConversation.conversation.id)?.pendingClarification)
        .toMatchObject({ type: "SCENARIO_REFERENCE", attemptedOperation: fixture.exactClarification.attemptedOperation.kind });
      expect(exactSimulation).not.toHaveBeenCalled();

      const ambiguousTest = conversationTestApplication();
      const ambiguousConversation = await ambiguousTest.application.create({ requestId: `c1g_ambiguous_${fixture.id}` });
      vi.spyOn(ambiguousTest.provider, "interpret").mockResolvedValueOnce({
        value: fixture.genericAmbiguity,
        metadata: { provider: "fake", model: "fake-c1g", attempts: 1 }
      });
      const ambiguousSimulation = vi.spyOn(ambiguousTest.simulator.simulateOneOffPurchase, "execute");
      await expect(ambiguousTest.application.send(ambiguousConversation.conversation.id, {
        requestId: `c1g_ambiguous_turn_${fixture.id}`,
        message: fixture.request.userMessage
      })).rejects.toMatchObject({ code: "AI_INTERPRETATION_INVALID" });
      expect(ambiguousTest.repository.messages.get(ambiguousConversation.conversation.id)?.at(-1)).toMatchObject({
        kind: "ASSISTANT_ERROR",
        templateId: "CONVERSATION_ERROR"
      });
      expect(ambiguousTest.repository.conversations.get(ambiguousConversation.conversation.id)?.pendingClarification)
        .toBeNull();
      expect(ambiguousSimulation).not.toHaveBeenCalled();
    }
  );

  it("retains generic ambiguity for a genuinely unclear operation without invoking the simulator", async () => {
    const test = conversationTestApplication();
    const detail = await test.application.create({ requestId: "c1g_genuine_ambiguity" });
    const simulation = vi.spyOn(test.simulator.simulateOneOffPurchase, "execute");
    const turn = await test.application.send(detail.conversation.id, {
      requestId: "c1g_genuine_ambiguity_turn",
      message: "Could you compare that somehow?"
    });
    expect(turn.intent).toBe("AMBIGUOUS");
    expect(turn.conversation.messages.at(-1)).toMatchObject({ templateId: "SUPPORTED_ACTION" });
    expect(simulation).not.toHaveBeenCalled();
  });
});
