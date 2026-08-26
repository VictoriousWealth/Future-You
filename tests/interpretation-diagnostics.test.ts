import { beforeEach, describe, expect, it, vi } from "vitest";

const openai = vi.hoisted(() => ({ create: vi.fn() }));

vi.mock("openai", () => ({
  default: class {
    readonly responses = { create: openai.create };
  }
}));

import {
  FAKE_INTERPRETATION_DIAGNOSTIC_MODES,
  fakeInterpretationDiagnosticFixture,
  type FakeInterpretationDiagnosticMode
} from "../src/infrastructure/ai/fake-conversation-model-provider";
import {
  INTERPRETATION_DIAGNOSTIC_CODES,
  INTERPRETATION_DIAGNOSTIC_VERSION,
  INTERPRETATION_VALIDATION_STAGES,
  SanitisedInterpretationDiagnosticCollector,
  type InterpretationDiagnosticCode,
  type InterpretationValidationStage,
  type SanitisedInterpretationDiagnostic
} from "../src/infrastructure/ai/openai/interpretation-diagnostics";
import { OpenAIResponsesConversationModelProvider } from "../src/infrastructure/ai/openai/openai-responses-conversation-provider";

const diagnosticsEnvironment: NodeJS.ProcessEnv = {
  NODE_ENV: "test",
  OPENAI_EVALUATION_DIAGNOSTICS_ENABLED: "true"
};

const expectedFailures: Readonly<Record<
  Exclude<FakeInterpretationDiagnosticMode,
    | "repair_succeeds"
    | "repair_repeats_same_failure"
    | "repair_produces_different_failure"
    | "repair_remains_invalid"
    | "timing_valid_canonical_next_month"
    | "timing_correct_named_month"
    | "timing_correct_explicit_year_month"
    | "timing_correct_months_after_selected"
    | "timing_missing_next_month_offset"
    | "timing_wrong_next_month_offset"
    | "timing_next_month_as_named_month"
    | "timing_wrong_named_month_number"
    | "timing_wrong_explicit_year"
    | "timing_missing_selected_scenario"
    | "timing_quote_kind_mismatch"
    | "timing_repair_fixes"
    | "timing_repair_repeats_failure"
    | "timing_repair_changes_failure">,
  Readonly<{ stage: InterpretationValidationStage | null; code: InterpretationDiagnosticCode }>
