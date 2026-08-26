import type {
  ClarificationResolution,
  ClarificationResolutionProviderRequest,
  CompleteTimingInterpretation,
  ConversationInterpretation,
  ConversationModelProvider,
  ExplanationPlan,
  ExplanationProviderRequest,
  InterpretationProviderRequest,
  ProviderResult
} from "../../application/conversation/contracts";
import type { UnsupportedCategoryId } from "../../application/conversation/interpretation-policy";
import { ConversationProviderError } from "../../application/conversation/provider-error";

export type FakeProviderMode =
  | "normal"
  | "timeout"
  | "rate_limit"
  | "provider_failure"
  | "invalid_schema"
  | "unknown_tool"
  | "multiple_tool_calls"
  | "explanation_failure";

export type FakeInterpretationDiagnosticMode =
  | "missing_tool_call"
  | "wrong_tool_name"
  | "multiple_tool_calls"
  | "invalid_json"
  | "root_envelope_invalid"
  | "missing_root_interpretation"
  | "unknown_branch"
  | "missing_branch_field"
  | "field_type_invalid"
  | "null_not_allowed"
  | "extra_branch_field"
  | "invalid_exact_identifier"
  | "supported_intent_semantic_failure"
  | "explanation_target_incompatible"
  | "scenario_selection_target_incompatible"
  | "wrong_branch_for_conversation_state"
  | "amount_quote_not_grounded"
  | "amount_quote_not_parseable"
  | "timing_quote_not_grounded"
  | "scenario_label_quote_not_grounded"
  | "scenario_reference_unresolved"
  | "invented_scenario_id"
  | "unsupported_branch_with_command_data"
  | "cross_user_reference_rejected"
  | "unsupported_operation_rejected"
  | "invalid_clarification_kind"
  | "repair_succeeds"
  | "repair_repeats_same_failure"
  | "repair_produces_different_failure"
  | "repair_remains_invalid";

export const FAKE_INTERPRETATION_DIAGNOSTIC_MODES = [
  "missing_tool_call",
  "wrong_tool_name",
  "multiple_tool_calls",
  "invalid_json",
  "root_envelope_invalid",
  "missing_root_interpretation",
  "unknown_branch",
  "missing_branch_field",
  "field_type_invalid",
  "null_not_allowed",
  "extra_branch_field",
  "invalid_exact_identifier",
  "supported_intent_semantic_failure",
  "explanation_target_incompatible",
  "scenario_selection_target_incompatible",
  "wrong_branch_for_conversation_state",
  "amount_quote_not_grounded",
  "amount_quote_not_parseable",
  "timing_quote_not_grounded",
  "scenario_label_quote_not_grounded",
  "scenario_reference_unresolved",
  "invented_scenario_id",
  "unsupported_branch_with_command_data",
  "cross_user_reference_rejected",
  "unsupported_operation_rejected",
  "invalid_clarification_kind",
  "repair_succeeds",
  "repair_repeats_same_failure",
  "repair_produces_different_failure",
  "repair_remains_invalid"
] as const satisfies readonly FakeInterpretationDiagnosticMode[];

export interface FakeInterpretationDiagnosticFixture {
  readonly method: "INTERPRET" | "RESOLVE_AMOUNT_CLARIFICATION";
  readonly request: InterpretationProviderRequest | ClarificationResolutionProviderRequest;
  readonly responses: readonly Readonly<{
    output: readonly unknown[];
    usage?: Readonly<{ input_tokens: number; output_tokens: number; total_tokens: number }>;
  }>[];
}

const DIAGNOSTIC_INTERPRET_TOOL = "submit_conversation_interpretation_v2";
const DIAGNOSTIC_CLARIFICATION_TOOL = "submit_clarification_resolution";

function diagnosticEnvelope(overrides: Readonly<Record<string, unknown>> = {}): Record<string, unknown> {
  return {
    interpretation: {
      kind: "CREATE_ONE_OFF_PURCHASE",
      amount: { quote: "£650", currency: "GBP" },
      timing: {
        quote: "next month",
        kind: "NEXT_MONTH",
        monthNumber: null,
        year: null,
        offsetMonths: 1
      },
      purposeQuote: "trip",
      ...overrides
    }
  };
}

