import type {
  AmountInterpretation,
  ConversationInterpretation,
  ExplanationTarget,
  InterpretationProviderRequest,
  SupportedFollowUpEvidence
} from "./contracts";
import { exactMinorUnitsFromInterpretation, sourceContainsQuote } from "./exact-source-grounding";
import { parseGroundedTimingQuote, type CompleteTimingInterpretation } from "./timing-policy";

export const SUPPORTED_FOLLOW_UP_EVIDENCE_VERSION = "fy-supported-follow-up-evidence/1.0.0" as const;

export const SCENARIO_REFERENCE_PRECEDENCE_DIAGNOSTIC_CODE =
  "SCENARIO_REFERENCE_CLARIFICATION_REQUIRED" as const;
export const FOLLOW_UP_EVIDENCE_MISMATCH_DIAGNOSTIC_CODE =
  "FOLLOW_UP_EVIDENCE_MISMATCH" as const;

export type ExactScenarioReferenceIssue = Readonly<{
  code:
    | typeof SCENARIO_REFERENCE_PRECEDENCE_DIAGNOSTIC_CODE
    | typeof FOLLOW_UP_EVIDENCE_MISMATCH_DIAGNOSTIC_CODE;
  path: "/interpretation/kind" | "/interpretation/attemptedOperation";
  family: "AMOUNT_CHANGE" | "MONTH_CHANGE" | "RESULT_EXPLANATION";
}>;

const MONTH_NAMES = [
  "january", "february", "march", "april", "may", "june",
  "july", "august", "september", "october", "november", "december"
] as const;

const UNSUPPORTED_FOLLOW_UP_PATTERN = new RegExp([
  "instal+ments?", "split\\s+(?:it|this|the|my)?\\s*(?:into|payment)",
  "credit\\s+card", "overdraft", "borrow", "loan\\s+funding",
  "emergency\\s+savings", "goal\\s+savings", "mixed\\s+funding",
  "cut\\s+groceries", "instead\\s+of\\s+(?:my\\s+)?(?:normal|usual|routine)\\s+spend",
  "before\\s+payday", "after\\s+payday", "exact\\s+day",
  "season.?ticket", "employer\\s+benefit", "pension", "commit\\s+(?:it|this)",
  "make\\s+it\\s+real", "recurring", "stock", "crypto", "invest",
  "what\\s+should\\s+i\\s+(?:prioritise|prioritize)", "recommend", "best\\s+choice",
  "search\\s+the\\s+web", "system\\s+prompt", "api\\s+key", "friend'?s",
  "another\\s+user", "ignore\\s+.*instruction", "override\\s+.*result",
  "do\\s+not\\s+call\\s+.*tool", "don't\\s+call\\s+.*tool"
].join("|"), "i");

const AMOUNT_FOLLOW_UP_PATTERN = new RegExp([
  "(?:what|wat)\\s+(?:about|abt)",
  "what\\s+if\\s+it\\s+(?:only\\s+)?cost",
  "(?:only|instead)\\s+cost",
  "(?:cheaper|lower)\\s+(?:option|amount|price|one|it)",
  "(?:show|try|open)\\s+(?:me\\s+)?(?:the\\s+)?(?:£?\\s*\\d[^?.,;]*)\\s+option"
].join("|"), "i");

const MONTH_FOLLOW_UP_PATTERN = new RegExp([
  "what\\s+if\\s+i\\s+(?:wait|w8)",
  "try\\s+it",
  "(?:one|\\d{1,3})\\s+months?\\s+(?:later|after(?:wards)?)",
  "pay\\s+(?:it\\s+)?(?:next\\s+month|in\\s+[a-z]+)(?:\\s+instead)?",
  `go\\s+in\\s+(?:${MONTH_NAMES.join("|")})`
].join("|"), "i");

const EXPLANATION_FOLLOW_UP_PATTERN =
  /\b(?:why|how\s+(?:did|does|do|is|was|were)|what\s+(?:changed|caused)|explain)\b/i;

