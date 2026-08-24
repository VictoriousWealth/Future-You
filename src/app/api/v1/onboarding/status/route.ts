import { correlationIdFor } from "../../../../../application/use-cases/resolve-current-baseline";
import type { AuthenticatedOnboardingApplicationResolver } from "../../../../../server/authenticated-onboarding-application";
import { jsonResponse } from "../../../../../server/http/api-response";
import { withAuthenticatedOnboardingApplication } from "../../../../../server/http/authenticated-route-onboarding";

export const runtime = "nodejs";

export async function handleGET(
  resolver?: AuthenticatedOnboardingApplicationResolver
): Promise<Response> {
  const correlationId = correlationIdFor("onboarding-status", "current-user");
  return withAuthenticatedOnboardingApplication(
    correlationId,
    async (application) => jsonResponse(await application.getStatus.execute()),
    resolver
  );
}

export async function GET(): Promise<Response> {
  return handleGET();
}
