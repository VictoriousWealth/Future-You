import { correlationIdFor } from "../../../../application/use-cases/resolve-current-baseline";
import {
  apiErrorResponse,
  applicationErrorResponse,
  jsonResponse
} from "../../../../server/http/api-response";
import { withAuthenticatedApplication } from "../../../../server/http/authenticated-route";
import type { AuthenticatedApplicationResolver } from "../../../../server/authenticated-application";

export const runtime = "nodejs";

const RUN_ID = /^run-[a-f0-9]{16}$/;

export async function handleGET(
  request: Request,
  resolver?: AuthenticatedApplicationResolver
): Promise<Response> {
  const invalidCorrelation = correlationIdFor("get-scenario-comparison", "invalid-request");
  return withAuthenticatedApplication(invalidCorrelation, async (application) => {
    const runId = new URL(request.url).searchParams.get("runId") ?? "";
    const requestId = `comparison_${runId || "missing"}`;
    const correlationId = correlationIdFor("get-scenario-comparison", requestId);
    if (!RUN_ID.test(runId)) {
      return apiErrorResponse(400, "INVALID_REQUEST", "A valid runId query parameter is required.", correlationId, [
        { path: "runId", message: "Expected run- followed by 16 lowercase hexadecimal characters." }
      ]);
    }
    const result = await application.getScenarioComparison.execute({ requestId, runId });
    return result.ok ? jsonResponse(result.value) : applicationErrorResponse(result.error, correlationId);
  }, resolver);
}

export async function GET(request: Request): Promise<Response> {
  return handleGET(request);
}
