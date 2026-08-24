import { describe, expect, it } from "vitest";
import type {
  ConversationInterpretation,
  InterpretationProviderRequest
} from "../src/application/conversation/contracts";
import { FakeConversationModelProvider } from "../src/infrastructure/ai/fake-conversation-model-provider";
import { conversationEvaluationCorpus } from "./fixtures/conversation-evaluation-corpus";

function missingFields(interpretation: ConversationInterpretation): readonly string[] {
  return "missingFields" in interpretation ? interpretation.missingFields : [];
}

function unsupportedCategory(interpretation: ConversationInterpretation): string | null {
  return interpretation.kind === "UNSUPPORTED" ? interpretation.category : null;
}

function clarificationKey(interpretation: ConversationInterpretation): string | null {
  if (interpretation.kind === "AMBIGUOUS") return interpretation.clarificationKey;
  if (!("missingFields" in interpretation)) return null;
  if (interpretation.missingFields.includes("purchaseAmount")) return "PURCHASE_AMOUNT";
  if (interpretation.missingFields.includes("purchaseMonth")) return "PURCHASE_MONTH";
  if (interpretation.missingFields.includes("scenarioReference")) return "SCENARIO_REFERENCE";
  return null;
}

function scenarioReference(interpretation: ConversationInterpretation): string | null {
  return interpretation.kind === "SELECT_EXISTING_SCENARIO"
    ? interpretation.scenarioReferenceQuote
    : null;
}

describe("versioned Slice 5 conversation evaluation corpus", () => {
  for (const evaluation of conversationEvaluationCorpus) {
    it(`${evaluation.category}: ${evaluation.id}`, async () => {
      const provider = new FakeConversationModelProvider();
      const request: InterpretationProviderRequest = {
        userMessage: evaluation.message,
        pendingClarification: evaluation.pendingClarification ?? null,
        availableScenarios: evaluation.selectedScenario
          ? [{ label: "£650 trip", scenarioType: "one_off_purchase", selected: true }]
          : [],
        selectedScenarioType: evaluation.selectedScenario ? "one_off_purchase" : null,
        trustedDate: "2026-08-24",
        timezone: "Europe/London"
      };
      const result = await provider.interpret(request);
      expect(result.value.kind).toBe(evaluation.expectedIntent);
      expect(missingFields(result.value)).toEqual(evaluation.expectedMissingFields);
      expect(unsupportedCategory(result.value)).toBe(evaluation.expectedUnsupportedCategory);
      expect(clarificationKey(result.value)).toBe(evaluation.expectedClarificationKey);
      expect(scenarioReference(result.value)).toBe(evaluation.expectedScenarioReference);
      expect(provider.observedInterpretationRequests).toHaveLength(
        evaluation.providerCallRequired ? 1 : 0
      );
    });
  }

  it("records explicit simulator permissions for every corpus case", () => {
    expect(conversationEvaluationCorpus).toHaveLength(33);
    expect(conversationEvaluationCorpus.every((evaluation) =>
      typeof evaluation.simulatorCallAllowed === "boolean"
    )).toBe(true);
  });
});
