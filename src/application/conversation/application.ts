import { inputIdentity } from "../../domain/shared/identity";
import type { FinancialContextSource } from "../ports/financial-context-source";
import type { ConversationRepository, StoredConversation } from "../ports/conversation-repository";
import type { ConversationSimulator } from "../ports/conversation-simulator";
import {
  amountClarificationResolutionSchema,
  conversationInterpretationSchema,
  monthClarificationResolutionSchema,
  scenarioClarificationResolutionSchema
} from "./schemas";
import type {
  AmountInterpretation,
  ClarificationResolution,
  CompleteTimingInterpretation,
  ConversationInterpretation,
  ConversationDetailDTO,
  ConversationIntentKind,
  ConversationListResponseDTO,
  ConversationMessageDTO,
  ConversationModelProvider,
  ConversationScenarioDTO,
  ConversationSummaryDTO,
  ConversationTurnResponseDTO,
  CreateConversationRequestDTO,
  ExplanationTarget,
  PendingClarification,
  SelectConversationScenarioRequestDTO,
  SendConversationMessageRequestDTO,
  TimingInterpretation
} from "./contracts";
import {
  CONVERSATION_LIST_RESPONSE_SCHEMA,
  CONVERSATION_ORCHESTRATION_VERSION,
  CONVERSATION_RESPONSE_SCHEMA,
  CONVERSATION_TIMEZONE,
  CONVERSATION_TURN_RESPONSE_SCHEMA,
  CLARIFICATION_RESOLUTION_PROMPT_VERSION,
  CLARIFICATION_RESOLUTION_SCHEMA_VERSION,
  EXPLANATION_PROMPT_VERSION,
  EXPLANATION_SCHEMA_VERSION,
  INTERPRETATION_PROMPT_VERSION,
  INTERPRETATION_SCHEMA_VERSION
} from "./contracts";
import {
  ConversationApplicationError,
  type ConversationApplicationErrorCode
} from "./application-error";
import { ConversationProviderError } from "./provider-error";
import { exactMinorUnitsFromInterpretation, sourceContainsQuote } from "./exact-source-grounding";
import { resolvePaymentPeriod, trustedLondonDate } from "./time-resolution";
import {
  availableFacts,
  renderExplanation,
  renderFallbackExplanation,
  renderResult,
  resultTemplateFor,
  templatesForTarget,
  validateExplanationPlan
} from "./server-renderer";
import type { OneOffPurchaseRequestDTO, OneOffPurchaseResponseDTO } from "../dto/contracts";

const SUPPORTED_SCOPE = Object.freeze([
  "Test a one-off purchase paid once from your current account.",
  "Compare a different purchase amount or month.",
  "Explain a stored result and return to your current path."
]);

export interface ConversationApplicationDependencies {
  readonly repository: ConversationRepository;
  readonly contextSource: FinancialContextSource;
  readonly simulator: ConversationSimulator;
  readonly provider: ConversationModelProvider;
  readonly providerIdentifier: string;
  readonly modelIdentifier: string;
  readonly now?: () => Date;
  readonly consumeProviderAllowance?: () => void;
}

function suffix(value: unknown): string {
  return inputIdentity(value).slice("fnv1a64:".length);
}

function scenarioLabel(result: OneOffPurchaseResponseDTO): string {
  return result.presentation.scenarioLabel;
}

function displayMinorUnits(minorUnits: string): string {
  const minor = BigInt(minorUnits);
  const pounds = minor / 100n;
  const pennies = minor % 100n;
  return `£${pounds}${pennies === 0n ? "" : `.${String(pennies).padStart(2, "0")}`}`;
}

function purposeFromQuote(quote: string | null, message: string, fallback: string): string {
  if (!quote || !sourceContainsQuote(message, quote)) return fallback;
  return quote.trim().slice(0, 120) || fallback;
}

function providerFailure(error: unknown): ConversationApplicationError {
  if (error instanceof ConversationApplicationError) return error;
  if (error instanceof ConversationProviderError) {
    if (error.category === "RATE_LIMIT") {
      return new ConversationApplicationError("RATE_LIMITED", "Future You is receiving too many Ask requests. Please try again shortly.", true);
    }
    if (error.category === "INVALID_OUTPUT" || error.category === "UNKNOWN_TOOL" || error.category === "MULTIPLE_TOOL_CALLS") {
      return new ConversationApplicationError("AI_INTERPRETATION_INVALID", "Future You could not safely interpret that request.", error.retryable);
    }
    return new ConversationApplicationError("AI_TEMPORARILY_UNAVAILABLE", "Future You could not interpret that request right now. Please retry.", true);
  }
  return new ConversationApplicationError("PERSISTENCE_FAILURE", "The conversation could not be processed safely.", true);
}

const APPLICATION_ERROR_CODES = new Set<ConversationApplicationErrorCode>([
  "FINANCIAL_CONTEXT_REQUIRED",
  "CONVERSATION_NOT_FOUND",
  "CONVERSATION_CONTEXT_STALE",
  "TURN_IDEMPOTENCY_KEY_REUSED",
  "TURN_PROCESSING",
  "CONVERSATION_INPUT_INVALID",
  "SCENARIO_REFERENCE_REQUIRED",
  "SCENARIO_REFERENCE_NOT_FOUND",
  "AI_TEMPORARILY_UNAVAILABLE",
  "AI_INTERPRETATION_INVALID",
  "RATE_LIMITED",
  "SIMULATION_REJECTED",
  "PERSISTENCE_FAILURE"
]);

