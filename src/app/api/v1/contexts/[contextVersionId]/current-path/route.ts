import { parseBaselineRequest } from "../../../../../../application/dto/request-validation";
import { correlationIdFor } from "../../../../../../application/use-cases/resolve-current-baseline";
import {
  apiErrorResponse,
  applicationErrorResponse,
  jsonResponse
} from "../../../../../../server/http/api-response";
import { withAuthenticatedApplication } from "../../../../../../server/http/authenticated-route";
import type { AuthenticatedApplicationResolver } from "../../../../../../server/authenticated-application";

export const runtime = "nodejs";

export async function handleGET(
  _request: Request,
  context: { params: Promise<{ contextVersionId: string }> },
  resolver?: AuthenticatedApplicationResolver
): Promise<Response> {
  const invalidCorrelation = correlationIdFor("get-current-path", "invalid-request");
  return withAuthenticatedApplication(invalidCorrelation, async (application) => {
    const { contextVersionId } = await context.params;
    const parsed = parseBaselineRequest({
      requestId: "get_current_path",
      expectedContextVersionId: contextVersionId
    });
    if (!parsed.ok) {
      return apiErrorResponse(400, parsed.code, "Invalid context version.", invalidCorrelation, parsed.issues);
    }
    const correlationId = correlationIdFor("get-current-path", parsed.value.requestId);
    const result = await application.getCurrentPath.execute(parsed.value);
    return result.ok ? jsonResponse(result.value) : applicationErrorResponse(result.error, correlationId);
  }, resolver);
}

export async function GET(
  request: Request,
  context: { params: Promise<{ contextVersionId: string }> }
): Promise<Response> {
  return handleGET(request, context);
}