function diagnosticCall(
  value: unknown,
  name = DIAGNOSTIC_INTERPRET_TOOL
): Readonly<{ type: "function_call"; name: string; arguments: string }> {
  return { type: "function_call", name, arguments: JSON.stringify(value) };
}

const diagnosticRequest: InterpretationProviderRequest = {
  userMessage: "Can I afford a £650 trip next month?",
  pendingClarification: null,
  availableScenarios: [],
  selectedScenarioType: null,
  trustedDate: "2026-08-24",
  timezone: "Europe/London"
};

/**
 * Low-level deterministic provider fixtures for the evaluation-only diagnostic boundary.
 * Invalid values exist only in test process memory and are never suitable conversation results.
 */
export function fakeInterpretationDiagnosticFixture(
  mode: FakeInterpretationDiagnosticMode
): FakeInterpretationDiagnosticFixture {
  const response = (output: readonly unknown[]) => ({
    output,
    usage: { input_tokens: 10, output_tokens: 5, total_tokens: 15 }
  });
  const valid = response([diagnosticCall(diagnosticEnvelope())]);
  const missingAmount = response([diagnosticCall(diagnosticEnvelope({ amount: undefined }))]);
  const extraField = response([diagnosticCall(diagnosticEnvelope({ extraDecision: "untrusted" }))]);

  switch (mode) {
    case "missing_tool_call":
      return { method: "INTERPRET", request: diagnosticRequest, responses: [response([])] };
    case "wrong_tool_name":
      return { method: "INTERPRET", request: diagnosticRequest, responses: [response([diagnosticCall(diagnosticEnvelope(), "untrusted_tool")])] };
    case "multiple_tool_calls":
      return { method: "INTERPRET", request: diagnosticRequest, responses: [response([diagnosticCall(diagnosticEnvelope()), diagnosticCall(diagnosticEnvelope())])] };
    case "invalid_json":
      return {
        method: "INTERPRET",
        request: diagnosticRequest,
        responses: [response([{ type: "function_call", name: DIAGNOSTIC_INTERPRET_TOOL, arguments: "{" }])]
      };
    case "root_envelope_invalid":
      return { method: "INTERPRET", request: diagnosticRequest, responses: [response([diagnosticCall([])])] };
    case "missing_root_interpretation":
      return { method: "INTERPRET", request: diagnosticRequest, responses: [response([diagnosticCall({})])] };
    case "unknown_branch":
      return { method: "INTERPRET", request: diagnosticRequest, responses: [response([diagnosticCall({ interpretation: { kind: "UNTRUSTED_KIND" } })])] };
    case "missing_branch_field":
      return { method: "INTERPRET", request: diagnosticRequest, responses: [missingAmount] };
    case "field_type_invalid":
      return { method: "INTERPRET", request: diagnosticRequest, responses: [response([diagnosticCall(diagnosticEnvelope({ amount: { quote: 650, currency: "GBP" } }))])] };
    case "null_not_allowed":
      return { method: "INTERPRET", request: diagnosticRequest, responses: [response([diagnosticCall(diagnosticEnvelope({ amount: null }))])] };
    case "extra_branch_field":
      return { method: "INTERPRET", request: diagnosticRequest, responses: [extraField] };
    case "invalid_exact_identifier":
      return {
        method: "INTERPRET",
        request: diagnosticRequest,
        responses: [response([diagnosticCall({ interpretation: { kind: "UNSUPPORTED", category: "UNTRUSTED_CATEGORY" } })])]
      };
    case "supported_intent_semantic_failure":
      return {
        method: "INTERPRET",
        request: diagnosticRequest,
        responses: [response([diagnosticCall(diagnosticEnvelope({
          timing: { quote: "next month", kind: "NEXT_MONTH", monthNumber: null, year: null, offsetMonths: 2 }
        }))])]
      };
    case "explanation_target_incompatible":
      return {
        method: "INTERPRET",
        request: { ...diagnosticRequest, userMessage: "Why did this change?", availableScenarios: [{ label: "£650 trip", scenarioType: "one_off_purchase", selected: true }], selectedScenarioType: "one_off_purchase" },
        responses: [response([diagnosticCall({
          interpretation: {
            kind: "EXPLAIN_SELECTED_RESULT",
            explanationTarget: "UNTRUSTED_TARGET",
            goalReferenceQuote: null,
            scenarioReferenceStrategy: "SELECTED_SCENARIO",
            scenarioReferenceQuote: null
          }
        })])]
      };
    case "scenario_selection_target_incompatible":
      return {
        method: "INTERPRET",
        request: diagnosticRequest,
        responses: [response([diagnosticCall({
          interpretation: {
            kind: "SELECT_EXISTING_SCENARIO",
            selectionTarget: "UNTRUSTED_TARGET",
            scenarioLabelQuote: null
          }
        })])]
      };
    case "wrong_branch_for_conversation_state":
      return {
        method: "INTERPRET",
        request: diagnosticRequest,
        responses: [response([diagnosticCall({
          interpretation: {
            kind: "CHANGE_PURCHASE_AMOUNT",
            amount: { quote: "£650", currency: "GBP" },
            scenarioReferenceStrategy: "SELECTED_SCENARIO",
            scenarioReferenceQuote: null
          }
        })])]
      };
    case "amount_quote_not_grounded":
      return { method: "INTERPRET", request: diagnosticRequest, responses: [response([diagnosticCall(diagnosticEnvelope({ amount: { quote: "£999", currency: "GBP" } }))])] };
    case "amount_quote_not_parseable":
      return {
        method: "INTERPRET",
        request: { ...diagnosticRequest, userMessage: "Can I afford six hundred pounds next month?" },
        responses: [response([diagnosticCall(diagnosticEnvelope({ amount: { quote: "six hundred pounds", currency: "GBP" } }))])]
      };
    case "timing_quote_not_grounded":
      return {
        method: "INTERPRET",
        request: diagnosticRequest,
        responses: [response([diagnosticCall(diagnosticEnvelope({
          timing: { quote: "October", kind: "NAMED_MONTH", monthNumber: 10, year: null, offsetMonths: null }
        }))])]
      };
    case "scenario_label_quote_not_grounded":
      return {
        method: "INTERPRET",
        request: {
          ...diagnosticRequest,
          userMessage: "Show that option.",
          availableScenarios: [{ label: "£650 trip", scenarioType: "one_off_purchase", selected: false }]
        },
        responses: [response([diagnosticCall({
          interpretation: {
            kind: "SELECT_EXISTING_SCENARIO",
            selectionTarget: "EXPLICIT_SCENARIO_LABEL",
            scenarioLabelQuote: "£650 trip"
          }
        })])]
      };
    case "scenario_reference_unresolved":
      return {
        method: "INTERPRET",
        request: {
          ...diagnosticRequest,
          userMessage: "Open the £500 trip.",
          availableScenarios: [{ label: "£650 trip", scenarioType: "one_off_purchase", selected: false }]
        },
        responses: [response([diagnosticCall({
          interpretation: {
            kind: "SELECT_EXISTING_SCENARIO",
            selectionTarget: "EXPLICIT_SCENARIO_LABEL",
            scenarioLabelQuote: "£500 trip"
          }
        })])]
      };
    case "invented_scenario_id":
      return { method: "INTERPRET", request: diagnosticRequest, responses: [response([diagnosticCall(diagnosticEnvelope({ runId: "untrusted-run" }))])] };
    case "unsupported_branch_with_command_data":
      return {
        method: "INTERPRET",
        request: diagnosticRequest,
        responses: [response([diagnosticCall({
          interpretation: {
            kind: "UNSUPPORTED",
            category: "INSTALMENTS",
            amount: { quote: "£650", currency: "GBP" }
          }
        })])]
      };
    case "cross_user_reference_rejected":
      return {
        method: "INTERPRET",
        request: { ...diagnosticRequest, userMessage: "Use my friend's account." },
        responses: [response([diagnosticCall({ interpretation: { kind: "UNSUPPORTED", category: "CROSS_USER_OR_IDENTITY_ACCESS" } })])]
      };
    case "unsupported_operation_rejected":
      return {
        method: "INTERPRET",
        request: { ...diagnosticRequest, userMessage: "Split this into four instalments." },
        responses: [response([diagnosticCall({ interpretation: { kind: "UNSUPPORTED", category: "INSTALMENTS" } })])]
      };
    case "invalid_clarification_kind":
      return {
        method: "RESOLVE_AMOUNT_CLARIFICATION",
        request: {
          ...diagnosticRequest,
          userMessage: "£650",
          pendingClarification: {
            type: "PURCHASE_AMOUNT",
            originalMessageId: "diagnostic-original",
            partialPurpose: "trip",
            partialTiming: { quote: "next month", kind: "NEXT_MONTH", monthNumber: null, year: null, offsetMonths: 1 }
          }
        },
        responses: [response([diagnosticCall({
          resolution: {
            kind: "RESOLVE_PURCHASE_MONTH",
            timing: { quote: "October", kind: "NAMED_MONTH", monthNumber: 10, year: null, offsetMonths: null }
          }
        }, DIAGNOSTIC_CLARIFICATION_TOOL)])]
      };
    case "repair_succeeds":
      return { method: "INTERPRET", request: diagnosticRequest, responses: [missingAmount, valid] };
    case "repair_repeats_same_failure":
      return { method: "INTERPRET", request: diagnosticRequest, responses: [missingAmount, missingAmount] };
    case "repair_produces_different_failure":
      return { method: "INTERPRET", request: diagnosticRequest, responses: [missingAmount, extraField] };
    case "repair_remains_invalid":
      return {
        method: "INTERPRET",
        request: diagnosticRequest,
        responses: [
          response([{ type: "function_call", name: DIAGNOSTIC_INTERPRET_TOOL, arguments: "{" }]),
          response([diagnosticCall({})])
        ]
      };
  }
}