function storedFailure(
  category: string | null,
  message: string | null
): ConversationApplicationError {
  const code = APPLICATION_ERROR_CODES.has(category as ConversationApplicationErrorCode)
    ? category as ConversationApplicationErrorCode
    : "PERSISTENCE_FAILURE";
  return new ConversationApplicationError(
    code,
    message ?? "That conversation turn previously failed safely.",
    ["AI_TEMPORARILY_UNAVAILABLE", "RATE_LIMITED", "PERSISTENCE_FAILURE"].includes(code)
  );
}

export class ConversationApplication {
  private readonly now: () => Date;

  constructor(private readonly dependencies: ConversationApplicationDependencies) {
    this.now = dependencies.now ?? (() => new Date());
  }

  async create(request: CreateConversationRequestDTO): Promise<ConversationDetailDTO> {
    const contextVersionId = await this.dependencies.contextSource.getCurrentContextVersionId();
    if (!contextVersionId) {
      throw new ConversationApplicationError("FINANCIAL_CONTEXT_REQUIRED", "Complete financial onboarding before starting an Ask conversation.");
    }
    const id = `conversation-${suffix({ requestId: request.requestId, contextVersionId })}`;
    const conversation = await this.dependencies.repository.create({
      id,
      contextVersionId,
      title: "New conversation",
      orchestrationVersion: CONVERSATION_ORCHESTRATION_VERSION
    });
    return this.detailFrom(conversation);
  }

  async list(): Promise<ConversationListResponseDTO> {
    const [conversations, currentVersion] = await Promise.all([
      this.dependencies.repository.list(),
      this.dependencies.contextSource.getCurrentContextVersionId()
    ]);
    return {
      apiVersion: "future-you.api/v1",
      schemaVersion: CONVERSATION_LIST_RESPONSE_SCHEMA,
      kind: "conversation_list",
      conversations: conversations.map((conversation) => this.summary(conversation, currentVersion))
    };
  }

  async get(conversationId: string): Promise<ConversationDetailDTO> {
    const conversation = await this.dependencies.repository.get(conversationId);
    if (!conversation) throw new ConversationApplicationError("CONVERSATION_NOT_FOUND", "The conversation was not found.");
    return this.detailFrom(conversation);
  }

  async select(
    conversationId: string,
    request: SelectConversationScenarioRequestDTO
  ): Promise<ConversationDetailDTO> {
    void request.requestId;
    const selected = await this.dependencies.repository.selectRun(conversationId, request.runId);
    if (!selected) throw new ConversationApplicationError("CONVERSATION_NOT_FOUND", "The conversation or scenario was not found.");
    return this.get(conversationId);
  }

