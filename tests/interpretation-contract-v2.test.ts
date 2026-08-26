import { describe, expect, it } from "vitest";
import {
  CLARIFICATION_RESOLUTION_PROMPT_VERSION,
  CLARIFICATION_RESOLUTION_SCHEMA_VERSION,
  EXPLANATION_PROMPT_VERSION,
  EXPLANATION_SCHEMA_VERSION,
  INTERPRETATION_PROMPT_VERSION,
  INTERPRETATION_PROMPT_VERSION_V1,
  INTERPRETATION_SCHEMA_VERSION,
  INTERPRETATION_SCHEMA_VERSION_V1
} from "../src/application/conversation/contracts";
import {
  CLARIFICATION_ID_BY_BRANCH,
  CLARIFICATION_IDS,
  CLARIFICATION_TEMPLATE_BY_ID,
  EXPLANATION_TARGET_IDS,
  INTERPRETATION_INTENT_IDS,
  SCENARIO_SELECTION_TARGET_IDS,
  UNSUPPORTED_CATEGORY_IDS,
  UNSUPPORTED_SCOPE_TEMPLATE_BY_CATEGORY
} from "../src/application/conversation/interpretation-policy";
import {
  conversationInterpretationEnvelopeV2Schema,
  conversationInterpretationSchema,
  conversationInterpretationV1Schema
} from "../src/application/conversation/schemas";
import { INTERPRETATION_PROMPT } from "../src/application/conversation/prompts";
import {
  INTERPRETATION_PARAMETERS_V1,
  INTERPRETATION_PARAMETERS_V2,
  assertStrictProviderSchema
} from "../src/infrastructure/ai/openai/provider-json-schemas";

const amount = { quote: "£650", currency: "GBP" as const };
const timing = { quote: "next month", kind: "NEXT_MONTH" as const, monthNumber: null, year: null, offsetMonths: 1 };

const branches = [
  { kind: "CREATE_ONE_OFF_PURCHASE", amount, timing, purposeQuote: "trip" },
  { kind: "CHANGE_PURCHASE_AMOUNT", amount, scenarioReferenceStrategy: "SELECTED_SCENARIO", scenarioReferenceQuote: null },
  { kind: "CHANGE_PURCHASE_MONTH", timing, scenarioReferenceStrategy: "SELECTED_SCENARIO", scenarioReferenceQuote: null },
  { kind: "EXPLAIN_SELECTED_RESULT", explanationTarget: "GOAL_DELAY", goalReferenceQuote: "emergency fund", scenarioReferenceStrategy: "SELECTED_SCENARIO", scenarioReferenceQuote: null },
  { kind: "SELECT_EXISTING_SCENARIO", selectionTarget: "CURRENT_PATH", scenarioLabelQuote: null },
  { kind: "CLARIFY_PURCHASE_AMOUNT", purposeQuote: "trip", timing },
  { kind: "CLARIFY_PURCHASE_MONTH", amount, purposeQuote: "trip" },
  { kind: "CLARIFY_SCENARIO_REFERENCE", attemptedOperation: { kind: "CHANGE_PURCHASE_AMOUNT", amount } },
  { kind: "HELP" },
  { kind: "GREETING" },
  { kind: "UNSUPPORTED", category: "INSTALMENTS" },
  { kind: "AMBIGUOUS", ambiguity: "UNCLEAR_SUPPORTED_ACTION" }
] as const;

function visitObjects(value: unknown, action: (object: Record<string, unknown>) => void): void {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item) => visitObjects(item, action));
    return;
  }
  const object = value as Record<string, unknown>;
  action(object);
  Object.values(object).forEach((item) => visitObjects(item, action));
}

