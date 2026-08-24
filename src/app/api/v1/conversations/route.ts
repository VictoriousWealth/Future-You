import {
  createConversationRequestSchema
} from "../../../../application/conversation/schemas";
import { correlationIdFor } from "../../../../application/use-cases/resolve-current-baseline";
import type { AuthenticatedConversationApplicationResolver } from "../../../../server/authenticated-conversation-application";
import { apiErrorResponse, jsonResponse, readJsonBody } from "../../../../server/http/api-response";
import { withAuthenticatedConversationApplication } from "../../../../server/http/authenticated-route-conversation";
import { sameOriginMutationError } from "../../../../server/http/same-origin";

export const runtime = "nodejs";

export async function handleGET(
  _request: Request,
  resolver?: AuthenticatedConversationApplicationResolver
): Promise<Response> {
  const correlationId = correlationIdFor("list-conversations", "current-user");
  return withAuthenticatedConversationApplication(
    correlationId,
    async (application) => jsonResponse(await application.list()),
    resolver
  );
}

export async function handlePOST(
  request: Request,
  resolver?: AuthenticatedConversationApplicationResolver
): Promise<Response> {
  const invalidCorrelation = correlationIdFor("create-conversation", "invalid-request");
  const originError = sameOriginMutationError(request, invalidCorrelation);
  if (originError) return originError;
  return withAuthenticatedConversationApplication(invalidCorrelation, async (application) => {
    const body = await readJsonBody(request);
    if (!body.ok) return apiErrorResponse(400, "INVALID_JSON", "Request body must be valid JSON.", invalidCorrelation);
    const parsed = createConversationRequestSchema.safeParse(body.value);
    if (!parsed.success) return apiErrorResponse(400, "INVALID_REQUEST", "Request did not match the conversation contract.", invalidCorrelation);
    return jsonResponse(await application.create(parsed.data), 201);
  }, resolver);
}

export async function GET(request: Request): Promise<Response> { return handleGET(request); }
export async function POST(request: Request): Promise<Response> { return handlePOST(request); }