  async send(
    conversationId: string,
    request: SendConversationMessageRequestDTO
  ): Promise<ConversationTurnResponseDTO> {
    const timestamp = this.now();
    const trustedTimestamp = timestamp.toISOString();
    const trustedDate = trustedLondonDate(timestamp);
    const turnSeed = { conversationId, requestId: request.requestId };
    const turnId = `turn-${suffix(turnSeed)}`;
    const userMessageId = `message-user-${suffix({ ...turnSeed, role: "user" })}`;
    const assistantMessageId = `message-assistant-${suffix({ ...turnSeed, role: "assistant" })}`;
    const requestIdentity = inputIdentity({ message: request.message });
    const contractConversation = await this.dependencies.repository.get(conversationId);
    if (!contractConversation) {
      throw new ConversationApplicationError("CONVERSATION_NOT_FOUND", "The conversation was not found.");
    }
    const resolvesClarification = contractConversation.pendingClarification !== null;
    const began = await this.dependencies.repository.beginTurn({
      conversationId,
      turnId,
      requestId: request.requestId,
      requestIdentity,
      userMessageId,
      message: request.message,
      trustedTimestamp,
      trustedTimezone: CONVERSATION_TIMEZONE,
      interpretationPromptVersion: resolvesClarification
        ? CLARIFICATION_RESOLUTION_PROMPT_VERSION
        : INTERPRETATION_PROMPT_VERSION,
      interpretationSchemaVersion: resolvesClarification
        ? CLARIFICATION_RESOLUTION_SCHEMA_VERSION
        : INTERPRETATION_SCHEMA_VERSION,
      explanationPromptVersion: EXPLANATION_PROMPT_VERSION,
      explanationSchemaVersion: EXPLANATION_SCHEMA_VERSION,
      providerIdentifier: this.dependencies.providerIdentifier,
      modelIdentifier: this.dependencies.modelIdentifier
    });
    if (began.status === "idempotency_conflict") {
      throw new ConversationApplicationError("TURN_IDEMPOTENCY_KEY_REUSED", "That turn request ID was already used with a different message.");
    }
    if (began.status === "not_found") {
      throw new ConversationApplicationError("CONVERSATION_NOT_FOUND", "The conversation was not found.");
    }
    if (began.status === "processing") {
      throw new ConversationApplicationError("TURN_PROCESSING", "That conversation turn is still processing.", true);
    }
    if (began.status === "existing") {
      if (began.completion.finalStatus === "FAILED") {
        throw storedFailure(
          began.completion.failureCategory,
          began.completion.failureMessage
        );
      }
      return this.turnResponse(
        request.requestId,
        began.turnId,
        began.completion.intent,
        began.completion.providerAttemptCount,
        began.completion.explanationFallbackUsed,
        await this.get(conversationId)
      );
    }

    let conversation = await this.dependencies.repository.get(conversationId);
    if (!conversation) throw new ConversationApplicationError("CONVERSATION_NOT_FOUND", "The conversation was not found.");
    let providerAttempts = 0;
    try {
      this.dependencies.consumeProviderAllowance?.();
      const scenarios = await this.scenarioResults(conversationId);
      const selected = conversation.selectedRunId
        ? scenarios.find((result) => result.calculation.runId === conversation!.selectedRunId) ?? null
        : null;
      const providerRequest = {
        userMessage: request.message,
        pendingClarification: conversation.pendingClarification,
        availableScenarios: scenarios.map((result) => ({
          label: scenarioLabel(result),
          scenarioType: "one_off_purchase" as const,
          selected: result.calculation.runId === conversation!.selectedRunId
        })),
        selectedScenarioType: selected ? "one_off_purchase" : null,
        trustedDate,
        timezone: CONVERSATION_TIMEZONE
      } as const;
      let providerValue: ConversationInterpretation;
      if (conversation.pendingClarification) {
        const resolved = await this.dependencies.provider.resolveClarification({
          ...providerRequest,
          pendingClarification: conversation.pendingClarification
        });
        providerAttempts += resolved.metadata.attempts;
        const resolutionValidation = conversation.pendingClarification.type === "PURCHASE_AMOUNT"
          ? amountClarificationResolutionSchema.safeParse(resolved.value)
          : conversation.pendingClarification.type === "PURCHASE_MONTH"
            ? monthClarificationResolutionSchema.safeParse(resolved.value)
            : scenarioClarificationResolutionSchema.safeParse(resolved.value);
        if (!resolutionValidation.success) {
          throw new ConversationProviderError("INVALID_OUTPUT", true, "The provider output did not match the clarification schema.");
        }
        providerValue = this.interpretClarificationResolution(
          conversation.pendingClarification,
          resolutionValidation.data,
          selected
        );
      } else {
        const interpreted = await this.dependencies.provider.interpret(providerRequest);
        providerAttempts += interpreted.metadata.attempts;
        providerValue = interpreted.value;
      }
      const validation = conversationInterpretationSchema.safeParse(providerValue);
      if (!validation.success) {
        throw new ConversationProviderError("INVALID_OUTPUT", true, "The provider output did not match the interpretation schema.");
      }
      const intent = validation.data;
      const outcome = await this.handleIntent({
        conversation,
        scenarios,
        selected,
        intent,
        message: request.message,
        userMessageId,
        trustedDate,
        turnId
      });
      providerAttempts += outcome.providerAttempts;
      await this.dependencies.repository.completeTurn({
        conversationId,
        turnId,
        assistantMessageId,
        assistantKind: outcome.kind,
        assistantText: outcome.text,
        templateId: outcome.templateId,
        interpretationKind: intent.kind,
        referencedRunId: outcome.runId,
        providerAttemptCount: providerAttempts,
        explanationFallbackUsed: outcome.explanationFallbackUsed,
        failureCategory: null,
        pendingClarification: outcome.pendingClarification,
        selectedRunId: outcome.selectedRunId,
        finalStatus: "COMPLETED"
      });
      return this.turnResponse(
        request.requestId,
        turnId,
        intent.kind,
        providerAttempts,
        outcome.explanationFallbackUsed,
        await this.get(conversationId)
      );
    } catch (caught) {
      if (caught instanceof ConversationProviderError && providerAttempts === 0) {
        providerAttempts = caught.attempts;
      }
      const error = providerFailure(caught);
      conversation = await this.dependencies.repository.get(conversationId) ?? conversation;
      try {
        await this.dependencies.repository.completeTurn({
          conversationId,
          turnId,
          assistantMessageId,
          assistantKind: "ASSISTANT_ERROR",
          assistantText: error.message,
          templateId: error.code === "CONVERSATION_CONTEXT_STALE"
            ? "CONVERSATION_CONTEXT_STALE"
            : "CONVERSATION_ERROR",
          interpretationKind: null,
          referencedRunId: null,
          providerAttemptCount: providerAttempts,
          explanationFallbackUsed: false,
          failureCategory: error.code,
          pendingClarification: conversation.pendingClarification,
          selectedRunId: conversation.selectedRunId,
          finalStatus: "FAILED"
        });
      } catch {
        // The original sanitised failure remains authoritative if completion persistence also fails.
      }
      throw error;
    }
  }

