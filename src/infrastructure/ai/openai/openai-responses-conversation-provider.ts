import "server-only";
import OpenAI from "openai";
import { z } from "zod";
import type {
  ClarificationResolution,
  ClarificationResolutionProviderRequest,
  ConversationInterpretation,
  ConversationModelProvider,
  ExplanationPlan,
  ExplanationProviderRequest,
  InterpretationProviderRequest,
  ProviderResult
} from "../../../application/conversation/contracts";
import type {
  DemoConversationInterpretation,
  DemoConversationModelProvider,
  DemoResponsePlan,
  DemoResponseProviderRequest
} from "../../../application/conversation/demo-contracts";
import {
  CLARIFICATION_RESOLUTION_PROMPT_VERSION,
  CLARIFICATION_RESOLUTION_SCHEMA_VERSION,
  INTERPRETATION_PROMPT_VERSION,
  INTERPRETATION_SCHEMA_VERSION
} from "../../../application/conversation/contracts";
import {
  amountClarificationResolutionSchema,
  conversationInterpretationEnvelopeV4Schema,
  explanationPlanSchema,
  monthClarificationResolutionSchema,
  scenarioClarificationResolutionSchema
} from "../../../application/conversation/schemas";
import {
  demoConversationInterpretationEnvelopeSchema,
  demoResponsePlanSchema
} from "../../../application/conversation/demo-schemas";
import { ConversationProviderError } from "../../../application/conversation/provider-error";
import {
  CLARIFICATION_RESOLUTION_PROMPT,
  DEMO_INTERPRETATION_PROMPT,
  DEMO_RESPONSE_PROMPT,
  EXPLANATION_PROMPT,
  INTERPRETATION_PROMPT
} from "../../../application/conversation/prompts";
import {
  AMBIGUITY_IDS,
  INTERPRETATION_INTENT_IDS,
  UNSUPPORTED_CATEGORY_IDS
} from "../../../application/conversation/interpretation-policy";
import {
  AMOUNT_CLARIFICATION_PARAMETERS,
  DEMO_INTERPRETATION_PARAMETERS_V1,
  DEMO_RESPONSE_PARAMETERS_V1,
  EXPLANATION_PARAMETERS_V1,
  INTERPRETATION_PARAMETERS_V4,
  MONTH_CLARIFICATION_PARAMETERS,
  SCENARIO_CLARIFICATION_PARAMETERS,
  assertStrictProviderSchema
} from "./provider-json-schemas";
import {
  OPENAI_BASELINE_MAX_OUTPUT_TOKENS,
  type OpenAIReasoningEffort
} from "./openai-runtime-configuration";
import {
  jsonArgumentsDiagnostic,
  markFinalFailure,
  markRepairFailed,
  markRepairRequested,
  markRepairSucceeded,
  repairValidationErrors,
  runtimeValidationDiagnostic,
  successfulInterpretationDiagnostic,
  toolSelectionDiagnostic,
  type ApprovedDiagnosticBranchKind,
  type InterpretationDiagnosticMetadata,
  type InterpretationDiagnosticSink,
  type SanitisedInterpretationDiagnosticDraft
} from "./interpretation-diagnostics";

export const INTERPRET_TOOL = "submit_conversation_interpretation_v4";
export const CLARIFICATION_TOOL = "submit_clarification_resolution_v2";
export const EXPLANATION_TOOL = "submit_explanation_plan";
export const DEMO_INTERPRET_TOOL = "submit_demo_conversation_interpretation_v1";
export const DEMO_RESPONSE_TOOL = "submit_demo_trusted_response_v1";

type ProviderValue =
  | ConversationInterpretation
  | ClarificationResolution
  | ExplanationPlan
  | DemoConversationInterpretation
  | DemoResponsePlan;
type JsonSchema = Readonly<Record<string, unknown>>;

interface ForcedCallResult<T extends ProviderValue> {
  readonly value: T;
  readonly attempts: number;
  readonly latencyMs: number;
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly totalTokens: number;
}

