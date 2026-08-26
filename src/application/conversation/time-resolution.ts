import type { TimingInterpretation } from "./contracts";
import { ConversationApplicationError } from "./application-error";
import { sourceContainsQuote } from "./exact-source-grounding";
import {
  completeTimingInterpretationSchema,
  timingQuoteEquivalenceIssues
} from "./timing-policy";

export function trustedLondonDate(value: Date): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(value);
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}

function addMonths(year: number, month: number, offset: number): string {
  const zeroBased = year * 12 + month - 1 + offset;
  const resolvedYear = Math.floor(zeroBased / 12);
  const resolvedMonth = zeroBased % 12 + 1;
  return `${resolvedYear}-${String(resolvedMonth).padStart(2, "0")}`;
}

export function resolvePaymentPeriod(input: Readonly<{
  timing: TimingInterpretation;
  currentMessage: string;
  trustedDate: string;
  selectedPaymentPeriod: string | null;
  allowedPriorTiming: TimingInterpretation | null;
  enforceQuoteEquivalence?: boolean;
}>): string {
  const timing = input.timing;
  if (timing.kind === "MISSING" || timing.kind === "AMBIGUOUS" || !timing.quote) {
    throw new ConversationApplicationError("CONVERSATION_INPUT_INVALID", "The purchase month is missing or ambiguous.");
  }
  const groundedInCurrent = sourceContainsQuote(input.currentMessage, timing.quote);
  const groundedInPrior = input.allowedPriorTiming?.quote === timing.quote && input.allowedPriorTiming.kind === timing.kind;
  if (!groundedInCurrent && !groundedInPrior) {
    throw new ConversationApplicationError(
      "AI_INTERPRETATION_INVALID",
      "The interpreted timing could not be traced to the user's message."
    );
  }
  const completeTiming = completeTimingInterpretationSchema.safeParse(timing);
  if (input.enforceQuoteEquivalence !== false
    && (!completeTiming.success || timingQuoteEquivalenceIssues(completeTiming.data).length > 0)) {
    throw new ConversationApplicationError(
      "AI_INTERPRETATION_INVALID",
      "The interpreted timing fields did not match the grounded timing expression."
    );
  }
  const [trustedYearText, trustedMonthText] = input.trustedDate.split("-");
  const trustedYear = Number(trustedYearText);
  const trustedMonth = Number(trustedMonthText);
  if (timing.kind === "NEXT_MONTH") return addMonths(trustedYear, trustedMonth, 1);
  if (timing.kind === "MONTHS_AFTER_SELECTED") {
    if (!input.selectedPaymentPeriod || timing.offsetMonths === null) {
      throw new ConversationApplicationError("SCENARIO_REFERENCE_REQUIRED", "Select a purchase before changing its month.");
    }
    const [year, month] = input.selectedPaymentPeriod.split("-").map(Number);
    return addMonths(year!, month!, timing.offsetMonths);
  }
  if (timing.kind === "EXPLICIT_YEAR_MONTH") {
    if (timing.year === null || timing.monthNumber === null) {
      throw new ConversationApplicationError("AI_INTERPRETATION_INVALID", "The explicit purchase month was incomplete.");
    }
    return `${timing.year}-${String(timing.monthNumber).padStart(2, "0")}`;
  }
  if (timing.monthNumber === null) {
    throw new ConversationApplicationError("AI_INTERPRETATION_INVALID", "The named purchase month was incomplete.");
  }
  const year = timing.year ?? (timing.monthNumber >= trustedMonth ? trustedYear : trustedYear + 1);
  return `${year}-${String(timing.monthNumber).padStart(2, "0")}`;
}
