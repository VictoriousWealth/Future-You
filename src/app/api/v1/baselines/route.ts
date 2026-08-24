import { parseBaselineRequest } from "../../../../application/dto/request-validation";
import { correlationIdFor } from "../../../../application/use-cases/resolve-current-baseline";
import {
  apiErrorResponse,
  applicationErrorResponse,
  jsonResponse,
  readJsonBody
} from "../../../../server/http/api-response";
import { withAuthenticatedApplication } from "../../../../server/http/authenticated-route";
import { sameOriginMutationError } from "../../../../server/http/same-origin";
import type { AuthenticatedApplicationResolver } from "../../../../server/authenticated-application";

export const runtime = "nodejs";

export async function handlePOST(
  request: Request,
  resolver?: AuthenticatedApplicationResolver
): Promise<Response> {
  const invalidCorrelation = correlationIdFor("generate-baseline", "invalid-request");
  const originError = sameOriginMutationError(request, invalidCorrelation);
  if (originError) return originError;
  return withAuthenticatedApplication(invalidCorrelation, async (application) => {
    const body = await readJsonBody(request);
    if (!body.ok) {
      return apiErrorResponse(400, "INVALID_JSON", "Request body must be valid JSON.", invalidCorrelation);
    }
    const parsed = parseBaselineRequest(body.value);
    if (!parsed.ok) {
      return apiErrorResponse(
        400,
        parsed.code,
        "Request did not match the baseline contract.",
        invalidCorrelation,
        parsed.issues
      );
    }
    const correlationId = correlationIdFor("generate-baseline", parsed.value.requestId);
    const result = await application.generateBaseline.execute(parsed.value);
    return result.ok
      ? jsonResponse(result.value)
      : applicationErrorResponse(result.error, correlationId);
  }, resolver);
}

export async function POST(request: Request): Promise<Response> {
  return handlePOST(request);
}
