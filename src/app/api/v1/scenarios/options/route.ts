import { parseScenarioOptionsRequest } from "../../../../../application/dto/request-validation";
import { correlationIdFor } from "../../../../../application/use-cases/resolve-current-baseline";
import {
  apiErrorResponse,
  applicationErrorResponse,
  internalSimulatorErrorResponse,
  jsonResponse,
  readJsonBody
} from "../../../../../server/http/api-response";
import { slice2Application } from "../../../../../server/slice-2-application";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  const invalidCorrelation = correlationIdFor("list-scenario-options", "invalid-request");
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
  try {
    const result = await slice2Application.listScenarioOptions.execute(parsed.value);
    return result.ok ? jsonResponse(result.value) : applicationErrorResponse(result.error, correlationId);
  } catch {
    return internalSimulatorErrorResponse(correlationId);
  }
}
