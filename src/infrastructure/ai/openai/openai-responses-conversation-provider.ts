import "server-only";
import OpenAI from "openai";
import { z } from "zod";
import type {
  ConversationInterpretation,
  ConversationModelProvider,
  ExplanationPlan,
  ExplanationProviderRequest,
  InterpretationProviderRequest,
  ProviderResult
} from "../../../application/conversation/contracts";
import {
  explanationPlanSchema
} from "../../../application/conversation/schemas";
import { ConversationProviderError } from "../../../application/conversation/provider-error";
import {
  EXPLANATION_PROMPT,
  INTERPRETATION_PROMPT
} from "../../../application/conversation/prompts";

const INTERPRET_TOOL = "submit_conversation_interpretation";
const EXPLANATION_TOOL = "submit_explanation_plan";

const nullableString = { anyOf: [{ type: "string" }, { type: "null" }] } as const;
const nullableInteger = { anyOf: [{ type: "integer" }, { type: "null" }] } as const;

const interpretationParameters = {
  type: "object",
  additionalProperties: false,
  properties: {
    kind: { type: "string", enum: [
      "CREATE_ONE_OFF_PURCHASE", "CHANGE_PURCHASE_AMOUNT", "CHANGE_PURCHASE_MONTH",
      "EXPLAIN_SELECTED_RESULT", "SELECT_EXISTING_SCENARIO", "HELP", "GREETING",
      "UNSUPPORTED", "AMBIGUOUS"
    ] },
    amountQuote: nullableString,
    currency: { anyOf: [{ type: "string", enum: ["GBP", "UNSUPPORTED"] }, { type: "null" }] },
    timingQuote: nullableString,
    timingKind: { type: "string", enum: [
      "NEXT_MONTH", "MONTHS_AFTER_SELECTED", "NAMED_MONTH", "EXPLICIT_YEAR_MONTH", "MISSING", "AMBIGUOUS"
    ] },
    timingMonthNumber: nullableInteger,
    timingYear: nullableInteger,
    timingOffsetMonths: nullableInteger,
    purposeQuote: nullableString,
    referencedScenarioLabel: nullableString,
    missingFields: { type: "array", items: { type: "string" } },
    unsupportedFeatures: { type: "array", items: { type: "string" } },
    explanationTarget: { anyOf: [{ type: "string", enum: [
      "OVERALL_CLASSIFICATION", "SAFETY_BUFFER", "BUFFER_RECOVERY", "GOAL_DELAY",
      "BILLS", "BORROWING", "ASSUMPTIONS", "OTHER"
    ] }, { type: "null" }] },
    goalReferenceQuote: nullableString,
    scenarioReferenceQuote: nullableString,
    category: nullableString,
    userGoalSummary: nullableString,
    ambiguity: nullableString,
    clarificationKey: nullableString
  },
  required: [
    "kind", "amountQuote", "currency", "timingQuote", "timingKind", "timingMonthNumber",
    "timingYear", "timingOffsetMonths", "purposeQuote", "referencedScenarioLabel",
    "missingFields", "unsupportedFeatures", "explanationTarget", "goalReferenceQuote",
    "scenarioReferenceQuote", "category", "userGoalSummary", "ambiguity", "clarificationKey"
  ]
} as const;

const explanationParameters = {
  type: "object",
  additionalProperties: false,
  properties: {
    templateId: { type: "string", enum: [
      "PURCHASE_RESULT_SIGNIFICANT", "PURCHASE_RESULT_NOTICEABLE", "PURCHASE_RESULT_MINIMAL",
      "PURCHASE_RESULT_RISKY", "BUFFER_EXPLANATION", "GOAL_DELAY_EXPLANATION",
      "TIMING_NO_IMPROVEMENT", "CURRENT_PATH_SUMMARY"
    ] },
    primaryFactKey: { type: "string", enum: [
      "OVERALL_CLASSIFICATION", "BUFFER_REDUCTION", "BILLS_COVERED", "NO_BORROWING",
      "BUFFER_RECOVERY", "GOAL_DELAY", "TIMING_NO_IMPROVEMENT", "ASSUMPTIONS", "CURRENT_PATH"
    ] },
    orderedFactKeys: { type: "array", items: { type: "string", enum: [
      "OVERALL_CLASSIFICATION", "BUFFER_REDUCTION", "BILLS_COVERED", "NO_BORROWING",
      "BUFFER_RECOVERY", "GOAL_DELAY", "TIMING_NO_IMPROVEMENT", "ASSUMPTIONS", "CURRENT_PATH"
    ] } },
    caveatKeys: { type: "array", items: { type: "string", enum: [
      "ASSUMED_TIMING", "HYPOTHETICAL_ONLY", "CALENDAR_FALLBACK"
    ] } },
    followUpActionKeys: { type: "array", items: { type: "string", enum: [
      "TRY_LOWER_AMOUNT", "TRY_ANOTHER_MONTH", "VIEW_ASSUMPTIONS", "VIEW_CURRENT_PATH"
    ] } },
    tone: { type: "string", enum: ["CLEAR", "SUPPORTIVE", "DIRECT"] }
  },
  required: [
    "templateId", "primaryFactKey", "orderedFactKeys", "caveatKeys", "followUpActionKeys", "tone"
  ]
} as const;

