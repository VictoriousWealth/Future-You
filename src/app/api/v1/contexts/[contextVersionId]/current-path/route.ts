import { parseBaselineRequest } from "../../../../../../application/dto/request-validation";
import { correlationIdFor } from "../../../../../../application/use-cases/resolve-current-baseline";
import {
  apiErrorResponse,
  applicationErrorResponse,
  internalSimulatorErrorResponse,
  jsonResponse
} from "../../../../../../server/http/api-response";
import { slice2Application } from "../../../../../../server/slice-2-application";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ contextVersionId: string }> }
): Promise<Response> {
  const { contextVersionId } = await context.params;
  const parsed = parseBaselineRequest({
    requestId: "get_current_path",
    expectedContextVersionId: contextVersionId
  });
  const invalidCorrelation = correlationIdFor("get-current-path", "invalid-request");
  if (!parsed.ok) {
    return apiErrorResponse(400, parsed.code, "Invalid context version.", invalidCorrelation, parsed.issues);
  }
  const correlationId = correlationIdFor("get-current-path", parsed.value.requestId);
  try {
    const result = await slice2Application.getCurrentPath.execute(parsed.value);
    return result.ok ? jsonResponse(result.value) : applicationErrorResponse(result.error, correlationId);
  } catch {
    return internalSimulatorErrorResponse(correlationId);
  }
}