  private interpretClarificationResolution(
    pending: PendingClarification,
    resolution: ClarificationResolution,
    selected: OneOffPurchaseResponseDTO | null
  ): ConversationInterpretation {
    if (resolution.kind === "UNSUPPORTED" || resolution.kind === "AMBIGUOUS") return resolution;
    if (pending.type === "PURCHASE_AMOUNT" && resolution.kind === "RESOLVE_PURCHASE_AMOUNT") {
      const operation = pending.attemptedOperation ?? (selected ? "CHANGE_PURCHASE_AMOUNT" : "CREATE_ONE_OFF_PURCHASE");
      if (operation === "CHANGE_PURCHASE_AMOUNT") {
        return selected
          ? {
              kind: "CHANGE_PURCHASE_AMOUNT",
              amount: resolution.amount,
              scenarioReferenceStrategy: "SELECTED_SCENARIO",
              scenarioReferenceQuote: null
            }
          : { kind: "CLARIFY_SCENARIO_REFERENCE", attemptedOperation: { kind: "CHANGE_PURCHASE_AMOUNT", amount: resolution.amount } };
      }
      const timing = this.completeTiming(pending.partialTiming);
      return timing
        ? { kind: "CREATE_ONE_OFF_PURCHASE", amount: resolution.amount, timing, purposeQuote: pending.partialPurpose }
        : { kind: "CLARIFY_PURCHASE_MONTH", amount: resolution.amount, purposeQuote: pending.partialPurpose };
    }
    if (pending.type === "PURCHASE_MONTH" && resolution.kind === "RESOLVE_PURCHASE_MONTH") {
      const operation = pending.attemptedOperation ?? (selected ? "CHANGE_PURCHASE_MONTH" : "CREATE_ONE_OFF_PURCHASE");
      if (operation === "CHANGE_PURCHASE_MONTH") {
        return selected
          ? {
              kind: "CHANGE_PURCHASE_MONTH",
              timing: resolution.timing,
              scenarioReferenceStrategy: "SELECTED_SCENARIO",
              scenarioReferenceQuote: null
            }
          : { kind: "CLARIFY_SCENARIO_REFERENCE", attemptedOperation: { kind: "CHANGE_PURCHASE_MONTH", timing: resolution.timing } };
      }
      return {
        kind: "CREATE_ONE_OFF_PURCHASE",
        amount: { quote: pending.amountQuote, currency: "GBP" },
        timing: resolution.timing,
        purposeQuote: pending.partialPurpose
      };
    }
    if (pending.type === "SCENARIO_REFERENCE" && resolution.kind === "RESOLVE_SCENARIO_REFERENCE") {
      if (resolution.selectionTarget === "CURRENT_PATH") {
        return { kind: "SELECT_EXISTING_SCENARIO", selectionTarget: "CURRENT_PATH", scenarioLabelQuote: null };
      }
      const strategy = resolution.selectionTarget === "EXPLICIT_SCENARIO_LABEL"
        ? "EXPLICIT_SCENARIO_LABEL" as const
        : "SELECTED_SCENARIO" as const;
      const quote = resolution.scenarioLabelQuote;
      switch (pending.attemptedOperation) {
        case "CHANGE_PURCHASE_AMOUNT":
          return pending.amount
            ? { kind: "CHANGE_PURCHASE_AMOUNT", amount: pending.amount, scenarioReferenceStrategy: strategy, scenarioReferenceQuote: quote }
            : { kind: "AMBIGUOUS", ambiguity: "UNCLEAR_SUPPORTED_ACTION" };
        case "CHANGE_PURCHASE_MONTH":
          return pending.timing
            ? { kind: "CHANGE_PURCHASE_MONTH", timing: pending.timing, scenarioReferenceStrategy: strategy, scenarioReferenceQuote: quote }
            : { kind: "AMBIGUOUS", ambiguity: "UNCLEAR_SUPPORTED_ACTION" };
        case "EXPLAIN_SELECTED_RESULT":
          return {
            kind: "EXPLAIN_SELECTED_RESULT",
            explanationTarget: pending.explanationTarget ?? "OVERALL_CLASSIFICATION",
            goalReferenceQuote: pending.goalReferenceQuote ?? null,
            scenarioReferenceStrategy: strategy,
            scenarioReferenceQuote: quote
          };
        case "SELECT_EXISTING_SCENARIO":
        default:
          return {
            kind: "SELECT_EXISTING_SCENARIO",
            selectionTarget: resolution.selectionTarget,
            scenarioLabelQuote: quote
          };
      }
    }
    throw new ConversationProviderError("INVALID_OUTPUT", true, "The clarification response did not match the pending gap.");
  }

  private completeTiming(timing: TimingInterpretation): CompleteTimingInterpretation | null {
    return timing.quote && !["MISSING", "AMBIGUOUS"].includes(timing.kind)
      ? timing as CompleteTimingInterpretation
      : null;
  }

