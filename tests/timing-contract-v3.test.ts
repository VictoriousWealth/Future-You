import { createHash } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

const openai = vi.hoisted(() => ({ create: vi.fn() }));

vi.mock("openai", () => ({
  default: class {
    readonly responses = { create: openai.create };
  }
}));

import {
  CLARIFICATION_RESOLUTION_PROMPT_VERSION,
  CLARIFICATION_RESOLUTION_SCHEMA_VERSION,
  INTERPRETATION_PROMPT_VERSION,
  INTERPRETATION_PROMPT_VERSION_V3,
  INTERPRETATION_SCHEMA_VERSION,
  INTERPRETATION_SCHEMA_VERSION_V3
} from "../src/application/conversation/contracts";
import {
  conversationInterpretationEnvelopeV3Schema,
  monthClarificationResolutionSchema
} from "../src/application/conversation/schemas";
import { CLARIFICATION_RESOLUTION_PROMPT, INTERPRETATION_PROMPT } from "../src/application/conversation/prompts";
import { resolvePaymentPeriod } from "../src/application/conversation/time-resolution";
import {
  COMPLETE_TIMING_KINDS,
  CONVERSATION_TIMING_POLICY_VERSION,
  TIMING_REPAIR_RULE_BY_CODE,
  completeTimingInterpretationSchema,
  parseGroundedTimingQuote,
  timingQuoteEquivalenceIssues,
  type CompleteTimingInterpretation
} from "../src/application/conversation/timing-policy";
import {
  fakeInterpretationDiagnosticFixture,
  interpretWithDeterministicFake
} from "../src/infrastructure/ai/fake-conversation-model-provider";
import {
  INTERPRETATION_DIAGNOSTIC_CODES,
  SanitisedInterpretationDiagnosticCollector,
  repairValidationErrors,
  runtimeValidationDiagnostic,
  successfulInterpretationDiagnostic,
  type InterpretationDiagnosticCode
} from "../src/infrastructure/ai/openai/interpretation-diagnostics";
import { OpenAIResponsesConversationModelProvider } from "../src/infrastructure/ai/openai/openai-responses-conversation-provider";
import {
  COMPLETE_TIMING_PARAMETERS_V3,
  INTERPRETATION_PARAMETERS_V3,
  MONTH_CLARIFICATION_PARAMETERS_V2,
  assertStrictProviderSchema
} from "../src/infrastructure/ai/openai/provider-json-schemas";
import {
  CONVERSATION_TIMING_CORPUS_V3_VERSION,
  conversationTimingEvaluationCorpusV3
} from "./fixtures/conversation-timing-evaluation-corpus-v3";

type JsonSchema = Readonly<Record<string, unknown>>;

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function acceptsJsonSchema(schema: JsonSchema, value: unknown): boolean {
  if (Array.isArray(schema.anyOf)) return schema.anyOf.some((branch) => acceptsJsonSchema(branch as JsonSchema, value));
  if (Array.isArray(schema.enum) && !schema.enum.includes(value)) return false;
  if (schema.type === "null") return value === null;
  if (schema.type === "string") {
    return typeof value === "string"
      && (typeof schema.minLength !== "number" || value.length >= schema.minLength)
      && (typeof schema.maxLength !== "number" || value.length <= schema.maxLength);
  }
  if (schema.type === "integer") {
    return typeof value === "number" && Number.isInteger(value)
      && (typeof schema.minimum !== "number" || value >= schema.minimum)
      && (typeof schema.maximum !== "number" || value <= schema.maximum);
  }
  if (schema.type !== "object") return true;
  const record = asRecord(value);
  if (!record) return false;
  const properties = asRecord(schema.properties) ?? {};
  const required = Array.isArray(schema.required) ? schema.required.map(String) : [];
  return required.every((field) => Object.hasOwn(record, field))
    && (schema.additionalProperties !== false || Object.keys(record).every((field) => Object.hasOwn(properties, field)))
    && Object.entries(properties).every(([field, child]) =>
      !Object.hasOwn(record, field) || acceptsJsonSchema(child as JsonSchema, record[field])
    );
}