function providerError(error: unknown): ConversationProviderError {
  if (error instanceof ConversationProviderError) return error;
  const status = typeof error === "object" && error !== null && "status" in error
    ? Number((error as { status?: unknown }).status)
    : null;
  if (status === 429) return new ConversationProviderError("RATE_LIMIT", true, "The provider rate-limited the request.");
  if (status !== null && status >= 500) return new ConversationProviderError("UNAVAILABLE", true, "The provider is temporarily unavailable.");
  if (error instanceof Error && /timeout|timed out|abort/i.test(error.message)) {
    return new ConversationProviderError("TIMEOUT", true, "The provider request timed out.");
  }
  return new ConversationProviderError("UNAVAILABLE", true, "The provider request failed.");
}

function legacyValidationIssueCodes(error: unknown): readonly Readonly<{ path: string; code: string }>[] {
  if (!(error instanceof z.ZodError)) return [{ path: "", code: "INVALID_PROVIDER_OUTPUT" }];
  const issues = error.issues.slice(0, 12).map((issue) => ({
    path: issue.path.map(String).join("."),
    code: issue.code
  }));
  return issues.length > 0 ? issues : [{ path: "", code: "INVALID_PROVIDER_OUTPUT" }];
}

function minimalState(input: unknown): unknown {
  if (!input || typeof input !== "object") return null;
  const request = input as Partial<InterpretationProviderRequest & ClarificationResolutionProviderRequest>;
  return {
    userMessage: request.userMessage,
    pendingClarification: request.pendingClarification ? { type: request.pendingClarification.type } : null,
    selectedScenarioType: request.selectedScenarioType ?? null,
    availableScenarioLabels: request.availableScenarios?.map((scenario) => scenario.label) ?? [],
    trustedDate: request.trustedDate,
    timezone: request.timezone,
    supportedFollowUpFamily: request.supportedFollowUpEvidence?.family ?? null
  };
}

function providerVisibleInterpretationRequest(request: InterpretationProviderRequest): unknown {
  return {
    userMessage: request.userMessage,
    pendingClarification: request.pendingClarification,
    availableScenarios: request.availableScenarios,
    selectedScenarioType: request.selectedScenarioType,
    trustedDate: request.trustedDate,
    timezone: request.timezone,
    ...(request.supportedFollowUpEvidence
      ? { supportedFollowUpFamily: request.supportedFollowUpEvidence.family }
      : {})
  };
}

function supportedFollowUpFamily(input: unknown): string | null {
  if (!input || typeof input !== "object" || !("supportedFollowUpEvidence" in input)) return null;
  const evidence = (input as { supportedFollowUpEvidence?: { family?: unknown } }).supportedFollowUpEvidence;
  return typeof evidence?.family === "string" ? evidence.family : null;
}

function repairInput(input: unknown, validationErrors: readonly unknown[]): unknown {
  return {
    mode: "BOUNDED_REPAIR",
    originalRequest: minimalState(input),
    validationErrors,
    permittedIdentifiers: {
      intents: INTERPRETATION_INTENT_IDS,
      unsupportedCategories: UNSUPPORTED_CATEGORY_IDS,
      ambiguityIdentifiers: AMBIGUITY_IDS
    }
  };
}

export class OpenAIResponsesConversationModelProvider implements ConversationModelProvider, DemoConversationModelProvider {
  private readonly client: OpenAI;
  private readonly reasoningEffort: OpenAIReasoningEffort | null;
  private readonly maxRetries: number;
  private readonly diagnosticSink: InterpretationDiagnosticSink | null;

  constructor(
    apiKey: string,
    private readonly model: string,
    options: Readonly<{
      timeoutMs?: number;
      maxRetries?: number;
      reasoningEffort?: OpenAIReasoningEffort | null;
      diagnosticSink?: InterpretationDiagnosticSink | null;
    }> = {}
  ) {
    this.client = new OpenAI({ apiKey, timeout: options.timeoutMs ?? 12_000, maxRetries: 0 });
    this.reasoningEffort = options.reasoningEffort ?? null;
    this.maxRetries = options.maxRetries ?? 1;
    this.diagnosticSink = options.diagnosticSink ?? null;
    assertStrictProviderSchema(INTERPRETATION_PARAMETERS_V4);
    assertStrictProviderSchema(DEMO_INTERPRETATION_PARAMETERS_V1);
    assertStrictProviderSchema(DEMO_RESPONSE_PARAMETERS_V1);
    assertStrictProviderSchema(MONTH_CLARIFICATION_PARAMETERS);
  }