  private async handleIntent(input: Readonly<{
    conversation: StoredConversation;
    scenarios: readonly OneOffPurchaseResponseDTO[];
    selected: OneOffPurchaseResponseDTO | null;
    intent: ReturnType<typeof conversationInterpretationSchema.parse>;
    message: string;
    userMessageId: string;
    trustedDate: string;
    turnId: string;
  }>): Promise<Readonly<{
    kind: "ASSISTANT_CLARIFICATION" | "ASSISTANT_RESULT" | "ASSISTANT_EXPLANATION" | "ASSISTANT_SCOPE";
    text: string;
    templateId: string | null;
    runId: string | null;
    selectedRunId: string | null;
    pendingClarification: PendingClarification | null;
    providerAttempts: number;
    explanationFallbackUsed: boolean;
  }>> {
    const preserve = {
      runId: null,
      selectedRunId: input.conversation.selectedRunId,
      providerAttempts: 0,
      explanationFallbackUsed: false
    };
    if (input.intent.kind === "HELP" || input.intent.kind === "GREETING") {
      return {
        ...preserve, kind: "ASSISTANT_SCOPE", templateId: input.intent.kind,
        text: "I can test a one-off purchase, compare a different amount or month, and explain a stored result. What money decision are you considering?",
        pendingClarification: input.conversation.pendingClarification
      };
    }
    if (input.intent.kind === "UNSUPPORTED") {
      return {
        ...preserve, kind: "ASSISTANT_SCOPE", templateId: "UNSUPPORTED",
        text: "I can’t model that in this version. I can test one additional, single-payment purchase from your current account, then compare its amount or month.",
        pendingClarification: input.conversation.pendingClarification
      };
    }
    if (input.intent.kind === "AMBIGUOUS") {
      return {
        ...preserve, kind: "ASSISTANT_CLARIFICATION", templateId: "SUPPORTED_ACTION",
        text: "Would you like to test a one-off purchase, change an existing option, or explain a stored result?",
        pendingClarification: input.conversation.pendingClarification
      };
    }
    if (input.intent.kind === "SELECT_EXISTING_SCENARIO") {
      if (input.intent.selectionTarget === "CURRENT_PATH") {
        return {
          ...preserve, kind: "ASSISTANT_EXPLANATION", templateId: "CURRENT_PATH_SUMMARY",
          text: "You’re viewing your current path again. None of the hypothetical purchase options changed your financial plan.",
          selectedRunId: null, pendingClarification: null
        };
      }
      const resolved = input.intent.selectionTarget === "SELECTED_SCENARIO"
        ? input.selected
        : this.resolveScenarioReference(input.intent.scenarioLabelQuote, input.message, input.scenarios);
      if (!resolved || resolved === "current") return this.scenarioClarification(input, preserve, "SELECT_EXISTING_SCENARIO");
      return {
        ...preserve, kind: "ASSISTANT_EXPLANATION", templateId: "SCENARIO_SELECTED",
        text: `You’re viewing ${scenarioLabel(resolved)}. Selection changes the view only; it does not change your financial plan.`,
        runId: resolved.calculation.runId, selectedRunId: resolved.calculation.runId, pendingClarification: null
      };
    }
    if (input.intent.kind === "EXPLAIN_SELECTED_RESULT") {
      const result = input.intent.scenarioReferenceStrategy === "SELECTED_SCENARIO"
        ? input.selected
        : this.resolveScenarioReference(input.intent.scenarioReferenceQuote, input.message, input.scenarios);
      if (!result || result === "current") {
        return this.scenarioClarification(input, preserve, "EXPLAIN_SELECTED_RESULT", {
          explanationTarget: input.intent.explanationTarget,
          goalReferenceQuote: input.intent.goalReferenceQuote
        });
      }
      return this.explainResult(result, input.intent.explanationTarget, result.calculation.runId);
    }

    const currentVersion = await this.dependencies.contextSource.getCurrentContextVersionId();
    if (currentVersion !== input.conversation.contextVersionId) {
      throw new ConversationApplicationError(
        "CONVERSATION_CONTEXT_STALE",
        "Your financial plan has changed since this conversation started. Start a new conversation to simulate against your current financial plan."
      );
    }

    if (input.intent.kind === "CLARIFY_PURCHASE_AMOUNT") {
      return {
        ...preserve, kind: "ASSISTANT_CLARIFICATION", templateId: "PURCHASE_AMOUNT",
        text: `How much do you expect the ${input.intent.purposeQuote ?? "purchase"} to cost?`,
        pendingClarification: {
          type: "PURCHASE_AMOUNT", originalMessageId: input.userMessageId,
          partialPurpose: input.intent.purposeQuote,
          partialTiming: input.intent.timing ?? { quote: null, kind: "MISSING", monthNumber: null, year: null, offsetMonths: null },
          attemptedOperation: "CREATE_ONE_OFF_PURCHASE"
        }
      };
    }
    if (input.intent.kind === "CLARIFY_PURCHASE_MONTH") {
      exactMinorUnitsFromInterpretation(input.intent.amount, input.message);
      return {
        ...preserve, kind: "ASSISTANT_CLARIFICATION", templateId: "PURCHASE_MONTH",
        text: "Which month do you expect to pay for it?",
        pendingClarification: {
          type: "PURCHASE_MONTH", originalMessageId: input.userMessageId,
          amountQuote: input.intent.amount.quote, partialPurpose: input.intent.purposeQuote,
          attemptedOperation: "CREATE_ONE_OFF_PURCHASE"
        }
      };
    }
    if (input.intent.kind === "CLARIFY_SCENARIO_REFERENCE") {
      const attempted = input.intent.attemptedOperation;
      return this.scenarioClarification(input, preserve, attempted.kind, {
        ...(attempted.kind === "CHANGE_PURCHASE_AMOUNT" ? { amount: attempted.amount } : {}),
        ...(attempted.kind === "CHANGE_PURCHASE_MONTH" ? { timing: attempted.timing } : {}),
        ...(attempted.kind === "EXPLAIN_SELECTED_RESULT"
          ? { explanationTarget: attempted.explanationTarget, goalReferenceQuote: attempted.goalReferenceQuote }
          : {})
      });
    }
    if (input.intent.kind === "CREATE_ONE_OFF_PURCHASE") {
      const priorAmount = input.conversation.pendingClarification?.type === "PURCHASE_MONTH"
        ? input.conversation.pendingClarification.amountQuote : null;
      const priorTiming = input.conversation.pendingClarification?.type === "PURCHASE_AMOUNT"
        ? input.conversation.pendingClarification.partialTiming : null;
      const amount = exactMinorUnitsFromInterpretation(input.intent.amount, input.message, priorAmount);
      const period = resolvePaymentPeriod({
        timing: input.intent.timing, currentMessage: input.message, trustedDate: input.trustedDate,
        selectedPaymentPeriod: null, allowedPriorTiming: priorTiming
      });
      const fallbackPurpose = input.conversation.pendingClarification && "partialPurpose" in input.conversation.pendingClarification
        ? input.conversation.pendingClarification.partialPurpose ?? "purchase" : "purchase";
      return this.simulateOrRetrieve(input, amount, period, purposeFromQuote(input.intent.purposeQuote, input.message, fallbackPurpose));
    }

    const referenced = input.intent.scenarioReferenceStrategy === "SELECTED_SCENARIO"
      ? input.selected
      : this.resolveScenarioReference(input.intent.scenarioReferenceQuote, input.message, input.scenarios);
    if (!referenced || referenced === "current") {
      return this.scenarioClarification(input, preserve, input.intent.kind, {
        ...(input.intent.kind === "CHANGE_PURCHASE_AMOUNT" ? { amount: input.intent.amount } : { timing: input.intent.timing })
      });
    }
    if (input.intent.kind === "CHANGE_PURCHASE_AMOUNT") {
      const priorAmount = input.conversation.pendingClarification?.type === "SCENARIO_REFERENCE"
        ? input.conversation.pendingClarification.amount?.quote ?? null
        : null;
      const amount = exactMinorUnitsFromInterpretation(input.intent.amount, input.message, priorAmount);
      const approvedAlternativeSource = input.scenarios.find((scenario) =>
        scenario.scenario.change.amount.minorUnits === "65000" &&
        scenario.scenario.change.paymentPeriod === referenced.scenario.change.paymentPeriod &&
        scenario.scenario.change.purpose === referenced.scenario.change.purpose
      ) ?? referenced;
      return this.simulateOrRetrieve(
        input, amount, referenced.scenario.change.paymentPeriod, referenced.scenario.change.purpose,
        { mode: "amount", source: approvedAlternativeSource }
      );
    }
    const period = resolvePaymentPeriod({
      timing: input.intent.timing, currentMessage: input.message, trustedDate: input.trustedDate,
      selectedPaymentPeriod: referenced.scenario.change.paymentPeriod,
      allowedPriorTiming: input.conversation.pendingClarification?.type === "SCENARIO_REFERENCE"
        ? input.conversation.pendingClarification.timing ?? null
        : null
    });
    const approvedTimingSource = input.scenarios.find((scenario) =>
      scenario.scenario.change.amount.minorUnits === "65000" &&
      scenario.scenario.change.purpose === referenced.scenario.change.purpose
    ) ?? referenced;
    return this.simulateOrRetrieve(
      input, approvedTimingSource.scenario.change.amount.minorUnits, period,
      approvedTimingSource.scenario.change.purpose, { mode: "timing", source: approvedTimingSource }
    );
  }

