import "server-only";
import type {
  AuthenticatedPrincipal,
  AuthenticatedPrincipalProvider
} from "../../application/auth/authenticated-principal";
import type { RequestSupabaseClient } from "../supabase/server-client";
import { AuthenticationBoundaryError } from "./authentication-error";

export class SupabasePrincipalProvider implements AuthenticatedPrincipalProvider {
  constructor(private readonly client: RequestSupabaseClient) {}

  async requirePrincipal(): Promise<AuthenticatedPrincipal> {
    const { data, error } = await this.client.auth.getClaims();
    if (error) {
      throw new AuthenticationBoundaryError(
        error.name === "AuthSessionMissingError"
          ? "AUTHENTICATION_REQUIRED"
          : "AUTHENTICATION_INVALID"
      );
    }
    const claims = data?.claims;
    const subject = claims?.sub;
    if (!claims || typeof subject !== "string" || subject.length === 0) {
      throw new AuthenticationBoundaryError("AUTHENTICATION_REQUIRED");
    }
    const email = claims.email;
    const assuranceLevel = claims.aal;
    return {
      userId: subject,
      ...(typeof email === "string" ? { email } : {}),
      ...(typeof assuranceLevel === "string" ? { assuranceLevel } : {})
    };
  }
}