  private async forcedCall<T extends ProviderValue>(input: Readonly<{
    toolName: string;
    instructions: string;
    request: unknown;
    parameters: JsonSchema;
    parse: (value: unknown) => T;
    allowValidationRepair: boolean;
    initialProviderInput?: unknown;
    diagnostic?: Readonly<{
      promptVersion: string;
      schemaVersion: string;
      rootField: "interpretation" | "resolution";
      allowedBranchKinds: readonly ApprovedDiagnosticBranchKind[];
    }>;
  }>): Promise<ForcedCallResult<T>> {
    let lastError: ConversationProviderError | null = null;
    let inputTokens = 0;
    let outputTokens = 0;
    let totalTokens = 0;
    let nextInput = input.initialProviderInput ?? input.request;
    let repairUsed = false;
    let firstFailureDiagnostic: SanitisedInterpretationDiagnosticDraft | null = null;
    const startedAt = performance.now();
    for (let attempt = 1; attempt <= this.maxRetries + 1; attempt += 1) {
      let providerArguments: unknown;
      let issueCodes: readonly unknown[] = [];
      let attemptDiagnostic: SanitisedInterpretationDiagnosticDraft | null = null;
      const diagnosticMetadata: InterpretationDiagnosticMetadata | null = input.diagnostic
        ? {
            modelId: this.model,
            promptVersion: input.diagnostic.promptVersion,
            schemaVersion: input.diagnostic.schemaVersion,
            attempt,
            repairAttempt: repairUsed,
            rootField: input.diagnostic.rootField,
            allowedBranchKinds: input.diagnostic.allowedBranchKinds
          }
        : null;
      try {
        const response = await this.client.responses.create({
          model: this.model,
          instructions: input.instructions,
          input: JSON.stringify(nextInput),
          tools: [{
            type: "function",
            name: input.toolName,
            description: "Return the validated Future You structured decision.",
            parameters: input.parameters,
            strict: true
          }],
          tool_choice: { type: "function", name: input.toolName },
          parallel_tool_calls: false,
          store: false,
          max_output_tokens: OPENAI_BASELINE_MAX_OUTPUT_TOKENS,
          ...(this.reasoningEffort ? { reasoning: { effort: this.reasoningEffort } } : {})
        });
        inputTokens += response.usage?.input_tokens ?? 0;
        outputTokens += response.usage?.output_tokens ?? 0;
        totalTokens += response.usage?.total_tokens ?? 0;
        const calls = response.output.filter((item) => item.type === "function_call");
        if (calls.length !== 1) {
          if (diagnosticMetadata) {
            attemptDiagnostic = toolSelectionDiagnostic(
              diagnosticMetadata,
              calls.length > 1 ? "MULTIPLE" : "MISSING"
            );
            issueCodes = repairValidationErrors(attemptDiagnostic, supportedFollowUpFamily(input.request));
          } else {
            issueCodes = [{
              path: "",
              code: calls.length > 1 ? "MULTIPLE_FUNCTION_CALLS" : "MISSING_FUNCTION_CALL"
            }];
          }
          throw new ConversationProviderError(
            calls.length > 1 ? "MULTIPLE_TOOL_CALLS" : "INVALID_OUTPUT",
            calls.length === 0,
            "The provider did not return exactly one function call."
          );
        }
        const call = calls[0]!;
        if (call.name !== input.toolName) {
          if (diagnosticMetadata) {
            attemptDiagnostic = toolSelectionDiagnostic(diagnosticMetadata, "UNEXPECTED");
          }
          throw new ConversationProviderError("UNKNOWN_TOOL", false, "The provider returned an unknown tool.");
        }
        try {
          providerArguments = JSON.parse(call.arguments);
        } catch {
          if (diagnosticMetadata) {
            attemptDiagnostic = jsonArgumentsDiagnostic(diagnosticMetadata);
            issueCodes = repairValidationErrors(attemptDiagnostic, supportedFollowUpFamily(input.request));
          } else {
            issueCodes = [{ path: "", code: "INVALID_JSON_ARGUMENTS" }];
          }
          throw new ConversationProviderError("INVALID_OUTPUT", true, "The provider returned invalid JSON arguments.");
        }
        try {
          const parsed = input.parse(providerArguments);
          if (diagnosticMetadata) {
            attemptDiagnostic = successfulInterpretationDiagnostic(
              diagnosticMetadata,
              parsed as ConversationInterpretation | ClarificationResolution,
              input.request as InterpretationProviderRequest | ClarificationResolutionProviderRequest
            );
            if (attemptDiagnostic.failedStage !== null) {
              issueCodes = repairValidationErrors(attemptDiagnostic, supportedFollowUpFamily(input.request));
              throw new ConversationProviderError(
                "INVALID_OUTPUT",
                true,
                "The provider interpretation failed deterministic semantic validation."
              );
            }
            if (repairUsed) attemptDiagnostic = markRepairSucceeded(attemptDiagnostic);
            this.diagnosticSink?.record(attemptDiagnostic);
          }
          return {
            value: parsed,
            attempts: attempt,
            latencyMs: Math.round(performance.now() - startedAt),
            inputTokens,
            outputTokens,
            totalTokens
          };
        } catch (error) {
          if (error instanceof ConversationProviderError && attemptDiagnostic && attemptDiagnostic.failedStage !== null) {
            throw error;
          }
          if (diagnosticMetadata) {
            attemptDiagnostic = runtimeValidationDiagnostic(diagnosticMetadata, providerArguments, error);
            issueCodes = repairValidationErrors(attemptDiagnostic, supportedFollowUpFamily(input.request));
          } else {
            issueCodes = legacyValidationIssueCodes(error);
          }
          throw new ConversationProviderError("INVALID_OUTPUT", true, "The provider arguments failed runtime validation.");
        }
      } catch (error) {
        lastError = providerError(error);
        const canRepair = input.allowValidationRepair && !repairUsed && lastError.category === "INVALID_OUTPUT";
        if (attemptDiagnostic) {
          if (canRepair && attempt < this.maxRetries + 1) {
            attemptDiagnostic = markRepairRequested(attemptDiagnostic);
            firstFailureDiagnostic = attemptDiagnostic;
          } else if (repairUsed && firstFailureDiagnostic) {
            attemptDiagnostic = markRepairFailed(attemptDiagnostic, firstFailureDiagnostic);
          } else {
            attemptDiagnostic = markFinalFailure(attemptDiagnostic);
          }
          this.diagnosticSink?.record(attemptDiagnostic);
        }
        if (canRepair && attempt < this.maxRetries + 1) {
          repairUsed = true;
          nextInput = repairInput(input.request, issueCodes);
          continue;
        }
        if (!lastError.retryable || attempt === this.maxRetries + 1) {
          throw new ConversationProviderError(
            lastError.category,
            lastError.retryable,
            lastError.message,
            attempt,
            { latencyMs: Math.round(performance.now() - startedAt), inputTokens, outputTokens, totalTokens }
          );
        }
      }
    }
    throw lastError ?? new ConversationProviderError("UNAVAILABLE", true, "The provider request failed.");
  }

