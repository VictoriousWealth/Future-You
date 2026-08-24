import { parseConfirmFinancialContextRequest } from "../../../../../../application/onboarding/validation";
import { correlationIdFor } from "../../../../../../application/use-cases/resolve-current-baseline";
import type { AuthenticatedOnboardingApplicationResolver } from "../../../../../../server/authenticated-onboarding-application";
import {
  apiErrorResponse,
  jsonResponse,
  readJsonBody
} from "../../../../../../server/http/api-response";
import { withAuthenticatedOnboardingApplication } from "../../../../../../server/http/authenticated-route-onboarding";
import {
  onboardingOperationErrorResponse,
  onboardingValidationCode
} from "../../../../../../server/http/onboarding-response";
import { sameOriginMutationError } from "../../../../../../server/http/same-origin";

export const runtime = "nodejs";

export async function handleGET(
  resolver?: AuthenticatedOnboardingApplicationResolver
): Promise<Response> {
  const correlationId = correlationIdFor("get-financial-context-correction", "current");
  return withAuthenticatedOnboardingApplication(
    correlationId,
    async (application) => {
      const result = await application.getCorrectionDraft.execute();
      return result.ok
        ? jsonResponse(result.value)
        : onboardingOperationErrorResponse(result.error, correlationId);
    },
    resolver
  );
}

export async function handlePOST(
  request: Request,
  resolver?: AuthenticatedOnboardingApplicationResolver
): Promise<Response> {
  const correlationId = correlationIdFor("revise-financial-context", "candidate");
  const originError = sameOriginMutationError(request, correlationId);
  if (originError) return originError;
  return withAuthenticatedOnboardingApplication(
    correlationId,
    async (application) => {
      const body = await readJsonBody(request);
      if (!body.ok) {
        return apiErrorResponse(400, "INVALID_JSON", "Request body must be valid JSON.", correlationId);
      }
      const parsed = parseConfirmFinancialContextRequest(body.value);
      if (!parsed.ok) {
        return apiErrorResponse(
          400,
          onboardingValidationCode(parsed.issues),
          "Review the highlighted correction fields.",
          correlationId,
          parsed.issues
        );
      }
      if (parsed.value.mode !== "revision") {
        return apiErrorResponse(
          400,
          "ONBOARDING_INPUT_INVALID",
          "This endpoint only accepts revisions.",
          correlationId
        );
      }
      const result = await application.confirm.execute(parsed.value);
      return result.ok
        ? jsonResponse(result.value, result.value.created ? 201 : 200)
        : onboardingOperationErrorResponse(result.error, correlationId);
    },
    resolver
  );
}

export async function POST(request: Request): Promise<Response> {
  return handlePOST(request);
}

export async function GET(): Promise<Response> {
  return handleGET();
}
