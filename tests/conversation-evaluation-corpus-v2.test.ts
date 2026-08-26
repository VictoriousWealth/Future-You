import { describe, expect, it } from "vitest";
import type {
  ClarificationResolution,
  ConversationInterpretation
} from "../src/application/conversation/contracts";
import { sourceContainsQuote } from "../src/application/conversation/exact-source-grounding";
import {
  CLARIFICATION_ID_BY_BRANCH,
  UNSUPPORTED_CATEGORY_IDS
} from "../src/application/conversation/interpretation-policy";
import { FakeConversationModelProvider } from "../src/infrastructure/ai/fake-conversation-model-provider";
import { conversationEvaluationCorpusV2 } from "./fixtures/conversation-evaluation-corpus-v2";

type EvaluatedValue = ConversationInterpretation | ClarificationResolution;

function identifier(value: EvaluatedValue): string | null {
  if (value.kind === "UNSUPPORTED") return value.category;
  if (value.kind === "AMBIGUOUS") return value.ambiguity;
  if (value.kind in CLARIFICATION_ID_BY_BRANCH) {
    return CLARIFICATION_ID_BY_BRANCH[value.kind as keyof typeof CLARIFICATION_ID_BY_BRANCH];
  }
  if (value.kind === "SELECT_EXISTING_SCENARIO" || value.kind === "RESOLVE_SCENARIO_REFERENCE") {
    return value.kind === "SELECT_EXISTING_SCENARIO" ? value.selectionTarget : value.selectionTarget;
  }
  return null;
}

function quote(value: EvaluatedValue): string | null {
  if ("amount" in value) return value.amount.quote;
  if (value.kind === "CLARIFY_SCENARIO_REFERENCE" && value.attemptedOperation.kind === "CHANGE_PURCHASE_AMOUNT") {
    return value.attemptedOperation.amount.quote;
  }
  return null;
}

describe("Track C1A expanded v2 conversation evaluation corpus", () => {
  for (const evaluation of conversationEvaluationCorpusV2) {
    it(`${evaluation.origin}: ${evaluation.id}`, async () => {
      const provider = new FakeConversationModelProvider();
      const common = {
        userMessage: evaluation.message,
        availableScenarios: evaluation.selectedScenario
          ? [{ label: "£650 trip", scenarioType: "one_off_purchase" as const, selected: true }]
          : [],
        selectedScenarioType: evaluation.selectedScenario ? "one_off_purchase" as const : null,
        trustedDate: "2026-08-24",
        timezone: "Europe/London" as const
      };
      const result = evaluation.providerMethod === "RESOLVE_CLARIFICATION"
        ? await provider.resolveClarification({ ...common, pendingClarification: evaluation.pendingClarification! })
        : await provider.interpret({ ...common, pendingClarification: null });
      expect(result.value.kind).toBe(evaluation.expectedKind);
      expect(identifier(result.value)).toBe(evaluation.expectedIdentifier);
      expect(quote(result.value)).toBe(evaluation.expectedSourceQuote);
      if (evaluation.expectedSourceQuote) {
        expect(sourceContainsQuote(evaluation.message, evaluation.expectedSourceQuote)).toBe(true);
      }
    });
  }

  it("retains all 33 C0 messages and covers every exact unsupported identifier", () => {
    expect(conversationEvaluationCorpusV2.filter((test) => test.origin === "FROZEN_C0")).toHaveLength(33);
    const covered = new Set(conversationEvaluationCorpusV2.map((test) => test.expectedIdentifier));
    expect(UNSUPPORTED_CATEGORY_IDS.every((id) => covered.has(id))).toBe(true);
    expect(new Set(conversationEvaluationCorpusV2.map((test) => test.id)).size).toBe(conversationEvaluationCorpusV2.length);
  });
});
