import { parsePreviewFinancialContextRequest } from "../../../../../application/onboarding/validation";
import { correlationIdFor } from "../../../../../application/use-cases/resolve-current-baseline";
import type { AuthenticatedOnboardingApplicationResolver } from "../../../../../server/authenticated-onboarding-application";
import {
  apiErrorResponse,
  jsonResponse,
  readJsonBody
} from "../../../../../server/http/api-response";
import { withAuthenticatedOnboardingApplication } from "../../../../../server/http/authenticated-route-onboarding";
import {
  onboardingOperationErrorResponse,
  onboardingValidationCode
} from "../../../../../server/http/onboarding-response";
import { sameOriginMutationError } from "../../../../../server/http/same-origin";

export const runtime = "nodejs";

export async function handlePOST(
  request: Request,
  resolver?: AuthenticatedOnboardingApplicationResolver
): Promise<Response> {
  const correlationId = correlationIdFor("preview-financial-context", "candidate");
  const originError = sameOriginMutationError(request, correlationId);
  if (originError) return originError;
  return withAuthenticatedOnboardingApplication(
    correlationId,
    async (application) => {
      const body = await readJsonBody(request);
      if (!body.ok) {
        return apiErrorResponse(400, "INVALID_JSON", "Request body must be valid JSON.", correlationId);
      }
      const parsed = parsePreviewFinancialContextRequest(body.value);
      if (!parsed.ok) {
        return apiErrorResponse(
          400,
          onboardingValidationCode(parsed.issues),
          "Review the highlighted onboarding fields.",
          correlationId,
          parsed.issues
        );
      }
      const result = application.preview.execute(parsed.value);
      return result.ok
        ? jsonResponse(result.value)
        : onboardingOperationErrorResponse(result.error, correlationId);
    },
    resolver
  );
}

export async function POST(request: Request): Promise<Response> {
  return handlePOST(request);
}