const diagnosticMetadata = {
  modelId: "fake-v3",
  promptVersion: "fy-conversation-interpretation/3.0.0",
  schemaVersion: "fy-conversation-intent/3.0.0",
  attempt: 1,
  repairAttempt: false,
  rootField: "interpretation" as const,
  allowedBranchKinds: [
    "CREATE_ONE_OFF_PURCHASE", "CHANGE_PURCHASE_AMOUNT", "CHANGE_PURCHASE_MONTH",
    "EXPLAIN_SELECTED_RESULT", "SELECT_EXISTING_SCENARIO", "CLARIFY_PURCHASE_AMOUNT",
    "CLARIFY_PURCHASE_MONTH", "CLARIFY_SCENARIO_REFERENCE", "HELP", "GREETING",
    "UNSUPPORTED", "AMBIGUOUS"
  ] as const
};

function interpretationEnvelope(branch: string, timing: unknown): unknown {
  if (branch === "CHANGE_PURCHASE_MONTH") return { interpretation: {
    kind: branch,
    timing,
    scenarioReferenceStrategy: "SELECTED_SCENARIO",
    scenarioReferenceQuote: null
  } };
  if (branch === "UNSUPPORTED") return { interpretation: { kind: "UNSUPPORTED", category: "INTRA_MONTH_PAYMENT_TIMING" } };
  return { interpretation: {
    kind: "CREATE_ONE_OFF_PURCHASE",
    amount: { quote: "£650", currency: "GBP" },
    timing,
    purposeQuote: "trip"
  } };
}

function classify(input: Readonly<{
  message: string;
  branch: string;
  timing: unknown;
  selected: boolean;
}>) {
  const envelope = interpretationEnvelope(input.branch, input.timing);
  const parsed = conversationInterpretationEnvelopeV3Schema.safeParse(envelope);
  if (!parsed.success) {
    return runtimeValidationDiagnostic(diagnosticMetadata, envelope, parsed.error);
  }
  return successfulInterpretationDiagnostic(
    diagnosticMetadata,
    parsed.data.interpretation,
    {
      userMessage: input.message,
      pendingClarification: null,
      availableScenarios: input.selected
        ? [{ label: "£650 trip", scenarioType: "one_off_purchase", selected: true }]
        : [],
      selectedScenarioType: input.selected ? "one_off_purchase" : null,
      trustedDate: "2026-08-24",
      timezone: "Europe/London"
    }
  );
}

function visitObjects(value: unknown, action: (object: Record<string, unknown>) => void): void {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) return value.forEach((child) => visitObjects(child, action));
  const object = value as Record<string, unknown>;
  action(object);
  Object.values(object).forEach((child) => visitObjects(child, action));
}

