import { parseBaselineRequest } from "../../../../application/dto/request-validation";
import { correlationIdFor } from "../../../../application/use-cases/resolve-current-baseline";
import {
  apiErrorResponse,
  applicationErrorResponse,
  internalSimulatorErrorResponse,
  jsonResponse,
  readJsonBody
} from "../../../../server/http/api-response";
import { slice2Application } from "../../../../server/slice-2-application";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  const invalidCorrelation = correlationIdFor("generate-baseline", "invalid-request");
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
  try {
    const result = await slice2Application.generateBaseline.execute(parsed.value);
    return result.ok
      ? jsonResponse(result.value)
      : applicationErrorResponse(result.error, correlationId);
  } catch {
    return internalSimulatorErrorResponse(correlationId);
  }
}
