import "server-only";
import { redirect } from "next/navigation";
import {
  buildFinancialContextSummary,
  type FinancialContextSummary
} from "../application/profile/financial-context-summary";
import { AuthenticationBoundaryError } from "../infrastructure/auth/authentication-error";
import { AccountActivationRequiredError } from "../infrastructure/auth/account-activation-error";
import { SupabasePrincipalProvider } from "../infrastructure/auth/supabase-principal-provider";
import { requireActiveFutureYouAccount } from "../infrastructure/auth/supabase-account-activation";
import { SupabaseFinancialContextSource } from "../infrastructure/context/supabase-financial-context-source";
import { SupabaseWorkplaceAssociationSource } from "../infrastructure/context/supabase-workplace-association-source";
import { createRequestSupabaseClient } from "../infrastructure/supabase/server-client";

export interface FinancialContextSummaryPageData {
  readonly displayName: string;
  readonly personalEmail: string | null;
  readonly summary: FinancialContextSummary;
}

export async function requireFinancialContextSummaryPageData(): Promise<FinancialContextSummaryPageData> {
  try {
    const client = await createRequestSupabaseClient();
    const principal = await new SupabasePrincipalProvider(client).requirePrincipal();
    await requireActiveFutureYouAccount(client, principal);

    const { data: profile, error: profileError } = await client
      .from("profiles")
      .select("display_name")
      .eq("user_id", principal.userId)
      .maybeSingle();
    if (profileError || !profile) throw new AuthenticationBoundaryError("AUTHENTICATION_INVALID");

    const contextSource = new SupabaseFinancialContextSource(client, principal);
    const currentVersionId = await contextSource.getCurrentContextVersionId();
    if (!currentVersionId) redirect("/onboarding");
    const context = await contextSource.getContextVersion(currentVersionId);
    if (!context) throw new Error("The current financial context could not be loaded.");

    const workplace = await new SupabaseWorkplaceAssociationSource(client, principal).getWorkplace();
    return {
      displayName: profile.display_name,
      personalEmail: principal.email ?? null,
      summary: buildFinancialContextSummary(context, workplace)
    };
  } catch (error) {
    if (error instanceof AccountActivationRequiredError) redirect("/onboarding");
    if (error instanceof AuthenticationBoundaryError) {
      redirect("/login?next=%2Fprofile%2Ffinancial-context");
    }
    throw error;
  }
}
