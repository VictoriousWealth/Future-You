import "server-only";
import type { SimulatorApplication } from "../simulator-application";
import {
  resolveAuthenticatedApplication,
  type AuthenticatedApplicationResolver
} from "../authenticated-application";
import { AuthenticationBoundaryError } from "../../infrastructure/auth/authentication-error";
import { PersistenceBoundaryError } from "../../infrastructure/persistence/persistence-errors";
import { apiErrorResponse, internalSimulatorErrorResponse } from "./api-response";

export async function withAuthenticatedApplication(
  correlationId: string,
  operation: (application: SimulatorApplication) => Promise<Response>,
  resolver: AuthenticatedApplicationResolver = resolveAuthenticatedApplication
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
