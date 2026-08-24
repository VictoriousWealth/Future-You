import type {
  ConversationInterpretation,
  ConversationModelProvider,
  ExplanationPlan,
  ExplanationProviderRequest,
  InterpretationProviderRequest,
  ProviderResult,
  TimingInterpretation
} from "../../application/conversation/contracts";
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

const MONTHS = [
  "january", "february", "march", "april", "may", "june",
  "july", "august", "september", "october", "november", "december"
] as const;

function metadata(attempts = 1) {
  return { provider: "fake", model: "fake-conversation/1.0.0", attempts } as const;
}

function amountFrom(message: string) {
  const match = message.match(/(?:£\s*)?\d+(?:\.\d{1,2})?(?:\s*(?:quid|pounds?))?/i);
  return {
    quote: match?.[0]?.trim() ?? null,
    currency: match ? "GBP" as const : null
  };
}

function timingFrom(message: string): TimingInterpretation {
  const lower = message.toLowerCase();
  if (/next\s+month|nxt\s+month/.test(lower)) {
    const quote = message.match(/next\s+month|nxt\s+month/i)?.[0] ?? "next month";
    return { quote, kind: "NEXT_MONTH", monthNumber: null, year: null, offsetMonths: 1 };
  }
  const explicit = message.match(/\b(20\d{2})-(0[1-9]|1[0-2])\b/);
  if (explicit) {
    return {
      quote: explicit[0], kind: "EXPLICIT_YEAR_MONTH",
      year: Number(explicit[1]), monthNumber: Number(explicit[2]), offsetMonths: null
    };
  }
  const namedMonths = MONTHS
    .map((month, index) => ({ month, index }))
    .filter(({ month }) => lower.includes(month));
  if (namedMonths.length > 1) {
    const quote = namedMonths
      .map(({ month }) => message.match(new RegExp(month, "i"))?.[0] ?? month)
      .join(" or ");
    return {
      quote,
      kind: "AMBIGUOUS",
      monthNumber: null,
      year: null,
      offsetMonths: null
    };
  }
  const namedIndex = namedMonths[0]?.index ?? -1;
  if (namedIndex >= 0) {
    return {
      quote: message.match(new RegExp(MONTHS[namedIndex]!, "i"))?.[0] ?? MONTHS[namedIndex]!,
      kind: "NAMED_MONTH", monthNumber: namedIndex + 1, year: null, offsetMonths: null
    };
  }
  const later = message.match(/(?:one|1)\s+month\s+later|wait\s+(?:one|1)\s+month/i);
  if (later) {
    return { quote: later[0], kind: "MONTHS_AFTER_SELECTED", monthNumber: null, year: null, offsetMonths: 1 };
  }
  return { quote: null, kind: "MISSING", monthNumber: null, year: null, offsetMonths: null };
}

