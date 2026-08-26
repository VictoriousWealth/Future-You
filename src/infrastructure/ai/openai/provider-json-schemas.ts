import {
  AMBIGUITY_IDS,
  EXPLANATION_TARGET_IDS,
  SCENARIO_REFERENCE_STRATEGY_IDS,
  SCENARIO_SELECTION_TARGET_IDS,
  UNSUPPORTED_CATEGORY_IDS
} from "../../../application/conversation/interpretation-policy";

type JsonSchema = Readonly<Record<string, unknown>>;

const nullableString = { anyOf: [{ type: "string" }, { type: "null" }] } as const;
const nullableInteger = { anyOf: [{ type: "integer" }, { type: "null" }] } as const;

function strictObject(properties: Readonly<Record<string, JsonSchema>>): JsonSchema {
  return {
    type: "object",
    additionalProperties: false,
    properties,
    required: Object.keys(properties)
  };
}

function literal(value: string): JsonSchema {
  return { type: "string", enum: [value] };
}

function enumeration(values: readonly string[]): JsonSchema {
  return { type: "string", enum: values };
}

const amount = strictObject({
  quote: { type: "string" },
  currency: enumeration(["GBP", "UNSUPPORTED"])
});

const completeTiming = strictObject({
  quote: { type: "string" },
  kind: enumeration(["NEXT_MONTH", "MONTHS_AFTER_SELECTED", "NAMED_MONTH", "EXPLICIT_YEAR_MONTH"]),
  monthNumber: nullableInteger,
  year: nullableInteger,
  offsetMonths: nullableInteger
});

const interpretationBranches: readonly JsonSchema[] = [
  strictObject({ kind: literal("CREATE_ONE_OFF_PURCHASE"), amount, timing: completeTiming, purposeQuote: nullableString }),
  strictObject({
    kind: literal("CHANGE_PURCHASE_AMOUNT"),
    amount,
    scenarioReferenceStrategy: enumeration(SCENARIO_REFERENCE_STRATEGY_IDS),
    scenarioReferenceQuote: nullableString
  }),
  strictObject({
    kind: literal("CHANGE_PURCHASE_MONTH"),
    timing: completeTiming,
    scenarioReferenceStrategy: enumeration(SCENARIO_REFERENCE_STRATEGY_IDS),
    scenarioReferenceQuote: nullableString
  }),
  strictObject({
    kind: literal("EXPLAIN_SELECTED_RESULT"),
    explanationTarget: enumeration(EXPLANATION_TARGET_IDS),
    goalReferenceQuote: nullableString,
    scenarioReferenceStrategy: enumeration(SCENARIO_REFERENCE_STRATEGY_IDS),
    scenarioReferenceQuote: nullableString
  }),
  strictObject({
    kind: literal("SELECT_EXISTING_SCENARIO"),
    selectionTarget: enumeration(SCENARIO_SELECTION_TARGET_IDS),
    scenarioLabelQuote: nullableString
  }),
  strictObject({
    kind: literal("CLARIFY_PURCHASE_AMOUNT"),
    purposeQuote: nullableString,
    timing: { anyOf: [completeTiming, { type: "null" }] }
  }),
  strictObject({
    kind: literal("CLARIFY_PURCHASE_MONTH"),
    amount,
    purposeQuote: nullableString
  }),
  strictObject({
    kind: literal("CLARIFY_SCENARIO_REFERENCE"),
    attemptedOperation: {
      anyOf: [
        strictObject({ kind: literal("CHANGE_PURCHASE_AMOUNT"), amount }),
        strictObject({ kind: literal("CHANGE_PURCHASE_MONTH"), timing: completeTiming }),
        strictObject({ kind: literal("EXPLAIN_SELECTED_RESULT"), explanationTarget: enumeration(EXPLANATION_TARGET_IDS), goalReferenceQuote: nullableString }),
        strictObject({ kind: literal("SELECT_EXISTING_SCENARIO") })
      ]
    }
  }),
  strictObject({ kind: literal("HELP") }),
  strictObject({ kind: literal("GREETING") }),
  strictObject({ kind: literal("UNSUPPORTED"), category: enumeration(UNSUPPORTED_CATEGORY_IDS) }),
  strictObject({ kind: literal("AMBIGUOUS"), ambiguity: enumeration(AMBIGUITY_IDS) })
];

/** Root is deliberately an object; alternatives are nested under interpretation. */
export const INTERPRETATION_PARAMETERS_V2 = strictObject({
  interpretation: { anyOf: interpretationBranches }
});

const unsupportedResolution = strictObject({
  kind: literal("UNSUPPORTED"),
  category: enumeration(UNSUPPORTED_CATEGORY_IDS)
});
const ambiguousResolution = strictObject({
  kind: literal("AMBIGUOUS"),
  ambiguity: enumeration(AMBIGUITY_IDS)
});

function resolutionRoot(branch: JsonSchema): JsonSchema {
  return strictObject({ resolution: { anyOf: [branch, unsupportedResolution, ambiguousResolution] } });
}