  private metadata(result: ForcedCallResult<ProviderValue>) {
    return {
      provider: "openai", model: this.model, attempts: result.attempts,
      latencyMs: result.latencyMs, inputTokens: result.inputTokens,
      outputTokens: result.outputTokens, totalTokens: result.totalTokens
    } as const;
  }

  async interpret(request: InterpretationProviderRequest): Promise<ProviderResult<ConversationInterpretation>> {
    const result = await this.forcedCall({
      toolName: INTERPRET_TOOL,
      instructions: INTERPRETATION_PROMPT,
      request,
      parameters: INTERPRETATION_PARAMETERS_V4,
      parse: (value) => conversationInterpretationEnvelopeV4Schema.parse(value).interpretation,
      allowValidationRepair: true,
      initialProviderInput: providerVisibleInterpretationRequest(request),
      diagnostic: {
        promptVersion: INTERPRETATION_PROMPT_VERSION,
        schemaVersion: INTERPRETATION_SCHEMA_VERSION,
        rootField: "interpretation",
        allowedBranchKinds: INTERPRETATION_INTENT_IDS
      }
    });
    return { value: result.value, metadata: this.metadata(result) };
  }

  async resolveClarification(request: ClarificationResolutionProviderRequest): Promise<ProviderResult<ClarificationResolution>> {
    const pending = request.pendingClarification.type;
    const parameters = pending === "PURCHASE_AMOUNT"
      ? AMOUNT_CLARIFICATION_PARAMETERS
      : pending === "PURCHASE_MONTH"
        ? MONTH_CLARIFICATION_PARAMETERS
        : SCENARIO_CLARIFICATION_PARAMETERS;
    const parse = (value: unknown): ClarificationResolution => {
      if (!value || typeof value !== "object" || !("resolution" in value)) {
        throw new z.ZodError([]);
      }
      const resolution = (value as { resolution: unknown }).resolution;
      if (pending === "PURCHASE_AMOUNT") return amountClarificationResolutionSchema.parse(resolution);
      if (pending === "PURCHASE_MONTH") return monthClarificationResolutionSchema.parse(resolution);
      return scenarioClarificationResolutionSchema.parse(resolution);
    };
    const result = await this.forcedCall({
      toolName: CLARIFICATION_TOOL,
      instructions: CLARIFICATION_RESOLUTION_PROMPT,
      request,
      parameters,
      parse,
      allowValidationRepair: true,
      diagnostic: {
        promptVersion: CLARIFICATION_RESOLUTION_PROMPT_VERSION,
        schemaVersion: CLARIFICATION_RESOLUTION_SCHEMA_VERSION,
        rootField: "resolution",
        allowedBranchKinds: pending === "PURCHASE_AMOUNT"
          ? ["RESOLVE_PURCHASE_AMOUNT", "UNSUPPORTED", "AMBIGUOUS"]
          : pending === "PURCHASE_MONTH"
            ? ["RESOLVE_PURCHASE_MONTH", "UNSUPPORTED", "AMBIGUOUS"]
            : ["RESOLVE_SCENARIO_REFERENCE", "UNSUPPORTED", "AMBIGUOUS"]
      }
    });
    return { value: result.value, metadata: this.metadata(result) };
  }

