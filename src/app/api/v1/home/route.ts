import { correlationIdFor } from "../../../../application/use-cases/resolve-current-baseline";
import type { AuthenticatedProductSurfaceResolver } from "../../../../server/authenticated-product-surface-application";
import { applicationErrorResponse, jsonResponse } from "../../../../server/http/api-response";
import { withAuthenticatedProductSurface } from "../../../../server/http/authenticated-product-surface-route";

export const runtime = "nodejs";

export async function handleGET(resolver?: AuthenticatedProductSurfaceResolver): Promise<Response> {
  const correlationId = correlationIdFor("get-home-surface", "current-user");
  return withAuthenticatedProductSurface(correlationId, async (application) => {
    const result = await application.home();
    return result.ok ? jsonResponse(result.value) : applicationErrorResponse(result.error, correlationId);
  }, resolver);
}

export async function GET(): Promise<Response> {
  return handleGET();
}
