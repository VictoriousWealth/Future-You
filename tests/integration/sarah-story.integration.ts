import { createClient } from "@supabase/supabase-js";
import WebSocket from "ws";
import { beforeAll, describe, expect, it } from "vitest";
import type { AuthenticatedPrincipal } from "../../src/application/auth/authenticated-principal";
import { SarahStoryApplication } from "../../src/application/story/application";
import { SLICE_1_RULES } from "../../src/domain/simulator/engine";
import {
  ENGLAND_WALES_CALENDAR_METADATA,
  ENGLAND_WALES_WORKING_DAY_CALENDAR
} from "../../src/fixtures/calendar/england-wales-bank-holidays";
import { SupabaseFinancialContextSource } from "../../src/infrastructure/context/supabase-financial-context-source";
import { SupabaseEmployerBenefitSource } from "../../src/infrastructure/context/supabase-employer-benefit-source";
import { SupabaseSimulationRunStore } from "../../src/infrastructure/runs/supabase-simulation-run-store";
import type { Database } from "../../src/infrastructure/supabase/database.types";
import type { RequestSupabaseClient } from "../../src/infrastructure/supabase/server-client";
import { SARAH_STORY_MANIFEST } from "../../src/server/sarah-story-contract";
import { createSimulatorApplication } from "../../src/server/simulator-application";

const URL = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_PUBLISHABLE_KEY;

function client(): RequestSupabaseClient {
  if (!URL || !KEY) throw new Error("Local Supabase integration environment is not configured.");
  return createClient<Database>(URL, KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    realtime: { transport: WebSocket as never }
  }) as unknown as RequestSupabaseClient;
}

async function signIn(user: "sarah" | "alex") {
  const configured = client();
  const credentials = user === "sarah"
    ? ["sarah@example.test", "Sarah-Local-Only-2026!"] as const
    : ["alex@example.test", "Alex-Local-Only-2026!"] as const;
  const { data, error } = await configured.auth.signInWithPassword({ email: credentials[0], password: credentials[1] });
  if (error || !data.user) throw new Error("Local fixture sign-in failed.");
  return {
    client: configured,
    principal: { userId: data.user.id, email: credentials[0] } satisfies AuthenticatedPrincipal
  };
}

function storyApplication(configured: RequestSupabaseClient, principal: AuthenticatedPrincipal) {
  const contextSource = new SupabaseFinancialContextSource(configured, principal);
  const simulator = createSimulatorApplication({
    contextSource,
    runStore: new SupabaseSimulationRunStore(configured, principal),
    rules: SLICE_1_RULES,
    calendar: ENGLAND_WALES_WORKING_DAY_CALENDAR,
    calendarMetadata: ENGLAND_WALES_CALENDAR_METADATA
  });
  return new SarahStoryApplication({
    manifest: SARAH_STORY_MANIFEST,
    opportunityReader: new SupabaseEmployerBenefitSource(configured, principal),
    runReader: simulator.getSimulationRun
  });
}

describe("Track B1 Sarah story persisted-run authority", () => {
  let sarah: Awaited<ReturnType<typeof signIn>>;
  let alex: Awaited<ReturnType<typeof signIn>>;

  beforeAll(async () => {
    [sarah, alex] = await Promise.all([signIn("sarah"), signIn("alex")]);
  });

  it("reads the four pre-created immutable Sarah runs without creating another run", async () => {
    const before = await sarah.client
      .from("simulation_runs")
      .select("run_id", { count: "exact", head: true })
      .in("run_id", Object.values(SARAH_STORY_MANIFEST.requiredRuns).map((run) => run.runId));
    expect(before.error).toBeNull();
    expect(before.count).toBe(4);

    const result = await storyApplication(sarah.client, sarah.principal).load();
    expect(result).toMatchObject({
      kind: "ready",
      story: {
        scenarios: {
          TRIP_650_SEPTEMBER: { safetyBufferAfter: "£250" },
          TRIP_500_SEPTEMBER: { safetyBufferAfter: "£400" },
          TRIP_400_SEPTEMBER: { safetyBufferAfter: "£500" },
          TRIP_650_OCTOBER: { safetyBufferAfter: "£250" }
        }
      }
    });
    const after = await sarah.client
      .from("simulation_runs")
      .select("run_id", { count: "exact", head: true })
      .in("run_id", Object.values(SARAH_STORY_MANIFEST.requiredRuns).map((run) => run.runId));
    expect(after.count).toBe(4);
  });

  it("keeps Sarah run IDs non-enumerable to Alex and anon through RLS", async () => {
    const runId = SARAH_STORY_MANIFEST.requiredRuns.TRIP_650_SEPTEMBER.runId;
    expect(await new SupabaseSimulationRunStore(alex.client, alex.principal).get(runId)).toBeNull();
    const alexStory = await storyApplication(alex.client, alex.principal).load();
    expect(alexStory).toMatchObject({ kind: "unavailable" });

    const anonymous = client();
    const fakePrincipal = { userId: "11111111-1111-4111-8111-111111111111" };
    await expect(new SupabaseSimulationRunStore(anonymous, fakePrincipal).get(runId)).rejects.toMatchObject({
      category: "PERSISTENCE_FAILURE"
    });
    const anonymousStory = await storyApplication(anonymous, fakePrincipal).load();
    expect(anonymousStory).toMatchObject({ kind: "unavailable" });
  });
});