describe("Track C1E timing contract v3", () => {
  beforeEach(() => openai.create.mockReset());

  it("activates explicit v3 versions while keeping explanation contracts unchanged elsewhere", () => {
    expect(CONVERSATION_TIMING_POLICY_VERSION).toBe("fy-conversation-timing-policy/1.0.0");
    expect(INTERPRETATION_PROMPT_VERSION_V3).toBe("fy-conversation-interpretation/3.0.0");
    expect(INTERPRETATION_SCHEMA_VERSION_V3).toBe("fy-conversation-intent/3.0.0");
    expect(INTERPRETATION_PROMPT_VERSION).toBe("fy-conversation-interpretation/4.0.0");
    expect(INTERPRETATION_SCHEMA_VERSION).toBe("fy-conversation-intent/4.0.0");
    expect(CLARIFICATION_RESOLUTION_PROMPT_VERSION).toBe("fy-clarification-resolution-prompt/2.0.0");
    expect(CLARIFICATION_RESOLUTION_SCHEMA_VERSION).toBe("fy-clarification-resolution-schema/2.0.0");
    expect(INTERPRETATION_PROMPT).toContain("NEXT_MONTH: quote is required; monthNumber=null; year=null; offsetMonths=1");
    expect(INTERPRETATION_PROMPT).toContain("one month later");
    expect(INTERPRETATION_PROMPT).toContain("sometime later");
    expect(CLARIFICATION_RESOLUTION_PROMPT).toContain("The quote must occur in the user message");
  });

  it("emits nested kind-specific strict provider timing branches and a stable sanitised fingerprint", () => {
    expect(INTERPRETATION_PARAMETERS_V3).toMatchObject({ type: "object", additionalProperties: false });
    expect(INTERPRETATION_PARAMETERS_V3).not.toHaveProperty("anyOf");
    expect(COMPLETE_TIMING_PARAMETERS_V3.anyOf).toHaveLength(COMPLETE_TIMING_KINDS.length);
    expect(() => assertStrictProviderSchema(INTERPRETATION_PARAMETERS_V3)).not.toThrow();
    expect(() => assertStrictProviderSchema(MONTH_CLARIFICATION_PARAMETERS_V2)).not.toThrow();
    visitObjects(COMPLETE_TIMING_PARAMETERS_V3, (object) => {
      if (object.type !== "object") return;
      expect(object.additionalProperties).toBe(false);
      expect(object.required).toEqual(Object.keys(object.properties as object));
    });
    const fingerprint = createHash("sha256").update(JSON.stringify(INTERPRETATION_PARAMETERS_V3)).digest("hex");
    expect(fingerprint).toBe("93022ec341abe8706f8e59e08e6058d96119ef28c5121a8e95e58f3e645960b5");
  });

  it("enforces each kind-specific provider and runtime field matrix", () => {
    const valid = [
      { quote: "next month", kind: "NEXT_MONTH", monthNumber: null, year: null, offsetMonths: 1 },
      { quote: "one month later", kind: "MONTHS_AFTER_SELECTED", monthNumber: null, year: null, offsetMonths: 1 },
      { quote: "October", kind: "NAMED_MONTH", monthNumber: 10, year: null, offsetMonths: null },
      { quote: "October 2027", kind: "EXPLICIT_YEAR_MONTH", monthNumber: 10, year: 2027, offsetMonths: null }
    ] as const;
    expect(valid.map((value) => acceptsJsonSchema(COMPLETE_TIMING_PARAMETERS_V3, value))).toEqual([true, true, true, true]);
    expect(valid.map((value) => completeTimingInterpretationSchema.safeParse(value).success)).toEqual([true, true, true, true]);
    const invalid = [
      { ...valid[0], offsetMonths: null },
      { ...valid[0], offsetMonths: 2 },
      { ...valid[0], monthNumber: 9 },
      { ...valid[1], year: 2027 },
      { ...valid[2], monthNumber: null },
      { ...valid[2], offsetMonths: 1 },
      { ...valid[3], year: null },
      { ...valid[3], monthNumber: 13 }
    ];
    expect(invalid.every((value) => !acceptsJsonSchema(COMPLETE_TIMING_PARAMETERS_V3, value))).toBe(true);
    expect(invalid.every((value) => !completeTimingInterpretationSchema.safeParse(value).success)).toBe(true);
  });

  it.each([
    ["next month", "NEXT_MONTH", null, null, 1],
    ["NXT MONTH", "NEXT_MONTH", null, null, 1],
    ["October", "NAMED_MONTH", 10, null, null],
    ["October 2027", "EXPLICIT_YEAR_MONTH", 10, 2027, null],
    ["2027-10", "EXPLICIT_YEAR_MONTH", 10, 2027, null],
    ["one month later", "MONTHS_AFTER_SELECTED", null, null, 1],
    ["2 months later", "MONTHS_AFTER_SELECTED", null, null, 2]
  ] as const)("parses the bounded source expression %s", (quote, kind, monthNumber, year, offsetMonths) => {
    expect(parseGroundedTimingQuote(quote)).toEqual({ status: "PARSED", kind, monthNumber, year, offsetMonths });
  });

  it("rejects unrecognised, ambiguous and contradictory grounded meanings", () => {
    expect(parseGroundedTimingQuote("soon")).toEqual({ status: "UNRECOGNISED" });
    expect(parseGroundedTimingQuote("September or October")).toEqual({ status: "AMBIGUOUS" });
    expect(timingQuoteEquivalenceIssues({
      quote: "next month", kind: "NAMED_MONTH", monthNumber: 10, year: null, offsetMonths: null
    })).toEqual(expect.arrayContaining(["TIMING_QUOTE_KIND_MISMATCH", "TIMING_MONTH_NUMBER_MISMATCH"]));
  });

  it("keeps initial, clarification and follow-up NEXT_MONTH representations identical", () => {
    const next = { quote: "next month", kind: "NEXT_MONTH", monthNumber: null, year: null, offsetMonths: 1 } as const;
    expect(conversationInterpretationEnvelopeV3Schema.safeParse({ interpretation: {
      kind: "CREATE_ONE_OFF_PURCHASE", amount: { quote: "£650", currency: "GBP" }, timing: next, purposeQuote: "trip"
    } }).success).toBe(true);
    expect(monthClarificationResolutionSchema.safeParse({ kind: "RESOLVE_PURCHASE_MONTH", timing: next }).success).toBe(true);
    expect(conversationInterpretationEnvelopeV3Schema.safeParse({ interpretation: {
      kind: "CHANGE_PURCHASE_MONTH", timing: next,
      scenarioReferenceStrategy: "SELECTED_SCENARIO", scenarioReferenceQuote: null
    } }).success).toBe(true);
  });

  it("classifies every v3 timing-corpus case without authorising an invalid command", () => {
    expect(CONVERSATION_TIMING_CORPUS_V3_VERSION).toBe("fy-conversation-timing-evaluation/3.0.0");
    expect(new Set(conversationTimingEvaluationCorpusV3.map((entry) => entry.id)).size)
      .toBe(conversationTimingEvaluationCorpusV3.length);
    for (const entry of conversationTimingEvaluationCorpusV3) {
      if (entry.branch === "RESOLVE_PURCHASE_MONTH") {
        expect(monthClarificationResolutionSchema.safeParse({ kind: "RESOLVE_PURCHASE_MONTH", timing: entry.timing }).success)
          .toBe(entry.expectedDiagnostic === null);
        const timing = entry.timing as CompleteTimingInterpretation;
        expect(resolvePaymentPeriod({ timing, currentMessage: entry.message, trustedDate: "2026-08-24", selectedPaymentPeriod: null, allowedPriorTiming: null }))
          .toBe(entry.expectedResolvedMonth);
        continue;
      }
      const diagnostic = classify({
        message: entry.message,
        branch: entry.branch,
        timing: entry.timing,
        selected: entry.selectedScenarioPresent
      });
      if (entry.expectedDiagnostic) expect(diagnostic.diagnosticCodes).toContain(entry.expectedDiagnostic);
      else expect(diagnostic.failedStage).toBeNull();
      expect(diagnostic.applicationCommandAuthorized).toBe(entry.simulatorPermitted);
      expect(diagnostic.simulatorInvoked).toBe(false);
      if (entry.simulatorPermitted && entry.timing) {
        expect(resolvePaymentPeriod({
          timing: entry.timing as CompleteTimingInterpretation,
          currentMessage: entry.message,
          trustedDate: "2026-08-24",
          selectedPaymentPeriod: entry.selectedPaymentPeriod,
          allowedPriorTiming: null
        })).toBe(entry.expectedResolvedMonth);
      }
    }
  });

  it("makes every active timing diagnostic reachable with a safe path, timing kind and repair rule", () => {
    const base = { quote: "next month", kind: "NEXT_MONTH", monthNumber: null, year: null, offsetMonths: 1 };
    const cases = [
      { message: "next month", timing: { ...base, kind: undefined } },
      { message: "next month", timing: { ...base, quote: "" } },
      { message: "next month", timing: { ...base, quote: "October" } },
      { message: "soon", timing: { ...base, quote: "soon" } },
      { message: "September or October", timing: { quote: "September or October", kind: "NAMED_MONTH", monthNumber: 10, year: null, offsetMonths: null } },
      { message: "next month", timing: { quote: "next month", kind: "NAMED_MONTH", monthNumber: 10, year: null, offsetMonths: null } },
      { message: "October", timing: { quote: "October", kind: "NAMED_MONTH", monthNumber: null, year: null, offsetMonths: null } },
      { message: "next month", timing: { ...base, monthNumber: 9 } },
      { message: "October", timing: { quote: "October", kind: "NAMED_MONTH", monthNumber: 9, year: null, offsetMonths: null } },
      { message: "October 2027", timing: { quote: "October 2027", kind: "EXPLICIT_YEAR_MONTH", monthNumber: 10, year: null, offsetMonths: null } },
      { message: "October", timing: { quote: "October", kind: "NAMED_MONTH", monthNumber: 10, year: 2027, offsetMonths: null } },
      { message: "October 2027", timing: { quote: "October 2027", kind: "EXPLICIT_YEAR_MONTH", monthNumber: 10, year: 2028, offsetMonths: null } },
      { message: "one month later", timing: { quote: "one month later", kind: "MONTHS_AFTER_SELECTED", monthNumber: null, year: null, offsetMonths: null } },
      { message: "October", timing: { quote: "October", kind: "NAMED_MONTH", monthNumber: 10, year: null, offsetMonths: 1 } },
      { message: "next month", timing: { ...base, offsetMonths: 2 } },
      { message: "one month later", timing: { quote: "one month later", kind: "MONTHS_AFTER_SELECTED", monthNumber: null, year: null, offsetMonths: 2 } },
      { message: "one month later", timing: { quote: "one month later", kind: "MONTHS_AFTER_SELECTED", monthNumber: null, year: null, offsetMonths: 1 } },
      { message: "next month", timing: { ...base, monthNumber: 9, year: 2026, offsetMonths: 2 } }
    ];
    const observed = new Set<InterpretationDiagnosticCode>();
    for (const entry of cases) {
      const diagnostic = classify({ message: `£650 ${entry.message}`, branch: "CREATE_ONE_OFF_PURCHASE", timing: entry.timing, selected: false });
      diagnostic.diagnosticCodes.filter((code) => code.startsWith("TIMING_")).forEach((code) => observed.add(code));
      expect(
        diagnostic.jsonPointerPaths.every((path) => path.startsWith("/interpretation/timing")),
        JSON.stringify({ entry, diagnostic })
      ).toBe(true);
      expect(JSON.stringify(diagnostic)).not.toContain(entry.message);
      for (const issue of repairValidationErrors(diagnostic).filter((item) => item.code.startsWith("TIMING_"))) {
        expect(issue.rule).toBe(TIMING_REPAIR_RULE_BY_CODE[issue.code as keyof typeof TIMING_REPAIR_RULE_BY_CODE]);
      }
    }
    const activeTimingCodes = INTERPRETATION_DIAGNOSTIC_CODES.filter((code) =>
      code.startsWith("TIMING_") && code !== "TIMING_QUOTE_NOT_FOUND"
    );
    expect([...observed].sort()).toEqual([...activeTimingCodes].sort());
  });

  it("collapses the old structural state space to unambiguous v3 branches", () => {
    const quotes = ["next month", "October", ""] as const;
    const months = [null, 0, 1, 10, 12, 13] as const;
    const years = [null, 1999, 2000, 2026, 2200, 2201] as const;
    const offsets = [null, -1, 0, 1, 2, 120, 121] as const;
    const shapes: CompleteTimingInterpretation[] = [];
    for (const kind of COMPLETE_TIMING_KINDS) for (const quote of quotes) for (const monthNumber of months) {
      for (const year of years) for (const offsetMonths of offsets) {
        shapes.push({ quote, kind, monthNumber, year, offsetMonths });
      }
    }
    expect(shapes).toHaveLength(3024);
    const providerValid = shapes.filter((shape) => acceptsJsonSchema(COMPLETE_TIMING_PARAMETERS_V3, shape));
    const runtimeValid = shapes.filter((shape) => completeTimingInterpretationSchema.safeParse(shape).success);
    const sourceEquivalent = runtimeValid.filter((shape) => timingQuoteEquivalenceIssues(shape).length === 0);
    expect(providerValid).toHaveLength(32);
    expect(runtimeValid).toHaveLength(32);
    expect(sourceEquivalent).toHaveLength(2);
    expect(providerValid.every((shape) => completeTimingInterpretationSchema.safeParse(shape).success)).toBe(true);
    expect(sourceEquivalent.every((shape) => parseGroundedTimingQuote(shape.quote).status === "PARSED")).toBe(true);
  });

  it.each([
    ["timing_valid_canonical_next_month", "RESOLVED", null],
    ["timing_correct_named_month", "RESOLVED", null],
    ["timing_correct_explicit_year_month", "RESOLVED", null],
    ["timing_correct_months_after_selected", "RESOLVED", null],
    ["timing_missing_next_month_offset", "REJECTED", "TIMING_OFFSET_REQUIRED"],
    ["timing_wrong_next_month_offset", "REJECTED", "TIMING_OFFSET_MUST_EQUAL_ONE"],
    ["timing_next_month_as_named_month", "REJECTED", "TIMING_QUOTE_KIND_MISMATCH"],
    ["timing_wrong_named_month_number", "REJECTED", "TIMING_MONTH_NUMBER_MISMATCH"],
    ["timing_wrong_explicit_year", "REJECTED", "TIMING_YEAR_MISMATCH"],
    ["timing_missing_selected_scenario", "REJECTED", "TIMING_SELECTED_SCENARIO_REQUIRED"]
  ] as const)("runs deterministic fake timing mode %s", async (mode, expectedResult, expectedCode) => {
    const fixture = fakeInterpretationDiagnosticFixture(mode);
    fixture.responses.forEach((response) => openai.create.mockResolvedValueOnce(response));
    const collector = new SanitisedInterpretationDiagnosticCollector({ NODE_ENV: "test", OPENAI_EVALUATION_DIAGNOSTICS_ENABLED: "true" });
    collector.beginCase(mode);
    const provider = new OpenAIResponsesConversationModelProvider("test-only-key", "gpt-test", { maxRetries: 0, diagnosticSink: collector });
    let result = "RESOLVED";
    try { await provider.interpret(fixture.request as Parameters<typeof provider.interpret>[0]); } catch { result = "REJECTED"; }
    expect(result).toBe(expectedResult);
    if (expectedCode) expect(collector.records()[0]!.diagnosticCodes).toContain(expectedCode);
    else expect(collector.records()[0]).toMatchObject({ failedStage: null, applicationCommandAuthorized: true });
  });

  it.each([
    ["timing_repair_fixes", "SUCCEEDED", "RESOLVED"],
    ["timing_repair_repeats_failure", "IDENTICAL_FAILURE", "REJECTED"],
    ["timing_repair_changes_failure", "NEW_FAILURE", "REJECTED"]
  ] as const)("applies one bounded timing repair for %s", async (mode, repairOutcome, expectedResult) => {
    const fixture = fakeInterpretationDiagnosticFixture(mode);
    fixture.responses.forEach((response) => openai.create.mockResolvedValueOnce(response));
    const collector = new SanitisedInterpretationDiagnosticCollector({ NODE_ENV: "test", OPENAI_EVALUATION_DIAGNOSTICS_ENABLED: "true" });
    collector.beginCase(mode);
    const provider = new OpenAIResponsesConversationModelProvider("test-only-key", "gpt-test", { maxRetries: 1, diagnosticSink: collector });
    let result = "RESOLVED";
    try { await provider.interpret(fixture.request as Parameters<typeof provider.interpret>[0]); } catch { result = "REJECTED"; }
    expect(result).toBe(expectedResult);
    expect(openai.create).toHaveBeenCalledTimes(2);
    expect(collector.records()[1]).toMatchObject({ repairOutcome, simulatorInvoked: false });
    const repairRequest = JSON.parse(openai.create.mock.calls[1]![0].input);
    expect(repairRequest).not.toHaveProperty("invalidInterpretation");
    expect(repairRequest).not.toHaveProperty("expectedResolvedMonth");
    expect(repairRequest.validationErrors[0]).toMatchObject({
      path: "/interpretation/timing/offsetMonths",
      code: "TIMING_OFFSET_MUST_EQUAL_ONE",
      rule: "For NEXT_MONTH, offsetMonths must equal 1; monthNumber and year must be null."
    });
  });

  it("keeps unsupported before/after-payday requests outside timing and simulation", () => {
    const value = interpretWithDeterministicFake({
      userMessage: "Can I pay £650 before payday?",
      pendingClarification: null,
      availableScenarios: [],
      selectedScenarioType: null,
      trustedDate: "2026-08-24",
      timezone: "Europe/London"
    });
    expect(value).toEqual({ kind: "UNSUPPORTED", category: "INTRA_MONTH_PAYMENT_TIMING" });
  });
});