const MONTHS = [
  "january", "february", "march", "april", "may", "june",
  "july", "august", "september", "october", "november", "december"
] as const;

function metadata(attempts = 1) {
  return { provider: "fake", model: "fake-conversation/2.0.0", attempts } as const;
}

function amountFrom(message: string) {
  const match = message.match(/(?:£\s*)?\d+(?:\.\d{1,2})?(?:\s*(?:quid|pounds?))?/i);
  return match ? { quote: match[0].trim(), currency: "GBP" as const } : null;
}

function timingFrom(message: string): CompleteTimingInterpretation | null | "AMBIGUOUS" {
  const lower = message.toLowerCase();
  if (/next\s+month|nxt\s+month/.test(lower)) {
    const quote = message.match(/next\s+month|nxt\s+month/i)?.[0] ?? "next month";
    return { quote, kind: "NEXT_MONTH", monthNumber: null, year: null, offsetMonths: 1 };
  }
  const explicit = message.match(/\b(20\d{2})-(0[1-9]|1[0-2])\b/);
  if (explicit) {
    return { quote: explicit[0], kind: "EXPLICIT_YEAR_MONTH", year: Number(explicit[1]), monthNumber: Number(explicit[2]), offsetMonths: null };
  }
  const namedMonths = MONTHS.map((month, index) => ({ month, index })).filter(({ month }) => lower.includes(month));
  if (namedMonths.length > 1) return "AMBIGUOUS";
  const named = namedMonths[0];
  if (named) {
    return {
      quote: message.match(new RegExp(named.month, "i"))?.[0] ?? named.month,
      kind: "NAMED_MONTH", monthNumber: named.index + 1, year: null, offsetMonths: null
    };
  }
  const later = message.match(/(?:one|1)\s+month\s+later|wait\s+(?:one|1)\s+month/i);
  if (later) return { quote: later[0], kind: "MONTHS_AFTER_SELECTED", monthNumber: null, year: null, offsetMonths: 1 };
  return null;
}

