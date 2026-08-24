import { correlationIdFor } from "../../../../../application/use-cases/resolve-current-baseline";
import {
  applicationErrorResponse,
  jsonResponse
} from "../../../../../server/http/api-response";
import { withAuthenticatedApplication } from "../../../../../server/http/authenticated-route";
import type { AuthenticatedApplicationResolver } from "../../../../../server/authenticated-application";

export const runtime = "nodejs";

export async function handleGET(resolver?: AuthenticatedApplicationResolver): Promise<Response> {
  const correlationId = correlationIdFor("get-current-financial-context", "unavailable");
  return withAuthenticatedApplication(correlationId, async (application) => {
    const result = await application.getCurrentFinancialContext.execute();
    if (!result.ok) return applicationErrorResponse(result.error, correlationId);
    return jsonResponse(result.value);
  }, resolver);
}

export async function GET(): Promise<Response> {
  return handleGET();
}