  private scenarioClarification(
    input: Readonly<{ userMessageId: string; scenarios: readonly OneOffPurchaseResponseDTO[] }>,
    preserve: Readonly<{ runId: null; selectedRunId: string | null; providerAttempts: number; explanationFallbackUsed: boolean }>,
    attemptedOperation: "CHANGE_PURCHASE_AMOUNT" | "CHANGE_PURCHASE_MONTH" | "EXPLAIN_SELECTED_RESULT" | "SELECT_EXISTING_SCENARIO",
    details: Readonly<{
      amount?: AmountInterpretation;
      timing?: CompleteTimingInterpretation;
      explanationTarget?: ExplanationTarget;
      goalReferenceQuote?: string | null;
    }> = {}
  ) {
    return {
      ...preserve,
      kind: "ASSISTANT_CLARIFICATION" as const,
      templateId: "SCENARIO_REFERENCE",
      text: "What purchase would you like me to compare?",
      pendingClarification: {
        type: "SCENARIO_REFERENCE" as const,
        originalMessageId: input.userMessageId,
        availableRunIds: input.scenarios.map((scenario) => scenario.calculation.runId),
        attemptedOperation,
        ...details
      }
    };
  }

  private async simulateOrRetrieve(
    input: Readonly<{
      conversation: StoredConversation;
      scenarios: readonly OneOffPurchaseResponseDTO[];
      turnId: string;
    }>,
    amountMinorUnits: string,
    paymentPeriod: string,
    purpose: string,
    derivation: Readonly<{ mode: "amount" | "timing"; source: OneOffPurchaseResponseDTO }> | null = null
  ) {
    const existing = input.scenarios.find((result) =>
      result.scenario.change.amount.minorUnits === amountMinorUnits &&
      result.scenario.change.paymentPeriod === paymentPeriod &&
      result.scenario.change.purpose.toLocaleLowerCase("en-GB") === purpose.toLocaleLowerCase("en-GB")
    );
    let result = existing ?? null;
    if (!result && derivation?.mode === "amount" && ["50000", "40000"].includes(amountMinorUnits)) {
      const sourceRequest = this.requestFromStoredResult(derivation.source);
      const alternatives = await this.dependencies.simulator.generateAmountAlternatives.execute({
        requestId: `conv-amounts-${suffix({ conversationId: input.conversation.id, sourceRunId: derivation.source.calculation.runId })}`,
        source: sourceRequest
      });
      if (!alternatives.ok) throw new ConversationApplicationError("SIMULATION_REJECTED", alternatives.error.message);
      result = alternatives.value.options.find((option) => option.scenario.change.amount.minorUnits === amountMinorUnits) ?? null;
    }
    if (!result && derivation?.mode === "timing") {
      const sourceRequest = this.requestFromStoredResult(derivation.source);
      const alternative = await this.dependencies.simulator.simulateMonthlyTimingAlternative.execute({
        requestId: `conv-timing-${suffix({ conversationId: input.conversation.id, sourceRunId: derivation.source.calculation.runId, paymentPeriod })}`,
        source: sourceRequest,
        targetPaymentPeriod: paymentPeriod
      });
      if (!alternative.ok) throw new ConversationApplicationError("SIMULATION_REJECTED", alternative.error.message);
      result = alternative.value.option;
    }
    if (!result) {
      const request: OneOffPurchaseRequestDTO = {
        requestId: `conv-sim-${suffix({ conversationId: input.conversation.id, amountMinorUnits, paymentPeriod, purpose })}`,
        expectedContextVersionId: input.conversation.contextVersionId,
        change: {
          type: "one_off_purchase",
          amount: { currency: "GBP", minorUnits: amountMinorUnits },
          purpose,
          paymentPeriod,
          paymentTiming: "assumed_conservative",
          paymentDate: null,
          datePrecision: "month",
          fundingSource: "current_account",
          paymentPattern: "single",
          costTreatment: "additional_to_routine_spending"
        },
        assumptionConfirmations: []
      };
      const simulated = await this.dependencies.simulator.simulateOneOffPurchase.execute(request);
      if (!simulated.ok) {
        throw new ConversationApplicationError("SIMULATION_REJECTED", simulated.error.message);
      }
      result = simulated.value;
    }
    const facts = availableFacts(result);
    const target: ExplanationTarget = "OVERALL_CLASSIFICATION";
    const templates = [resultTemplateFor(result)] as const;
    let text: string;
    let templateId: string;
    let explanationFallbackUsed = false;
    let providerAttempts = 0;
    try {
      this.dependencies.consumeProviderAllowance?.();
      const planned = await this.dependencies.provider.planExplanation({
        explanationTarget: target,
        availableFactKeys: facts,
        availableTemplateIds: templates,
        availableFollowUpActionKeys: ["TRY_LOWER_AMOUNT", "TRY_ANOTHER_MONTH", "VIEW_ASSUMPTIONS", "VIEW_CURRENT_PATH"]
      });
      providerAttempts = planned.metadata.attempts;
      validateExplanationPlan(planned.value, facts, templates);
      templateId = planned.value.templateId;
      text = renderExplanation(result, planned.value.templateId);
    } catch (error) {
      if (error instanceof ConversationProviderError) providerAttempts = error.attempts;
      explanationFallbackUsed = true;
      templateId = resultTemplateFor(result);
      text = renderResult(result);
    }
    return {
      kind: "ASSISTANT_RESULT" as const,
      text,
      templateId,
      runId: result.calculation.runId,
      selectedRunId: result.calculation.runId,
      pendingClarification: null,
      providerAttempts,
      explanationFallbackUsed
    };
  }