export function unsupportedCategory(message: string): UnsupportedCategoryId | null {
  const lower = message.toLowerCase();
  if (/reveal|show|print|give me/.test(lower) && /system prompt|hidden prompt|api key|secret|token/.test(lower)) return "SECRET_OR_SYSTEM_PROMPT_REQUEST";
  if (/friend'?s|another user|other user|act as|select another user|someone else'?s/.test(lower)) return "CROSS_USER_OR_IDENTITY_ACCESS";
  if (/ignore .*instruction|override .*result|say i can afford|return a £?2,?000 buffer|pretend .*(?:buffer|saves?)|change (?:the )?(?:deterministic )?result/.test(lower)) return "RESULT_OR_AUTHORITY_OVERRIDE";
  if (/do not call .*tool|don't call .*tool|change .*schema|override .*tool|use a different tool/.test(lower)) return "PROMPT_OR_TOOL_OVERRIDE";
  if (/instal+ments?|split (?:this|it|the|my)?\s*(?:into|payment)|four payments/.test(lower)) return "INSTALMENTS";
  if (/season.?ticket|employer benefit|activate .*benefit|use .*benefit/.test(lower)) return "BENEFIT_SIMULATION_OR_ACTIVATION";
  if (/pension|contribution.*(?:3|5)%/.test(lower)) return "PENSION_CONTRIBUTION_CHANGE";
  if (/goal savings|emergency savings|house deposit.*(?:pay|fund)|save first/.test(lower)) return "GOAL_SAVINGS_FUNDING";
  if (/mixed funding|combine .*fund|part .*cash.*part|two sources/.test(lower)) return "MIXED_FUNDING";
  if (/credit card|overdraft|borrow|take out a loan|loan funding/.test(lower)) return "CREDIT_OR_OVERDRAFT_FUNDING";
  if (/substitut|instead of (?:my )?(?:normal|usual|routine) spend|cut groceries/.test(lower)) return "SPENDING_SUBSTITUTION";
  if (/before payday|after payday|exact day|payday/.test(lower)) return "INTRA_MONTH_PAYMENT_TIMING";
  if (/rent .*every month|rent changes|recurring|monthly expense change|salary changes every/.test(lower)) return "RECURRING_EXPENSE_CHANGE";
  if (/commit (?:it|this)|make it real|change my real financial context|apply this scenario/.test(lower)) return "SCENARIO_COMMITMENT";
  if (/stock|share should|invest|trading|crypto|fund should/.test(lower)) return "INVESTMENT_OR_TRADING_ADVICE";
  if (/what should i prioritise|what should i prioritize|recommend|best choice|what should i do/.test(lower)) return "GENERAL_FINANCIAL_RECOMMENDATION";
  if (/search the web|google|find online|upload|voice/.test(lower)) return "OTHER_OUT_OF_SCOPE";
  return null;
}

function purposeFrom(message: string): string | null {
  return message.match(/\b(trip|holiday|laptop|phone|bike|festival|purchase|something)\b/i)?.[0] ?? null;
}

function referenceStrategy(request: InterpretationProviderRequest, message: string) {
  const explicit = request.availableScenarios.find((scenario) => message.toLowerCase().includes(scenario.label.toLowerCase()));
  if (explicit) return { strategy: "EXPLICIT_SCENARIO_LABEL" as const, quote: explicit.label };
  if (request.availableScenarios.some((scenario) => scenario.selected)) {
    return { strategy: "SELECTED_SCENARIO" as const, quote: null };
  }
  return null;
}

export function interpretWithDeterministicFake(request: InterpretationProviderRequest): ConversationInterpretation {
  const message = request.userMessage.trim();
  const lower = message.toLowerCase();
  const unsupported = unsupportedCategory(message);
  if (unsupported) return { kind: "UNSUPPORTED", category: unsupported };

  const currentPathSelection = /(?:show|open|return to|go back to|switch to)(?: me)? (?:my )?current path/i.test(message);
  if (currentPathSelection) return { kind: "SELECT_EXISTING_SCENARIO", selectionTarget: "CURRENT_PATH", scenarioLabelQuote: null };

  const explicitScenario = request.availableScenarios.find((scenario) => lower.includes(scenario.label.toLowerCase()));
  if (/\b(?:show|open|return to|go back to|switch to)\b/i.test(message) && explicitScenario) {
    return { kind: "SELECT_EXISTING_SCENARIO", selectionTarget: "EXPLICIT_SCENARIO_LABEL", scenarioLabelQuote: explicitScenario.label };
  }
  if (/\b(?:show|open|return to|go back to|switch to)\b/i.test(message) && /selected|this (?:option|scenario)/i.test(message)) {
    return { kind: "SELECT_EXISTING_SCENARIO", selectionTarget: "SELECTED_SCENARIO", scenarioLabelQuote: null };
  }

  if (/why|how did|what changed|what caused|explain/.test(lower)) {
    const reference = referenceStrategy(request, message);
    if (!reference) return {
      kind: "CLARIFY_SCENARIO_REFERENCE",
      attemptedOperation: {
        kind: "EXPLAIN_SELECTED_RESULT",
        explanationTarget: "OVERALL_CLASSIFICATION",
        goalReferenceQuote: message.match(/emergency fund|house deposit|holiday/i)?.[0] ?? null
      }
    };
    const explanationTarget = /emergency|goal|deposit|holiday/.test(lower)
      ? "GOAL_DELAY" as const
      : /recover|restored/.test(lower)
        ? "BUFFER_RECOVERY" as const
        : /buffer/.test(lower)
          ? "SAFETY_BUFFER" as const
          : /bill/.test(lower)
            ? "BILLS" as const
            : /overdraft|borrow/.test(lower)
              ? "BORROWING" as const
              : /assumption/.test(lower)
                ? "ASSUMPTIONS" as const
                : /timing|wait|month/.test(lower)
                  ? "TIMING_EFFECT" as const
                  : "OVERALL_CLASSIFICATION" as const;
    return {
      kind: "EXPLAIN_SELECTED_RESULT", explanationTarget,
      goalReferenceQuote: message.match(/emergency fund|house deposit|holiday/i)?.[0] ?? null,
      scenarioReferenceStrategy: reference.strategy,
      scenarioReferenceQuote: reference.quote
    };
  }

  const amount = amountFrom(message);
  const timing = timingFrom(message);
  const reference = referenceStrategy(request, message);
  if (/(?:what|wat) (?:about|abt)|only cost|cheaper|option/i.test(lower) && amount) {
    if (!reference) return { kind: "CLARIFY_SCENARIO_REFERENCE", attemptedOperation: { kind: "CHANGE_PURCHASE_AMOUNT", amount } };
    return { kind: "CHANGE_PURCHASE_AMOUNT", amount, scenarioReferenceStrategy: reference.strategy, scenarioReferenceQuote: reference.quote };
  }
  if (/what if i (?:wait|w8)|try it|month later|instead|go in/i.test(lower) && timing && timing !== "AMBIGUOUS") {
    if (!reference) return { kind: "CLARIFY_SCENARIO_REFERENCE", attemptedOperation: { kind: "CHANGE_PURCHASE_MONTH", timing } };
    return { kind: "CHANGE_PURCHASE_MONTH", timing, scenarioReferenceStrategy: reference.strategy, scenarioReferenceQuote: reference.quote };
  }

  if (/afford|spend|buy|cost|trip|holiday|laptop|would .* be okay/.test(lower)) {
    if (!amount) return { kind: "CLARIFY_PURCHASE_AMOUNT", purposeQuote: purposeFrom(message), timing: timing === "AMBIGUOUS" ? null : timing };
    if (!timing || timing === "AMBIGUOUS") return { kind: "CLARIFY_PURCHASE_MONTH", amount, purposeQuote: purposeFrom(message) };
    return { kind: "CREATE_ONE_OFF_PURCHASE", amount, timing, purposeQuote: purposeFrom(message) };
  }

  if (/^(hi|hello|hey|good (?:morning|afternoon|evening))[!. ]*$/i.test(message)) return { kind: "GREETING" };
  if (/what can you do|help me|^help[!. ]*$/i.test(message)) return { kind: "HELP" };
  return { kind: "AMBIGUOUS", ambiguity: "UNCLEAR_SUPPORTED_ACTION" };
}

function resolveWithDeterministicFake(request: ClarificationResolutionProviderRequest): ClarificationResolution {
  const unsupported = unsupportedCategory(request.userMessage);
  if (unsupported) return { kind: "UNSUPPORTED", category: unsupported };
  if (request.pendingClarification.type === "PURCHASE_AMOUNT") {
    const amount = amountFrom(request.userMessage);
    return amount
      ? { kind: "RESOLVE_PURCHASE_AMOUNT", amount }
      : { kind: "AMBIGUOUS", ambiguity: "UNRECOGNISED_AMOUNT_EXPRESSION" };
  }
  if (request.pendingClarification.type === "PURCHASE_MONTH") {
    const timing = timingFrom(request.userMessage);
    return timing && timing !== "AMBIGUOUS"
      ? { kind: "RESOLVE_PURCHASE_MONTH", timing }
      : { kind: "AMBIGUOUS", ambiguity: "UNRECOGNISED_TIMING_EXPRESSION" };
  }
  if (/current path/i.test(request.userMessage)) {
    return { kind: "RESOLVE_SCENARIO_REFERENCE", selectionTarget: "CURRENT_PATH", scenarioLabelQuote: null };
  }
  const scenario = request.availableScenarios.find((candidate) =>
    request.userMessage.toLowerCase().includes(candidate.label.toLowerCase())
  );
  if (scenario) return { kind: "RESOLVE_SCENARIO_REFERENCE", selectionTarget: "EXPLICIT_SCENARIO_LABEL", scenarioLabelQuote: scenario.label };
  if (/selected|this (?:one|option|scenario)/i.test(request.userMessage) && request.availableScenarios.some((candidate) => candidate.selected)) {
    return { kind: "RESOLVE_SCENARIO_REFERENCE", selectionTarget: "SELECTED_SCENARIO", scenarioLabelQuote: null };
  }
  return { kind: "AMBIGUOUS", ambiguity: "UNRECOGNISED_SCENARIO_REFERENCE" };
}

export class FakeConversationModelProvider implements ConversationModelProvider {
  readonly observedInterpretationRequests: InterpretationProviderRequest[] = [];
  readonly observedClarificationRequests: ClarificationResolutionProviderRequest[] = [];
  readonly observedExplanationRequests: ExplanationProviderRequest[] = [];

  constructor(private readonly mode: FakeProviderMode = "normal") {}

  private failIfConfigured(): void {
    if (this.mode === "timeout") throw new ConversationProviderError("TIMEOUT", true, "Fake timeout.");
    if (this.mode === "rate_limit") throw new ConversationProviderError("RATE_LIMIT", true, "Fake rate limit.");
    if (this.mode === "provider_failure") throw new ConversationProviderError("UNAVAILABLE", true, "Fake provider failure.");
    if (this.mode === "invalid_schema") throw new ConversationProviderError("INVALID_OUTPUT", true, "Fake invalid output.");
    if (this.mode === "unknown_tool") throw new ConversationProviderError("UNKNOWN_TOOL", false, "Fake unknown tool.");
    if (this.mode === "multiple_tool_calls") throw new ConversationProviderError("MULTIPLE_TOOL_CALLS", false, "Fake multiple calls.");
  }

  async interpret(request: InterpretationProviderRequest): Promise<ProviderResult<ConversationInterpretation>> {
    this.observedInterpretationRequests.push(structuredClone(request));
    this.failIfConfigured();
    return { value: interpretWithDeterministicFake(request), metadata: metadata() };
  }

  async resolveClarification(request: ClarificationResolutionProviderRequest): Promise<ProviderResult<ClarificationResolution>> {
    this.observedClarificationRequests.push(structuredClone(request));
    this.failIfConfigured();
    return { value: resolveWithDeterministicFake(request), metadata: metadata() };
  }

  async planExplanation(request: ExplanationProviderRequest): Promise<ProviderResult<ExplanationPlan>> {
    this.observedExplanationRequests.push(structuredClone(request));
    if (this.mode === "explanation_failure") throw new ConversationProviderError("UNAVAILABLE", true, "Fake explanation failure.");
    const preferred = request.explanationTarget === "GOAL_DELAY"
      ? "GOAL_DELAY_EXPLANATION"
      : request.explanationTarget === "SAFETY_BUFFER"
        ? "BUFFER_EXPLANATION"
        : request.availableTemplateIds[0] ?? "PURCHASE_RESULT_SIGNIFICANT";
    const primary = request.explanationTarget === "GOAL_DELAY"
      ? "GOAL_DELAY"
      : request.explanationTarget === "SAFETY_BUFFER"
        ? "BUFFER_REDUCTION"
        : request.availableFactKeys[0] ?? "OVERALL_CLASSIFICATION";
    return {
      value: {
        templateId: preferred, primaryFactKey: primary,
        orderedFactKeys: request.availableFactKeys,
        caveatKeys: ["HYPOTHETICAL_ONLY", "ASSUMED_TIMING"],
        followUpActionKeys: ["TRY_LOWER_AMOUNT", "TRY_ANOTHER_MONTH", "VIEW_CURRENT_PATH"],
        tone: "CLEAR"
      },
      metadata: metadata()
    };
  }
}
