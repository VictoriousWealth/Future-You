import type {
  ConversationInterpretation,
  InterpretationProviderRequest,
  PendingClarification
} from "../../src/application/conversation/contracts";

export const SCENARIO_REFERENCE_CORPUS_VERSION = "fy-scenario-reference-corpus/1.0.0" as const;

export interface ScenarioReferenceEvaluationCase {
  readonly id: string;
  readonly message: string;
  readonly availableScenarios: InterpretationProviderRequest["availableScenarios"];
  readonly pendingClarification: PendingClarification | null;
  readonly expectedKind: ConversationInterpretation["kind"];
  readonly expectedAttemptedOperation: "CHANGE_PURCHASE_AMOUNT" | "CHANGE_PURCHASE_MONTH" | "EXPLAIN_SELECTED_RESULT" | null;
  readonly expectedEvidenceFamily: "AMOUNT_CHANGE" | "MONTH_CHANGE" | "RESULT_EXPLANATION" | "SCENARIO_SELECTION" | "NONE" | "MULTIPLE_OR_UNCERTAIN";
  readonly preservedAmountMinorUnits: string | null;
  readonly preservedTimingKind: "NEXT_MONTH" | "MONTHS_AFTER_SELECTED" | "NAMED_MONTH" | "EXPLICIT_YEAR_MONTH" | null;
  readonly preservedExplanationTarget: string | null;
  readonly repairExpectation: "NONE" | "SUCCEEDS" | "IDENTICAL_FAILURE" | "NEW_FAILURE";
  readonly simulatorInvocationPermitted: boolean;
  readonly pendingScenarioReferenceExpected: boolean;
}

const selected = [{ label: "£650 trip", scenarioType: "one_off_purchase" as const, selected: true }];
const explicitSummer = [{ label: "summer trip", scenarioType: "one_off_purchase" as const, selected: false }];
const unselected = [{ label: "£650 trip", scenarioType: "one_off_purchase" as const, selected: false }];
const multipleUnselected = [
  ...unselected,
  { label: "£400 option", scenarioType: "one_off_purchase" as const, selected: false }
];

const entry = (
  input: Omit<ScenarioReferenceEvaluationCase,
    "pendingClarification" | "repairExpectation" | "simulatorInvocationPermitted" | "pendingScenarioReferenceExpected"
  > & Partial<Pick<ScenarioReferenceEvaluationCase,
    "pendingClarification" | "repairExpectation" | "simulatorInvocationPermitted" | "pendingScenarioReferenceExpected"
  >>
): ScenarioReferenceEvaluationCase => ({
  pendingClarification: null,
  repairExpectation: "NONE",
  simulatorInvocationPermitted: false,
  pendingScenarioReferenceExpected: input.expectedKind === "CLARIFY_SCENARIO_REFERENCE",
  ...input
});

