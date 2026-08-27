import {
  AMBIGUITY_IDS,
  EXPLANATION_TARGET_IDS,
  SCENARIO_REFERENCE_STRATEGY_IDS,
  SCENARIO_SELECTION_TARGET_IDS,
  UNSUPPORTED_CATEGORY_IDS
} from "../../../application/conversation/interpretation-policy";
import {
  TIMING_KIND_POLICY,
  TIMING_MONTH_MAX,
  TIMING_MONTH_MIN,
  TIMING_OFFSET_MAX,
  TIMING_OFFSET_MIN,
  TIMING_QUOTE_MAX_LENGTH,
  TIMING_YEAR_MAX,
  TIMING_YEAR_MIN
} from "../../../application/conversation/timing-policy";

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

const completeTimingV2 = strictObject({
  quote: { type: "string" },
  kind: enumeration(["NEXT_MONTH", "MONTHS_AFTER_SELECTED", "NAMED_MONTH", "EXPLICIT_YEAR_MONTH"]),
  monthNumber: nullableInteger,
  year: nullableInteger,
  offsetMonths: nullableInteger
});

const timingQuote = { type: "string", minLength: 1, maxLength: TIMING_QUOTE_MAX_LENGTH } as const;
const timingMonth = { type: "integer", minimum: TIMING_MONTH_MIN, maximum: TIMING_MONTH_MAX } as const;
const timingYear = { type: "integer", minimum: TIMING_YEAR_MIN, maximum: TIMING_YEAR_MAX } as const;
const timingOffset = { type: "integer", minimum: TIMING_OFFSET_MIN, maximum: TIMING_OFFSET_MAX } as const;
const nullValue = { type: "null" } as const;

export const COMPLETE_TIMING_PARAMETERS_V3 = {
  anyOf: [
    strictObject({
      quote: timingQuote,
      kind: { ...literal("NEXT_MONTH"), description: TIMING_KIND_POLICY.NEXT_MONTH.description },
      monthNumber: nullValue,
      year: nullValue,
      offsetMonths: { type: "integer", enum: [1], minimum: 1, maximum: 1 }
    }),
    strictObject({
      quote: timingQuote,
      kind: { ...literal("MONTHS_AFTER_SELECTED"), description: TIMING_KIND_POLICY.MONTHS_AFTER_SELECTED.description },
      monthNumber: nullValue,
      year: nullValue,
      offsetMonths: timingOffset
    }),
    strictObject({
      quote: timingQuote,
      kind: { ...literal("NAMED_MONTH"), description: TIMING_KIND_POLICY.NAMED_MONTH.description },
      monthNumber: timingMonth,
      year: nullValue,
      offsetMonths: nullValue
    }),
    strictObject({
      quote: timingQuote,
      kind: { ...literal("EXPLICIT_YEAR_MONTH"), description: TIMING_KIND_POLICY.EXPLICIT_YEAR_MONTH.description },
      monthNumber: timingMonth,
      year: timingYear,
      offsetMonths: nullValue
    })
  ]
} as const satisfies JsonSchema;

function interpretationBranches(completeTiming: JsonSchema): readonly JsonSchema[] {
  return [
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
}

/** Root is deliberately an object; alternatives are nested under interpretation. */
export const INTERPRETATION_PARAMETERS_V2 = strictObject({
  interpretation: { anyOf: interpretationBranches(completeTimingV2) }
});

/** Active v3 provider contract with kind-specific nested timing alternatives. */
export const INTERPRETATION_PARAMETERS_V3 = strictObject({
  interpretation: { anyOf: interpretationBranches(COMPLETE_TIMING_PARAMETERS_V3) }
});

/** Active v4 provider shape. Exact-clarification precedence is enforced by server semantics. */
export const INTERPRETATION_PARAMETERS_V4 = strictObject({
  interpretation: { anyOf: interpretationBranches(COMPLETE_TIMING_PARAMETERS_V3) }
});

export const DEMO_INTERPRETATION_PARAMETERS_V1 = strictObject({
  interpretation: {
    anyOf: [
      ...interpretationBranches(COMPLETE_TIMING_PARAMETERS_V3),
      strictObject({ kind: literal("RETRIEVE_GOALS") }),
      strictObject({ kind: literal("RETRIEVE_WORK_BENEFITS") })
    ]
  }
});

export const DEMO_RESPONSE_PARAMETERS_V1 = strictObject({
  template: { type: "string", minLength: 1, maxLength: 4_000 }
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

export const MONTH_CLARIFICATION_PARAMETERS_V1 = resolutionRoot(strictObject({
  kind: literal("RESOLVE_PURCHASE_MONTH"),
  timing: completeTimingV2
}));

export const MONTH_CLARIFICATION_PARAMETERS_V2 = resolutionRoot(strictObject({
  kind: literal("RESOLVE_PURCHASE_MONTH"),
  timing: COMPLETE_TIMING_PARAMETERS_V3
}));

export const MONTH_CLARIFICATION_PARAMETERS = MONTH_CLARIFICATION_PARAMETERS_V2;

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
