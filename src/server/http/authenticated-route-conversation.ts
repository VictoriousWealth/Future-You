import "server-only";
import type { ConversationApplication } from "../../application/conversation/application";
import { ConversationApplicationError } from "../../application/conversation/application-error";
import { AuthenticationBoundaryError } from "../../infrastructure/auth/authentication-error";
import { PersistenceBoundaryError } from "../../infrastructure/persistence/persistence-errors";
import {
  resolveAuthenticatedConversationApplication,
  type AuthenticatedConversationApplicationResolver
} from "../authenticated-conversation-application";
import { apiErrorResponse } from "./api-response";

function statusFor(code: ConversationApplicationError["code"]): number {
  switch (code) {
    case "CONVERSATION_NOT_FOUND": return 404;
    case "TURN_IDEMPOTENCY_KEY_REUSED":
    case "TURN_PROCESSING":
    case "CONVERSATION_CONTEXT_STALE": return 409;
    case "AI_TEMPORARILY_UNAVAILABLE":
    case "PERSISTENCE_FAILURE": return 503;
    case "RATE_LIMITED": return 429;
    case "SIMULATION_REJECTED": return 422;
    default: return 400;
  }
}

export async function withAuthenticatedConversationApplication(
  correlationId: string,
  operation: (application: ConversationApplication) => Promise<Response>,
  resolver: AuthenticatedConversationApplicationResolver = resolveAuthenticatedConversationApplication
): Promise<Response> {
  try {
    const context = await resolver();
    return await operation(context.application);
  } catch (error) {
    if (error instanceof AuthenticationBoundaryError) {
      return apiErrorResponse(401, error.code, error.message, correlationId);
    }
    if (error instanceof ConversationApplicationError) {
      return apiErrorResponse(statusFor(error.code), error.code, error.message, correlationId, [], error.retryable);
    }
    if (error instanceof PersistenceBoundaryError) {
      return apiErrorResponse(
        error.category === "PERSISTENCE_FAILURE" ? 503 : 500,
        error.category,
        error.category === "PERSISTENCE_FAILURE"
          ? "Conversation persistence is temporarily unavailable."
          : "Stored conversation data could not be used safely.",
        correlationId,
        [],
        error.category === "PERSISTENCE_FAILURE"
      );
    }
    return apiErrorResponse(500, "INTERNAL_SIMULATOR_FAILURE", "The conversation could not be completed safely.", correlationId);
  }
}