  async planExplanation(request: ExplanationProviderRequest): Promise<ProviderResult<ExplanationPlan>> {
    const result = await this.forcedCall({
      toolName: EXPLANATION_TOOL,
      instructions: EXPLANATION_PROMPT,
      request,
      parameters: EXPLANATION_PARAMETERS_V1,
      parse: (value) => explanationPlanSchema.parse(value),
      allowValidationRepair: true
    });
    return { value: result.value, metadata: this.metadata(result) };
  }

  async interpretDemo(
    request: InterpretationProviderRequest
  ): Promise<ProviderResult<DemoConversationInterpretation>> {
    const result = await this.forcedCall({
      toolName: DEMO_INTERPRET_TOOL,
      instructions: DEMO_INTERPRETATION_PROMPT,
      request,
      parameters: DEMO_INTERPRETATION_PARAMETERS_V1,
      parse: (value) => demoConversationInterpretationEnvelopeSchema.parse(value).interpretation,
      allowValidationRepair: false,
      initialProviderInput: providerVisibleInterpretationRequest(request)
    });
    return { value: result.value, metadata: this.metadata(result) };
  }

  async writeDemoResponse(
    request: DemoResponseProviderRequest
  ): Promise<ProviderResult<DemoResponsePlan>> {
    const result = await this.forcedCall({
      toolName: DEMO_RESPONSE_TOOL,
      instructions: DEMO_RESPONSE_PROMPT,
      request,
      parameters: DEMO_RESPONSE_PARAMETERS_V1,
      parse: (value) => demoResponsePlanSchema.parse(value),
      allowValidationRepair: false
    });
    return { value: result.value, metadata: this.metadata(result) };
  }
}
