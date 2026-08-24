import { createClient } from "@supabase/supabase-js";
import { beforeAll, describe, expect, it } from "vitest";
import WebSocket from "ws";
import type { AuthenticatedPrincipal } from "../../src/application/auth/authenticated-principal";
import { ConversationApplication } from "../../src/application/conversation/application";
import { SLICE_1_RULES } from "../../src/domain/simulator/engine";
import {
  ENGLAND_WALES_CALENDAR_METADATA,
  ENGLAND_WALES_WORKING_DAY_CALENDAR
} from "../../src/fixtures/calendar/england-wales-bank-holidays";
import { FakeConversationModelProvider } from "../../src/infrastructure/ai/fake-conversation-model-provider";
import { SupabaseConversationRepository } from "../../src/infrastructure/conversations/supabase-conversation-repository";
import { SupabaseFinancialContextSource } from "../../src/infrastructure/context/supabase-financial-context-source";
import { SupabaseSimulationRunStore } from "../../src/infrastructure/runs/supabase-simulation-run-store";
import type { Database } from "../../src/infrastructure/supabase/database.types";
import type { RequestSupabaseClient } from "../../src/infrastructure/supabase/server-client";
import { createSimulatorApplication } from "../../src/server/simulator-application";

const URL = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_PUBLISHABLE_KEY;

function configuredClient(): RequestSupabaseClient {
  if (!URL || !KEY) throw new Error("Local Supabase integration environment is not configured.");
  return createClient<Database>(URL, KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    realtime: { transport: WebSocket as never }
  }) as unknown as RequestSupabaseClient;
}

async function signedIn(user: "sarah" | "alex") {
  const client = configuredClient();
  const credentials = user === "sarah"
    ? ["sarah@example.test", "Sarah-Local-Only-2026!"] as const
    : ["alex@example.test", "Alex-Local-Only-2026!"] as const;
  const { data, error } = await client.auth.signInWithPassword({ email: credentials[0], password: credentials[1] });
  if (error || !data.user) throw new Error("Local fixture sign-in failed.");
  return { client, principal: { userId: data.user.id, email: credentials[0] } satisfies AuthenticatedPrincipal };
}

function application(client: RequestSupabaseClient, principal: AuthenticatedPrincipal) {
  const contextSource = new SupabaseFinancialContextSource(client, principal);
  const simulator = createSimulatorApplication({
    contextSource,
    runStore: new SupabaseSimulationRunStore(client, principal),
    rules: SLICE_1_RULES,
    calendar: ENGLAND_WALES_WORKING_DAY_CALENDAR,
    calendarMetadata: ENGLAND_WALES_CALENDAR_METADATA
  });
  return new ConversationApplication({
    repository: new SupabaseConversationRepository(client, principal),
    contextSource,
    simulator,
    provider: new FakeConversationModelProvider(),
    providerIdentifier: "fake",
    modelIdentifier: "fake-conversation/1.0.0",
    now: () => new Date("2026-08-24T12:00:00.000Z")
  });
}

describe("Supabase conversation persistence", () => {
  let sarah: Awaited<ReturnType<typeof signedIn>>;
  let alex: Awaited<ReturnType<typeof signedIn>>;

  beforeAll(async () => {
    [sarah, alex] = await Promise.all([signedIn("sarah"), signedIn("alex")]);
  });

  it("survives application recreation with immutable run references and stable ordering", async () => {
    const firstApplication = application(sarah.client, sarah.principal);
    const created = await firstApplication.create({ requestId: "integration_conversation_create" });
    const turn = await firstApplication.send(created.conversation.id, {
      requestId: "integration_conversation_turn",
      message: "Can I afford a £650 trip next month?"
    });
    const runId = turn.conversation.selectedResult!.calculation.runId;

    const recreated = application(sarah.client, sarah.principal);
    const reloaded = await recreated.get(created.conversation.id);
    expect(reloaded.messages.map((message) => message.sequence)).toEqual(["1", "2"]);
    expect(reloaded.messages[1]).toMatchObject({ kind: "ASSISTANT_RESULT", runId });
    expect(reloaded.selectedResult?.presentation.immediateImpact.safetyBufferAfter).toBe("£250");

    const exactRetry = await recreated.send(created.conversation.id, {
      requestId: "integration_conversation_turn",
      message: "Can I afford a £650 trip next month?"
    });
    expect(exactRetry.conversation.messages).toHaveLength(2);
    expect(exactRetry.conversation.scenarios).toHaveLength(1);
  });

  it("keeps foreign conversation IDs non-enumerable through the RLS-backed adapter", async () => {
    const sarahApplication = application(sarah.client, sarah.principal);
    const created = await sarahApplication.create({ requestId: "integration_private_conversation" });
    const alexApplication = application(alex.client, alex.principal);
    await expect(alexApplication.get(created.conversation.id)).rejects.toMatchObject({
      code: "CONVERSATION_NOT_FOUND"
    });
    const foreign = await new SupabaseConversationRepository(alex.client, alex.principal).get(created.conversation.id);
    expect(foreign).toBeNull();
  });
});
