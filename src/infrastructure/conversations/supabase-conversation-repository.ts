import "server-only";
import type { AuthenticatedPrincipal } from "../../application/auth/authenticated-principal";
import { pendingClarificationSchema } from "../../application/conversation/schemas";
import type {
  BeginConversationTurnCommand,
  BeginConversationTurnOutcome,
  CompleteConversationTurnCommand,
  ConversationRepository,
  CreateConversationCommand,
  StoredConversation,
  StoredConversationMessage,
  StoredConversationTurnCompletion
} from "../../application/ports/conversation-repository";
import { recordedConversationIntentKindSchema } from "../../application/conversation/demo-schemas";
import type { Json } from "../supabase/database.types";
import type { RequestSupabaseClient } from "../supabase/server-client";
import { PersistenceBoundaryError } from "../persistence/persistence-errors";

type ConversationRow = {
  conversation_id: string;
  context_version_id: string;
  title: string;
  selected_run_id: string | null;
  pending_clarification: Json | null;
  orchestration_version: string;
  created_at: string;
  latest_activity_at: string;
};

function pendingFromJson(value: Json | null) {
  if (value === null) return null;
  const parsed = pendingClarificationSchema.safeParse(value);
  if (!parsed.success) {
    throw new PersistenceBoundaryError(
      "PERSISTED_DATA_INVALID",
      "The persisted clarification state was invalid."
    );
  }
  return parsed.data;
}

function conversationFromRow(row: ConversationRow): StoredConversation {
  return {
    id: row.conversation_id,
    contextVersionId: row.context_version_id,
    title: row.title,
    selectedRunId: row.selected_run_id,
    pendingClarification: pendingFromJson(row.pending_clarification),
    orchestrationVersion: row.orchestration_version,
    createdAt: row.created_at,
    latestActivityAt: row.latest_activity_at
  };
}

function completionFromJson(value: Json | null): StoredConversationTurnCompletion {
  if (value === null || Array.isArray(value) || typeof value !== "object") {
    throw new PersistenceBoundaryError("PERSISTED_DATA_INVALID", "The persisted turn completion was invalid.");
  }
  const intent = value.intent === null ? null : recordedConversationIntentKindSchema.safeParse(value.intent);
  if (
    (intent !== null && !intent.success) ||
    typeof value.providerAttemptCount !== "number" ||
    !Number.isSafeInteger(value.providerAttemptCount) ||
    value.providerAttemptCount < 0 ||
    typeof value.explanationFallbackUsed !== "boolean" ||
    (value.finalStatus !== "COMPLETED" && value.finalStatus !== "FAILED") ||
    !(typeof value.failureCategory === "string" || value.failureCategory === null) ||
    !(typeof value.failureMessage === "string" || value.failureMessage === null)
  ) {
    throw new PersistenceBoundaryError("PERSISTED_DATA_INVALID", "The persisted turn completion was invalid.");
  }
  return {
    intent: intent === null ? null : intent.data,
    providerAttemptCount: value.providerAttemptCount,
    explanationFallbackUsed: value.explanationFallbackUsed,
    finalStatus: value.finalStatus,
    failureCategory: value.failureCategory,
    failureMessage: value.failureMessage
  };
}

export class SupabaseConversationRepository implements ConversationRepository {
  constructor(
    private readonly client: RequestSupabaseClient,
    private readonly principal: AuthenticatedPrincipal
  ) {}

  async create(command: CreateConversationCommand): Promise<StoredConversation> {
    const { error } = await this.client.from("conversations").insert({
      user_id: this.principal.userId,
      conversation_id: command.id,
      context_version_id: command.contextVersionId,
      title: command.title,
      orchestration_version: command.orchestrationVersion
    });
    if (error && error.code !== "23505") throw this.failure("The conversation could not be created.");
    const stored = await this.get(command.id);
    if (!stored || stored.contextVersionId !== command.contextVersionId) {
      throw new PersistenceBoundaryError(
        "PERSISTED_DATA_INVALID",
        "The conversation identity collided with different content."
      );
    }
    return stored;
  }

  async list(): Promise<readonly StoredConversation[]> {
    const { data, error } = await this.client
      .from("conversations")
      .select("conversation_id, context_version_id, title, selected_run_id, pending_clarification, orchestration_version, created_at, latest_activity_at")
      .eq("user_id", this.principal.userId)
      .order("latest_activity_at", { ascending: false });
    if (error) throw this.failure("The conversation list could not be read.");
    return (data as ConversationRow[]).map(conversationFromRow);
  }

  async get(conversationId: string): Promise<StoredConversation | null> {
    const { data, error } = await this.client
      .from("conversations")
      .select("conversation_id, context_version_id, title, selected_run_id, pending_clarification, orchestration_version, created_at, latest_activity_at")
      .eq("user_id", this.principal.userId)
      .eq("conversation_id", conversationId)
      .maybeSingle();
    if (error) throw this.failure("The conversation could not be read.");
    return data ? conversationFromRow(data as ConversationRow) : null;
  }

