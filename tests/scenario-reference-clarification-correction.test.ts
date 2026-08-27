import { beforeEach, describe, expect, it, vi } from "vitest";

const openai = vi.hoisted(() => ({ create: vi.fn() }));

vi.mock("openai", () => ({
  default: class {
    readonly responses = { create: openai.create };
  }
}));

import {
  INTERPRETATION_PROMPT_VERSION,
  INTERPRETATION_PROMPT_VERSION_V3,
  INTERPRETATION_SCHEMA_VERSION,
  INTERPRETATION_SCHEMA_VERSION_V3,
  type ConversationInterpretation,
  type InterpretationProviderRequest
} from "../src/application/conversation/contracts";
import {
  deriveSupportedFollowUpEvidence,
  exactScenarioReferenceIssue,
  SUPPORTED_FOLLOW_UP_EVIDENCE_VERSION
} from "../src/application/conversation/follow-up-evidence";
import { INTERPRETATION_PROMPT, INTERPRETATION_PROMPT_V3 } from "../src/application/conversation/prompts";
import { conversationInterpretationEnvelopeV4Schema } from "../src/application/conversation/schemas";
import {
  FAKE_SCENARIO_REFERENCE_MODES,
  fakeScenarioReferenceFixture,
  interpretWithDeterministicFake
} from "../src/infrastructure/ai/fake-conversation-model-provider";
import {
  INTERPRETATION_DIAGNOSTIC_VERSION,
  SanitisedInterpretationDiagnosticCollector,
  successfulInterpretationDiagnostic
} from "../src/infrastructure/ai/openai/interpretation-diagnostics";
import {
  INTERPRET_TOOL,
  OpenAIResponsesConversationModelProvider
} from "../src/infrastructure/ai/openai/openai-responses-conversation-provider";
import {
  INTERPRETATION_PARAMETERS_V3,
  INTERPRETATION_PARAMETERS_V4,
  assertStrictProviderSchema
} from "../src/infrastructure/ai/openai/provider-json-schemas";
import { conversationTestApplication } from "./helpers/conversation";
import {
  SCENARIO_REFERENCE_CORPUS_VERSION,
  scenarioReferenceEvaluationCorpusV1
} from "./fixtures/scenario-reference-evaluation-corpus-v1";

function requestFor(message: string, availableScenarios: InterpretationProviderRequest["availableScenarios"] = []): InterpretationProviderRequest {
  return {
    userMessage: message,
    pendingClarification: null,
    availableScenarios,
    selectedScenarioType: availableScenarios.some((scenario) => scenario.selected) ? "one_off_purchase" : null,
    trustedDate: "2026-08-24",
    timezone: "Europe/London",
    supportedFollowUpEvidence: deriveSupportedFollowUpEvidence(message)
  };
}

function attemptedOperation(value: ConversationInterpretation): string | null {
  return value.kind === "CLARIFY_SCENARIO_REFERENCE" ? value.attemptedOperation.kind : null;
}

function response(value: ConversationInterpretation) {
  return {
    output: [{ type: "function_call", name: INTERPRET_TOOL, arguments: JSON.stringify({ interpretation: value }) }],
    usage: { input_tokens: 10, output_tokens: 5, total_tokens: 15 }
  };
}

async function seedSelectedTrip(test: ReturnType<typeof conversationTestApplication>, id: string) {
  const conversation = await test.application.create({ requestId: `c1h_${id}_conversation` });
  const initial = await test.application.send(conversation.conversation.id, {
    requestId: `c1h_${id}_initial`,
    message: "Can I afford a £650 trip next month?"
  });
  const runId = initial.conversation.conversation.selectedRunId;
  expect(runId).not.toBeNull();
  await test.application.select(conversation.conversation.id, {
    requestId: `c1h_${id}_clear_selection`,
    runId: null
  });
  return { conversationId: conversation.conversation.id, runId: runId! };
}