export const scenarioReferenceEvaluationCorpusV1: readonly ScenarioReferenceEvaluationCase[] = [
  entry({ id: "amount-selected", message: "What about £500?", availableScenarios: selected, expectedKind: "CHANGE_PURCHASE_AMOUNT", expectedAttemptedOperation: null, expectedEvidenceFamily: "AMOUNT_CHANGE", preservedAmountMinorUnits: "50000", preservedTimingKind: null, preservedExplanationTarget: null, simulatorInvocationPermitted: true }),
  entry({ id: "amount-explicit", message: "What about £500 for the summer trip?", availableScenarios: explicitSummer, expectedKind: "CHANGE_PURCHASE_AMOUNT", expectedAttemptedOperation: null, expectedEvidenceFamily: "AMOUNT_CHANGE", preservedAmountMinorUnits: "50000", preservedTimingKind: null, preservedExplanationTarget: null, simulatorInvocationPermitted: true }),
  entry({ id: "amount-no-scenarios", message: "What about £500?", availableScenarios: [], expectedKind: "CLARIFY_SCENARIO_REFERENCE", expectedAttemptedOperation: "CHANGE_PURCHASE_AMOUNT", expectedEvidenceFamily: "AMOUNT_CHANGE", preservedAmountMinorUnits: "50000", preservedTimingKind: null, preservedExplanationTarget: null }),
  entry({ id: "amount-one-unselected", message: "What about £500?", availableScenarios: unselected, expectedKind: "CLARIFY_SCENARIO_REFERENCE", expectedAttemptedOperation: "CHANGE_PURCHASE_AMOUNT", expectedEvidenceFamily: "AMOUNT_CHANGE", preservedAmountMinorUnits: "50000", preservedTimingKind: null, preservedExplanationTarget: null }),
  entry({ id: "amount-multiple-unselected", message: "wat abt £500", availableScenarios: multipleUnselected, expectedKind: "CLARIFY_SCENARIO_REFERENCE", expectedAttemptedOperation: "CHANGE_PURCHASE_AMOUNT", expectedEvidenceFamily: "AMOUNT_CHANGE", preservedAmountMinorUnits: "50000", preservedTimingKind: null, preservedExplanationTarget: null }),
  entry({ id: "amount-nonexistent-label", message: "What about £500 for the winter trip?", availableScenarios: explicitSummer, expectedKind: "CLARIFY_SCENARIO_REFERENCE", expectedAttemptedOperation: "CHANGE_PURCHASE_AMOUNT", expectedEvidenceFamily: "AMOUNT_CHANGE", preservedAmountMinorUnits: "50000", preservedTimingKind: null, preservedExplanationTarget: null }),
  entry({ id: "month-selected", message: "What if I wait until October?", availableScenarios: selected, expectedKind: "CHANGE_PURCHASE_MONTH", expectedAttemptedOperation: null, expectedEvidenceFamily: "MONTH_CHANGE", preservedAmountMinorUnits: null, preservedTimingKind: "NAMED_MONTH", preservedExplanationTarget: null, simulatorInvocationPermitted: true }),
  entry({ id: "month-explicit", message: "What if I wait until October for the summer trip?", availableScenarios: explicitSummer, expectedKind: "CHANGE_PURCHASE_MONTH", expectedAttemptedOperation: null, expectedEvidenceFamily: "MONTH_CHANGE", preservedAmountMinorUnits: null, preservedTimingKind: "NAMED_MONTH", preservedExplanationTarget: null, simulatorInvocationPermitted: true }),
  entry({ id: "month-no-scenario", message: "what if i w8 till october", availableScenarios: [], expectedKind: "CLARIFY_SCENARIO_REFERENCE", expectedAttemptedOperation: "CHANGE_PURCHASE_MONTH", expectedEvidenceFamily: "MONTH_CHANGE", preservedAmountMinorUnits: null, preservedTimingKind: "NAMED_MONTH", preservedExplanationTarget: null }),
  entry({ id: "explanation-selected", message: "Why did it delay my emergency fund?", availableScenarios: selected, expectedKind: "EXPLAIN_SELECTED_RESULT", expectedAttemptedOperation: null, expectedEvidenceFamily: "RESULT_EXPLANATION", preservedAmountMinorUnits: null, preservedTimingKind: null, preservedExplanationTarget: "GOAL_DELAY" }),
  entry({ id: "explanation-explicit", message: "Why did the summer trip delay my emergency fund?", availableScenarios: explicitSummer, expectedKind: "EXPLAIN_SELECTED_RESULT", expectedAttemptedOperation: null, expectedEvidenceFamily: "RESULT_EXPLANATION", preservedAmountMinorUnits: null, preservedTimingKind: null, preservedExplanationTarget: "GOAL_DELAY" }),
  entry({ id: "explanation-no-result", message: "Why did it delay my emergency fund?", availableScenarios: [], expectedKind: "CLARIFY_SCENARIO_REFERENCE", expectedAttemptedOperation: "EXPLAIN_SELECTED_RESULT", expectedEvidenceFamily: "RESULT_EXPLANATION", preservedAmountMinorUnits: null, preservedTimingKind: null, preservedExplanationTarget: "GOAL_DELAY" }),
  entry({ id: "current-path", message: "Show me my current path.", availableScenarios: [], expectedKind: "SELECT_EXISTING_SCENARIO", expectedAttemptedOperation: null, expectedEvidenceFamily: "SCENARIO_SELECTION", preservedAmountMinorUnits: null, preservedTimingKind: null, preservedExplanationTarget: null }),
  entry({ id: "genuine-ambiguity", message: "Can you compare it somehow?", availableScenarios: [], expectedKind: "AMBIGUOUS", expectedAttemptedOperation: null, expectedEvidenceFamily: "NONE", preservedAmountMinorUnits: null, preservedTimingKind: null, preservedExplanationTarget: null }),
  entry({ id: "mixed-unsupported", message: "What about £500 paid in four instalments?", availableScenarios: [], expectedKind: "UNSUPPORTED", expectedAttemptedOperation: null, expectedEvidenceFamily: "NONE", preservedAmountMinorUnits: null, preservedTimingKind: null, preservedExplanationTarget: null }),
  entry({ id: "cross-user-reference", message: "What about £500 for my friend's trip?", availableScenarios: [], expectedKind: "UNSUPPORTED", expectedAttemptedOperation: null, expectedEvidenceFamily: "NONE", preservedAmountMinorUnits: null, preservedTimingKind: null, preservedExplanationTarget: null }),
  entry({ id: "repair-success", message: "What about £500?", availableScenarios: [], expectedKind: "CLARIFY_SCENARIO_REFERENCE", expectedAttemptedOperation: "CHANGE_PURCHASE_AMOUNT", expectedEvidenceFamily: "AMOUNT_CHANGE", preservedAmountMinorUnits: "50000", preservedTimingKind: null, preservedExplanationTarget: null, repairExpectation: "SUCCEEDS" }),
  entry({ id: "repair-identical-failure", message: "What about £500?", availableScenarios: [], expectedKind: "CLARIFY_SCENARIO_REFERENCE", expectedAttemptedOperation: "CHANGE_PURCHASE_AMOUNT", expectedEvidenceFamily: "AMOUNT_CHANGE", preservedAmountMinorUnits: "50000", preservedTimingKind: null, preservedExplanationTarget: null, repairExpectation: "IDENTICAL_FAILURE" }),
  entry({ id: "repair-new-failure", message: "What about £500?", availableScenarios: [], expectedKind: "CLARIFY_SCENARIO_REFERENCE", expectedAttemptedOperation: "CHANGE_PURCHASE_AMOUNT", expectedEvidenceFamily: "AMOUNT_CHANGE", preservedAmountMinorUnits: "50000", preservedTimingKind: null, preservedExplanationTarget: null, repairExpectation: "NEW_FAILURE" })
] as const;
