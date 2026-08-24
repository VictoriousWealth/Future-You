import "server-only";
import type { AuthenticatedPrincipal } from "../application/auth/authenticated-principal";
import {
  createOnboardingApplication,
  type OnboardingApplication
} from "../application/onboarding/application";
import { SLICE_1_RULES } from "../domain/simulator/engine";
import {
  ENGLAND_WALES_CALENDAR_METADATA,
  ENGLAND_WALES_WORKING_DAY_CALENDAR
} from "../fixtures/calendar/england-wales-bank-holidays";
import { SupabasePrincipalProvider } from "../infrastructure/auth/supabase-principal-provider";
import { SupabaseFinancialContextSource } from "../infrastructure/context/supabase-financial-context-source";
import { SupabaseFinancialContextVersionRepository } from "../infrastructure/context/supabase-financial-context-version-repository";
import { createRequestSupabaseClient } from "../infrastructure/supabase/server-client";

export interface AuthenticatedOnboardingApplicationContext {
  readonly principal: AuthenticatedPrincipal;
  readonly application: OnboardingApplication;
}

export type AuthenticatedOnboardingApplicationResolver =
  () => Promise<AuthenticatedOnboardingApplicationContext>;

export const resolveAuthenticatedOnboardingApplication: AuthenticatedOnboardingApplicationResolver =
  async () => {
    const client = await createRequestSupabaseClient();
    const principal = await new SupabasePrincipalProvider(client).requirePrincipal();
    const contextSource = new SupabaseFinancialContextSource(client, principal);
    const versionRepository = new SupabaseFinancialContextVersionRepository(client, principal);
    return {
      principal,
      application: createOnboardingApplication({
        contextSource,
        versionRepository,
        rules: SLICE_1_RULES,
        calendar: ENGLAND_WALES_WORKING_DAY_CALENDAR,
        calendarMetadata: ENGLAND_WALES_CALENDAR_METADATA
      })
    };
  };
