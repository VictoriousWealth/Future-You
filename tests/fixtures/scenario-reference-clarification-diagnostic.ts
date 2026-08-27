import type {
  ConversationInterpretation,
  InterpretationProviderRequest
} from "../../src/application/conversation/contracts";

const noScenarioRequest = (userMessage: string): InterpretationProviderRequest => ({
  userMessage,
  pendingClarification: null,
  availableScenarios: [],
  selectedScenarioType: null,
  trustedDate: "2026-08-24",
  timezone: "Europe/London"
});

export interface MissingScenarioDiagnosticFixture {
  readonly id: "amount" | "timing" | "explanation";
  readonly request: InterpretationProviderRequest;
  readonly exactClarification: Extract<ConversationInterpretation, { kind: "CLARIFY_SCENARIO_REFERENCE" }>;
  readonly genericAmbiguity: Extract<ConversationInterpretation, { kind: "AMBIGUOUS" }>;
}

/**
 * C1G-only fixtures. They reproduce the two schema-valid branches for the same
 * message and no-scenario state; they are not production routing data.
 */
export const missingScenarioDiagnosticFixtures = [
  {
    id: "amount",
    request: noScenarioRequest("What about £500?"),
    exactClarification: {
      kind: "CLARIFY_SCENARIO_REFERENCE",
      attemptedOperation: {
        kind: "CHANGE_PURCHASE_AMOUNT",
        amount: { quote: "£500", currency: "GBP" }
      }
    },
    genericAmbiguity: { kind: "AMBIGUOUS", ambiguity: "UNCLEAR_SUPPORTED_ACTION" }
  },
  {
    id: "timing",
    request: noScenarioRequest("What if I wait until October?"),
    exactClarification: {
      kind: "CLARIFY_SCENARIO_REFERENCE",
      attemptedOperation: {
        kind: "CHANGE_PURCHASE_MONTH",
        timing: {
          quote: "October",
          kind: "NAMED_MONTH",
          monthNumber: 10,
          year: null,
          offsetMonths: null
        }
      }
    },
    genericAmbiguity: { kind: "AMBIGUOUS", ambiguity: "UNCLEAR_SUPPORTED_ACTION" }
  },
  {
    id: "explanation",
    request: noScenarioRequest("Why did it delay my goal?"),
    exactClarification: {
      kind: "CLARIFY_SCENARIO_REFERENCE",
      attemptedOperation: {
        kind: "EXPLAIN_SELECTED_RESULT",
        explanationTarget: "GOAL_DELAY",
        goalReferenceQuote: "my goal"
      }
    },
    genericAmbiguity: { kind: "AMBIGUOUS", ambiguity: "UNCLEAR_SUPPORTED_ACTION" }
  }
] as const satisfies readonly MissingScenarioDiagnosticFixture[];

const selectedScenarioRequest: InterpretationProviderRequest = {
  userMessage: "What about £500?",
  pendingClarification: null,
  availableScenarios: [{ label: "£650 trip", scenarioType: "one_off_purchase", selected: true }],
  selectedScenarioType: "one_off_purchase",
  trustedDate: "2026-08-24",
  timezone: "Europe/London"
};

export const representativeScenarioBranchFixtures = [
  {
    id: "correct-supported-follow-up",
    request: selectedScenarioRequest,
    value: {
      kind: "CHANGE_PURCHASE_AMOUNT",
      amount: { quote: "£500", currency: "GBP" },
      scenarioReferenceStrategy: "SELECTED_SCENARIO",
      scenarioReferenceQuote: null
    },
    expectedFailedStage: null,
    expectedApplicationCommandAuthorized: true
  },
  {
    id: "exact-scenario-clarification",
    request: missingScenarioDiagnosticFixtures[0].request,
    value: missingScenarioDiagnosticFixtures[0].exactClarification,
    expectedFailedStage: null,
    expectedApplicationCommandAuthorized: true
  },
  {
    id: "generic-ambiguity",
    request: missingScenarioDiagnosticFixtures[0].request,
    value: missingScenarioDiagnosticFixtures[0].genericAmbiguity,
    expectedFailedStage: null,
    expectedApplicationCommandAuthorized: true
  },
  {
    id: "unsupported",
    request: missingScenarioDiagnosticFixtures[0].request,
    value: { kind: "UNSUPPORTED", category: "OTHER_OUT_OF_SCOPE" },
    expectedFailedStage: null,
    expectedApplicationCommandAuthorized: false
  },
  {
    id: "wrong-supported-follow-up",
    request: missingScenarioDiagnosticFixtures[0].request,
    value: {
      kind: "CHANGE_PURCHASE_AMOUNT",
      amount: { quote: "£500", currency: "GBP" },
      scenarioReferenceStrategy: "SELECTED_SCENARIO",
      scenarioReferenceQuote: null
    },
    expectedFailedStage: "CONVERSATION_STATE_VALIDATION",
    expectedApplicationCommandAuthorized: false
  },
  {
    id: "selection",
    request: {
      ...missingScenarioDiagnosticFixtures[0].request,
      userMessage: "Show me my current path."
    },
    value: {
      kind: "SELECT_EXISTING_SCENARIO",
      selectionTarget: "CURRENT_PATH",
      scenarioLabelQuote: null
    },
    expectedFailedStage: null,
    expectedApplicationCommandAuthorized: true
  },
  {
    id: "explanation",
    request: {
      ...selectedScenarioRequest,
      userMessage: "Why did it delay my goal?"
    },
    value: {
      kind: "EXPLAIN_SELECTED_RESULT",
      explanationTarget: "GOAL_DELAY",
      goalReferenceQuote: "my goal",
      scenarioReferenceStrategy: "SELECTED_SCENARIO",
      scenarioReferenceQuote: null
    },
    expectedFailedStage: null,
    expectedApplicationCommandAuthorized: true
  }
] as const satisfies readonly Readonly<{
  id: string;
  request: InterpretationProviderRequest;
  value: ConversationInterpretation;
  expectedFailedStage: "CONVERSATION_STATE_VALIDATION" | null;
  expectedApplicationCommandAuthorized: boolean;
}>[];
