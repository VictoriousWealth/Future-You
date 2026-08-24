import { correlationIdFor } from "../../../../../application/use-cases/resolve-current-baseline";
import type { AuthenticatedConversationApplicationResolver } from "../../../../../server/authenticated-conversation-application";
import { apiErrorResponse, jsonResponse } from "../../../../../server/http/api-response";
import { withAuthenticatedConversationApplication } from "../../../../../server/http/authenticated-route-conversation";

export const runtime = "nodejs";
const ID = /^conversation-[a-f0-9]{16}$/;

export async function handleGET(
  _request: Request,
  context: { params: Promise<{ conversationId: string }> },
  resolver?: AuthenticatedConversationApplicationResolver
): Promise<Response> {
  const { conversationId } = await context.params;
  const correlationId = correlationIdFor("get-conversation", conversationId);
  if (!ID.test(conversationId)) return apiErrorResponse(400, "INVALID_REQUEST", "Invalid conversation ID.", correlationId);
  return withAuthenticatedConversationApplication(
    correlationId,
    async (application) => jsonResponse(await application.get(conversationId)),
    resolver
  );
}

export async function GET(request: Request, context: { params: Promise<{ conversationId: string }> }): Promise<Response> {
  return handleGET(request, context);
}
