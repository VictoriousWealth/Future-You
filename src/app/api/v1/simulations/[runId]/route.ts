import { correlationIdFor } from "../../../../../application/use-cases/resolve-current-baseline";
import {
  apiErrorResponse,
  applicationErrorResponse,
  internalSimulatorErrorResponse,
  jsonResponse
} from "../../../../../server/http/api-response";
import { slice2Application } from "../../../../../server/slice-2-application";

export const runtime = "nodejs";

const RUN_ID = /^run-[a-f0-9]{16}$/;

export async function GET(
  _request: Request,
  context: { params: Promise<{ runId: string }> }
): Promise<Response> {
  const { runId } = await context.params;
  const correlationId = correlationIdFor("get-simulation-run", runId);
  if (!RUN_ID.test(runId)) {
    return apiErrorResponse(400, "INVALID_REQUEST", "Invalid simulation run ID.", correlationId, [
      { path: "runId", message: "Expected run- followed by 16 lowercase hexadecimal characters." }
    ]);
  }
  try {
    const result = await slice2Application.getSimulationRun.execute(runId);
    return result.ok ? jsonResponse(result.value) : applicationErrorResponse(result.error, correlationId);
  } catch {
    return internalSimulatorErrorResponse(correlationId);
  }
}