function amountFromMessage(message: string): Readonly<{
  amount: AmountInterpretation;
  amountMinorUnits: string;
}> | null | "MULTIPLE" {
  const matches = [
    ...message.matchAll(/£\s*(?:0|[1-9]\d*)(?:\.\d{1,2})?/gi),
    ...message.matchAll(/(?:0|[1-9]\d*)(?:\.\d{1,2})?\s*(?:quid|pounds?)/gi)
  ].map((match) => match[0].trim());
  if (matches.length === 0) {
    const bare = message.match(/\b(?:0|[1-9]\d*)(?:\.\d{1,2})?\b/);
    if (bare) matches.push(bare[0]);
  }
  const unique = [...new Set(matches.map((value) => value.toLocaleLowerCase("en-GB")))];
  if (unique.length !== 1) return unique.length > 1 ? "MULTIPLE" : null;
  const quote = matches[0]!;
  const amount = { quote, currency: "GBP" as const };
  try {
    return {
      amount,
      amountMinorUnits: exactMinorUnitsFromInterpretation(amount, message)
    };
  } catch {
    return null;
  }
}

function timingQuote(message: string, kind: CompleteTimingInterpretation["kind"]): string | null {
  if (kind === "NEXT_MONTH") return message.match(/(?:next|nxt)\s+month/i)?.[0] ?? null;
  if (kind === "MONTHS_AFTER_SELECTED") {
    return message.match(/(?:(?:\d{1,3}|one)\s+months?\s+(?:later|after(?:wards)?)|wait\s+(?:\d{1,3}|one)\s+months?)/i)?.[0] ?? null;
  }
  if (kind === "EXPLICIT_YEAR_MONTH") {
    return message.match(/\b(?:20\d{2}|21\d{2}|2200)-(?:0?[1-9]|1[0-2])\b/i)?.[0]
      ?? message.match(new RegExp(`\\b(?:${MONTH_NAMES.join("|")})\\s*,?\\s+(?:20\\d{2}|21\\d{2}|2200)\\b`, "i"))?.[0]
      ?? null;
  }
  return message.match(new RegExp(`\\b(?:${MONTH_NAMES.join("|")})\\b`, "i"))?.[0] ?? null;
}

function timingFromMessage(message: string): CompleteTimingInterpretation | null {
  const parsed = parseGroundedTimingQuote(message);
  if (parsed.status !== "PARSED") return null;
  const quote = timingQuote(message, parsed.kind);
  if (!quote) return null;
  return {
    quote,
    kind: parsed.kind,
    monthNumber: parsed.monthNumber,
    year: parsed.year,
    offsetMonths: parsed.offsetMonths
  };
}

function explanationFromMessage(message: string): Extract<SupportedFollowUpEvidence, {
  family: "RESULT_EXPLANATION";
}> {
  const lower = message.toLocaleLowerCase("en-GB");
  const goalReferenceQuote = message.match(/emergency fund|house deposit|holiday|(?:my\s+)?goal/i)?.[0] ?? null;
  const explanationTarget: ExplanationTarget = /emergency|goal|deposit|holiday/.test(lower)
    ? "GOAL_DELAY"
    : /recover|restored/.test(lower)
      ? "BUFFER_RECOVERY"
      : /buffer/.test(lower)
        ? "SAFETY_BUFFER"
        : /bill/.test(lower)
          ? "BILLS"
          : /overdraft|borrow/.test(lower)
            ? "BORROWING"
            : /assumption/.test(lower)
              ? "ASSUMPTIONS"
              : /timing|wait|month/.test(lower)
                ? "TIMING_EFFECT"
                : "OVERALL_CLASSIFICATION";
  return { family: "RESULT_EXPLANATION", explanationTarget, goalReferenceQuote };
}

/**
 * Deliberately bounded evidence extraction. This is not a general natural-language
 * interpreter and cannot authorise a simulator operation by itself.
 */
