import "server-only";
import type { AuthenticatedPrincipal } from "../../application/auth/authenticated-principal";
import type { RequestSupabaseClient } from "../supabase/server-client";
import { AuthenticationBoundaryError } from "./authentication-error";
import { AccountActivationRequiredError } from "./account-activation-error";

export async function requireActiveFutureYouAccount(
  client: RequestSupabaseClient,
  principal: AuthenticatedPrincipal
): Promise<void> {
  const { data, error } = await client
    .from("profiles")
    .select("account_activation_state")
    .eq("user_id", principal.userId)
    .maybeSingle();
  if (error || !data) {
    throw new AuthenticationBoundaryError("AUTHENTICATION_INVALID");
  }
  if (data.account_activation_state !== "ACTIVE") throw new AccountActivationRequiredError();
}
