import { beforeEach, describe, expect, it, vi } from "vitest";

const openai = vi.hoisted(() => ({ create: vi.fn() }));

vi.mock("openai", () => ({
  default: class {
    readonly responses = { create: openai.create };
  }
}));

import {
  CLARIFICATION_RESOLUTION_PROMPT_VERSION,
  CLARIFICATION_RESOLUTION_PROMPT_VERSION_V1,
  CLARIFICATION_RESOLUTION_SCHEMA_VERSION,
  CLARIFICATION_RESOLUTION_SCHEMA_VERSION_V1,
  INTERPRETATION_PROMPT_VERSION,
  INTERPRETATION_PROMPT_VERSION_V2,
  INTERPRETATION_SCHEMA_VERSION,
  INTERPRETATION_SCHEMA_VERSION_V2
} from "../src/application/conversation/contracts";
import {
  completeTimingInterpretationSchemaV2,
  legacyTimingInterpretationSchema,
  monthClarificationResolutionSchemaV1
} from "../src/application/conversation/schemas";
import {
  CLARIFICATION_RESOLUTION_PROMPT_V1,
  INTERPRETATION_PROMPT_V2
} from "../src/application/conversation/prompts";
import {
  SanitisedInterpretationDiagnosticCollector
} from "../src/infrastructure/ai/openai/interpretation-diagnostics";
import { OpenAIResponsesConversationModelProvider } from "../src/infrastructure/ai/openai/openai-responses-conversation-provider";
import {
  CANONICAL_TIMING_MESSAGE,
  COMPLETE_TIMING_KINDS,
  classifyCanonicalCreateTiming,
  enumerateProviderTimingEquivalenceShapes,
  providerCompleteTimingSchema,
  providerSchemaAcceptsTiming,
  type SyntheticTimingShape
} from "./helpers/timing-contract-diagnostics";
import { FakeConversationModelProvider } from "../src/infrastructure/ai/fake-conversation-model-provider";
import { conversationEvaluationCorpusV2 } from "./fixtures/conversation-evaluation-corpus-v2";

const validNextMonth = {
  quote: "next month",
  kind: "NEXT_MONTH",
  monthNumber: null,
  year: null,
  offsetMonths: 1
} as const;

const diagnosticsEnvironment: NodeJS.ProcessEnv = {
  NODE_ENV: "test",
  OPENAI_EVALUATION_DIAGNOSTICS_ENABLED: "true"
};

const request = {
  userMessage: CANONICAL_TIMING_MESSAGE,
  pendingClarification: null,
  availableScenarios: [],
  selectedScenarioType: null,
  trustedDate: "2026-08-24",
  timezone: "Europe/London" as const
};

function providerResponse(timing: SyntheticTimingShape) {
  return {
    output: [{
      type: "function_call",
      name: "submit_conversation_interpretation_v4",
      arguments: JSON.stringify({
        interpretation: {
          kind: "CREATE_ONE_OFF_PURCHASE",
          amount: { quote: "£650", currency: "GBP" },
          timing,
          purposeQuote: "trip"
        }
      })
    }]
  };
}

async function runRepair(first: SyntheticTimingShape, second: SyntheticTimingShape) {
  openai.create.mockResolvedValueOnce(providerResponse(first)).mockResolvedValueOnce(providerResponse(second));
  const collector = new SanitisedInterpretationDiagnosticCollector(diagnosticsEnvironment);
  collector.beginCase("c1d-local-repair");
  const provider = new OpenAIResponsesConversationModelProvider("test-only-key", "gpt-test", {
    maxRetries: 1,
    diagnosticSink: collector
  });
  let resolved: boolean;
  try {
    await provider.interpret(request);
    resolved = true;
  } catch {
    resolved = false;
  }
  return { resolved, diagnostics: collector.records(), calls: openai.create.mock.calls };
}

