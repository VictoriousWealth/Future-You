/**
 * Canonical, server-owned identifiers for the v2 conversation interpretation contract.
 * Provider schemas, prompts, runtime validators, render mappings and evaluation fixtures
 * import these values so the accepted vocabulary cannot drift silently.
 */
export const INTERPRETATION_INTENT_IDS = [
  "CREATE_ONE_OFF_PURCHASE",
  "CHANGE_PURCHASE_AMOUNT",
  "CHANGE_PURCHASE_MONTH",
  "EXPLAIN_SELECTED_RESULT",
  "SELECT_EXISTING_SCENARIO",
  "CLARIFY_PURCHASE_AMOUNT",
  "CLARIFY_PURCHASE_MONTH",
  "CLARIFY_SCENARIO_REFERENCE",
  "HELP",
  "GREETING",
  "UNSUPPORTED",
  "AMBIGUOUS"
] as const;

export const CLARIFICATION_IDS = [
  "PURCHASE_AMOUNT",
  "PURCHASE_MONTH",
  "SCENARIO_REFERENCE"
] as const;

export const UNSUPPORTED_CATEGORY_IDS = [
  "INSTALMENTS",
  "CREDIT_OR_OVERDRAFT_FUNDING",
  "GOAL_SAVINGS_FUNDING",
  "MIXED_FUNDING",
  "SPENDING_SUBSTITUTION",
  "INTRA_MONTH_PAYMENT_TIMING",
  "BENEFIT_SIMULATION_OR_ACTIVATION",
  "PENSION_CONTRIBUTION_CHANGE",
  "SCENARIO_COMMITMENT",
  "RECURRING_EXPENSE_CHANGE",
  "INVESTMENT_OR_TRADING_ADVICE",
  "GENERAL_FINANCIAL_RECOMMENDATION",
  "CROSS_USER_OR_IDENTITY_ACCESS",
  "RESULT_OR_AUTHORITY_OVERRIDE",
  "PROMPT_OR_TOOL_OVERRIDE",
  "SECRET_OR_SYSTEM_PROMPT_REQUEST",
  "OTHER_OUT_OF_SCOPE"
] as const;

export const EXPLANATION_TARGET_IDS = [
  "OVERALL_CLASSIFICATION",
  "SAFETY_BUFFER",
  "BUFFER_RECOVERY",
  "GOAL_DELAY",
  "BILLS",
  "BORROWING",
  "ASSUMPTIONS",
  "TIMING_EFFECT",
  "OTHER_SUPPORTED_EXPLANATION"
] as const;

export const SCENARIO_REFERENCE_STRATEGY_IDS = [
  "SELECTED_SCENARIO",
  "EXPLICIT_SCENARIO_LABEL"
] as const;

export const SCENARIO_SELECTION_TARGET_IDS = [
  "CURRENT_PATH",
  "SELECTED_SCENARIO",
  "EXPLICIT_SCENARIO_LABEL"
] as const;

export const SCENARIO_FOLLOW_UP_IDS = [
  "CHANGE_PURCHASE_AMOUNT",
  "CHANGE_PURCHASE_MONTH",
  "EXPLAIN_SELECTED_RESULT",
  "SELECT_EXISTING_SCENARIO"
] as const;

export const AMBIGUITY_IDS = [
  "UNCLEAR_SUPPORTED_ACTION",
  "UNRECOGNISED_AMOUNT_EXPRESSION",
  "UNRECOGNISED_TIMING_EXPRESSION",
  "UNRECOGNISED_SCENARIO_REFERENCE"
] as const;

export type InterpretationIntentId = typeof INTERPRETATION_INTENT_IDS[number];
export type ClarificationId = typeof CLARIFICATION_IDS[number];
export type UnsupportedCategoryId = typeof UNSUPPORTED_CATEGORY_IDS[number];
export type ExplanationTargetId = typeof EXPLANATION_TARGET_IDS[number];
export type ScenarioReferenceStrategyId = typeof SCENARIO_REFERENCE_STRATEGY_IDS[number];
export type ScenarioSelectionTargetId = typeof SCENARIO_SELECTION_TARGET_IDS[number];
export type ScenarioFollowUpId = typeof SCENARIO_FOLLOW_UP_IDS[number];
export type AmbiguityId = typeof AMBIGUITY_IDS[number];

