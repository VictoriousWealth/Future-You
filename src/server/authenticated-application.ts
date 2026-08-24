import "server-only";
import type { AuthenticatedPrincipal } from "../application/auth/authenticated-principal";
import { SLICE_1_RULES } from "../domain/simulator/engine";
import {
  ENGLAND_WALES_CALENDAR_METADATA,
  ENGLAND_WALES_WORKING_DAY_CALENDAR
} from "../fixtures/calendar/england-wales-bank-holidays";
import { SupabasePrincipalProvider } from "../infrastructure/auth/supabase-principal-provider";
import { SupabaseFinancialContextSource } from "../infrastructure/context/supabase-financial-context-source";
import { SupabaseSimulationRunStore } from "../infrastructure/runs/supabase-simulation-run-store";
import { createRequestSupabaseClient } from "../infrastructure/supabase/server-client";
import { createSimulatorApplication, type SimulatorApplication } from "./simulator-application";

export interface AuthenticatedApplicationContext {
  readonly principal: AuthenticatedPrincipal;
  readonly application: SimulatorApplication;
}

export type AuthenticatedApplicationResolver = () => Promise<AuthenticatedApplicationContext>;

export const resolveAuthenticatedApplication: AuthenticatedApplicationResolver = async () => {
  const client = await createRequestSupabaseClient();
  const principal = await new SupabasePrincipalProvider(client).requirePrincipal();
  const dependencies = Object.freeze({
    contextSource: new SupabaseFinancialContextSource(client, principal),
    rules: SLICE_1_RULES,
    calendar: ENGLAND_WALES_WORKING_DAY_CALENDAR,
    calendarMetadata: ENGLAND_WALES_CALENDAR_METADATA,
    runStore: new SupabaseSimulationRunStore(client, principal)
  });
  return {
    principal,
    application: createSimulatorApplication(dependencies)
  };
};
