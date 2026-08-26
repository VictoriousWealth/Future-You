import { z } from "zod";

/** Canonical, server-owned timing contract for active conversational interpretation. */
export const CONVERSATION_TIMING_POLICY_VERSION = "fy-conversation-timing-policy/1.0.0" as const;

export const COMPLETE_TIMING_KINDS = [
  "NEXT_MONTH",
  "MONTHS_AFTER_SELECTED",
  "NAMED_MONTH",
  "EXPLICIT_YEAR_MONTH"
] as const;

export type CompleteTimingKind = typeof COMPLETE_TIMING_KINDS[number];

export const TIMING_MONTH_MIN = 1 as const;
export const TIMING_MONTH_MAX = 12 as const;
export const TIMING_YEAR_MIN = 2000 as const;
export const TIMING_YEAR_MAX = 2200 as const;
export const TIMING_OFFSET_MIN = 1 as const;
export const TIMING_OFFSET_MAX = 120 as const;
export const TIMING_QUOTE_MAX_LENGTH = 120 as const;

export type CompleteTimingInterpretation = Readonly<{
  quote: string;
  kind: CompleteTimingKind;
  monthNumber: number | null;
  year: number | null;
  offsetMonths: number | null;
}>;

export type TimingIntentContext =
  | "CREATE_ONE_OFF_PURCHASE"
  | "CHANGE_PURCHASE_MONTH"
  | "CLARIFY_PURCHASE_AMOUNT"
  | "CLARIFY_SCENARIO_REFERENCE_CHANGE_MONTH"
  | "RESOLVE_PURCHASE_MONTH_FOR_CREATE"
  | "RESOLVE_PURCHASE_MONTH_FOR_CHANGE";

export const TIMING_KIND_POLICY = Object.freeze({
  NEXT_MONTH: Object.freeze({
    description: "The quoted expression means the month after the trusted request month.",
    monthNumber: "NULL",
    year: "NULL",
    offsetMonths: "ONE",
    requiresSelectedScenario: false
  }),
  MONTHS_AFTER_SELECTED: Object.freeze({
    description: "The quoted expression moves the selected scenario by a positive number of months.",
    monthNumber: "NULL",
    year: "NULL",
    offsetMonths: "POSITIVE_BOUNDED",
    requiresSelectedScenario: true
  }),
  NAMED_MONTH: Object.freeze({
    description: "The quoted expression names a month without a year; the server chooses the next occurrence.",
    monthNumber: "MONTH",
    year: "NULL",
    offsetMonths: "NULL",
    requiresSelectedScenario: false
  }),
  EXPLICIT_YEAR_MONTH: Object.freeze({
    description: "The quoted expression supplies both an approved year and month.",
    monthNumber: "MONTH",
    year: "YEAR",
    offsetMonths: "NULL",
    requiresSelectedScenario: false
  })
} as const);

const quote = z.string().min(1).max(TIMING_QUOTE_MAX_LENGTH);
const month = z.number().int().min(TIMING_MONTH_MIN).max(TIMING_MONTH_MAX);
const year = z.number().int().min(TIMING_YEAR_MIN).max(TIMING_YEAR_MAX);
const offset = z.number().int().min(TIMING_OFFSET_MIN).max(TIMING_OFFSET_MAX);

export const completeTimingInterpretationSchema = z.discriminatedUnion("kind", [
  z.object({
    quote,
    kind: z.literal("NEXT_MONTH"),
    monthNumber: z.null(),
    year: z.null(),
    offsetMonths: z.literal(1)
  }).strict(),
  z.object({
    quote,
    kind: z.literal("MONTHS_AFTER_SELECTED"),
    monthNumber: z.null(),
    year: z.null(),
    offsetMonths: offset
  }).strict(),
  z.object({
    quote,
    kind: z.literal("NAMED_MONTH"),
    monthNumber: month,
    year: z.null(),
    offsetMonths: z.null()
  }).strict(),
  z.object({
    quote,
    kind: z.literal("EXPLICIT_YEAR_MONTH"),
    monthNumber: month,
    year,
    offsetMonths: z.null()
  }).strict()
]);

const MONTHS = [
  "january", "february", "march", "april", "may", "june",
  "july", "august", "september", "october", "november", "december"
] as const;