  private requestFromStoredResult(result: OneOffPurchaseResponseDTO): OneOffPurchaseRequestDTO {
    return {
      requestId: result.requestId,
      expectedContextVersionId: result.context.version,
      change: result.scenario.change,
      assumptionConfirmations: []
    };
  }

  private async explainResult(
    result: OneOffPurchaseResponseDTO,
    target: ExplanationTarget,
    selectedRunId: string | null
  ) {
    const facts = availableFacts(result);
    const templates = templatesForTarget(target);
    let text: string;
    let templateId: string;
    let explanationFallbackUsed = false;
    let providerAttempts = 0;
    try {
      this.dependencies.consumeProviderAllowance?.();
      const planned = await this.dependencies.provider.planExplanation({
        explanationTarget: target,
        availableFactKeys: facts,
        availableTemplateIds: templates,
        availableFollowUpActionKeys: ["TRY_LOWER_AMOUNT", "TRY_ANOTHER_MONTH", "VIEW_ASSUMPTIONS", "VIEW_CURRENT_PATH"]
      });
      providerAttempts = planned.metadata.attempts;
      validateExplanationPlan(planned.value, facts, templates);
      templateId = planned.value.templateId;
      text = renderExplanation(result, planned.value.templateId);
    } catch (error) {
      if (error instanceof ConversationProviderError) providerAttempts = error.attempts;
      explanationFallbackUsed = true;
      templateId = templates[0]!;
      text = renderFallbackExplanation(result, target);
    }
    return {
      kind: "ASSISTANT_EXPLANATION" as const,
      text,
      templateId,
      runId: result.calculation.runId,
      selectedRunId,
      pendingClarification: null,
      providerAttempts,
      explanationFallbackUsed
    };
  }

