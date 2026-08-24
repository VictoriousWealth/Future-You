import "server-only";
import {
  resolveAuthenticatedOnboardingApplication,
  type AuthenticatedOnboardingApplicationResolver
} from "../authenticated-onboarding-application";
import { AuthenticationBoundaryError } from "../../infrastructure/auth/authentication-error";
import { PersistenceBoundaryError } from "../../infrastructure/persistence/persistence-errors";
import { apiErrorResponse, internalSimulatorErrorResponse } from "./api-response";
import type { OnboardingApplication } from "../../application/onboarding/application";

export async function withAuthenticatedOnboardingApplication(
  correlationId: string,
  operation: (application: OnboardingApplication) => Promise<Response>,
  resolver: AuthenticatedOnboardingApplicationResolver = resolveAuthenticatedOnboardingApplication
): Promise<Response> {
  try {
    const context = await resolver();
    return await operation(context.application);
  } catch (error) {
    if (error instanceof AuthenticationBoundaryError) {
      return apiErrorResponse(401, error.code, error.message, correlationId);
    }
    if (error instanceof PersistenceBoundaryError) {
      return apiErrorResponse(
        error.category === "PERSISTENCE_FAILURE" ? 503 : 500,
        error.category,
        error.category === "PERSISTENCE_FAILURE"
          ? "Financial persistence is temporarily unavailable."
          : "Stored financial data could not be used safely.",
        correlationId,
        [],
        error.category === "PERSISTENCE_FAILURE"
      );
    }
    return internalSimulatorErrorResponse(correlationId);
  }
}