describe("Track C1H exact scenario-reference clarification correction", () => {
  beforeEach(() => openai.create.mockReset());

  it("activates v4 while preserving the historical v3 prompt, schema and timing shape", () => {
    expect(INTERPRETATION_PROMPT_VERSION_V3).toBe("fy-conversation-interpretation/3.0.0");
    expect(INTERPRETATION_SCHEMA_VERSION_V3).toBe("fy-conversation-intent/3.0.0");
    expect(INTERPRETATION_PROMPT_VERSION).toBe("fy-conversation-interpretation/4.0.0");
    expect(INTERPRETATION_SCHEMA_VERSION).toBe("fy-conversation-intent/4.0.0");
    expect(INTERPRETATION_DIAGNOSTIC_VERSION).toBe("fy-interpretation-diagnostics/3.0.0");
    expect(SUPPORTED_FOLLOW_UP_EVIDENCE_VERSION).toBe("fy-supported-follow-up-evidence/1.0.0");
    expect(INTERPRETATION_PROMPT_V3).toContain(INTERPRETATION_PROMPT_VERSION_V3);
    expect(INTERPRETATION_PROMPT).toContain("Do not return AMBIGUOUS when scenario reference is the");
    expect(INTERPRETATION_PROMPT).toContain("What about £500?");
    expect(INTERPRETATION_PROMPT).toContain("Why did it delay my emergency fund?");
    expect(INTERPRETATION_PARAMETERS_V4).toEqual(INTERPRETATION_PARAMETERS_V3);
    expect(() => assertStrictProviderSchema(INTERPRETATION_PARAMETERS_V4)).not.toThrow();
  });

  it("keeps the v1 scenario-reference corpus unique, complete and free of answer-key routing", () => {
    expect(SCENARIO_REFERENCE_CORPUS_VERSION).toBe("fy-scenario-reference-corpus/1.0.0");
    expect(new Set(scenarioReferenceEvaluationCorpusV1.map((entry) => entry.id)).size)
      .toBe(scenarioReferenceEvaluationCorpusV1.length);
    expect(scenarioReferenceEvaluationCorpusV1).toHaveLength(19);
    expect(new Set(scenarioReferenceEvaluationCorpusV1.map((entry) => entry.expectedEvidenceFamily)))
      .toEqual(new Set(["AMOUNT_CHANGE", "MONTH_CHANGE", "RESULT_EXPLANATION", "SCENARIO_SELECTION", "NONE"]));
    expect(scenarioReferenceEvaluationCorpusV1.filter((entry) => entry.repairExpectation !== "NONE").map((entry) => entry.repairExpectation))
      .toEqual(["SUCCEEDS", "IDENTICAL_FAILURE", "NEW_FAILURE"]);
  });

  it.each(scenarioReferenceEvaluationCorpusV1.filter((entry) => entry.repairExpectation === "NONE"))(
    "routes corpus case $id through bounded evidence and the deterministic fake",
    (entry) => {
      const request = requestFor(entry.message, entry.availableScenarios);
      expect(request.supportedFollowUpEvidence?.family).toBe(entry.expectedEvidenceFamily);
      const value = interpretWithDeterministicFake(request);
      expect(value.kind).toBe(entry.expectedKind);
      expect(attemptedOperation(value)).toBe(entry.expectedAttemptedOperation);
      expect(exactScenarioReferenceIssue(value, request)).toBeNull();
      if (value.kind === "CLARIFY_SCENARIO_REFERENCE" && value.attemptedOperation.kind === "CHANGE_PURCHASE_AMOUNT") {
        expect(request.supportedFollowUpEvidence).toMatchObject({ amountMinorUnits: entry.preservedAmountMinorUnits });
      }
      if (value.kind === "CLARIFY_SCENARIO_REFERENCE" && value.attemptedOperation.kind === "CHANGE_PURCHASE_MONTH") {
        expect(value.attemptedOperation.timing.kind).toBe(entry.preservedTimingKind);
      }
      if (value.kind === "CLARIFY_SCENARIO_REFERENCE" && value.attemptedOperation.kind === "EXPLAIN_SELECTED_RESULT") {
        expect(value.attemptedOperation.explanationTarget).toBe(entry.preservedExplanationTarget);
      }
    }
  );

  it.each([
    ["What about £500?", "AMOUNT_CHANGE"],
    ["What if I wait until October?", "MONTH_CHANGE"],
    ["Why did it delay my emergency fund?", "RESULT_EXPLANATION"]
  ] as const)("rejects generic ambiguity for proven %s evidence at the semantic stage", (message, family) => {
    const request = requestFor(message);
    expect(request.supportedFollowUpEvidence?.family).toBe(family);
    const diagnostic = successfulInterpretationDiagnostic({
      modelId: "fake-c1h",
      promptVersion: INTERPRETATION_PROMPT_VERSION,
      schemaVersion: INTERPRETATION_SCHEMA_VERSION,
      attempt: 1,
      repairAttempt: false,
      rootField: "interpretation",
      allowedBranchKinds: ["AMBIGUOUS", "CLARIFY_SCENARIO_REFERENCE"]
    }, { kind: "AMBIGUOUS", ambiguity: "UNCLEAR_SUPPORTED_ACTION" }, request);
    expect(diagnostic).toMatchObject({
      failedStage: "BRANCH_SEMANTIC_VALIDATION",
      diagnosticCodes: ["SCENARIO_REFERENCE_CLARIFICATION_REQUIRED"],
      jsonPointerPaths: ["/interpretation/kind"],
      semanticContractValid: false,
      applicationCommandAuthorized: false,
      simulatorInvoked: false
    });
    expect(JSON.stringify(diagnostic)).not.toContain(message);
    expect(JSON.stringify(diagnostic)).not.toContain("50000");
  });

  it("uses one precise repair, preserves £500, and sends no parsed pence to the provider", async () => {
    const request = requestFor("What about £500?");
    openai.create
      .mockResolvedValueOnce(response({ kind: "AMBIGUOUS", ambiguity: "UNCLEAR_SUPPORTED_ACTION" }))
      .mockResolvedValueOnce(response({
        kind: "CLARIFY_SCENARIO_REFERENCE",
        attemptedOperation: { kind: "CHANGE_PURCHASE_AMOUNT", amount: { quote: "£500", currency: "GBP" } }
      }));
    const collector = new SanitisedInterpretationDiagnosticCollector({
      NODE_ENV: "test",
      OPENAI_EVALUATION_DIAGNOSTICS_ENABLED: "true"
    });
    collector.beginCase("c1h-repair-success");
    const provider = new OpenAIResponsesConversationModelProvider("test-only-key", "gpt-test", {
      maxRetries: 1,
      diagnosticSink: collector
    });
    await expect(provider.interpret(request)).resolves.toMatchObject({
      value: {
        kind: "CLARIFY_SCENARIO_REFERENCE",
        attemptedOperation: { kind: "CHANGE_PURCHASE_AMOUNT", amount: { quote: "£500" } }
      },
      metadata: { attempts: 2 }
    });
    expect(openai.create).toHaveBeenCalledTimes(2);
    const initialInput = JSON.parse(openai.create.mock.calls[0]![0].input);
    const repairInput = JSON.parse(openai.create.mock.calls[1]![0].input);
    expect(initialInput).toMatchObject({ supportedFollowUpFamily: "AMOUNT_CHANGE" });
    expect(initialInput).not.toHaveProperty("supportedFollowUpEvidence");
    expect(JSON.stringify(initialInput)).not.toContain("50000");
    expect(repairInput).toMatchObject({
      mode: "BOUNDED_REPAIR",
      originalRequest: { supportedFollowUpFamily: "AMOUNT_CHANGE" },
      validationErrors: [{
        path: "/interpretation/kind",
        code: "SCENARIO_REFERENCE_CLARIFICATION_REQUIRED",
        rule: expect.stringContaining("CLARIFY_SCENARIO_REFERENCE")
      }]
    });
    expect(repairInput).not.toHaveProperty("invalidInterpretation");
    expect(JSON.stringify(repairInput)).not.toContain("50000");
    expect(collector.records()).toEqual([
      expect.objectContaining({ failedStage: "BRANCH_SEMANTIC_VALIDATION", repairOutcome: "REQUESTED" }),
      expect.objectContaining({ failedStage: null, repairOutcome: "SUCCEEDED" })
    ]);
  });

  it.each([
    ["repair_corrects_ambiguity", "RESOLVED", "SUCCEEDED"],
    ["repair_repeats_ambiguity", "REJECTED", "IDENTICAL_FAILURE"],
    ["repair_changes_to_invalid_branch", "REJECTED", "NEW_FAILURE"]
  ] as const)("runs fake scenario-reference mode %s with one bounded repair", async (mode, expectedResult, expectedRepair) => {
    const fixture = fakeScenarioReferenceFixture(mode);
    fixture.responses.forEach((item) => openai.create.mockResolvedValueOnce(item));
    const collector = new SanitisedInterpretationDiagnosticCollector({
      NODE_ENV: "test",
      OPENAI_EVALUATION_DIAGNOSTICS_ENABLED: "true"
    });
    collector.beginCase(mode);
    const provider = new OpenAIResponsesConversationModelProvider("test-only-key", "gpt-test", {
      maxRetries: 1,
      diagnosticSink: collector
    });
    let result = "RESOLVED";
    try {
      await provider.interpret(fixture.request as InterpretationProviderRequest);
    } catch {
      result = "REJECTED";
    }
    expect(result).toBe(expectedResult);
    expect(openai.create).toHaveBeenCalledTimes(2);
    expect(collector.records().at(-1)?.repairOutcome).toBe(expectedRepair);
  });

  it("declares every required deterministic fake scenario-reference mode", () => {
    expect(new Set(FAKE_SCENARIO_REFERENCE_MODES).size).toBe(FAKE_SCENARIO_REFERENCE_MODES.length);
    expect(FAKE_SCENARIO_REFERENCE_MODES).toEqual(expect.arrayContaining([
      "valid_amount_change", "ambiguous_amount_without_scenario", "correct_amount_scenario_clarification",
      "valid_timing_change", "ambiguous_timing_without_scenario", "correct_timing_scenario_clarification",
      "valid_explanation", "ambiguous_explanation_without_result", "correct_explanation_scenario_clarification",
      "genuine_ambiguity", "repair_corrects_ambiguity", "repair_repeats_ambiguity",
      "repair_changes_to_invalid_branch"
    ]));
  });

  it("persists and resolves an amount follow-up without a simulator call before reference resolution", async () => {
    const test = conversationTestApplication();
    const seeded = await seedSelectedTrip(test, "amount");
    const simulate = vi.spyOn(test.simulator.simulateOneOffPurchase, "execute");
    const alternatives = vi.spyOn(test.simulator.generateAmountAlternatives, "execute");
    const beforeMessages = test.repository.messages.get(seeded.conversationId)?.length;
    const clarification = await test.application.send(seeded.conversationId, {
      requestId: "c1h_amount_followup",
      message: "What about £500?"
    });
    expect(clarification.intent).toBe("CLARIFY_SCENARIO_REFERENCE");
    expect(clarification.conversation.messages.at(-1)).toMatchObject({
      kind: "ASSISTANT_CLARIFICATION",
      templateId: "SCENARIO_REFERENCE",
      text: "What purchase would you like me to compare?"
    });
    expect(test.repository.conversations.get(seeded.conversationId)?.pendingClarification).toMatchObject({
      type: "SCENARIO_REFERENCE",
      attemptedOperation: "CHANGE_PURCHASE_AMOUNT",
      amountMinorUnits: "50000",
      amount: { quote: "£500", currency: "GBP" }
    });
    expect(simulate).not.toHaveBeenCalled();
    expect(alternatives).not.toHaveBeenCalled();

    const retried = await test.application.send(seeded.conversationId, {
      requestId: "c1h_amount_followup",
      message: "What about £500?"
    });
    expect(retried.turnId).toBe(clarification.turnId);
    expect(test.repository.messages.get(seeded.conversationId)?.length).toBe((beforeMessages ?? 0) + 2);

    const resolved = await test.application.send(seeded.conversationId, {
      requestId: "c1h_amount_reference",
      message: "£650 trip"
    });
    expect(resolved.intent).toBe("CHANGE_PURCHASE_AMOUNT");
    expect(resolved.conversation.selectedResult?.scenario.change.amount.minorUnits).toBe("50000");
    expect(test.repository.conversations.get(seeded.conversationId)?.pendingClarification).toBeNull();
    expect(simulate).not.toHaveBeenCalled();
    expect(alternatives).toHaveBeenCalledTimes(1);
  });

  it("preserves and resolves month and explanation follow-ups without recalculating before resolution", async () => {
    const monthTest = conversationTestApplication();
    const monthSeed = await seedSelectedTrip(monthTest, "month");
    const timingAlternative = vi.spyOn(monthTest.simulator.simulateMonthlyTimingAlternative, "execute");
    const monthGap = await monthTest.application.send(monthSeed.conversationId, {
      requestId: "c1h_month_followup",
      message: "What if I wait until October?"
    });
    expect(monthGap.intent).toBe("CLARIFY_SCENARIO_REFERENCE");
    expect(monthTest.repository.conversations.get(monthSeed.conversationId)?.pendingClarification).toMatchObject({
      type: "SCENARIO_REFERENCE",
      attemptedOperation: "CHANGE_PURCHASE_MONTH",
      timing: { quote: "October", kind: "NAMED_MONTH", monthNumber: 10 }
    });
    expect(timingAlternative).not.toHaveBeenCalled();
    const monthResult = await monthTest.application.send(monthSeed.conversationId, {
      requestId: "c1h_month_reference",
      message: "£650 trip"
    });
    expect(monthResult.intent).toBe("CHANGE_PURCHASE_MONTH");
    expect(monthResult.conversation.selectedResult?.scenario.change.paymentPeriod).toBe("2026-10");
    expect(timingAlternative).toHaveBeenCalledTimes(1);

    const explanationTest = conversationTestApplication();
    const explanationSeed = await seedSelectedTrip(explanationTest, "explanation");
    const simulate = vi.spyOn(explanationTest.simulator.simulateOneOffPurchase, "execute");
    const explanationGap = await explanationTest.application.send(explanationSeed.conversationId, {
      requestId: "c1h_explanation_followup",
      message: "Why did it delay my emergency fund?"
    });
    expect(explanationGap.intent).toBe("CLARIFY_SCENARIO_REFERENCE");
    expect(explanationTest.repository.conversations.get(explanationSeed.conversationId)?.pendingClarification).toMatchObject({
      type: "SCENARIO_REFERENCE",
      attemptedOperation: "EXPLAIN_SELECTED_RESULT",
      explanationTarget: "GOAL_DELAY",
      goalReferenceQuote: "emergency fund"
    });
    expect(simulate).not.toHaveBeenCalled();
    const explanation = await explanationTest.application.send(explanationSeed.conversationId, {
      requestId: "c1h_explanation_reference",
      message: "£650 trip"
    });
    expect(explanation.intent).toBe("EXPLAIN_SELECTED_RESULT");
    expect(explanation.conversation.messages.at(-1)).toMatchObject({
      kind: "ASSISTANT_EXPLANATION",
      runId: explanationSeed.runId
    });
    expect(simulate).not.toHaveBeenCalled();
  });

  it("blocks scenario-producing follow-ups in a stale thread before creating pending state", async () => {
    const test = conversationTestApplication();
    const seeded = await seedSelectedTrip(test, "stale");
    test.setCurrentVersion("sarah-v2-test");
    const simulate = vi.spyOn(test.simulator.simulateOneOffPurchase, "execute");
    await expect(test.application.send(seeded.conversationId, {
      requestId: "c1h_stale_followup",
      message: "What about £500?"
    })).rejects.toMatchObject({ code: "CONVERSATION_CONTEXT_STALE" });
    expect(test.repository.conversations.get(seeded.conversationId)?.pendingClarification).toBeNull();
    expect(simulate).not.toHaveBeenCalled();
  });

  it("keeps genuine ambiguity valid and rejects only the provable exact-gap state", () => {
    const genuineRequest = requestFor("Can you compare it somehow?");
    const genuine = { kind: "AMBIGUOUS", ambiguity: "UNCLEAR_SUPPORTED_ACTION" } as const;
    expect(genuineRequest.supportedFollowUpEvidence).toEqual({ family: "NONE" });
    expect(conversationInterpretationEnvelopeV4Schema.safeParse({ interpretation: genuine }).success).toBe(true);
    expect(exactScenarioReferenceIssue(genuine, genuineRequest)).toBeNull();
  });
});