describe("Track C1A interpretation contract v2", () => {
  it("uses a strict object root with alternatives nested under interpretation", () => {
    expect(INTERPRETATION_PARAMETERS_V2).toMatchObject({
      type: "object",
      additionalProperties: false,
      required: ["interpretation"]
    });
    expect(INTERPRETATION_PARAMETERS_V2).not.toHaveProperty("anyOf");
    const property = (INTERPRETATION_PARAMETERS_V2.properties as Record<string, unknown>).interpretation as Record<string, unknown>;
    expect(property.anyOf).toHaveLength(INTERPRETATION_INTENT_IDS.length);
    expect(() => assertStrictProviderSchema(INTERPRETATION_PARAMETERS_V2)).not.toThrow();
  });

  it("requires every property and rejects additional properties on every provider object", () => {
    visitObjects(INTERPRETATION_PARAMETERS_V2, (object) => {
      if (object.type !== "object") return;
      expect(object.additionalProperties).toBe(false);
      expect(object.required).toEqual(Object.keys(object.properties as object));
    });
  });

  for (const branch of branches) {
    it(`accepts only the fields for ${branch.kind}`, () => {
      expect(conversationInterpretationSchema.safeParse(branch).success).toBe(true);
      expect(conversationInterpretationSchema.safeParse({ ...branch, unrelated: null }).success).toBe(false);
      const keys = Object.keys(branch).filter((key) => key !== "kind");
      if (keys[0]) {
        const missing = { ...branch } as Record<string, unknown>;
        delete missing[keys[0]];
        expect(conversationInterpretationSchema.safeParse(missing).success).toBe(false);
      }
    });
  }

  it("rejects semantic cross-branch mutations and invalid identifiers", () => {
    expect(conversationInterpretationSchema.safeParse({ ...branches[0], amount: null }).success).toBe(false);
    expect(conversationInterpretationSchema.safeParse({ ...branches[0], category: "INSTALMENTS" }).success).toBe(false);
    expect(conversationInterpretationSchema.safeParse({ ...branches[4], explanationTarget: "GOAL_DELAY" }).success).toBe(false);
    expect(conversationInterpretationSchema.safeParse({ kind: "UNSUPPORTED", category: "UNSUPPORTED_ADVICE" }).success).toBe(false);
    expect(conversationInterpretationSchema.safeParse({ kind: "AMBIGUOUS", ambiguity: "anything" }).success).toBe(false);
    expect(conversationInterpretationSchema.safeParse({
      kind: "CHANGE_PURCHASE_AMOUNT", amount,
      scenarioReferenceStrategy: "EXPLICIT_SCENARIO_LABEL", scenarioReferenceQuote: null
    }).success).toBe(false);
  });

  it("accepts the v2 envelope and rejects root extras or a flat v1 envelope", () => {
    expect(conversationInterpretationEnvelopeV2Schema.safeParse({ interpretation: branches[0] }).success).toBe(true);
    expect(conversationInterpretationEnvelopeV2Schema.safeParse({ interpretation: branches[0], extra: true }).success).toBe(false);
    expect(conversationInterpretationEnvelopeV2Schema.safeParse(branches[0]).success).toBe(false);
  });

  it("keeps the exact v1 artifacts available without making them active", () => {
    expect(INTERPRETATION_PARAMETERS_V1).toMatchObject({ type: "object", additionalProperties: false });
    expect(conversationInterpretationV1Schema.safeParse({
      kind: "HELP"
    }).success).toBe(true);
    expect(INTERPRETATION_PROMPT_VERSION_V1).toBe("fy-conversation-interpretation/1.0.0");
    expect(INTERPRETATION_SCHEMA_VERSION_V1).toBe("fy-conversation-intent/1.0.0");
    expect(INTERPRETATION_PROMPT_VERSION).toBe("fy-conversation-interpretation/2.0.0");
    expect(INTERPRETATION_SCHEMA_VERSION).toBe("fy-conversation-intent/2.0.0");
  });

  it("keeps clarification independently versioned and explanation unchanged", () => {
    expect(CLARIFICATION_RESOLUTION_PROMPT_VERSION).toBe("fy-clarification-resolution-prompt/1.0.0");
    expect(CLARIFICATION_RESOLUTION_SCHEMA_VERSION).toBe("fy-clarification-resolution-schema/1.0.0");
    expect(EXPLANATION_PROMPT_VERSION).toBe("fy-conversation-explanation/1.0.0");
    expect(EXPLANATION_SCHEMA_VERSION).toBe("fy-explanation-plan/1.0.0");
  });

  it("derives prompt, schemas and renderer mappings from the canonical policy identifiers", () => {
    for (const id of [
      ...INTERPRETATION_INTENT_IDS,
      ...UNSUPPORTED_CATEGORY_IDS,
      ...EXPLANATION_TARGET_IDS,
      ...SCENARIO_SELECTION_TARGET_IDS
    ]) expect(INTERPRETATION_PROMPT).toContain(id);
    expect(Object.keys(UNSUPPORTED_SCOPE_TEMPLATE_BY_CATEGORY)).toEqual(UNSUPPORTED_CATEGORY_IDS);
    expect(Object.keys(CLARIFICATION_TEMPLATE_BY_ID)).toEqual(CLARIFICATION_IDS);
    expect(Object.keys(CLARIFICATION_ID_BY_BRANCH)).toEqual([
      "CLARIFY_PURCHASE_AMOUNT", "CLARIFY_PURCHASE_MONTH", "CLARIFY_SCENARIO_REFERENCE"
    ]);
  });
});
