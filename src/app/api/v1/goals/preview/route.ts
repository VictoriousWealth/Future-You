import { correlationIdFor } from "../../../../../application/use-cases/resolve-current-baseline";
import type { AuthenticatedProductSurfaceResolver } from "../../../../../server/authenticated-product-surface-application";
import {
  apiErrorResponse,
  applicationErrorResponse,
  jsonResponse
} from "../../../../../server/http/api-response";
import { withAuthenticatedProductSurface } from "../../../../../server/http/authenticated-product-surface-route";

export const runtime = "nodejs";
const RUN_ID = /^run-[a-f0-9]{16}$/;

export async function handleGET(
  request: Request,
  resolver?: AuthenticatedProductSurfaceResolver
): Promise<Response> {
  const runId = new URL(request.url).searchParams.get("runId") ?? "";
  const correlationId = correlationIdFor("get-goals-preview", runId || "invalid");
  if (!RUN_ID.test(runId)) {
    return apiErrorResponse(
      400,
      "INVALID_REQUEST",
      "A valid runId query parameter is required.",
      correlationId,
      [{ path: "runId", message: "Expected a stored simulation run identifier." }]
    );
  }
  return withAuthenticatedProductSurface(correlationId, async (application) => {
    const result = await application.goalsPreview(runId);
    return result.ok ? jsonResponse(result.value) : applicationErrorResponse(result.error, correlationId);
  }, resolver);
}

export async function GET(request: Request): Promise<Response> {
  return handleGET(request);
}