  async listMessages(conversationId: string): Promise<readonly StoredConversationMessage[]> {
    const { data, error } = await this.client
      .from("conversation_messages")
      .select("message_id, sequence_number, kind, content_payload, run_id, created_at")
      .eq("user_id", this.principal.userId)
      .eq("conversation_id", conversationId)
      .order("sequence_number", { ascending: true });
    if (error) throw this.failure("Conversation messages could not be read.");
    return data.map((row) => {
      const payload = row.content_payload;
      if (
        payload === null || Array.isArray(payload) || typeof payload !== "object" ||
        typeof payload.text !== "string" ||
        !(typeof payload.templateId === "string" || payload.templateId === null || payload.templateId === undefined)
        || !(typeof payload.explanationFallbackUsed === "boolean" || payload.explanationFallbackUsed === undefined)
      ) {
        throw new PersistenceBoundaryError("PERSISTED_DATA_INVALID", "A persisted conversation message was invalid.");
      }
      return {
        id: row.message_id,
        sequence: String(row.sequence_number),
        kind: row.kind as StoredConversationMessage["kind"],
        text: payload.text,
        templateId: typeof payload.templateId === "string" ? payload.templateId : null,
        explanationFallbackUsed: payload.explanationFallbackUsed === true,
        runId: row.run_id,
        createdAt: row.created_at
      };
    });
  }

  async beginTurn(command: BeginConversationTurnCommand): Promise<BeginConversationTurnOutcome> {
    const { data, error } = await this.client.rpc("begin_conversation_turn", {
      p_conversation_id: command.conversationId,
      p_turn_id: command.turnId,
      p_request_id: command.requestId,
      p_request_identity: command.requestIdentity,
      p_user_message_id: command.userMessageId,
      p_message_text: command.message,
      p_trusted_timestamp: command.trustedTimestamp,
      p_trusted_timezone: command.trustedTimezone,
      p_interpretation_prompt_version: command.interpretationPromptVersion,
      p_interpretation_schema_version: command.interpretationSchemaVersion,
      p_explanation_prompt_version: command.explanationPromptVersion,
      p_explanation_schema_version: command.explanationSchemaVersion,
      p_provider_identifier: command.providerIdentifier,
      p_model_identifier: command.modelIdentifier
    });
    if (error || !data || data.length !== 1) throw this.failure("The conversation turn could not be started.");
    const row = data[0]!;
    if (row.status === "idempotency_conflict" || row.status === "not_found") {
      return { status: row.status, turnId: null };
    }
    if (row.status === "created" || row.status === "processing") {
      if (!row.turn_id) throw this.failure("The stored conversation turn identity was missing.");
      return { status: row.status, turnId: row.turn_id };
    }
    if (row.status === "existing") {
      if (!row.turn_id) throw this.failure("The stored conversation turn identity was missing.");
      return {
        status: row.status,
        turnId: row.turn_id,
        completion: completionFromJson(row.response_payload)
      };
    }
    throw this.failure("The stored conversation turn status was invalid.");
  }

  async completeTurn(command: CompleteConversationTurnCommand): Promise<void> {
    const assistantContent = {
      text: command.assistantText,
      templateId: command.templateId,
      explanationFallbackUsed: command.explanationFallbackUsed
    } satisfies Json;
    const responsePayload = {
      assistantMessageId: command.assistantMessageId,
      intent: command.interpretationKind,
      referencedRunId: command.referencedRunId,
      providerAttemptCount: command.providerAttemptCount,
      explanationFallbackUsed: command.explanationFallbackUsed,
      finalStatus: command.finalStatus,
      failureCategory: command.failureCategory,
      failureMessage: command.finalStatus === "FAILED" ? command.assistantText : null
    } satisfies Json;
    const { error } = await this.client.rpc("complete_conversation_turn", {
      p_conversation_id: command.conversationId,
      p_turn_id: command.turnId,
      p_assistant_message_id: command.assistantMessageId,
      p_assistant_kind: command.assistantKind,
      p_assistant_content: assistantContent,
      p_interpretation_kind: command.interpretationKind ?? "",
      p_referenced_run_id: command.referencedRunId ?? "",
      p_provider_attempt_count: command.providerAttemptCount,
      p_explanation_fallback_used: command.explanationFallbackUsed,
      p_failure_category: command.failureCategory ?? "",
      p_pending_clarification: command.pendingClarification as unknown as Json | null,
      p_selected_run_id: command.selectedRunId ?? "",
      p_response_payload: responsePayload,
      p_final_status: command.finalStatus
    });
    if (error) throw this.failure("The conversation turn could not be completed.");
  }

  async selectRun(conversationId: string, runId: string | null): Promise<boolean> {
    if (runId !== null) {
      const { data: reference, error: referenceError } = await this.client
        .from("conversation_messages")
        .select("message_id")
        .eq("user_id", this.principal.userId)
        .eq("conversation_id", conversationId)
        .eq("run_id", runId)
        .maybeSingle();
      if (referenceError || !reference) return false;
    }
    const { data, error } = await this.client
      .from("conversations")
      .update({ selected_run_id: runId, latest_activity_at: new Date().toISOString() })
      .eq("user_id", this.principal.userId)
      .eq("conversation_id", conversationId)
      .select("conversation_id")
      .maybeSingle();
    if (error) throw this.failure("The selected conversation scenario could not be changed.");
    return data !== null;
  }

  private failure(message: string): PersistenceBoundaryError {
    return new PersistenceBoundaryError("PERSISTENCE_FAILURE", message);
  }
}