export const AMOUNT_CLARIFICATION_PARAMETERS = resolutionRoot(strictObject({
  kind: literal("RESOLVE_PURCHASE_AMOUNT"),
  amount
}));

export const MONTH_CLARIFICATION_PARAMETERS = resolutionRoot(strictObject({
  kind: literal("RESOLVE_PURCHASE_MONTH"),
  timing: completeTiming
}));

export const SCENARIO_CLARIFICATION_PARAMETERS = resolutionRoot(strictObject({
  kind: literal("RESOLVE_SCENARIO_REFERENCE"),
  selectionTarget: enumeration(SCENARIO_SELECTION_TARGET_IDS),
  scenarioLabelQuote: nullableString
}));

/** Frozen provider contract used by the Track C0 live baseline. New turns never use it. */
export const INTERPRETATION_PARAMETERS_V1 = strictObject({
  kind: enumeration([
    "CREATE_ONE_OFF_PURCHASE", "CHANGE_PURCHASE_AMOUNT", "CHANGE_PURCHASE_MONTH",
    "EXPLAIN_SELECTED_RESULT", "SELECT_EXISTING_SCENARIO", "HELP", "GREETING",
    "UNSUPPORTED", "AMBIGUOUS"
  ]),
  amountQuote: nullableString,
  currency: { anyOf: [enumeration(["GBP", "UNSUPPORTED"]), { type: "null" }] },
  timingQuote: nullableString,
  timingKind: enumeration(["NEXT_MONTH", "MONTHS_AFTER_SELECTED", "NAMED_MONTH", "EXPLICIT_YEAR_MONTH", "MISSING", "AMBIGUOUS"]),
  timingMonthNumber: nullableInteger,
  timingYear: nullableInteger,
  timingOffsetMonths: nullableInteger,
  purposeQuote: nullableString,
  referencedScenarioLabel: nullableString,
  missingFields: { type: "array", items: { type: "string" } },
  unsupportedFeatures: { type: "array", items: { type: "string" } },
  explanationTarget: { anyOf: [enumeration(["OVERALL_CLASSIFICATION", "SAFETY_BUFFER", "BUFFER_RECOVERY", "GOAL_DELAY", "BILLS", "BORROWING", "ASSUMPTIONS", "OTHER"]), { type: "null" }] },
  goalReferenceQuote: nullableString,
  scenarioReferenceQuote: nullableString,
  category: nullableString,
  userGoalSummary: nullableString,
  ambiguity: nullableString,
  clarificationKey: nullableString
});

export const EXPLANATION_PARAMETERS_V1 = strictObject({
  templateId: enumeration([
    "PURCHASE_RESULT_SIGNIFICANT", "PURCHASE_RESULT_NOTICEABLE", "PURCHASE_RESULT_MINIMAL",
    "PURCHASE_RESULT_RISKY", "BUFFER_EXPLANATION", "GOAL_DELAY_EXPLANATION",
    "TIMING_NO_IMPROVEMENT", "CURRENT_PATH_SUMMARY"
  ]),
  primaryFactKey: enumeration([
    "OVERALL_CLASSIFICATION", "BUFFER_REDUCTION", "BILLS_COVERED", "NO_BORROWING",
    "BUFFER_RECOVERY", "GOAL_DELAY", "TIMING_NO_IMPROVEMENT", "ASSUMPTIONS", "CURRENT_PATH"
  ]),
  orderedFactKeys: { type: "array", items: enumeration([
    "OVERALL_CLASSIFICATION", "BUFFER_REDUCTION", "BILLS_COVERED", "NO_BORROWING",
    "BUFFER_RECOVERY", "GOAL_DELAY", "TIMING_NO_IMPROVEMENT", "ASSUMPTIONS", "CURRENT_PATH"
  ]) },
  caveatKeys: { type: "array", items: enumeration(["ASSUMED_TIMING", "HYPOTHETICAL_ONLY", "CALENDAR_FALLBACK"]) },
  followUpActionKeys: { type: "array", items: enumeration(["TRY_LOWER_AMOUNT", "TRY_ANOTHER_MONTH", "VIEW_ASSUMPTIONS", "VIEW_CURRENT_PATH"]) },
  tone: enumeration(["CLEAR", "SUPPORTIVE", "DIRECT"])
});

export function assertStrictProviderSchema(schema: JsonSchema): void {
  const visit = (value: unknown): void => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return;
    const object = value as Record<string, unknown>;
    if (object.type === "object") {
      if (object.additionalProperties !== false) throw new Error("Every provider object must reject additional properties.");
      const properties = object.properties as Record<string, unknown> | undefined;
      const required = object.required as readonly string[] | undefined;
      if (!properties || !required || Object.keys(properties).some((key) => !required.includes(key))) {
        throw new Error("Every provider object property must be required.");
      }
    }
    Object.values(object).forEach(visit);
  };
  if (schema.type !== "object" || "anyOf" in schema) throw new Error("The provider schema root must be an object without anyOf.");
  visit(schema);
}
