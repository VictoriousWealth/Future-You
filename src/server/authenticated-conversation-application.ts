import "server-only";
import { ConversationApplication } from "../application/conversation/application";
import type { AuthenticatedPrincipal } from "../application/auth/authenticated-principal";
import { SLICE_1_RULES } from "../domain/simulator/engine";
import {
  ENGLAND_WALES_CALENDAR_METADATA,
  ENGLAND_WALES_WORKING_DAY_CALENDAR
} from "../fixtures/calendar/england-wales-bank-holidays";
import { SupabasePrincipalProvider } from "../infrastructure/auth/supabase-principal-provider";
import { SupabaseFinancialContextSource } from "../infrastructure/context/supabase-financial-context-source";
import { SupabaseConversationRepository } from "../infrastructure/conversations/supabase-conversation-repository";
import { resolveConversationProvider, userScopedProviderAllowance } from "../infrastructure/ai/provider-configuration";
import { SupabaseSimulationRunStore } from "../infrastructure/runs/supabase-simulation-run-store";
import { createRequestSupabaseClient } from "../infrastructure/supabase/server-client";
import { createSimulatorApplication } from "./simulator-application";

export interface AuthenticatedConversationApplicationContext {
  readonly principal: AuthenticatedPrincipal;
  readonly displayName: string;
  readonly currentContextVersionId: string | null;
  readonly application: ConversationApplication;
}

export type AuthenticatedConversationApplicationResolver =
  () => Promise<AuthenticatedConversationApplicationContext>;

export const resolveAuthenticatedConversationApplication: AuthenticatedConversationApplicationResolver = async () => {
  const client = await createRequestSupabaseClient();
  const principal = await new SupabasePrincipalProvider(client).requirePrincipal();
  const { data: profile, error: profileError } = await client
    .from("profiles")
    .select("display_name")
    .eq("user_id", principal.userId)
    .maybeSingle();
  if (profileError || !profile) throw new Error("The authenticated profile could not be loaded.");
  const contextSource = new SupabaseFinancialContextSource(client, principal);
  const currentContextVersionId = await contextSource.getCurrentContextVersionId();
  const simulator = createSimulatorApplication({
    contextSource,
    rules: SLICE_1_RULES,
    calendar: ENGLAND_WALES_WORKING_DAY_CALENDAR,
    calendarMetadata: ENGLAND_WALES_CALENDAR_METADATA,
    runStore: new SupabaseSimulationRunStore(client, principal)
  });
  const resolvedProvider = resolveConversationProvider();
  return {
    principal,
    displayName: profile.display_name,
    currentContextVersionId,
    application: new ConversationApplication({
      repository: new SupabaseConversationRepository(client, principal),
      contextSource,
      simulator,
      provider: resolvedProvider.provider,
      providerIdentifier: resolvedProvider.providerIdentifier,
      modelIdentifier: resolvedProvider.modelIdentifier,
      consumeProviderAllowance: () => userScopedProviderAllowance(principal.userId)
    })
  };
};
