import { ConversationApplication } from "../../src/application/conversation/application";
import type {
  BeginConversationTurnCommand,
  BeginConversationTurnOutcome,
  CompleteConversationTurnCommand,
  ConversationRepository,
  CreateConversationCommand,
  StoredConversation,
  StoredConversationMessage,
  StoredConversationTurnCompletion
} from "../../src/application/ports/conversation-repository";
import { FakeConversationModelProvider, type FakeProviderMode } from "../../src/infrastructure/ai/fake-conversation-model-provider";
import { createSimulatorApplication } from "../../src/server/simulator-application";
import { SARAH_V1_CONTEXT } from "../../src/fixtures/sarah-v1";
import { slice2TestDependencies } from "./slice-2";

interface StoredTurn {
  readonly identity: string;
  readonly turnId: string;
  readonly beginCommand: BeginConversationTurnCommand;
  status: "processing" | "complete";
  completion?: StoredConversationTurnCompletion;
}

export class InMemoryConversationRepository implements ConversationRepository {
  readonly conversations = new Map<string, StoredConversation>();
  readonly messages = new Map<string, StoredConversationMessage[]>();
  readonly turns = new Map<string, StoredTurn>();

  async create(command: CreateConversationCommand): Promise<StoredConversation> {
    const existing = this.conversations.get(command.id);
    if (existing) return existing;
    const created: StoredConversation = {
      id: command.id,
      contextVersionId: command.contextVersionId,
      title: command.title,
      selectedRunId: null,
      pendingClarification: null,
      orchestrationVersion: command.orchestrationVersion,
      createdAt: "2026-08-24T12:00:00.000Z",
      latestActivityAt: "2026-08-24T12:00:00.000Z"
    };
    this.conversations.set(command.id, created);
    this.messages.set(command.id, []);
    return created;
  }

  async list() { return [...this.conversations.values()]; }
  async get(id: string) { return this.conversations.get(id) ?? null; }
  async listMessages(id: string) { return this.messages.get(id) ?? []; }

  async beginTurn(command: BeginConversationTurnCommand): Promise<BeginConversationTurnOutcome> {
    if (!this.conversations.has(command.conversationId)) return { status: "not_found", turnId: null };
    const key = `${command.conversationId}:${command.requestId}`;
    const existing = this.turns.get(key);
    if (existing) {
      if (existing.identity !== command.requestIdentity) return { status: "idempotency_conflict", turnId: null };
      return existing.status === "processing"
        ? { status: "processing", turnId: existing.turnId }
        : { status: "existing", turnId: existing.turnId, completion: existing.completion! };
    }
    this.turns.set(key, { identity: command.requestIdentity, turnId: command.turnId, beginCommand: command, status: "processing" });
    const messages = this.messages.get(command.conversationId)!;
    messages.push({
      id: command.userMessageId,
      sequence: String(messages.length + 1),
      kind: "USER_TEXT",
      text: command.message,
      templateId: null,
      explanationFallbackUsed: false,
      runId: null,
      createdAt: command.trustedTimestamp
    });
    return { status: "created", turnId: command.turnId };
  }

  async completeTurn(command: CompleteConversationTurnCommand): Promise<void> {
    const messages = this.messages.get(command.conversationId)!;
    messages.push({
      id: command.assistantMessageId,
      sequence: String(messages.length + 1),
      kind: command.assistantKind,
      text: command.assistantText,
      templateId: command.templateId,
      explanationFallbackUsed: command.explanationFallbackUsed,
      runId: command.referencedRunId,
      createdAt: "2026-08-24T12:00:01.000Z"
    });
    const conversation = this.conversations.get(command.conversationId)!;
    this.conversations.set(command.conversationId, {
      ...conversation,
      selectedRunId: command.selectedRunId,
      pendingClarification: command.pendingClarification,
      latestActivityAt: "2026-08-24T12:00:01.000Z"
    });
    const turn = [...this.turns.values()].find((candidate) => candidate.turnId === command.turnId);
    if (turn) {
      turn.status = "complete";
      turn.completion = {
        intent: command.interpretationKind,
        providerAttemptCount: command.providerAttemptCount,
        explanationFallbackUsed: command.explanationFallbackUsed,
        finalStatus: command.finalStatus,
        failureCategory: command.failureCategory,
        failureMessage: command.finalStatus === "FAILED" ? command.assistantText : null
      };
    }
  }

  async selectRun(conversationId: string, runId: string | null): Promise<boolean> {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) return false;
    if (runId && !(this.messages.get(conversationId) ?? []).some((message) => message.runId === runId)) return false;
    this.conversations.set(conversationId, { ...conversation, selectedRunId: runId });
    return true;
  }
}

export function conversationTestApplication(mode: FakeProviderMode = "normal") {
  const dependencies = slice2TestDependencies();
  let currentVersionId: string | null = SARAH_V1_CONTEXT.version;
  const contextSource = {
    getCurrentContextVersionId: async () => currentVersionId,
    getContextVersion: dependencies.contextSource.getContextVersion.bind(dependencies.contextSource)
  };
  const repository = new InMemoryConversationRepository();
  const provider = new FakeConversationModelProvider(mode);
  const simulator = createSimulatorApplication({ ...dependencies, contextSource });
  const application = new ConversationApplication({
    repository,
    contextSource,
    simulator,
    provider,
    providerIdentifier: "fake",
    modelIdentifier: "fake-conversation/2.0.0",
    now: () => new Date("2026-08-24T12:00:00.000Z")
  });
  return {
    application,
    repository,
    provider,
    simulator,
    setCurrentVersion: (value: string | null) => { currentVersionId = value; }
  };
}
