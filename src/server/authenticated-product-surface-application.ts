import "server-only";
import type { AuthenticatedPrincipal } from "../application/auth/authenticated-principal";
import { ProductSurfaceApplication } from "../application/product-surfaces/application";
import { SLICE_1_RULES } from "../domain/simulator/engine";
import {
  ENGLAND_WALES_CALENDAR_METADATA,
  ENGLAND_WALES_WORKING_DAY_CALENDAR
} from "../fixtures/calendar/england-wales-bank-holidays";
import { SupabasePrincipalProvider } from "../infrastructure/auth/supabase-principal-provider";
import { requireActiveFutureYouAccount } from "../infrastructure/auth/supabase-account-activation";
import { SupabaseFinancialContextSource } from "../infrastructure/context/supabase-financial-context-source";
import { SupabaseWorkplaceAssociationSource } from "../infrastructure/context/supabase-workplace-association-source";
import { SupabaseEmployerBenefitSource } from "../infrastructure/context/supabase-employer-benefit-source";
import { SupabaseSimulationRunStore } from "../infrastructure/runs/supabase-simulation-run-store";
import { createRequestSupabaseClient } from "../infrastructure/supabase/server-client";
import { EMPTY_TAX_OPPORTUNITY_PROFILE_SOURCE } from "../application/ports/tax-opportunity-profile-source";
import { SARAH_V1_TAX_OPPORTUNITY_PROFILE_SOURCE } from "../fixtures/sarah-v1-tax-opportunity-profile";
import { SARAH_V1_GOAL_CONTRIBUTION_HISTORY_SOURCE } from "../fixtures/sarah-v1-goal-contribution-history";
import { EMPTY_GOAL_CONTRIBUTION_HISTORY_SOURCE } from "../application/ports/goal-contribution-history-source";
import { createSimulatorApplication } from "./simulator-application";
import { SARAH_DEMO_USER_ID, SARAH_STORY_MANIFEST } from "./sarah-story-contract";

export interface AuthenticatedProductSurfaceContext {
  readonly principal: AuthenticatedPrincipal;
  readonly currentContextVersionId: string | null;
  readonly application: ProductSurfaceApplication;
}

export type AuthenticatedProductSurfaceResolver = () => Promise<AuthenticatedProductSurfaceContext>;

export const resolveAuthenticatedProductSurfaceApplication: AuthenticatedProductSurfaceResolver = async () => {
  const client = await createRequestSupabaseClient();
  const principal = await new SupabasePrincipalProvider(client).requirePrincipal();
  await requireActiveFutureYouAccount(client, principal);
  const { data: profile, error: profileError } = await client
    .from("profiles")
    .select("display_name, is_demo, current_financial_context_version_id")
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
  const isCanonicalSarah = principal.userId === SARAH_DEMO_USER_ID
    && profile.is_demo;
  const isSarahStoryAvailable = isCanonicalSarah
    && profile.current_financial_context_version_id === SARAH_STORY_MANIFEST.requiredContextVersion;
  return {
    principal,
    currentContextVersionId: await contextSource.getCurrentContextVersionId(),
    application: new ProductSurfaceApplication({
      displayName: profile.display_name,
      sarahStoryAvailable: isSarahStoryAvailable,
      contextSource,
      workplaceSource: new SupabaseWorkplaceAssociationSource(client, principal),
      employerBenefitSource: new SupabaseEmployerBenefitSource(client, principal),
      taxOpportunityProfileSource: isCanonicalSarah
        ? SARAH_V1_TAX_OPPORTUNITY_PROFILE_SOURCE
        : EMPTY_TAX_OPPORTUNITY_PROFILE_SOURCE,
      goalContributionHistorySource: isCanonicalSarah
        ? SARAH_V1_GOAL_CONTRIBUTION_HISTORY_SOURCE
        : EMPTY_GOAL_CONTRIBUTION_HISTORY_SOURCE,
      simulator
    })
  };
};
