import "server-only";
import type { AuthenticatedPrincipal } from "../application/auth/authenticated-principal";
import { ProductSurfaceApplication } from "../application/product-surfaces/application";
import { SLICE_1_RULES } from "../domain/simulator/engine";
import {
  ENGLAND_WALES_CALENDAR_METADATA,
  ENGLAND_WALES_WORKING_DAY_CALENDAR
} from "../fixtures/calendar/england-wales-bank-holidays";
import { SupabasePrincipalProvider } from "../infrastructure/auth/supabase-principal-provider";
import { SupabaseFinancialContextSource } from "../infrastructure/context/supabase-financial-context-source";
import { SupabaseWorkplaceAssociationSource } from "../infrastructure/context/supabase-workplace-association-source";
import { SupabaseSimulationRunStore } from "../infrastructure/runs/supabase-simulation-run-store";
import { createRequestSupabaseClient } from "../infrastructure/supabase/server-client";
import { createSimulatorApplication } from "./simulator-application";

export interface AuthenticatedProductSurfaceContext {
  readonly principal: AuthenticatedPrincipal;
  readonly currentContextVersionId: string | null;
  readonly application: ProductSurfaceApplication;
}

export type AuthenticatedProductSurfaceResolver = () => Promise<AuthenticatedProductSurfaceContext>;

export const resolveAuthenticatedProductSurfaceApplication: AuthenticatedProductSurfaceResolver = async () => {
  const client = await createRequestSupabaseClient();
  const principal = await new SupabasePrincipalProvider(client).requirePrincipal();
  const { data: profile, error: profileError } = await client
    .from("profiles")
    .select("display_name")
    .eq("user_id", principal.userId)
    .maybeSingle();
  if (profileError || !profile) throw new Error("The authenticated profile could not be loaded.");
  const contextSource = new SupabaseFinancialContextSource(client, principal);
  const runStore = new SupabaseSimulationRunStore(client, principal);
  const simulator = createSimulatorApplication({
    contextSource,
    rules: SLICE_1_RULES,
    calendar: ENGLAND_WALES_WORKING_DAY_CALENDAR,
    calendarMetadata: ENGLAND_WALES_CALENDAR_METADATA,
    runStore
  });
  return {
    principal,
    currentContextVersionId: await contextSource.getCurrentContextVersionId(),
    application: new ProductSurfaceApplication({
      displayName: profile.display_name,
      contextSource,
      workplaceSource: new SupabaseWorkplaceAssociationSource(client, principal),
      simulator
    })
  };
};
