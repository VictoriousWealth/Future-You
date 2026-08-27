import type {
  ConversationMessageKind,
  PendingClarification
} from "../conversation/contracts";
import type { RecordedConversationIntentKind } from "../conversation/demo-contracts";

export interface StoredConversation {
  readonly id: string;
  readonly contextVersionId: string;
  readonly title: string;
  readonly selectedRunId: string | null;
  readonly pendingClarification: PendingClarification | null;
  readonly orchestrationVersion: string;
  readonly createdAt: string;
  readonly latestActivityAt: string;
}

export interface StoredConversationMessage {
  readonly id: string;
  readonly sequence: string;
  readonly kind: ConversationMessageKind;
  readonly text: string;
  readonly templateId: string | null;
  readonly explanationFallbackUsed: boolean;
  readonly runId: string | null;
  readonly createdAt: string;
}

export interface CreateConversationCommand {
  readonly id: string;
  readonly contextVersionId: string;
  readonly title: string;
  readonly orchestrationVersion: string;
}

export type BeginConversationTurnOutcome =
  | Readonly<{ status: "created"; turnId: string }>
  | Readonly<{
      status: "existing";
      turnId: string;
      completion: StoredConversationTurnCompletion;
    }>
  | Readonly<{ status: "processing"; turnId: string }>
  | Readonly<{ status: "idempotency_conflict" | "not_found"; turnId: null }>;

export interface StoredConversationTurnCompletion {
  readonly intent: RecordedConversationIntentKind | null;
  readonly providerAttemptCount: number;
  readonly explanationFallbackUsed: boolean;
  readonly finalStatus: "COMPLETED" | "FAILED";
  readonly failureCategory: string | null;
  readonly failureMessage: string | null;
}

export interface BeginConversationTurnCommand {
  readonly conversationId: string;
  readonly turnId: string;
  readonly requestId: string;
  readonly requestIdentity: string;
  readonly userMessageId: string;
  readonly message: string;
  readonly trustedTimestamp: string;
  readonly trustedTimezone: "Europe/London";
  readonly interpretationPromptVersion: string;
  readonly interpretationSchemaVersion: string;
  readonly explanationPromptVersion: string;
  readonly explanationSchemaVersion: string;
  readonly providerIdentifier: string;
  readonly modelIdentifier: string;
}

export interface CompleteConversationTurnCommand {
  readonly conversationId: string;
  readonly turnId: string;
  readonly assistantMessageId: string;
  readonly assistantKind: Exclude<ConversationMessageKind, "USER_TEXT">;
  readonly assistantText: string;
  readonly templateId: string | null;
  readonly interpretationKind: RecordedConversationIntentKind | null;
  readonly referencedRunId: string | null;
  readonly providerAttemptCount: number;
  readonly explanationFallbackUsed: boolean;
  readonly failureCategory: string | null;
  readonly pendingClarification: PendingClarification | null;
  readonly selectedRunId: string | null;
  readonly finalStatus: "COMPLETED" | "FAILED";
}

export interface ConversationRepository {
  create(command: CreateConversationCommand): Promise<StoredConversation>;
  list(): Promise<readonly StoredConversation[]>;
  get(conversationId: string): Promise<StoredConversation | null>;
  listMessages(conversationId: string): Promise<readonly StoredConversationMessage[]>;
  beginTurn(command: BeginConversationTurnCommand): Promise<BeginConversationTurnOutcome>;
  completeTurn(command: CompleteConversationTurnCommand): Promise<void>;
  selectRun(conversationId: string, runId: string | null): Promise<boolean>;
}