const envelopeSchema = z.object({
  kind: z.enum([
    "CREATE_ONE_OFF_PURCHASE", "CHANGE_PURCHASE_AMOUNT", "CHANGE_PURCHASE_MONTH",
    "EXPLAIN_SELECTED_RESULT", "SELECT_EXISTING_SCENARIO", "HELP", "GREETING",
    "UNSUPPORTED", "AMBIGUOUS"
  ]),
  amountQuote: z.string().nullable(),
  currency: z.enum(["GBP", "UNSUPPORTED"]).nullable(),
  timingQuote: z.string().nullable(),
  timingKind: z.enum([
    "NEXT_MONTH", "MONTHS_AFTER_SELECTED", "NAMED_MONTH", "EXPLICIT_YEAR_MONTH", "MISSING", "AMBIGUOUS"
  ]),
  timingMonthNumber: z.number().int().min(1).max(12).nullable(),
  timingYear: z.number().int().min(2000).max(2200).nullable(),
  timingOffsetMonths: z.number().int().min(0).max(120).nullable(),
  purposeQuote: z.string().nullable(),
  referencedScenarioLabel: z.string().nullable(),
  missingFields: z.array(z.string()).max(4),
  unsupportedFeatures: z.array(z.string()).max(8),
  explanationTarget: z.enum([
    "OVERALL_CLASSIFICATION", "SAFETY_BUFFER", "BUFFER_RECOVERY", "GOAL_DELAY",
    "BILLS", "BORROWING", "ASSUMPTIONS", "OTHER"
  ]).nullable(),
  goalReferenceQuote: z.string().nullable(),
  scenarioReferenceQuote: z.string().nullable(),
  category: z.string().nullable(),
  userGoalSummary: z.string().nullable(),
  ambiguity: z.string().nullable(),
  clarificationKey: z.string().nullable()
}).strict();

function toInterpretation(value: z.infer<typeof envelopeSchema>): ConversationInterpretation {
  const amount = { quote: value.amountQuote, currency: value.currency };
  const timing = {
    quote: value.timingQuote,
    kind: value.timingKind,
    monthNumber: value.timingMonthNumber,
    year: value.timingYear,
    offsetMonths: value.timingOffsetMonths
  };
  switch (value.kind) {
    case "CREATE_ONE_OFF_PURCHASE":
      return { kind: value.kind, amount, timing, purposeQuote: value.purposeQuote, missingFields: value.missingFields, unsupportedFeatures: value.unsupportedFeatures };
    case "CHANGE_PURCHASE_AMOUNT":
      return { kind: value.kind, amount, referencedScenarioLabel: value.referencedScenarioLabel, missingFields: value.missingFields, unsupportedFeatures: value.unsupportedFeatures };
    case "CHANGE_PURCHASE_MONTH":
      return { kind: value.kind, timing, referencedScenarioLabel: value.referencedScenarioLabel, missingFields: value.missingFields, unsupportedFeatures: value.unsupportedFeatures };
    case "EXPLAIN_SELECTED_RESULT":
      if (!value.explanationTarget) throw new ConversationProviderError("INVALID_OUTPUT", true, "Explanation target missing.");
      return { kind: value.kind, explanationTarget: value.explanationTarget, goalReferenceQuote: value.goalReferenceQuote };
    case "SELECT_EXISTING_SCENARIO":
      return { kind: value.kind, scenarioReferenceQuote: value.scenarioReferenceQuote };
    case "HELP":
    case "GREETING":
      return { kind: value.kind };
    case "UNSUPPORTED":
      if (!value.category) throw new ConversationProviderError("INVALID_OUTPUT", true, "Unsupported category missing.");
      return { kind: value.kind, category: value.category, userGoalSummary: value.userGoalSummary };
    case "AMBIGUOUS":
      if (!value.ambiguity || !value.clarificationKey) throw new ConversationProviderError("INVALID_OUTPUT", true, "Ambiguity fields missing.");
      return { kind: value.kind, ambiguity: value.ambiguity, clarificationKey: value.clarificationKey };
  }
}

