import { correlationIdFor } from "../../../../../application/use-cases/resolve-current-baseline";
import {
  apiErrorResponse,
  applicationErrorResponse,
  jsonResponse
} from "../../../../../server/http/api-response";
import { withAuthenticatedApplication } from "../../../../../server/http/authenticated-route";
import type { AuthenticatedApplicationResolver } from "../../../../../server/authenticated-application";

export const runtime = "nodejs";

const RUN_ID = /^run-[a-f0-9]{16}$/;

export async function handleGET(
  _request: Request,
  context: { params: Promise<{ runId: string }> },
  resolver?: AuthenticatedApplicationResolver
): Promise<Response> {
  const invalidCorrelation = correlationIdFor("get-simulation-run", "invalid-request");
  return withAuthenticatedApplication(invalidCorrelation, async (application) => {
    const { runId } = await context.params;
    const correlationId = correlationIdFor("get-simulation-run", runId);
    if (!RUN_ID.test(runId)) {
      return apiErrorResponse(400, "INVALID_REQUEST", "Invalid simulation run ID.", correlationId, [
        { path: "runId", message: "Expected run- followed by 16 lowercase hexadecimal characters." }
      ]);
    }
    const result = await application.getSimulationRun.execute(runId);
    return result.ok ? jsonResponse(result.value) : applicationErrorResponse(result.error, correlationId);
  }, resolver);
}

export async function GET(
  request: Request,
  context: { params: Promise<{ runId: string }> }
): Promise<Response> {
  return handleGET(request, context);
}
