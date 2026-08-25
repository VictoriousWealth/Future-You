import "server-only";
import { AuthenticationBoundaryError } from "../../infrastructure/auth/authentication-error";
import { AccountActivationRequiredError } from "../../infrastructure/auth/account-activation-error";
import { PersistenceBoundaryError } from "../../infrastructure/persistence/persistence-errors";
import {
  resolveAuthenticatedProductSurfaceApplication,
  type AuthenticatedProductSurfaceResolver
} from "../authenticated-product-surface-application";
import { apiErrorResponse } from "./api-response";

export async function withAuthenticatedProductSurface(
  correlationId: string,
  operation: (application: Awaited<ReturnType<AuthenticatedProductSurfaceResolver>>["application"]) => Promise<Response>,
  resolver: AuthenticatedProductSurfaceResolver = resolveAuthenticatedProductSurfaceApplication
): Promise<Response> {
  try {
    const context = await resolver();
    return await operation(context.application);
  } catch (error) {
    if (error instanceof AccountActivationRequiredError) {
      return apiErrorResponse(403, "ACCOUNT_ACTIVATION_REQUIRED", error.message, correlationId);
    }
    if (error instanceof AuthenticationBoundaryError) {
      return apiErrorResponse(401, error.code, error.message, correlationId);
    }
    if (error instanceof PersistenceBoundaryError) {
      return apiErrorResponse(
        error.category === "PERSISTENCE_FAILURE" ? 503 : 500,
        error.category,
        error.category === "PERSISTENCE_FAILURE"
          ? "Your product overview is temporarily unavailable."
          : "Stored product data could not be used safely.",
        correlationId,
        [],
        error.category === "PERSISTENCE_FAILURE"
      );
    }
    return apiErrorResponse(
      500,
      "INTERNAL_SIMULATOR_FAILURE",
      "Your product overview could not be loaded safely.",
      correlationId
    );
  }
}
