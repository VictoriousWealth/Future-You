import type {
  ConversationInterpretation,
  InterpretationProviderRequest
} from "../src/application/conversation/contracts";
import { conversationInterpretationSchema } from "../src/application/conversation/schemas";
import { sourceContainsQuote } from "../src/application/conversation/exact-source-grounding";
import {
  OpenAIResponsesConversationModelProvider
} from "../src/infrastructure/ai/openai/openai-responses-conversation-provider";
import { conversationEvaluationCorpus } from "../tests/fixtures/conversation-evaluation-corpus";

const apiKey = process.env.OPENAI_API_KEY?.trim();
const model = process.env.OPENAI_CONVERSATION_MODEL?.trim();

if (!apiKey || !model) {
  console.error(
    "BLOCKED: set OPENAI_API_KEY and OPENAI_CONVERSATION_MODEL for an authorised live-provider review."
  );
  process.exitCode = 2;
} else {
  const provider = new OpenAIResponsesConversationModelProvider(apiKey, model);
  let passed = 0;

  function fail(caseId: string, reason: string): never {
    throw new Error(`Live-provider evaluation failed for ${caseId}: ${reason}`);
  }

  function fields(value: ConversationInterpretation): readonly string[] {
    return "missingFields" in value ? value.missingFields : [];
  }

  for (const evaluation of conversationEvaluationCorpus) {
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
    const validated = conversationInterpretationSchema.parse(result.value);
    if (validated.kind !== evaluation.expectedIntent) {
      fail(evaluation.id, `expected ${evaluation.expectedIntent}, received ${validated.kind}`);
    }
    if (JSON.stringify(fields(validated)) !== JSON.stringify(evaluation.expectedMissingFields)) {
      fail(evaluation.id, "missing-field classification differed");
    }
    if (validated.kind === "UNSUPPORTED" && validated.category !== evaluation.expectedUnsupportedCategory) {
      fail(evaluation.id, "unsupported category differed");
    }
    if (
      "amount" in validated &&
      validated.amount.quote &&
      evaluation.pendingClarification?.type !== "PURCHASE_MONTH" &&
      !sourceContainsQuote(evaluation.message, validated.amount.quote)
    ) {
      fail(evaluation.id, "amount quote was not source-grounded");
    }
    passed += 1;
  }

  const explanation = await provider.planExplanation({
    explanationTarget: "GOAL_DELAY",
    availableFactKeys: ["GOAL_DELAY", "BILLS_COVERED", "NO_BORROWING"],
    availableTemplateIds: ["GOAL_DELAY_EXPLANATION"],
    availableFollowUpActionKeys: ["VIEW_CURRENT_PATH"]
  });
  if (
    explanation.value.templateId !== "GOAL_DELAY_EXPLANATION" ||
    explanation.value.orderedFactKeys.some((key) =>
      !["GOAL_DELAY", "BILLS_COVERED", "NO_BORROWING"].includes(key)
    )
  ) {
    throw new Error("Live-provider explanation plan requested unavailable trusted facts.");
  }

  console.log(JSON.stringify({
    status: "PASS",
    model,
    interpretationCases: passed,
    explanationCases: 1
  }));
}
