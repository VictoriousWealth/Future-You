import { correlationIdFor } from "../../../../../application/use-cases/resolve-current-baseline";
import {
  applicationErrorResponse,
  internalSimulatorErrorResponse,
  jsonResponse
} from "../../../../../server/http/api-response";
import { slice2Application } from "../../../../../server/slice-2-application";

export const runtime = "nodejs";

export async function GET(): Promise<Response> {
  const correlationId = correlationIdFor("get-current-financial-context", "unavailable");
  try {
    const result = await slice2Application.getCurrentFinancialContext.execute();
    if (!result.ok) return applicationErrorResponse(result.error, correlationId);
    return jsonResponse(result.value);
  } catch {
    return internalSimulatorErrorResponse(correlationId);
  }
}
