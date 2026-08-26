import type { CompleteTimingInterpretation } from "../../src/application/conversation/timing-policy";
import type { InterpretationDiagnosticCode } from "../../src/infrastructure/ai/openai/interpretation-diagnostics";

export const CONVERSATION_TIMING_CORPUS_V3_VERSION = "fy-conversation-timing-evaluation/3.0.0" as const;

export interface ConversationTimingEvaluationCaseV3 {
  readonly id: string;
  readonly message: string;
  readonly branch: "CREATE_ONE_OFF_PURCHASE" | "CHANGE_PURCHASE_MONTH" | "RESOLVE_PURCHASE_MONTH" | "UNSUPPORTED";
  readonly timing: unknown;
  readonly expectedTimingKind: CompleteTimingInterpretation["kind"] | null;
  readonly expectedFields: Readonly<{
    monthNumber: number | null;
    year: number | null;
    offsetMonths: number | null;
  }> | null;
  readonly expectedDiagnostic: InterpretationDiagnosticCode | null;
  readonly simulatorPermitted: boolean;
  readonly selectedScenarioRequired: boolean;
  readonly selectedScenarioPresent: boolean;
  readonly selectedPaymentPeriod: string | null;
  readonly expectedResolvedMonth: string | null;
}

const nextMonth = {
  quote: "next month",
  kind: "NEXT_MONTH",
  monthNumber: null,
  year: null,
  offsetMonths: 1
} as const;

