import type { OneOffPurchaseResponseDTO } from "../dto/contracts";
import type {
  ExplanationPlan,
  ExplanationTarget,
  ExplanationTemplateId,
  TrustedFactKey
} from "./contracts";
import { ConversationApplicationError } from "./application-error";

export const RESULT_TEMPLATE_IDS: readonly ExplanationTemplateId[] = [
  "PURCHASE_RESULT_SIGNIFICANT",
  "PURCHASE_RESULT_NOTICEABLE",
  "PURCHASE_RESULT_MINIMAL",
  "PURCHASE_RESULT_RISKY"
];

export function resultTemplateFor(result: OneOffPurchaseResponseDTO): ExplanationTemplateId {
  switch (result.result.comparison.classification.code) {
    case "AFFORDABLE_SIGNIFICANT_TRADE_OFF": return "PURCHASE_RESULT_SIGNIFICANT";
    case "AFFORDABLE_NOTICEABLE_TRADE_OFF": return "PURCHASE_RESULT_NOTICEABLE";
    case "AFFORDABLE_MINIMAL_IMPACT": return "PURCHASE_RESULT_MINIMAL";
    default: return "PURCHASE_RESULT_RISKY";
  }
}

export function renderResult(result: OneOffPurchaseResponseDTO): string {
  const impact = result.presentation.immediateImpact;
  return `${result.presentation.summary} Your safety buffer changes from ${impact.safetyBufferBefore} to ${impact.safetyBufferAfter}. ${impact.requiredPayments} ${impact.borrowing}`;
}

export function availableFacts(_result: OneOffPurchaseResponseDTO): readonly TrustedFactKey[] {
  const facts: TrustedFactKey[] = [
    "OVERALL_CLASSIFICATION", "BUFFER_REDUCTION", "BILLS_COVERED", "NO_BORROWING",
    "BUFFER_RECOVERY", "GOAL_DELAY", "ASSUMPTIONS"
  ];
  return facts;
}

export function templatesForTarget(target: ExplanationTarget): readonly ExplanationTemplateId[] {
  if (target === "SAFETY_BUFFER" || target === "BUFFER_RECOVERY") return ["BUFFER_EXPLANATION"];
  if (target === "GOAL_DELAY") return ["GOAL_DELAY_EXPLANATION"];
  return RESULT_TEMPLATE_IDS;
}

export function validateExplanationPlan(
  plan: ExplanationPlan,
  factKeys: readonly TrustedFactKey[],
  templateIds: readonly ExplanationTemplateId[]
): void {
  const facts = new Set(factKeys);
  if (!templateIds.includes(plan.templateId)) {
    throw new ConversationApplicationError("AI_INTERPRETATION_INVALID", "The explanation selected an unavailable template.");
  }
  for (const key of [plan.primaryFactKey, ...plan.orderedFactKeys]) {
    if (!facts.has(key)) {
      throw new ConversationApplicationError("AI_INTERPRETATION_INVALID", "The explanation referenced an unavailable trusted fact.");
    }
  }
}

export function renderExplanation(
  result: OneOffPurchaseResponseDTO,
  templateId: ExplanationTemplateId
): string {
  const impact = result.presentation.immediateImpact;
  if (templateId === "BUFFER_EXPLANATION") {
    return `The purchase reduces your safety buffer from ${impact.safetyBufferBefore} to ${impact.safetyBufferAfter}. ${impact.requiredPayments} ${impact.borrowing} ${impact.recovery}`;
  }
  if (templateId === "GOAL_DELAY_EXPLANATION") {
    const goals = result.presentation.goalImpacts
      .filter((goal) => goal.baselineCompletion !== goal.scenarioCompletion)
      .map((goal) => `${goal.label} moves from ${goal.baselineCompletion} to ${goal.scenarioCompletion}`);
    return goals.length > 0
      ? `The purchase leaves less cash available for your planned goal contributions while the safety buffer recovers. ${goals.join("; ")}.`
      : "The stored result shows no change to your goal completion dates under these assumptions.";
  }
  return renderResult(result);
}

export function renderFallbackExplanation(result: OneOffPurchaseResponseDTO, target: ExplanationTarget): string {
  return renderExplanation(
    result,
    target === "GOAL_DELAY" ? "GOAL_DELAY_EXPLANATION" : target === "SAFETY_BUFFER" || target === "BUFFER_RECOVERY"
      ? "BUFFER_EXPLANATION" : resultTemplateFor(result)
  );
}