const MONTH_NUMBER_BY_NAME = Object.freeze(Object.fromEntries(
  MONTHS.map((name, index) => [name, index + 1])
) as Readonly<Record<string, number>>);

export type ParsedTimingQuote =
  | Readonly<{
      status: "PARSED";
      kind: CompleteTimingKind;
      monthNumber: number | null;
      year: number | null;
      offsetMonths: number | null;
    }>
  | Readonly<{ status: "AMBIGUOUS" | "UNRECOGNISED" }>;

type TimingCandidate = Extract<ParsedTimingQuote, { status: "PARSED" }>;

function candidate(
  kind: CompleteTimingKind,
  monthNumber: number | null,
  yearValue: number | null,
  offsetMonths: number | null
): TimingCandidate {
  return { status: "PARSED", kind, monthNumber, year: yearValue, offsetMonths };
}

/**
 * Parses only the deliberately bounded timing language approved for C1E. It is not a
 * general natural-language date parser and it never reads the model's calendar.
 */
export function parseGroundedTimingQuote(sourceQuote: string): ParsedTimingQuote {
  const normalised = sourceQuote
    .normalize("NFKC")
    .toLocaleLowerCase("en-GB")
    .replace(/[’]/g, "'")
    .replace(/\s+/g, " ")
    .trim();
  if (!normalised) return { status: "UNRECOGNISED" };

  const candidates: TimingCandidate[] = [];
  const occupiedNamedMonths = new Set<string>();
  const namedPattern = MONTHS.join("|");

  const iso = normalised.match(/\b(20\d{2}|21\d{2}|2200)-(0?[1-9]|1[0-2])\b/);
  if (iso) {
    candidates.push(candidate("EXPLICIT_YEAR_MONTH", Number(iso[2]), Number(iso[1]), null));
  }

  const namedWithYear = normalised.match(new RegExp(`\\b(${namedPattern})\\s*,?\\s+(20\\d{2}|21\\d{2}|2200)\\b`));
  if (namedWithYear) {
    const name = namedWithYear[1]!;
    occupiedNamedMonths.add(name);
    candidates.push(candidate("EXPLICIT_YEAR_MONTH", MONTH_NUMBER_BY_NAME[name]!, Number(namedWithYear[2]), null));
  }

  const relative = normalised.match(/\b(?:(?:in\s+)?(\d{1,3}|one)\s+months?\s+(?:later|after(?:wards)?)|wait\s+(\d{1,3}|one)\s+months?)\b/);
  if (relative) {
    const offsetText = relative[1] ?? relative[2]!;
    const parsedOffset = offsetText === "one" ? 1 : Number(offsetText);
    if (parsedOffset >= TIMING_OFFSET_MIN && parsedOffset <= TIMING_OFFSET_MAX) {
      candidates.push(candidate("MONTHS_AFTER_SELECTED", null, null, parsedOffset));
    }
  }

  if (/\b(?:next|nxt)\s+month\b/.test(normalised)) {
    candidates.push(candidate("NEXT_MONTH", null, null, 1));
  }

  const namedMatches = [...normalised.matchAll(new RegExp(`\\b(${namedPattern})\\b`, "g"))];
  for (const match of namedMatches) {
    const name = match[1]!;
    if (!occupiedNamedMonths.has(name)) {
      candidates.push(candidate("NAMED_MONTH", MONTH_NUMBER_BY_NAME[name]!, null, null));
    }
  }

  const distinct = new Map(candidates.map((value) => [
    `${value.kind}:${value.monthNumber ?? "null"}:${value.year ?? "null"}:${value.offsetMonths ?? "null"}`,
    value
  ]));
  if (distinct.size === 1) return [...distinct.values()][0]!;
  if (distinct.size > 1 || /\b(?:or|either|sometime|whenever|later)\b/.test(normalised)) {
    return { status: "AMBIGUOUS" };
  }
  return { status: "UNRECOGNISED" };
}

export type TimingEquivalenceIssue =
  | "TIMING_QUOTE_UNRECOGNISED"
  | "TIMING_QUOTE_AMBIGUOUS"
  | "TIMING_QUOTE_KIND_MISMATCH"
  | "TIMING_MONTH_NUMBER_MISMATCH"
  | "TIMING_YEAR_MISMATCH"
  | "TIMING_OFFSET_MISMATCH";

