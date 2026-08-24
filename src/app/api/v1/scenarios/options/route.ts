import { parseScenarioOptionsRequest } from "../../../../../application/dto/request-validation";
import { correlationIdFor } from "../../../../../application/use-cases/resolve-current-baseline";
import {
  apiErrorResponse,
  applicationErrorResponse,
  jsonResponse,
  readJsonBody
} from "../../../../../server/http/api-response";
import { withAuthenticatedApplication } from "../../../../../server/http/authenticated-route";
import { sameOriginMutationError } from "../../../../../server/http/same-origin";
import type { AuthenticatedApplicationResolver } from "../../../../../server/authenticated-application";

export const runtime = "nodejs";

export async function handlePOST(
  request: Request,
  resolver?: AuthenticatedApplicationResolver
): Promise<Response> {
  const invalidCorrelation = correlationIdFor("list-scenario-options", "invalid-request");
  const originError = sameOriginMutationError(request, invalidCorrelation);
  if (originError) return originError;
  return withAuthenticatedApplication(invalidCorrelation, async (application) => {
    const body = await readJsonBody(request);
    if (!body.ok) {
      return apiErrorResponse(400, "INVALID_JSON", "Request body must be valid JSON.", invalidCorrelation);
    }
    const parsed = parseScenarioOptionsRequest(body.value);
    if (!parsed.ok) {
      return apiErrorResponse(
        parsed.code === "UNSUPPORTED_SCENARIO_TYPE" ? 422 : 400,
        parsed.code,
        "Request did not match the scenario-options contract.",
        invalidCorrelation,
        parsed.issues
      );
    }
    const correlationId = correlationIdFor("list-scenario-options", parsed.value.requestId);
    const result = await application.listScenarioOptions.execute(parsed.value);
    return result.ok ? jsonResponse(result.value) : applicationErrorResponse(result.error, correlationId);
  }, resolver);
}

export async function POST(request: Request): Promise<Response> {
  return handlePOST(request);
}