function providerError(error: unknown): ConversationProviderError {
  if (error instanceof ConversationProviderError) return error;
  const status = typeof error === "object" && error !== null && "status" in error
    ? Number((error as { status?: unknown }).status)
    : null;
  if (status === 429) return new ConversationProviderError("RATE_LIMIT", true, "The provider rate-limited the request.");
  if (status !== null && status >= 500) return new ConversationProviderError("UNAVAILABLE", true, "The provider is temporarily unavailable.");
  if (error instanceof Error && /timeout|timed out|abort/i.test(error.message)) {
    return new ConversationProviderError("TIMEOUT", true, "The provider request timed out.");
  }
  return new ConversationProviderError("UNAVAILABLE", true, "The provider request failed.");
}

export class OpenAIResponsesConversationModelProvider implements ConversationModelProvider {
  private readonly client: OpenAI;

  constructor(
    apiKey: string,
    private readonly model: string,
    timeoutMs = 12_000
  ) {
    this.client = new OpenAI({ apiKey, timeout: timeoutMs, maxRetries: 0 });
  }

  private async forcedCall(
    toolName: string,
    instructions: string,
    input: unknown,
    parameters: typeof interpretationParameters | typeof explanationParameters,
    parse: (value: unknown) => ConversationInterpretation | ExplanationPlan
  ): Promise<{ value: ConversationInterpretation | ExplanationPlan; attempts: number }> {
    let lastError: ConversationProviderError | null = null;
    for (let attempt = 1; attempt <= 2; attempt += 1) {
      try {
        const response = await this.client.responses.create({
          model: this.model,
          instructions,
          input: JSON.stringify(input),
          tools: [{
            type: "function",
            name: toolName,
            description: "Return the validated Future You structured decision.",
            parameters,
            strict: true
          }],
          tool_choice: { type: "function", name: toolName },
          parallel_tool_calls: false,
          store: false,
          max_output_tokens: 1200
        });
        const calls = response.output.filter((item) => item.type === "function_call");
        if (calls.length !== 1) {
          throw new ConversationProviderError(
            calls.length > 1 ? "MULTIPLE_TOOL_CALLS" : "INVALID_OUTPUT",
            calls.length === 0,
            "The provider did not return exactly one function call."
          );
        }
        const call = calls[0]!;
        if (call.name !== toolName) {
          throw new ConversationProviderError("UNKNOWN_TOOL", false, "The provider returned an unknown tool.");
        }
        let argumentsValue: unknown;
        try {
          argumentsValue = JSON.parse(call.arguments);
        } catch {
          throw new ConversationProviderError("INVALID_OUTPUT", true, "The provider returned invalid JSON arguments.");
        }
        let parsed: ConversationInterpretation | ExplanationPlan;
        try {
          parsed = parse(argumentsValue);
        } catch (error) {
          if (error instanceof ConversationProviderError) throw error;
          throw new ConversationProviderError("INVALID_OUTPUT", true, "The provider arguments failed runtime validation.");
        }
        return { value: parsed, attempts: attempt };
      } catch (error) {
        lastError = providerError(error);
        if (!lastError.retryable || attempt === 2) {
          throw new ConversationProviderError(
            lastError.category,
            lastError.retryable,
            lastError.message,
            attempt
          );
        }
      }
    }
    throw lastError ?? new ConversationProviderError("UNAVAILABLE", true, "The provider request failed.");
  }

  async interpret(request: InterpretationProviderRequest): Promise<ProviderResult<ConversationInterpretation>> {
    const result = await this.forcedCall(
      INTERPRET_TOOL,
      INTERPRETATION_PROMPT,
      request,
      interpretationParameters,
      (value) => toInterpretation(envelopeSchema.parse(value))
    );
    return { value: result.value as ConversationInterpretation, metadata: { provider: "openai", model: this.model, attempts: result.attempts } };
  }

  async planExplanation(request: ExplanationProviderRequest): Promise<ProviderResult<ExplanationPlan>> {
    const result = await this.forcedCall(
      EXPLANATION_TOOL,
      EXPLANATION_PROMPT,
      request,
      explanationParameters,
      (value) => explanationPlanSchema.parse(value)
    );
    return { value: result.value as ExplanationPlan, metadata: { provider: "openai", model: this.model, attempts: result.attempts } };
  }
}