describe("Track C1D local timing-contract diagnostic", () => {
  beforeEach(() => openai.create.mockReset());

  it("proves the provider timing schema is strict about fields but not kind-specific timing semantics", () => {
    expect(providerCompleteTimingSchema()).toMatchObject({
      type: "object",
      additionalProperties: false,
      required: ["quote", "kind", "monthNumber", "year", "offsetMonths"]
    });
    expect(providerSchemaAcceptsTiming(validNextMonth)).toBe(true);
    expect(providerSchemaAcceptsTiming({ ...validNextMonth, offsetMonths: null })).toBe(true);
    expect(providerSchemaAcceptsTiming({ ...validNextMonth, monthNumber: 13 })).toBe(true);
    expect(providerSchemaAcceptsTiming({ ...validNextMonth, quote: "" })).toBe(true);
    expect(providerSchemaAcceptsTiming({ ...validNextMonth, offsetMonths: 1, extra: null })).toBe(false);
    const missingOffset = { ...validNextMonth } as Record<string, unknown>;
    delete missingOffset.offsetMonths;
    expect(providerSchemaAcceptsTiming(missingOffset)).toBe(false);
  });

  it("freezes the exact runtime invariant for every complete timing kind and legacy incomplete kinds", () => {
    const valid = [
      validNextMonth,
      { quote: "one month later", kind: "MONTHS_AFTER_SELECTED", monthNumber: null, year: null, offsetMonths: 1 },
      { quote: "October", kind: "NAMED_MONTH", monthNumber: 10, year: null, offsetMonths: null },
      { quote: "2027-10", kind: "EXPLICIT_YEAR_MONTH", monthNumber: 10, year: 2027, offsetMonths: null }
    ] as const;
    expect(valid.map((timing) => completeTimingInterpretationSchemaV2.safeParse(timing).success)).toEqual([true, true, true, true]);
    expect(COMPLETE_TIMING_KINDS).toEqual(valid.map((timing) => timing.kind));

    const invalid = [
      { ...validNextMonth, offsetMonths: null },
      { ...validNextMonth, offsetMonths: 2 },
      { ...validNextMonth, monthNumber: 9 },
      { ...validNextMonth, year: 2026 },
      { ...valid[1], monthNumber: 10 },
      { ...valid[2], monthNumber: null },
      { ...valid[2], year: 2026 },
      { ...valid[3], year: null },
      { ...valid[3], offsetMonths: 1 }
    ];
    expect(invalid.every((timing) => !completeTimingInterpretationSchemaV2.safeParse(timing).success)).toBe(true);
    for (const kind of ["MISSING", "AMBIGUOUS"] as const) {
      const partial = { quote: null, kind, monthNumber: null, year: null, offsetMonths: null };
      expect(legacyTimingInterpretationSchema.safeParse(partial).success).toBe(true);
      expect(completeTimingInterpretationSchemaV2.safeParse(partial).success).toBe(false);
    }
  });

  it("exhaustively classifies provider structural/nullability and representative range equivalence classes", () => {
    const shapes = enumerateProviderTimingEquivalenceShapes();
    expect(shapes).toHaveLength(3024);
    expect(shapes.every(providerSchemaAcceptsTiming)).toBe(true);
    const nullabilityPatterns = new Set(shapes.map((shape) => [
      shape.kind,
      shape.monthNumber === null ? "month:null" : "month:integer",
      shape.year === null ? "year:null" : "year:integer",
      shape.offsetMonths === null ? "offset:null" : "offset:integer"
    ].join("|")));
    expect(nullabilityPatterns).toHaveLength(32);

    const classifications = shapes.map((shape) => classifyCanonicalCreateTiming(shape));
    expect(classifications.some((result) => result.runtimeContractValid)).toBe(true);
    expect(classifications.some((result) => result.failedStage === "STRICT_SCHEMA_VALIDATION")).toBe(true);
    expect(classifications.some((result) => result.failedStage === "BRANCH_SEMANTIC_VALIDATION")).toBe(true);
    expect(classifications.some((result) => result.diagnosticCodes.includes("SUPPORTED_INTENT_MISSING_REQUIRED_INFORMATION"))).toBe(true);
    expect(classifications.some((result) => result.diagnosticCodes.includes("TIMING_QUOTE_NOT_FOUND"))).toBe(true);
    expect(classifications.some((result) => result.applicationErrorCode === "SCENARIO_REFERENCE_REQUIRED")).toBe(true);
    expect(classifications.some((result) => result.applicationEligible && result.canonicalMeaningConsistent === false)).toBe(true);
    expect(classifications.every((result) => result.applicationEligible ? result.runtimeContractValid && result.sourceGrounded === true && result.conversationStateValid === true : true)).toBe(true);
  });

  it.each([
    ["missing quote", { kind: "NEXT_MONTH", monthNumber: null, year: null, offsetMonths: 1 }, "STRICT_SCHEMA_VALIDATION", "BRANCH_REQUIRED_FIELD_MISSING"],
    ["null offset", { ...validNextMonth, offsetMonths: null }, "BRANCH_SEMANTIC_VALIDATION", "SUPPORTED_INTENT_MISSING_REQUIRED_INFORMATION"],
    ["incompatible explicit month", { ...validNextMonth, monthNumber: 9 }, "BRANCH_SEMANTIC_VALIDATION", "SUPPORTED_INTENT_MISSING_REQUIRED_INFORMATION"],
    ["incompatible year", { ...validNextMonth, year: 2026 }, "BRANCH_SEMANTIC_VALIDATION", "SUPPORTED_INTENT_MISSING_REQUIRED_INFORMATION"],
    ["non-grounded quote", { ...validNextMonth, quote: "October" }, "SOURCE_GROUNDING", "TIMING_QUOTE_NOT_FOUND"]
  ] as const)("fails %s safely before simulator eligibility", (_name, timing, stage, code) => {
    const result = classifyCanonicalCreateTiming(timing);
    expect(result).toMatchObject({ failedStage: stage, applicationEligible: false });
    expect(result.diagnosticCodes).toContain(code);
    expect(result.safePaths.every((path) => path.startsWith("/"))).toBe(true);
  });

  it("defines the canonical next-month object and leaves year-month resolution to the trusted server", () => {
    const result = classifyCanonicalCreateTiming(validNextMonth);
    expect(result).toMatchObject({
      providerSchemaValid: true,
      runtimeContractValid: true,
      sourceGrounded: true,
      conversationStateValid: true,
      applicationEligible: true,
      resolvedPaymentPeriod: "2026-09",
      canonicalMeaningConsistent: true
    });
  });

  it("exposes the current quote-to-kind enforcement gap without changing production validation", () => {
    const wrongKind = {
      quote: "next month",
      kind: "NAMED_MONTH",
      monthNumber: 10,
      year: null,
      offsetMonths: null
    } as const;
    const result = classifyCanonicalCreateTiming(wrongKind);
    expect(result).toMatchObject({
      providerSchemaValid: true,
      runtimeContractValid: true,
      sourceGrounded: true,
      diagnosticCommandAuthorized: true,
      conversationStateValid: true,
      applicationEligible: true,
      resolvedPaymentPeriod: "2026-10",
      canonicalMeaningConsistent: false
    });
  });

  it("exposes the diagnostic/application state gap for MONTHS_AFTER_SELECTED on an initial purchase", () => {
    const result = classifyCanonicalCreateTiming({
      quote: "next month",
      kind: "MONTHS_AFTER_SELECTED",
      monthNumber: null,
      year: null,
      offsetMonths: 1
    });
    expect(result).toMatchObject({
      runtimeContractValid: true,
      sourceGrounded: true,
      diagnosticCommandAuthorized: true,
      conversationStateValid: false,
      applicationEligible: false,
      applicationErrorCode: "SCENARIO_REFERENCE_REQUIRED"
    });
  });

  it("uses the identical complete-timing contract for initial purchase, month clarification, and timing follow-up", () => {
    expect(monthClarificationResolutionSchemaV1.safeParse({ kind: "RESOLVE_PURCHASE_MONTH", timing: validNextMonth }).success).toBe(true);
    expect(monthClarificationResolutionSchemaV1.safeParse({ kind: "RESOLVE_PURCHASE_MONTH", timing: { ...validNextMonth, offsetMonths: null } }).success).toBe(false);
    expect(CLARIFICATION_RESOLUTION_SCHEMA_VERSION_V1).toBe("fy-clarification-resolution-schema/1.0.0");
    expect(CLARIFICATION_RESOLUTION_PROMPT_VERSION_V1).toBe("fy-clarification-resolution-prompt/1.0.0");
    expect(CLARIFICATION_RESOLUTION_SCHEMA_VERSION).toBe("fy-clarification-resolution-schema/2.0.0");
    expect(CLARIFICATION_RESOLUTION_PROMPT_VERSION).toBe("fy-clarification-resolution-prompt/2.0.0");
  });

  it("shows that current prompts require semantic timing but do not state the five kind-specific field invariants", () => {
    expect(INTERPRETATION_PROMPT_VERSION_V2).toBe("fy-conversation-interpretation/2.0.0");
    expect(INTERPRETATION_SCHEMA_VERSION_V2).toBe("fy-conversation-intent/2.0.0");
    expect(INTERPRETATION_PROMPT_V2).toContain("Preserve exact amount, timing");
    expect(INTERPRETATION_PROMPT_V2).toContain("resolves relative dates");
    expect(INTERPRETATION_PROMPT_V2).not.toContain("offsetMonths=1");
    expect(INTERPRETATION_PROMPT_V2).not.toContain("monthNumber must be null");
    expect(CLARIFICATION_RESOLUTION_PROMPT_V1).not.toContain("offsetMonths=1");
    expect(INTERPRETATION_PROMPT_VERSION).toBe("fy-conversation-interpretation/4.0.0");
    expect(INTERPRETATION_SCHEMA_VERSION).toBe("fy-conversation-intent/4.0.0");
  });

  it("audits every current corpus timing path without changing its expectation", async () => {
    const timingCases = new Map([
      ["canonical-trip-650", ["CREATE_ONE_OFF_PURCHASE", "NEXT_MONTH"]],
      ["natural-quid", ["CREATE_ONE_OFF_PURCHASE", "NEXT_MONTH"]],
      ["natural-laptop-october", ["CREATE_ONE_OFF_PURCHASE", "NAMED_MONTH"]],
      ["natural-okay", ["CREATE_ONE_OFF_PURCHASE", "NEXT_MONTH"]],
      ["noisy-afford", ["CREATE_ONE_OFF_PURCHASE", "NEXT_MONTH"]],
      ["noisy-month-follow-up", ["CHANGE_PURCHASE_MONTH", "NAMED_MONTH"]],
      ["resolve-month-clarification", ["RESOLVE_PURCHASE_MONTH", "NAMED_MONTH"]],
      ["timing-follow-up", ["CHANGE_PURCHASE_MONTH", "MONTHS_AFTER_SELECTED"]],
      ["clarify-scenario-month", ["CLARIFY_SCENARIO_REFERENCE", "NAMED_MONTH"]]
    ] as const);
    const provider = new FakeConversationModelProvider();
    for (const [id, [expectedBranch, expectedTimingKind]] of timingCases) {
      const evaluation = conversationEvaluationCorpusV2.find((item) => item.id === id)!;
      const common = {
        userMessage: evaluation.message,
        availableScenarios: evaluation.selectedScenario
          ? [{ label: "£650 trip", scenarioType: "one_off_purchase" as const, selected: true }]
          : [],
        selectedScenarioType: evaluation.selectedScenario ? "one_off_purchase" as const : null,
        trustedDate: "2026-08-24",
        timezone: "Europe/London" as const
      };
      const output = evaluation.providerMethod === "RESOLVE_CLARIFICATION"
        ? (await provider.resolveClarification({ ...common, pendingClarification: evaluation.pendingClarification! })).value
        : (await provider.interpret({ ...common, pendingClarification: null })).value;
      expect(output.kind).toBe(expectedBranch);
      const timing = "timing" in output
        ? output.timing
        : output.kind === "CLARIFY_SCENARIO_REFERENCE" && output.attemptedOperation.kind === "CHANGE_PURCHASE_MONTH"
          ? output.attemptedOperation.timing
          : null;
      expect(timing?.kind).toBe(expectedTimingKind);
      expect(timing ? completeTimingInterpretationSchemaV2.safeParse(timing).success : false).toBe(true);
    }

    expect(conversationEvaluationCorpusV2.some((item) => item.message.includes("2027-10"))).toBe(false);
    expect(conversationEvaluationCorpusV2.find((item) => item.id === "missing-month")?.expectedKind).toBe("CLARIFY_PURCHASE_MONTH");
    expect(conversationEvaluationCorpusV2.find((item) => item.id === "ambiguous-month")?.expectedKind).toBe("CLARIFY_PURCHASE_MONTH");
    expect(conversationEvaluationCorpusV2.find((item) => item.id === "current-path-selection")?.expectedKind).toBe("SELECT_EXISTING_SCENARIO");
    expect(conversationEvaluationCorpusV2.find((item) => item.id === "unsupported-intr_month")?.expectedKind).toBe("UNSUPPORTED");
  });

  it("retains the C1D repair case while the active v3 repair now receives a precise rule", async () => {
    const invalid = { ...validNextMonth, offsetMonths: 2 };
    const result = await runRepair(invalid, invalid);
    expect(result.resolved).toBe(false);
    expect(result.diagnostics).toHaveLength(2);
    expect(result.diagnostics[1]).toMatchObject({ repairOutcome: "IDENTICAL_FAILURE", simulatorInvoked: false });
    const repairInput = JSON.parse(result.calls[1]![0].input);
    expect(repairInput.validationErrors).toEqual([{
      path: "/interpretation/timing/offsetMonths",
      code: "TIMING_OFFSET_MUST_EQUAL_ONE",
      rule: "For NEXT_MONTH, offsetMonths must equal 1; monthNumber and year must be null."
    }]);
    expect(repairInput).not.toHaveProperty("invalidInterpretation");
  });

  it("distinguishes a different invalid timing repair signature", async () => {
    const result = await runRepair(
      { ...validNextMonth, offsetMonths: 2 },
      { ...validNextMonth, monthNumber: 13, offsetMonths: 1 }
    );
    expect(result.resolved).toBe(false);
    expect(result.diagnostics[1]).toMatchObject({ repairOutcome: "NEW_FAILURE", simulatorInvoked: false });
    expect(result.diagnostics[1]!.diagnosticCodes).toContain("REPAIR_OUTPUT_NEW_FAILURE");
  });

  it("accepts a repair that produces the canonical semantic timing object", async () => {
    const result = await runRepair({ ...validNextMonth, offsetMonths: null }, validNextMonth);
    expect(result.resolved).toBe(true);
    expect(result.diagnostics[1]).toMatchObject({
      repairOutcome: "SUCCEEDED",
      semanticContractValid: true,
      applicationCommandAuthorized: true,
      simulatorInvoked: false
    });
    expect(openai.create).toHaveBeenCalledTimes(2);
  });
});
