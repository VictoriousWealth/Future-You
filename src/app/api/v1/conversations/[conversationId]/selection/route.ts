import { selectConversationScenarioRequestSchema } from "../../../../../../application/conversation/schemas";
import { correlationIdFor } from "../../../../../../application/use-cases/resolve-current-baseline";
import type { AuthenticatedConversationApplicationResolver } from "../../../../../../server/authenticated-conversation-application";
import { apiErrorResponse, jsonResponse, readJsonBody } from "../../../../../../server/http/api-response";
import { withAuthenticatedConversationApplication } from "../../../../../../server/http/authenticated-route-conversation";
import { sameOriginMutationError } from "../../../../../../server/http/same-origin";

export const runtime = "nodejs";
const ID = /^conversation-[a-f0-9]{16}$/;

export async function handlePOST(
  request: Request,
  context: { params: Promise<{ conversationId: string }> },
  resolver?: AuthenticatedConversationApplicationResolver
): Promise<Response> {
  const { conversationId } = await context.params;
  const correlationId = correlationIdFor("select-conversation-scenario", conversationId);
  const originError = sameOriginMutationError(request, correlationId);
  if (originError) return originError;
  if (!ID.test(conversationId)) return apiErrorResponse(400, "INVALID_REQUEST", "Invalid conversation ID.", correlationId);
  return withAuthenticatedConversationApplication(correlationId, async (application) => {
    const body = await readJsonBody(request);
    if (!body.ok) return apiErrorResponse(400, "INVALID_JSON", "Request body must be valid JSON.", correlationId);
    const parsed = selectConversationScenarioRequestSchema.safeParse(body.value);
    if (!parsed.success) return apiErrorResponse(400, "INVALID_REQUEST", "Request did not match the scenario-selection contract.", correlationId);
    return jsonResponse(await application.select(conversationId, parsed.data));
  }, resolver);
}

export async function POST(request: Request, context: { params: Promise<{ conversationId: string }> }): Promise<Response> {
  return handlePOST(request, context);
}