>> = {
  missing_tool_call: { stage: "TOOL_CALL_SELECTION", code: "REQUIRED_TOOL_CALL_MISSING" },
  wrong_tool_name: { stage: "TOOL_CALL_SELECTION", code: "UNEXPECTED_TOOL_NAME" },
  multiple_tool_calls: { stage: "TOOL_CALL_SELECTION", code: "MULTIPLE_TOOL_CALLS" },
  invalid_json: { stage: "TOOL_ARGUMENT_JSON_PARSE", code: "TOOL_ARGUMENTS_NOT_JSON" },
  root_envelope_invalid: { stage: "STRICT_SCHEMA_VALIDATION", code: "ROOT_ENVELOPE_INVALID" },
  missing_root_interpretation: { stage: "STRICT_SCHEMA_VALIDATION", code: "INTERPRETATION_BRANCH_MISSING" },
  unknown_branch: { stage: "BRANCH_DISCRIMINATOR_VALIDATION", code: "INTERPRETATION_BRANCH_UNKNOWN" },
  missing_branch_field: { stage: "STRICT_SCHEMA_VALIDATION", code: "BRANCH_REQUIRED_FIELD_MISSING" },
  field_type_invalid: { stage: "STRICT_SCHEMA_VALIDATION", code: "FIELD_TYPE_INVALID" },
  null_not_allowed: { stage: "STRICT_SCHEMA_VALIDATION", code: "NULL_NOT_ALLOWED" },
  extra_branch_field: { stage: "STRICT_SCHEMA_VALIDATION", code: "EXTRA_PROPERTY_PRESENT" },
  invalid_exact_identifier: { stage: "IDENTIFIER_VALIDATION", code: "UNSUPPORTED_CATEGORY_INCOMPATIBLE" },
  supported_intent_semantic_failure: { stage: "BRANCH_SEMANTIC_VALIDATION", code: "TIMING_OFFSET_MUST_EQUAL_ONE" },
  explanation_target_incompatible: { stage: "IDENTIFIER_VALIDATION", code: "EXPLANATION_TARGET_INCOMPATIBLE" },
  scenario_selection_target_incompatible: { stage: "IDENTIFIER_VALIDATION", code: "SCENARIO_SELECTION_TARGET_INCOMPATIBLE" },
  wrong_branch_for_conversation_state: { stage: "CONVERSATION_STATE_VALIDATION", code: "BRANCH_NOT_ALLOWED_IN_CONVERSATION_STATE" },
  amount_quote_not_grounded: { stage: "SOURCE_GROUNDING", code: "AMOUNT_QUOTE_NOT_FOUND" },
  amount_quote_not_parseable: { stage: "SOURCE_GROUNDING", code: "AMOUNT_QUOTE_NOT_PARSEABLE" },
  timing_quote_not_grounded: { stage: "SOURCE_GROUNDING", code: "TIMING_QUOTE_NOT_GROUNDED" },
  scenario_label_quote_not_grounded: { stage: "SOURCE_GROUNDING", code: "SCENARIO_LABEL_QUOTE_NOT_FOUND" },
  scenario_reference_unresolved: { stage: "CONVERSATION_STATE_VALIDATION", code: "SCENARIO_REFERENCE_UNRESOLVED" },
  invented_scenario_id: { stage: "STRICT_SCHEMA_VALIDATION", code: "MODEL_SUPPLIED_UNTRUSTED_SCENARIO_ID" },
  unsupported_branch_with_command_data: { stage: "BRANCH_SEMANTIC_VALIDATION", code: "UNSUPPORTED_BRANCH_CONTAINS_COMMAND_FIELDS" },
  cross_user_reference_rejected: { stage: null, code: "CROSS_USER_REFERENCE_REJECTED" },
  unsupported_operation_rejected: { stage: null, code: "UNSUPPORTED_OPERATION_REJECTED" },
  invalid_clarification_kind: { stage: "BRANCH_SEMANTIC_VALIDATION", code: "CLARIFICATION_KIND_INCOMPATIBLE" }
};

async function runFixture(
  mode: FakeInterpretationDiagnosticMode
): Promise<Readonly<{ diagnostics: readonly SanitisedInterpretationDiagnostic[]; result: "RESOLVED" | "REJECTED" }>> {
  const fixture = fakeInterpretationDiagnosticFixture(mode);
  for (const response of fixture.responses) openai.create.mockResolvedValueOnce(response);
  const collector = new SanitisedInterpretationDiagnosticCollector(diagnosticsEnvironment);
  collector.beginCase(mode);
  const repairMode = mode.startsWith("repair_") || mode.startsWith("timing_repair_");
  const provider = new OpenAIResponsesConversationModelProvider("test-only-key", "gpt-test", {
    maxRetries: repairMode ? 1 : 0,
    diagnosticSink: collector
  });
  try {
    if (fixture.method === "RESOLVE_AMOUNT_CLARIFICATION") {
      await provider.resolveClarification(fixture.request as Parameters<typeof provider.resolveClarification>[0]);
    } else {
      await provider.interpret(fixture.request as Parameters<typeof provider.interpret>[0]);
    }
    return { diagnostics: collector.records(), result: "RESOLVED" };
  } catch {
    return { diagnostics: collector.records(), result: "REJECTED" };
  }
}

