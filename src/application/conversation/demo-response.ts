import type { OneOffPurchaseResponseDTO } from "../dto/contracts";
import { ConversationApplicationError } from "./application-error";
import type {
  DemoAnswerKind,
  DemoResponsePlan,
  DemoTrustedFact
} from "./demo-contracts";
import type { ExplanationTarget } from "./contracts";
import { renderFallbackExplanation } from "./server-renderer";

const FACT_TOKEN = /\{\{([A-Z][A-Z0-9_]*)\}\}/g;
const FINANCIAL_AUTHORITY_LANGUAGE = /(?:\d|[£$€%]|\b(?:january|february|march|april|may|june|july|august|september|october|november|december|afford(?:able|ability)?|unaffordable|balance|buffer|overdraft|borrow(?:ing)?|bills?|goal|deposit|saving|cash|income|expense|spend(?:ing)?|cost|price|classification|risk(?:y)?|safe|on track|delay(?:ed)?|restore(?:d)?|completion|target|pension|contribution|employer|workplace|benefit|eligibility|eligible|active|inactive|loan|match|recommend|should|best|choice|manageable)\b)/i;
const CONNECTIVE_WORDS = new Set([
  "a", "about", "and", "another", "any", "are", "at", "available", "based", "below",
  "can", "clear", "control", "data", "decision", "details", "explore", "facts", "from",
  "future", "here", "here’s", "if", "in", "information", "is", "it", "like", "look", "me",
  "more", "now", "of", "on", "option", "part", "picture", "plan", "question", "ready",
  "recorded", "remain", "result", "shows", "summary", "supported", "tell", "the", "these",
  "this", "to", "together", "trusted", "under", "want", "we", "what", "when", "you",
  "you’d", "your"
]);

function trustedFact(key: string, text: string): DemoTrustedFact {
  return { key, text };
}

export function purchaseResultFacts(result: OneOffPurchaseResponseDTO): readonly DemoTrustedFact[] {
  const impact = result.presentation.immediateImpact;
  return [
    trustedFact("RESULT_SUMMARY", result.presentation.summary),
    trustedFact("SAFETY_BUFFER", `Your safety buffer changes from ${impact.safetyBufferBefore} to ${impact.safetyBufferAfter}.`),
    trustedFact("REQUIRED_PAYMENTS", `${impact.requiredPayments}.`),
    trustedFact("BORROWING", `${impact.borrowing}.`),
    trustedFact("BUFFER_RECOVERY", `${impact.recovery}.`),
    ...result.presentation.goalImpacts.map((goal, index) => trustedFact(
      `GOAL_IMPACT_${index + 1}`,
      `${goal.label}: ${goal.baselineCompletion} becomes ${goal.scenarioCompletion}. ${goal.delay}.`
    )),
    trustedFact(
      "SCENARIO_ASSUMPTIONS",
      "This remains a hypothetical one-off purchase, paid once from the current account and treated as additional to routine spending."
    )
  ];
}

export function storedExplanationFacts(
  result: OneOffPurchaseResponseDTO,
  target: ExplanationTarget
): readonly DemoTrustedFact[] {
  if (target === "GOAL_DELAY") {
    const changed = result.presentation.goalImpacts.filter(
      (goal) => goal.baselineCompletion !== goal.scenarioCompletion
    );
    return [
      trustedFact(
        "EXPLANATION_CAUSE",
        "The stored result shows that the purchase leaves less cash available for planned goal contributions while the safety buffer recovers."
      ),
      ...(changed.length > 0
        ? changed.map((goal, index) => trustedFact(
            `EXPLAINED_GOAL_${index + 1}`,
            `${goal.label} moves from ${goal.baselineCompletion} to ${goal.scenarioCompletion}. ${goal.delay}.`
          ))
        : [trustedFact("NO_GOAL_DATE_CHANGE", "The stored result shows no change to the goal completion dates.")])
    ];
  }
  return [trustedFact("STORED_RESULT_EXPLANATION", renderFallbackExplanation(result, target))];
}

/**
 * The model may supply connective prose and fact ordering only. Every factual
 * sentence is inserted by the server from the exact trusted fact set.
 */
export function renderDemoResponse(
  plan: DemoResponsePlan,
  facts: readonly DemoTrustedFact[]
): string {
  if (facts.length === 0) {
    throw new ConversationApplicationError("AI_INTERPRETATION_INVALID", "The demo response had no trusted facts.");
  }
  const byKey = new Map(facts.map((fact) => [fact.key, fact.text]));
  if (byKey.size !== facts.length || facts.some((fact) => !/^[A-Z][A-Z0-9_]*$/.test(fact.key))) {
    throw new ConversationApplicationError("PERSISTENCE_FAILURE", "The trusted demo fact set was invalid.");
  }
  const tokens = [...plan.template.matchAll(FACT_TOKEN)].map((match) => match[1]!);
  const expected = [...byKey.keys()].sort();
  if (tokens.length !== facts.length || [...tokens].sort().some((key, index) => key !== expected[index])) {
    throw new ConversationApplicationError(
      "AI_INTERPRETATION_INVALID",
      "The demo wording plan did not preserve every trusted fact exactly once."
    );
  }
  if (tokens.some((key) => !byKey.has(key))) {
    throw new ConversationApplicationError("AI_INTERPRETATION_INVALID", "The demo wording plan referenced an unknown fact.");
  }
  const connective = plan.template.replace(FACT_TOKEN, " ");
  const connectiveWords = connective.toLocaleLowerCase("en-GB").match(/[a-z]+(?:[’'][a-z]+)?/g) ?? [];
  if (
    /[{}<>]/.test(connective)
    || FINANCIAL_AUTHORITY_LANGUAGE.test(connective)
    || connectiveWords.some((word) => !CONNECTIVE_WORDS.has(word.replace("'", "’")))
  ) {
    throw new ConversationApplicationError(
      "AI_INTERPRETATION_INVALID",
      "The demo wording plan attempted to add an authoritative financial claim."
    );
  }
  return plan.template.replace(FACT_TOKEN, (_token, key: string) => byKey.get(key)! ).trim();
}

export function fallbackDemoResponse(
  _answerKind: DemoAnswerKind,
  facts: readonly DemoTrustedFact[]
): string {
  return facts.map((fact) => fact.text).join(" ");
}
