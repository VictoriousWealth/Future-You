import "server-only";
import { redirect } from "next/navigation";
import { AuthenticationBoundaryError } from "../infrastructure/auth/authentication-error";
import { AccountActivationRequiredError } from "../infrastructure/auth/account-activation-error";
import { SupabasePrincipalProvider } from "../infrastructure/auth/supabase-principal-provider";
import { requireActiveFutureYouAccount } from "../infrastructure/auth/supabase-account-activation";
import { createRequestSupabaseClient } from "../infrastructure/supabase/server-client";

export interface ProfilePageData {
  readonly displayName: string;
  readonly personalEmail: string | null;
}

export async function requireProfilePageData(path: "/profile" | "/profile/settings"): Promise<ProfilePageData> {
  try {
    const client = await createRequestSupabaseClient();
    const principal = await new SupabasePrincipalProvider(client).requirePrincipal();
    await requireActiveFutureYouAccount(client, principal);
    const { data: profile, error } = await client
      .from("profiles")
      .select("display_name, current_financial_context_version_id")
      .eq("user_id", principal.userId)
      .maybeSingle();

    if (error || !profile) throw new AuthenticationBoundaryError("AUTHENTICATION_INVALID");
    if (!profile.current_financial_context_version_id) redirect("/onboarding");

    return {
      displayName: profile.display_name,
      personalEmail: principal.email ?? null
    };
  } catch (error) {
    if (error instanceof AccountActivationRequiredError) redirect("/onboarding");
    if (error instanceof AuthenticationBoundaryError) {
      redirect(`/login?next=${encodeURIComponent(path)}`);
    }
    throw error;
  }
}
