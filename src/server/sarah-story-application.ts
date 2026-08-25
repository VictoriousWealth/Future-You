import "server-only";
import type { SarahStoryLoadResult } from "../application/story/contracts";
import { SarahStoryApplication } from "../application/story/application";
import { SLICE_1_RULES } from "../domain/simulator/engine";
import {
  ENGLAND_WALES_CALENDAR_METADATA,
  ENGLAND_WALES_WORKING_DAY_CALENDAR
} from "../fixtures/calendar/england-wales-bank-holidays";
import { SupabasePrincipalProvider } from "../infrastructure/auth/supabase-principal-provider";
import { requireActiveFutureYouAccount } from "../infrastructure/auth/supabase-account-activation";
import { SupabaseFinancialContextSource } from "../infrastructure/context/supabase-financial-context-source";
import { SupabaseSimulationRunStore } from "../infrastructure/runs/supabase-simulation-run-store";
import { createRequestSupabaseClient } from "../infrastructure/supabase/server-client";
import { createSimulatorApplication } from "./simulator-application";
import { SARAH_DEMO_USER_ID, SARAH_STORY_MANIFEST } from "./sarah-story-contract";

export class SarahStoryAccessUnavailableError extends Error {
  constructor() {
    super("The requested resource is unavailable.");
    this.name = "SarahStoryAccessUnavailableError";
  }
}

export interface SarahStoryResolution {
  readonly result: SarahStoryLoadResult;
}

export type SarahStoryResolver = () => Promise<SarahStoryResolution>;

export function isSarahStoryAuthorised(input: Readonly<{
  readonly userId: string;
  readonly isDemo: boolean;
  readonly currentContextVersionId: string | null;
}>): boolean {
  return input.userId === SARAH_DEMO_USER_ID
    && input.isDemo
    && input.currentContextVersionId === SARAH_STORY_MANIFEST.requiredContextVersion;
}

export const resolveSarahStory: SarahStoryResolver = async () => {
  const client = await createRequestSupabaseClient();
  const principal = await new SupabasePrincipalProvider(client).requirePrincipal();
  await requireActiveFutureYouAccount(client, principal);
  const { data: profile, error } = await client
    .from("profiles")
    .select("is_demo, current_financial_context_version_id")
    .eq("user_id", principal.userId)
    .maybeSingle();
  if (
    error
    || !profile
    || !isSarahStoryAuthorised({
      userId: principal.userId,
      isDemo: profile.is_demo,
      currentContextVersionId: profile.current_financial_context_version_id
    })
  ) throw new SarahStoryAccessUnavailableError();

  const contextSource = new SupabaseFinancialContextSource(client, principal);
  const simulator = createSimulatorApplication({
    contextSource,
    rules: SLICE_1_RULES,
    calendar: ENGLAND_WALES_WORKING_DAY_CALENDAR,
    calendarMetadata: ENGLAND_WALES_CALENDAR_METADATA,
    runStore: new SupabaseSimulationRunStore(client, principal)
  });
  const application = new SarahStoryApplication({
    runReader: simulator.getSimulationRun,
    manifest: SARAH_STORY_MANIFEST
  });
  return { result: await application.load() };
};