export const INTERPRETATION_POLICY_DESCRIPTIONS = Object.freeze({
  intents: {
    CREATE_ONE_OFF_PURCHASE: "A new supported one-payment current-account purchase with a quoted amount and timing.",
    CHANGE_PURCHASE_AMOUNT: "Change only the amount of a resolvable one-off purchase scenario.",
    CHANGE_PURCHASE_MONTH: "Change only the month of a resolvable one-off purchase scenario.",
    EXPLAIN_SELECTED_RESULT: "Explain facts from an existing deterministic result.",
    SELECT_EXISTING_SCENARIO: "Change the viewed scenario or return to the current path.",
    CLARIFY_PURCHASE_AMOUNT: "The otherwise supported initial purchase is missing a usable amount.",
    CLARIFY_PURCHASE_MONTH: "The otherwise supported initial purchase is missing a usable month.",
    CLARIFY_SCENARIO_REFERENCE: "A supported follow-up cannot resolve an existing scenario.",
    HELP: "A narrow request for supported capabilities.",
    GREETING: "A greeting without a more specific request.",
    UNSUPPORTED: "An exact unsupported, security-sensitive or out-of-scope request.",
    AMBIGUOUS: "A request that remains unclear and is not a defined missing-field or unsupported case."
  } satisfies Record<InterpretationIntentId, string>,
  unsupported: {
    INSTALMENTS: "Split or instalment payment patterns.",
    CREDIT_OR_OVERDRAFT_FUNDING: "Credit, loans or overdraft funding.",
    GOAL_SAVINGS_FUNDING: "Using goal or emergency savings as the funding source.",
    MIXED_FUNDING: "Combining funding sources.",
    SPENDING_SUBSTITUTION: "Replacing routine spending with the purchase.",
    INTRA_MONTH_PAYMENT_TIMING: "Before/after-payday or exact intra-month branching.",
    BENEFIT_SIMULATION_OR_ACTIVATION: "Calculating, using or activating an employer benefit.",
    PENSION_CONTRIBUTION_CHANGE: "Changing pension contributions.",
    SCENARIO_COMMITMENT: "Committing a hypothetical scenario or changing real state.",
    RECURRING_EXPENSE_CHANGE: "A recurring income or expense change.",
    INVESTMENT_OR_TRADING_ADVICE: "Investment selection or trading advice.",
    GENERAL_FINANCIAL_RECOMMENDATION: "Prescriptive prioritisation or general financial advice.",
    CROSS_USER_OR_IDENTITY_ACCESS: "Accessing or acting as another user.",
    RESULT_OR_AUTHORITY_OVERRIDE: "Overriding deterministic facts or financial authority.",
    PROMPT_OR_TOOL_OVERRIDE: "Changing instructions, tools, schemas or required calls.",
    SECRET_OR_SYSTEM_PROMPT_REQUEST: "Requesting secrets or hidden instructions.",
    OTHER_OUT_OF_SCOPE: "Another capability outside the approved one-off-purchase scope."
  } satisfies Record<UnsupportedCategoryId, string>
});

// Internal categories remain private; the stable user-facing scope wording does not vary by category.
export const UNSUPPORTED_SCOPE_TEMPLATE_BY_CATEGORY = Object.freeze(
  Object.fromEntries(UNSUPPORTED_CATEGORY_IDS.map((id) => [id, "UNSUPPORTED"])) as
    Record<UnsupportedCategoryId, "UNSUPPORTED">
);

export const CLARIFICATION_TEMPLATE_BY_ID = Object.freeze({
  PURCHASE_AMOUNT: "PURCHASE_AMOUNT",
  PURCHASE_MONTH: "PURCHASE_MONTH",
  SCENARIO_REFERENCE: "SCENARIO_REFERENCE"
} satisfies Record<ClarificationId, ClarificationId>);

export const CLARIFICATION_ID_BY_BRANCH = Object.freeze({
  CLARIFY_PURCHASE_AMOUNT: "PURCHASE_AMOUNT",
  CLARIFY_PURCHASE_MONTH: "PURCHASE_MONTH",
  CLARIFY_SCENARIO_REFERENCE: "SCENARIO_REFERENCE"
} as const);