export function deriveSupportedFollowUpEvidence(message: string): SupportedFollowUpEvidence {
  if (UNSUPPORTED_FOLLOW_UP_PATTERN.test(message)) return { family: "NONE" };
  if (/(?:show|open|return to|go back to|switch to)(?: me)? (?:my )?current path/i.test(message)) {
    return { family: "SCENARIO_SELECTION", selectionTarget: "CURRENT_PATH" };
  }

  const candidates: SupportedFollowUpEvidence[] = [];
  if (AMOUNT_FOLLOW_UP_PATTERN.test(message)) {
    const amount = amountFromMessage(message);
    if (amount === "MULTIPLE") return { family: "MULTIPLE_OR_UNCERTAIN" };
    if (amount) candidates.push({ family: "AMOUNT_CHANGE", ...amount });
  }
  if (MONTH_FOLLOW_UP_PATTERN.test(message)) {
    const timing = timingFromMessage(message);
    if (timing) candidates.push({ family: "MONTH_CHANGE", timing });
  }
  if (EXPLANATION_FOLLOW_UP_PATTERN.test(message)) {
    candidates.push(explanationFromMessage(message));
  }
  if (candidates.length === 0) return { family: "NONE" };
  if (candidates.length > 1) return { family: "MULTIPLE_OR_UNCERTAIN" };
  return candidates[0]!;
}

export function hasResolvedScenarioReference(request: InterpretationProviderRequest): boolean {
  if (request.availableScenarios.some((scenario) => scenario.selected)) return true;
  return request.availableScenarios.some((scenario) => sourceContainsQuote(request.userMessage, scenario.label));
}

function attemptedOperationMatchesEvidence(
  value: Extract<ConversationInterpretation, { kind: "CLARIFY_SCENARIO_REFERENCE" }>,
  evidence: SupportedFollowUpEvidence,
  message: string
): boolean {
  const attempted = value.attemptedOperation;
  if (evidence.family === "AMOUNT_CHANGE") {
    if (attempted.kind !== "CHANGE_PURCHASE_AMOUNT") return false;
    try {
      return exactMinorUnitsFromInterpretation(attempted.amount, message) === evidence.amountMinorUnits;
    } catch {
      return false;
    }
  }
  if (evidence.family === "MONTH_CHANGE") {
    return attempted.kind === "CHANGE_PURCHASE_MONTH"
      && JSON.stringify(attempted.timing) === JSON.stringify(evidence.timing);
  }
  if (evidence.family === "RESULT_EXPLANATION") {
    return attempted.kind === "EXPLAIN_SELECTED_RESULT"
      && attempted.explanationTarget === evidence.explanationTarget
      && attempted.goalReferenceQuote === evidence.goalReferenceQuote;
  }
  return true;
}

/** Returns an issue only when scenario reference is deterministically the sole gap. */
export function exactScenarioReferenceIssue(
  value: ConversationInterpretation,
  request: InterpretationProviderRequest
): ExactScenarioReferenceIssue | null {
  const evidence = request.supportedFollowUpEvidence;
  if (!evidence || !["AMOUNT_CHANGE", "MONTH_CHANGE", "RESULT_EXPLANATION"].includes(evidence.family)) {
    return null;
  }
  if (request.pendingClarification !== null || hasResolvedScenarioReference(request)) return null;
  const family = evidence.family as ExactScenarioReferenceIssue["family"];
  if (value.kind === "UNSUPPORTED") return null;
  if (value.kind !== "CLARIFY_SCENARIO_REFERENCE") {
    return {
      code: SCENARIO_REFERENCE_PRECEDENCE_DIAGNOSTIC_CODE,
      path: "/interpretation/kind",
      family
    };
  }
  return attemptedOperationMatchesEvidence(value, evidence, request.userMessage)
    ? null
    : {
        code: FOLLOW_UP_EVIDENCE_MISMATCH_DIAGNOSTIC_CODE,
        path: "/interpretation/attemptedOperation",
        family
      };
}