export function timingQuoteEquivalenceIssues(
  timing: CompleteTimingInterpretation
): readonly TimingEquivalenceIssue[] {
  const parsed = parseGroundedTimingQuote(timing.quote);
  if (parsed.status !== "PARSED") {
    return [parsed.status === "UNRECOGNISED" ? "TIMING_QUOTE_UNRECOGNISED" : "TIMING_QUOTE_AMBIGUOUS"];
  }
  const issues: TimingEquivalenceIssue[] = [];
  if (parsed.kind !== timing.kind) issues.push("TIMING_QUOTE_KIND_MISMATCH");
  if (parsed.monthNumber !== timing.monthNumber) issues.push("TIMING_MONTH_NUMBER_MISMATCH");
  if (parsed.year !== timing.year) issues.push("TIMING_YEAR_MISMATCH");
  if (parsed.offsetMonths !== timing.offsetMonths) issues.push("TIMING_OFFSET_MISMATCH");
  return issues;
}

export function timingKindAllowedForIntent(kind: CompleteTimingKind, context: TimingIntentContext): boolean {
  if (kind !== "MONTHS_AFTER_SELECTED") return true;
  return context === "CHANGE_PURCHASE_MONTH"
    || context === "CLARIFY_SCENARIO_REFERENCE_CHANGE_MONTH"
    || context === "RESOLVE_PURCHASE_MONTH_FOR_CHANGE";
}

export const TIMING_POLICY_PROMPT_TABLE = `
Timing field contract:
- The provider returns semantic timing; the trusted server resolves the actual target calendar date.
- NEXT_MONTH: quote is required; monthNumber=null; year=null; offsetMonths=1.
- MONTHS_AFTER_SELECTED: quote is required; monthNumber=null; year=null; offsetMonths is 1..120; a selected scenario is required.
- NAMED_MONTH: quote is required; monthNumber is 1..12; year=null; offsetMonths=null.
- EXPLICIT_YEAR_MONTH: quote is required; monthNumber is 1..12; year is 2000..2200; offsetMonths=null.
The quote must occur in the user message and its deterministic meaning must agree with kind and every numeric field.`.trim();

export const TIMING_REPAIR_RULE_BY_CODE = Object.freeze({
  TIMING_KIND_REQUIRED: "Return one approved complete timing kind.",
  TIMING_QUOTE_REQUIRED: "Return a non-empty exact timing quote from the user message.",
  TIMING_QUOTE_NOT_GROUNDED: "Use an exact timing quote that occurs in the user message.",
  TIMING_QUOTE_UNRECOGNISED: "Use only an approved timing expression or choose the appropriate clarification branch.",
  TIMING_QUOTE_AMBIGUOUS: "Choose the appropriate clarification branch for an ambiguous timing expression.",
  TIMING_QUOTE_KIND_MISMATCH: "The timing kind and associated fields must match the deterministic meaning of the source-grounded quote.",
  TIMING_MONTH_NUMBER_REQUIRED: "Supply monthNumber for a named or explicit year-month expression.",
  TIMING_MONTH_NUMBER_FORBIDDEN: "Set monthNumber to null for this timing kind.",
  TIMING_MONTH_NUMBER_MISMATCH: "Make monthNumber match the quoted month.",
  TIMING_YEAR_REQUIRED: "Supply the quoted four-digit year for an explicit year-month expression.",
  TIMING_YEAR_FORBIDDEN: "Set year to null for this timing kind.",
  TIMING_YEAR_MISMATCH: "Make year match the year in the timing quote.",
  TIMING_OFFSET_REQUIRED: "Supply a positive offsetMonths within 1..120.",
  TIMING_OFFSET_FORBIDDEN: "Set offsetMonths to null for this timing kind.",
  TIMING_OFFSET_MUST_EQUAL_ONE: "For NEXT_MONTH, offsetMonths must equal 1; monthNumber and year must be null.",
  TIMING_OFFSET_MISMATCH: "Make offsetMonths match the numeric offset in the timing quote.",
  TIMING_SELECTED_SCENARIO_REQUIRED: "Use MONTHS_AFTER_SELECTED only when the server declares a selected scenario.",
  TIMING_KIND_NOT_ALLOWED_FOR_INTENT: "Use only a timing kind allowed for this intent branch.",
  TIMING_FIELDS_INCOMPATIBLE: "Return only the field combination defined for the selected timing kind."
} as const);
