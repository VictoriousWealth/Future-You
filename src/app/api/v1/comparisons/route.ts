import { correlationIdFor } from "../../../../application/use-cases/resolve-current-baseline";
import {
  apiErrorResponse,
  applicationErrorResponse,
  internalSimulatorErrorResponse,
  jsonResponse
} from "../../../../server/http/api-response";
import { slice2Application } from "../../../../server/slice-2-application";

export const runtime = "nodejs";

const RUN_ID = /^run-[a-f0-9]{16}$/;

export async function GET(request: Request): Promise<Response> {
  const runId = new URL(request.url).searchParams.get("runId") ?? "";
  const requestId = `comparison_${runId || "missing"}`;
  const correlationId = correlationIdFor("get-scenario-comparison", requestId);
  if (!RUN_ID.test(runId)) {
    return apiErrorResponse(400, "INVALID_REQUEST", "A valid runId query parameter is required.", correlationId, [
      { path: "runId", message: "Expected run- followed by 16 lowercase hexadecimal characters." }
    ]);
  }
  try {
    const result = await slice2Application.getScenarioComparison.execute({ requestId, runId });
    return result.ok ? jsonResponse(result.value) : applicationErrorResponse(result.error, correlationId);
  } catch {
    return internalSimulatorErrorResponse(correlationId);
  }
}