  private resolveScenarioReference(
    quote: string | null,
    message: string,
    scenarios: readonly OneOffPurchaseResponseDTO[]
  ): OneOffPurchaseResponseDTO | "current" | null {
    if (quote && !sourceContainsQuote(message, quote)) {
      throw new ConversationApplicationError(
        "AI_INTERPRETATION_INVALID",
        "The interpreted scenario label could not be traced to the user's message."
      );
    }
    const source = (quote ?? message).toLocaleLowerCase("en-GB");
    if (source.includes("current path")) return "current";
    const amount = source.match(/£?\s*(\d+(?:\.\d{1,2})?)/)?.[1] ?? null;
    const matches = scenarios.filter((result) => {
      const label = scenarioLabel(result).toLocaleLowerCase("en-GB");
      if (label.includes(source) || source.includes(label)) return true;
      if (!amount) return false;
      const expected = exactMinorUnitsFromInterpretation(
        { quote: amount, currency: "GBP" },
        amount
      );
      return result.scenario.change.amount.minorUnits === expected;
    });
    return matches.length === 1 ? matches[0]! : null;
  }

  private async scenarioResults(conversationId: string): Promise<readonly OneOffPurchaseResponseDTO[]> {
    const messages = await this.dependencies.repository.listMessages(conversationId);
    const runIds = [...new Set(messages.map((message) => message.runId).filter((id): id is string => id !== null))];
    const results = await Promise.all(runIds.map(async (runId) => {
      const stored = await this.dependencies.simulator.getSimulationRun.execute(runId);
      return stored.ok ? stored.value : null;
    }));
    return results.filter((value): value is OneOffPurchaseResponseDTO => value !== null);
  }

  private async detailFrom(conversation: StoredConversation): Promise<ConversationDetailDTO> {
    const [currentVersion, messages, scenarios, currentPathResult] = await Promise.all([
      this.dependencies.contextSource.getCurrentContextVersionId(),
      this.dependencies.repository.listMessages(conversation.id),
      this.scenarioResults(conversation.id),
      this.dependencies.simulator.getCurrentPath.execute({
        requestId: `conv-path-${suffix({ conversationId: conversation.id, context: conversation.contextVersionId })}`,
        expectedContextVersionId: conversation.contextVersionId
      })
    ]);
    if (!currentPathResult.ok) {
      throw new ConversationApplicationError("SIMULATION_REJECTED", currentPathResult.error.message);
    }
    const byRun = new Map(scenarios.map((result) => [result.calculation.runId, result]));
    const messageDTOs: ConversationMessageDTO[] = messages.map((message) => ({
      id: message.id,
      sequence: message.sequence,
      kind: message.kind,
      text: message.text,
      templateId: message.templateId,
      explanationFallbackUsed: message.explanationFallbackUsed,
      runId: message.runId,
      result: message.kind === "ASSISTANT_RESULT" && message.runId ? byRun.get(message.runId) ?? null : null,
      createdAt: message.createdAt
    }));
    const scenarioDTOs: ConversationScenarioDTO[] = scenarios.map((result) => ({
      runId: result.calculation.runId,
      scenarioId: result.scenario.id,
      label: scenarioLabel(result),
      paymentPeriod: result.scenario.change.paymentPeriod,
      amount: displayMinorUnits(result.scenario.change.amount.minorUnits),
      presentation: result.presentation
    }));
    return {
      apiVersion: "future-you.api/v1",
      schemaVersion: CONVERSATION_RESPONSE_SCHEMA,
      kind: "conversation",
      conversation: this.summary(conversation, currentVersion),
      currentPath: currentPathResult.value,
      messages: messageDTOs,
      scenarios: scenarioDTOs,
      selectedResult: conversation.selectedRunId ? byRun.get(conversation.selectedRunId) ?? null : null,
      supportedScope: SUPPORTED_SCOPE
    };
  }

  private summary(conversation: StoredConversation, currentVersion: string | null): ConversationSummaryDTO {
    return {
      id: conversation.id,
      title: conversation.title,
      contextVersionId: conversation.contextVersionId,
      contextIsCurrent: conversation.contextVersionId === currentVersion,
      selectedRunId: conversation.selectedRunId,
      hasPendingClarification: conversation.pendingClarification !== null,
      createdAt: conversation.createdAt,
      latestActivityAt: conversation.latestActivityAt
    };
  }

  private turnResponse(
    requestId: string,
    turnId: string,
    intent: ConversationIntentKind | null,
    providerAttempts: number,
    explanationFallbackUsed: boolean,
    conversation: ConversationDetailDTO
  ): ConversationTurnResponseDTO {
    return {
      apiVersion: "future-you.api/v1",
      schemaVersion: CONVERSATION_TURN_RESPONSE_SCHEMA,
      kind: "conversation_turn",
      requestId,
      turnId,
      intent,
      providerAttempts,
      explanationFallbackUsed,
      conversation
    };
  }
}