function unsupportedCategory(message: string): string | null {
  const lower = message.toLowerCase();
  if (/instal+ments?|split\s+payment/.test(lower)) return "UNSUPPORTED_PAYMENT_PATTERN";
  if (/credit|overdraft|emergency savings|goal savings|mixed funding/.test(lower)) return "UNSUPPORTED_FUNDING_SOURCE";
  if (/substitut|instead of (?:my )?(?:normal|usual) spend/.test(lower)) return "UNSUPPORTED_COST_TREATMENT";
  if (/before payday|after payday/.test(lower)) return "UNSUPPORTED_INTRAMONTH_TIMING";
  if (/season.?ticket|pension|employer benefit|benefit/.test(lower)) return "UNSUPPORTED_BENEFIT";
  if (/stock|invest|debt optimisation|loan|prioriti[sz]|recommend|should i/.test(lower)) return "UNSUPPORTED_ADVICE";
  if (/search the web|google|find online/.test(lower)) return "UNSUPPORTED_EXTERNAL_TOOL";
  if (/rent .*every month|rent every month|recurring|commit (?:it|this)|make it real|save first/.test(lower)) return "UNSUPPORTED_SCENARIO";
  if (/ignore (?:all |your )?instructions|reveal (?:the )?(?:system )?prompt|friend'?s account|return a £?2,?000 buffer|calculate it yourself/.test(lower)) return "UNSUPPORTED_OVERRIDE";
  return null;
}

function purposeFrom(message: string): string | null {
  const purpose = message.match(/\b(trip|holiday|laptop|phone|bike|festival|purchase|something)\b/i);
  return purpose?.[0] ?? null;
}

function normalInterpretation(request: InterpretationProviderRequest): ConversationInterpretation {
  const message = request.userMessage.trim();
  const lower = message.toLowerCase();
  const unsupported = unsupportedCategory(message);
  if (unsupported) return { kind: "UNSUPPORTED", category: unsupported, userGoalSummary: null };
  if (/^(hi|hello|hey|good (?:morning|afternoon|evening))[!. ]*$/i.test(message)) return { kind: "GREETING" };
  if (/what can you do|help me|^help[!. ]*$/i.test(message)) return { kind: "HELP" };
  if (/show (?:me )?my current path|go back to (?:my )?current path|current path/i.test(lower)) {
    return { kind: "SELECT_EXISTING_SCENARIO", scenarioReferenceQuote: "current path" };
  }
  if (/why|how did|explain/.test(lower)) {
    const explanationTarget = /emergency|goal|deposit|holiday/.test(lower)
      ? "GOAL_DELAY"
      : /buffer/.test(lower)
        ? "SAFETY_BUFFER"
        : /bill/.test(lower)
          ? "BILLS"
          : /overdraft|borrow/.test(lower)
            ? "BORROWING"
            : "OVERALL_CLASSIFICATION";
    return {
      kind: "EXPLAIN_SELECTED_RESULT",
      explanationTarget,
      goalReferenceQuote: message.match(/emergency fund|house deposit|holiday/i)?.[0] ?? null
    };
  }

  if (request.pendingClarification?.type === "PURCHASE_AMOUNT") {
    const amount = amountFrom(message);
    return {
      kind: "CREATE_ONE_OFF_PURCHASE",
      amount,
      timing: request.pendingClarification.partialTiming,
      purposeQuote: request.pendingClarification.partialPurpose,
      missingFields: amount.quote ? [] : ["purchaseAmount"],
      unsupportedFeatures: []
    };
  }
  if (request.pendingClarification?.type === "PURCHASE_MONTH") {
    const timing = timingFrom(message);
    return {
      kind: "CREATE_ONE_OFF_PURCHASE",
      amount: { quote: request.pendingClarification.amountQuote, currency: "GBP" },
      timing,
      purposeQuote: request.pendingClarification.partialPurpose,
      missingFields: timing.kind === "MISSING" ? ["purchaseMonth"] : [],
      unsupportedFeatures: []
    };
  }

  const amount = amountFrom(message);
  const timing = timingFrom(message);
  const hasSelected = request.availableScenarios.some((scenario) => scenario.selected);
  if (/(?:what|wat) (?:about|abt)|only cost|cheaper|option/i.test(lower) && amount.quote) {
    return {
      kind: "CHANGE_PURCHASE_AMOUNT", amount, referencedScenarioLabel: null,
      missingFields: hasSelected ? [] : ["scenarioReference"], unsupportedFeatures: []
    };
  }
  if (/what if i (?:wait|w8)|try it|month later|instead|go in/i.test(lower) && timing.kind !== "MISSING") {
    return {
      kind: "CHANGE_PURCHASE_MONTH", timing, referencedScenarioLabel: null,
      missingFields: hasSelected ? [] : ["scenarioReference"], unsupportedFeatures: []
    };
  }
  const explicitScenario = request.availableScenarios.find((scenario) =>
    lower.includes(scenario.label.toLowerCase())
  );
  if (/show|open|go back/.test(lower) && explicitScenario) {
    return { kind: "SELECT_EXISTING_SCENARIO", scenarioReferenceQuote: explicitScenario.label };
  }
  if (/show|open|go back/.test(lower) && amount.quote) {
    return { kind: "SELECT_EXISTING_SCENARIO", scenarioReferenceQuote: amount.quote };
  }
  if (/afford|spend|buy|cost|trip|holiday|laptop|would .* be okay/.test(lower)) {
    const missingFields = [
      ...(amount.quote ? [] : ["purchaseAmount"]),
      ...(timing.kind === "MISSING" || timing.kind === "AMBIGUOUS" ? ["purchaseMonth"] : [])
    ];
    return {
      kind: "CREATE_ONE_OFF_PURCHASE", amount, timing, purposeQuote: purposeFrom(message),
      missingFields, unsupportedFeatures: []
    };
  }
  return { kind: "AMBIGUOUS", ambiguity: "The request did not identify a supported action.", clarificationKey: "SUPPORTED_ACTION" };
}

export class FakeConversationModelProvider implements ConversationModelProvider {
  readonly observedInterpretationRequests: InterpretationProviderRequest[] = [];
  readonly observedExplanationRequests: ExplanationProviderRequest[] = [];

  constructor(private readonly mode: FakeProviderMode = "normal") {}

  async interpret(request: InterpretationProviderRequest): Promise<ProviderResult<ConversationInterpretation>> {
    this.observedInterpretationRequests.push(structuredClone(request));
    if (this.mode === "timeout") throw new ConversationProviderError("TIMEOUT", true, "Fake timeout.");
    if (this.mode === "rate_limit") throw new ConversationProviderError("RATE_LIMIT", true, "Fake rate limit.");
    if (this.mode === "provider_failure") throw new ConversationProviderError("UNAVAILABLE", true, "Fake provider failure.");
    if (this.mode === "invalid_schema") throw new ConversationProviderError("INVALID_OUTPUT", true, "Fake invalid output.");
    if (this.mode === "unknown_tool") throw new ConversationProviderError("UNKNOWN_TOOL", false, "Fake unknown tool.");
    if (this.mode === "multiple_tool_calls") throw new ConversationProviderError("MULTIPLE_TOOL_CALLS", false, "Fake multiple calls.");
    return { value: normalInterpretation(request), metadata: metadata() };
  }

  async planExplanation(request: ExplanationProviderRequest): Promise<ProviderResult<ExplanationPlan>> {
    this.observedExplanationRequests.push(structuredClone(request));
    if (this.mode === "explanation_failure") {
      throw new ConversationProviderError("UNAVAILABLE", true, "Fake explanation failure.");
    }
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
        templateId: preferred,
        primaryFactKey: primary,
        orderedFactKeys: request.availableFactKeys,
        caveatKeys: ["HYPOTHETICAL_ONLY", "ASSUMED_TIMING"],
        followUpActionKeys: ["TRY_LOWER_AMOUNT", "TRY_ANOTHER_MONTH", "VIEW_CURRENT_PATH"],
        tone: "CLEAR"
      },
      metadata: metadata()
    };
  }
}