describe("sanitised interpretation diagnostics", () => {
  beforeEach(() => openai.create.mockReset());

  it("defines stable, closed and unique validation-stage and diagnostic-code inventories", () => {
    expect(new Set(INTERPRETATION_VALIDATION_STAGES).size).toBe(INTERPRETATION_VALIDATION_STAGES.length);
    expect(new Set(INTERPRETATION_DIAGNOSTIC_CODES).size).toBe(INTERPRETATION_DIAGNOSTIC_CODES.length);
    expect(INTERPRETATION_DIAGNOSTIC_VERSION).toBe("fy-interpretation-diagnostic/2.0.0");
    expect(INTERPRETATION_VALIDATION_STAGES).toEqual(expect.arrayContaining([
      "PROVIDER_RESPONSE_RECEIVED",
      "STRICT_SCHEMA_VALIDATION",
      "SOURCE_GROUNDING",
      "APPLICATION_COMMAND_AUTHORIZATION",
      "REPAIR_REQUEST",
      "REPAIR_RESPONSE_VALIDATION",
      "FINAL_FAILURE"
    ]));
  });

  it("is disabled by default and cannot be activated by a provider request", () => {
    expect(() => new SanitisedInterpretationDiagnosticCollector({ NODE_ENV: "test" }))
      .toThrow("Evaluation diagnostics are disabled.");
  });

  it.each(Object.entries(expectedFailures))(
    "classifies %s at the precise sanitised stage",
    async (mode, expected) => {
      const result = await runFixture(mode as keyof typeof expectedFailures);
      expect(result.diagnostics).toHaveLength(1);
      const diagnostic = result.diagnostics[0]!;
      expect(diagnostic.failedStage).toBe(expected.stage);
      expect(diagnostic.diagnosticCodes).toContain(expected.code);
      expect(diagnostic.simulatorInvoked).toBe(false);
      expect(diagnostic.applicationCommandAuthorized).toBe(false);
      expect(diagnostic.jsonPointerPaths.every((path) => path.startsWith("/"))).toBe(true);
      expect(() => JSON.parse(JSON.stringify(diagnostic))).not.toThrow();
      const serialised = JSON.stringify(diagnostic);
      const fixture = fakeInterpretationDiagnosticFixture(mode as keyof typeof expectedFailures);
      expect(serialised).not.toContain(fixture.request.userMessage);
      expect(serialised).not.toMatch(/userMessage|rawOutput|rawArguments|messageId|runId/);
    }
  );

  it("records a successful bounded repair without changing the retry count", async () => {
    const result = await runFixture("repair_succeeds");
    expect(result.result).toBe("RESOLVED");
    expect(result.diagnostics).toHaveLength(2);
    expect(result.diagnostics[0]).toMatchObject({ attempt: 1, repairAttempt: false, repairOutcome: "REQUESTED" });
    expect(result.diagnostics[1]).toMatchObject({
      attempt: 2,
      repairAttempt: true,
      repairOutcome: "SUCCEEDED",
      failedStage: null,
      strictSchemaValid: true,
      semanticContractValid: true,
      sourceGroundingValid: true,
      conversationStateValid: true,
      applicationCommandAuthorized: true,
      simulatorInvoked: false
    });
    expect(openai.create).toHaveBeenCalledTimes(2);
    const repairInput = JSON.parse(openai.create.mock.calls[1]![0].input);
    expect(repairInput.validationErrors).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: expect.stringMatching(/^\//) })
    ]));
    for (const issue of repairInput.validationErrors as { code: string }[]) {
      expect(INTERPRETATION_DIAGNOSTIC_CODES).toContain(issue.code);
    }
    expect(repairInput).not.toHaveProperty("expectedEvaluationAnswer");
    expect(repairInput).not.toHaveProperty("corpusCase");
  });

  it.each([
    ["repair_repeats_same_failure", "IDENTICAL_FAILURE", "REPAIR_OUTPUT_IDENTICAL_FAILURE"],
    ["repair_produces_different_failure", "NEW_FAILURE", "REPAIR_OUTPUT_NEW_FAILURE"],
    ["repair_remains_invalid", "NEW_FAILURE", "REPAIR_OUTPUT_NEW_FAILURE"]
  ] as const)("classifies the final repair outcome for %s", async (mode, repairOutcome, repairCode) => {
    const result = await runFixture(mode);
    expect(result.result).toBe("REJECTED");
    expect(result.diagnostics).toHaveLength(2);
    expect(result.diagnostics[1]).toMatchObject({ attempt: 2, repairAttempt: true, repairOutcome });
    expect(result.diagnostics[1]!.diagnosticCodes).toEqual(expect.arrayContaining([
      repairCode,
      "REPAIR_OUTPUT_INVALID",
      "REPAIR_EXHAUSTED"
    ]));
    expect(result.diagnostics[1]!.stageTrace).toEqual(expect.arrayContaining([
      { stage: "REPAIR_RESPONSE_VALIDATION", outcome: "FAILED" },
      { stage: "FINAL_FAILURE", outcome: "COMPLETED" }
    ]));
    expect(openai.create).toHaveBeenCalledTimes(2);
  });

  it("covers every declared fake diagnostic mode", () => {
    expect(new Set(FAKE_INTERPRETATION_DIAGNOSTIC_MODES).size).toBe(FAKE_INTERPRETATION_DIAGNOSTIC_MODES.length);
    expect(FAKE_INTERPRETATION_DIAGNOSTIC_MODES).toEqual(expect.arrayContaining([
      ...Object.keys(expectedFailures),
      "repair_succeeds", "repair_repeats_same_failure", "repair_produces_different_failure",
      "repair_remains_invalid", "timing_valid_canonical_next_month", "timing_missing_next_month_offset",
      "timing_wrong_next_month_offset", "timing_next_month_as_named_month", "timing_correct_named_month",
      "timing_wrong_named_month_number", "timing_correct_explicit_year_month", "timing_wrong_explicit_year",
      "timing_correct_months_after_selected", "timing_missing_selected_scenario", "timing_quote_kind_mismatch",
      "timing_repair_fixes", "timing_repair_repeats_failure", "timing_repair_changes_failure"
    ]));
  });

  it("can produce every closed diagnostic code through deterministic fake attempts", async () => {
    const observed = new Set<InterpretationDiagnosticCode>();
    for (const mode of FAKE_INTERPRETATION_DIAGNOSTIC_MODES) {
      openai.create.mockReset();
      const result = await runFixture(mode);
      for (const diagnostic of result.diagnostics) {
        for (const code of diagnostic.diagnosticCodes) observed.add(code);
      }
    }
    const timingCodes = new Set(INTERPRETATION_DIAGNOSTIC_CODES.filter((code) =>
      code.startsWith("TIMING_")
      || code === "SUPPORTED_INTENT_MISSING_REQUIRED_INFORMATION"
    ));
    expect([...INTERPRETATION_DIAGNOSTIC_CODES].filter((code) => !timingCodes.has(code))).toEqual(
      expect.arrayContaining([...observed].filter((code) => !timingCodes.has(code)))
    );
    for (const code of INTERPRETATION_DIAGNOSTIC_CODES) {
      if (!timingCodes.has(code)) expect(observed).toContain(code);
    }
  });

  it("serialises only safe shape metadata and never provider or user free text", async () => {
    const fixture = fakeInterpretationDiagnosticFixture("invented_scenario_id");
    openai.create.mockResolvedValueOnce({
      output: [{
        type: "function_call",
        name: "submit_conversation_interpretation_v3",
        arguments: JSON.stringify({
          interpretation: {
            kind: "CREATE_ONE_OFF_PURCHASE",
            amount: { quote: "£650", currency: "GBP" },
            timing: { quote: "next month", kind: "NEXT_MONTH", monthNumber: null, year: null, offsetMonths: 1 },
            purposeQuote: "private-purpose-text",
            scenarioLabelQuote: "private-scenario-label",
            runId: "private-run-id",
            unknownSensitiveField: "sk-test-secret Bearer private-authorization"
          }
        })
      }]
    });
    const collector = new SanitisedInterpretationDiagnosticCollector(diagnosticsEnvironment);
    collector.beginCase("artifact-security");
    const provider = new OpenAIResponsesConversationModelProvider("sk-test-secret", "gpt-test", {
      maxRetries: 0,
      diagnosticSink: collector
    });
    await expect(provider.interpret(fixture.request as Parameters<typeof provider.interpret>[0])).rejects.toBeDefined();
    const artifact = JSON.stringify({ interpretationDiagnostics: collector.records() });
    for (const forbidden of [
      "Can I afford a £650 trip next month?",
      "£650",
      "private-purpose-text",
      "private-scenario-label",
      "private-run-id",
      "sarah.wonk@onibank.test",
      "sarah.personal@example.test",
      "FY7K3M9Q2D",
      "£2,750",
      "£900",
      "sk-test-secret",
      "Bearer private-authorization",
      "private-system-prompt",
      "private-hidden-instructions",
      "private-provider-reasoning"
    ]) {
      expect(artifact).not.toContain(forbidden);
    }
    expect(artifact).not.toContain("unknownSensitiveField");
    expect(JSON.parse(artifact)).toEqual({ interpretationDiagnostics: expect.any(Array) });
    expect(collector.records()[0]).toMatchObject({
      simulatorInvoked: false,
      applicationCommandAuthorized: false,
      diagnosticCodes: expect.arrayContaining(["MODEL_SUPPLIED_UNTRUSTED_SCENARIO_ID"])
    });
  });
});