export const conversationTimingEvaluationCorpusV3 = [
  { id: "v3-canonical-next-month", message: "Can I afford a £650 trip next month?", branch: "CREATE_ONE_OFF_PURCHASE", timing: nextMonth, expectedTimingKind: "NEXT_MONTH", expectedFields: { monthNumber: null, year: null, offsetMonths: 1 }, expectedDiagnostic: null, simulatorPermitted: true, selectedScenarioRequired: false, selectedScenarioPresent: false, selectedPaymentPeriod: null, expectedResolvedMonth: "2026-09" },
  { id: "v3-next-month-missing-offset", message: "Can I afford a £650 trip next month?", branch: "CREATE_ONE_OFF_PURCHASE", timing: { ...nextMonth, offsetMonths: undefined }, expectedTimingKind: "NEXT_MONTH", expectedFields: { monthNumber: null, year: null, offsetMonths: 1 }, expectedDiagnostic: "TIMING_OFFSET_REQUIRED", simulatorPermitted: false, selectedScenarioRequired: false, selectedScenarioPresent: false, selectedPaymentPeriod: null, expectedResolvedMonth: null },
  { id: "v3-next-month-explicit-month", message: "Can I afford a £650 trip next month?", branch: "CREATE_ONE_OFF_PURCHASE", timing: { ...nextMonth, monthNumber: 9 }, expectedTimingKind: "NEXT_MONTH", expectedFields: { monthNumber: null, year: null, offsetMonths: 1 }, expectedDiagnostic: "TIMING_MONTH_NUMBER_FORBIDDEN", simulatorPermitted: false, selectedScenarioRequired: false, selectedScenarioPresent: false, selectedPaymentPeriod: null, expectedResolvedMonth: null },
  { id: "v3-next-month-as-named", message: "Can I afford a £650 trip next month?", branch: "CREATE_ONE_OFF_PURCHASE", timing: { quote: "next month", kind: "NAMED_MONTH", monthNumber: 10, year: null, offsetMonths: null }, expectedTimingKind: "NAMED_MONTH", expectedFields: { monthNumber: 10, year: null, offsetMonths: null }, expectedDiagnostic: "TIMING_QUOTE_KIND_MISMATCH", simulatorPermitted: false, selectedScenarioRequired: false, selectedScenarioPresent: false, selectedPaymentPeriod: null, expectedResolvedMonth: null },
  { id: "v3-named-month-correct", message: "Can I afford a £650 trip in October?", branch: "CREATE_ONE_OFF_PURCHASE", timing: { quote: "October", kind: "NAMED_MONTH", monthNumber: 10, year: null, offsetMonths: null }, expectedTimingKind: "NAMED_MONTH", expectedFields: { monthNumber: 10, year: null, offsetMonths: null }, expectedDiagnostic: null, simulatorPermitted: true, selectedScenarioRequired: false, selectedScenarioPresent: false, selectedPaymentPeriod: null, expectedResolvedMonth: "2026-10" },
  { id: "v3-named-month-wrong-number", message: "Can I afford a £650 trip in October?", branch: "CREATE_ONE_OFF_PURCHASE", timing: { quote: "October", kind: "NAMED_MONTH", monthNumber: 9, year: null, offsetMonths: null }, expectedTimingKind: "NAMED_MONTH", expectedFields: { monthNumber: 10, year: null, offsetMonths: null }, expectedDiagnostic: "TIMING_MONTH_NUMBER_MISMATCH", simulatorPermitted: false, selectedScenarioRequired: false, selectedScenarioPresent: false, selectedPaymentPeriod: null, expectedResolvedMonth: null },
  { id: "v3-explicit-year-month-missing-year", message: "Can I afford a £650 trip in October 2027?", branch: "CREATE_ONE_OFF_PURCHASE", timing: { quote: "October 2027", kind: "EXPLICIT_YEAR_MONTH", monthNumber: 10, year: null, offsetMonths: null }, expectedTimingKind: "EXPLICIT_YEAR_MONTH", expectedFields: { monthNumber: 10, year: 2027, offsetMonths: null }, expectedDiagnostic: "TIMING_YEAR_REQUIRED", simulatorPermitted: false, selectedScenarioRequired: false, selectedScenarioPresent: false, selectedPaymentPeriod: null, expectedResolvedMonth: null },
  { id: "v3-explicit-year-month-wrong-year", message: "Can I afford a £650 trip in October 2027?", branch: "CREATE_ONE_OFF_PURCHASE", timing: { quote: "October 2027", kind: "EXPLICIT_YEAR_MONTH", monthNumber: 10, year: 2028, offsetMonths: null }, expectedTimingKind: "EXPLICIT_YEAR_MONTH", expectedFields: { monthNumber: 10, year: 2027, offsetMonths: null }, expectedDiagnostic: "TIMING_YEAR_MISMATCH", simulatorPermitted: false, selectedScenarioRequired: false, selectedScenarioPresent: false, selectedPaymentPeriod: null, expectedResolvedMonth: null },
  { id: "v3-months-after-no-selection", message: "Can I afford a £650 trip one month later?", branch: "CREATE_ONE_OFF_PURCHASE", timing: { quote: "one month later", kind: "MONTHS_AFTER_SELECTED", monthNumber: null, year: null, offsetMonths: 1 }, expectedTimingKind: "MONTHS_AFTER_SELECTED", expectedFields: { monthNumber: null, year: null, offsetMonths: 1 }, expectedDiagnostic: "TIMING_SELECTED_SCENARIO_REQUIRED", simulatorPermitted: false, selectedScenarioRequired: true, selectedScenarioPresent: false, selectedPaymentPeriod: null, expectedResolvedMonth: null },
  { id: "v3-months-after-wrong-offset", message: "What if I wait one month later?", branch: "CHANGE_PURCHASE_MONTH", timing: { quote: "one month later", kind: "MONTHS_AFTER_SELECTED", monthNumber: null, year: null, offsetMonths: 2 }, expectedTimingKind: "MONTHS_AFTER_SELECTED", expectedFields: { monthNumber: null, year: null, offsetMonths: 1 }, expectedDiagnostic: "TIMING_OFFSET_MISMATCH", simulatorPermitted: false, selectedScenarioRequired: true, selectedScenarioPresent: true, selectedPaymentPeriod: "2026-09", expectedResolvedMonth: null },
  { id: "v3-grounded-wrong-kind", message: "What if I wait one month later?", branch: "CHANGE_PURCHASE_MONTH", timing: { quote: "one month later", kind: "NEXT_MONTH", monthNumber: null, year: null, offsetMonths: 1 }, expectedTimingKind: "NEXT_MONTH", expectedFields: { monthNumber: null, year: null, offsetMonths: 1 }, expectedDiagnostic: "TIMING_QUOTE_KIND_MISMATCH", simulatorPermitted: false, selectedScenarioRequired: true, selectedScenarioPresent: true, selectedPaymentPeriod: "2026-09", expectedResolvedMonth: null },
  { id: "v3-grounded-incompatible-fields", message: "Can I afford a £650 trip in October?", branch: "CREATE_ONE_OFF_PURCHASE", timing: { quote: "October", kind: "NAMED_MONTH", monthNumber: 10, year: 2026, offsetMonths: null }, expectedTimingKind: "NAMED_MONTH", expectedFields: { monthNumber: 10, year: null, offsetMonths: null }, expectedDiagnostic: "TIMING_YEAR_FORBIDDEN", simulatorPermitted: false, selectedScenarioRequired: false, selectedScenarioPresent: false, selectedPaymentPeriod: null, expectedResolvedMonth: null },
  { id: "v3-noisy-next-month", message: "can i aford a £650 trip nxt month", branch: "CREATE_ONE_OFF_PURCHASE", timing: { ...nextMonth, quote: "nxt month" }, expectedTimingKind: "NEXT_MONTH", expectedFields: { monthNumber: null, year: null, offsetMonths: 1 }, expectedDiagnostic: null, simulatorPermitted: true, selectedScenarioRequired: false, selectedScenarioPresent: false, selectedPaymentPeriod: null, expectedResolvedMonth: "2026-09" },
  { id: "v3-noisy-named-month", message: "what if i w8 till october", branch: "CHANGE_PURCHASE_MONTH", timing: { quote: "october", kind: "NAMED_MONTH", monthNumber: 10, year: null, offsetMonths: null }, expectedTimingKind: "NAMED_MONTH", expectedFields: { monthNumber: 10, year: null, offsetMonths: null }, expectedDiagnostic: null, simulatorPermitted: true, selectedScenarioRequired: true, selectedScenarioPresent: true, selectedPaymentPeriod: "2026-09", expectedResolvedMonth: "2026-10" },
  { id: "v3-ambiguous-timing", message: "Can I afford a £650 trip in September or October?", branch: "CREATE_ONE_OFF_PURCHASE", timing: { quote: "September or October", kind: "NAMED_MONTH", monthNumber: 10, year: null, offsetMonths: null }, expectedTimingKind: "NAMED_MONTH", expectedFields: { monthNumber: 10, year: null, offsetMonths: null }, expectedDiagnostic: "TIMING_QUOTE_AMBIGUOUS", simulatorPermitted: false, selectedScenarioRequired: false, selectedScenarioPresent: false, selectedPaymentPeriod: null, expectedResolvedMonth: null },
  { id: "v3-timing-clarification", message: "Next month.", branch: "RESOLVE_PURCHASE_MONTH", timing: nextMonth, expectedTimingKind: "NEXT_MONTH", expectedFields: { monthNumber: null, year: null, offsetMonths: 1 }, expectedDiagnostic: null, simulatorPermitted: true, selectedScenarioRequired: false, selectedScenarioPresent: false, selectedPaymentPeriod: null, expectedResolvedMonth: "2026-09" },
  { id: "v3-timing-follow-up", message: "What if I wait one month later?", branch: "CHANGE_PURCHASE_MONTH", timing: { quote: "one month later", kind: "MONTHS_AFTER_SELECTED", monthNumber: null, year: null, offsetMonths: 1 }, expectedTimingKind: "MONTHS_AFTER_SELECTED", expectedFields: { monthNumber: null, year: null, offsetMonths: 1 }, expectedDiagnostic: null, simulatorPermitted: true, selectedScenarioRequired: true, selectedScenarioPresent: true, selectedPaymentPeriod: "2026-09", expectedResolvedMonth: "2026-10" },
  { id: "v3-unsupported-payday", message: "Can I pay £650 before payday?", branch: "UNSUPPORTED", timing: null, expectedTimingKind: null, expectedFields: null, expectedDiagnostic: "UNSUPPORTED_OPERATION_REJECTED", simulatorPermitted: false, selectedScenarioRequired: false, selectedScenarioPresent: false, selectedPaymentPeriod: null, expectedResolvedMonth: null }
] as const satisfies readonly ConversationTimingEvaluationCaseV3[];
