import { createClient } from "@supabase/supabase-js";
import WebSocket from "ws";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { AuthenticatedPrincipal } from "../../src/application/auth/authenticated-principal";
import { ProductSurfaceApplication } from "../../src/application/product-surfaces/application";
import { canonicalStringify } from "../../src/domain/shared/identity";
import { SLICE_1_RULES } from "../../src/domain/simulator/engine";
import {
  ENGLAND_WALES_CALENDAR_METADATA,
  ENGLAND_WALES_WORKING_DAY_CALENDAR
} from "../../src/fixtures/calendar/england-wales-bank-holidays";
import { SARAH_V1_CONTEXT } from "../../src/fixtures/sarah-v1";
import { SARAH_V1_TAX_OPPORTUNITY_PROFILE_SOURCE } from "../../src/fixtures/sarah-v1-tax-opportunity-profile";
import { SupabaseEmployerBenefitSource } from "../../src/infrastructure/context/supabase-employer-benefit-source";
import { SupabaseFinancialContextSource } from "../../src/infrastructure/context/supabase-financial-context-source";
import { SupabaseWorkplaceAssociationSource } from "../../src/infrastructure/context/supabase-workplace-association-source";
import { SupabaseSimulationRunStore } from "../../src/infrastructure/runs/supabase-simulation-run-store";
import type { Database } from "../../src/infrastructure/supabase/database.types";
import type { RequestSupabaseClient } from "../../src/infrastructure/supabase/server-client";
import { createSimulatorApplication } from "../../src/server/simulator-application";

const URL = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_PUBLISHABLE_KEY;
const SARAH_ID = "11111111-1111-4111-8111-111111111111";
const ALEX_ID = "22222222-2222-4222-8222-222222222222";
const ONIBANK_ID = "44444444-4444-4444-8444-444444444444";
const SARAH_PROVISION_ID = "55555555-5555-4555-8555-555555555559";

function client(): RequestSupabaseClient {
  if (!URL || !KEY) throw new Error("Local Supabase integration environment is not configured.");
  return createClient<Database>(URL, KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    realtime: { transport: WebSocket as never }
  }) as unknown as RequestSupabaseClient;
}

async function signIn(email: string, password: string) {
  const configured = client();
  const { data, error } = await configured.auth.signInWithPassword({ email, password });
  if (error || !data.user?.email) throw new Error("Local fixture sign-in failed.");
  return {
    client: configured,
    principal: { userId: data.user.id, email: data.user.email } satisfies AuthenticatedPrincipal,
    authEmail: data.user.email
  };
}

function surfaceApplication(
  configured: RequestSupabaseClient,
  principal: AuthenticatedPrincipal
) {
  const contextSource = new SupabaseFinancialContextSource(configured, principal);
  const simulator = createSimulatorApplication({
    contextSource,
    runStore: new SupabaseSimulationRunStore(configured, principal),
    rules: SLICE_1_RULES,
    calendar: ENGLAND_WALES_WORKING_DAY_CALENDAR,
    calendarMetadata: ENGLAND_WALES_CALENDAR_METADATA
  });
  return new ProductSurfaceApplication({
    displayName: "Sarah",
    sarahStoryAvailable: true,
    contextSource,
    workplaceSource: new SupabaseWorkplaceAssociationSource(configured, principal),
    employerBenefitSource: new SupabaseEmployerBenefitSource(configured, principal),
    taxOpportunityProfileSource: SARAH_V1_TAX_OPPORTUNITY_PROFILE_SOURCE,
    simulator
  });
}

describe("canonical Sarah employer and Benefits persistence", () => {
  let sarah: Awaited<ReturnType<typeof signIn>>;
  let alex: Awaited<ReturnType<typeof signIn>>;

  beforeAll(async () => {
    [sarah, alex] = await Promise.all([
      signIn("sarah@example.test", "Sarah-Local-Only-2026!"),
      signIn("alex@example.test", "Alex-Local-Only-2026!")
    ]);
  });

  afterAll(async () => {
    await Promise.all([sarah.client.auth.signOut(), alex.client.auth.signOut()]);
  });

  it("connects Sarah's existing personal identity to exactly one verified OniBank membership", async () => {
    expect(sarah.principal.userId).toBe(SARAH_ID);
    expect(sarah.authEmail).toBe("sarah@example.test");
    const membership = await sarah.client
      .from("employer_memberships")
      .select("user_id, employer_id, employer_display_name, provision_id, work_email_normalized, status, source")
      .eq("user_id", SARAH_ID);
    expect(membership.error).toBeNull();
    expect(membership.data).toEqual([{
      user_id: SARAH_ID,
      employer_id: ONIBANK_ID,
      employer_display_name: "OniBank",
      provision_id: SARAH_PROVISION_ID,
      work_email_normalized: "sarah.wonk@onibank.test",
      status: "ACTIVE",
      source: "employer_provisioned"
    }]);
    expect(await new SupabaseWorkplaceAssociationSource(sarah.client, sarah.principal).getWorkplace())
      .toEqual({ name: "OniBank", associationSource: "employer_provisioned", verificationStatus: "verified" });
  });

  it("reads two explicit, inert OniBank opportunities with Sarah-owned state", async () => {
    const opportunities = await new SupabaseEmployerBenefitSource(sarah.client, sarah.principal)
      .getOpportunities();
    expect(opportunities.map((opportunity) => opportunity.benefitKey).sort()).toEqual([
      "ADDITIONAL_PENSION_MATCH",
      "SEASON_TICKET_LOAN"
    ]);
    expect(opportunities.every((opportunity) =>
      opportunity.employerId === ONIBANK_ID
      && opportunity.employerName === "OniBank"
      && opportunity.offeringStatus === "AVAILABLE"
      && opportunity.referenceDate === "2026-08-31"
      && opportunity.numericalSimulationSupported === false
      && opportunity.furtherInformationRequired === true
      && opportunity.userState?.eligibilityStatus === "UNKNOWN"
      && opportunity.userState.uptakeStatus === "INACTIVE"
      && opportunity.userState.includedInFinancialBaseline === false
      && opportunity.userState.informationCompleteness === "INCOMPLETE"
    )).toBe(true);
  });

  it("composes Benefits and Home from authoritative records without creating a run", async () => {
    const before = await sarah.client
      .from("simulation_runs")
      .select("run_id", { count: "exact", head: true });
    const application = surfaceApplication(sarah.client, sarah.principal);
    const [home, benefits] = await Promise.all([application.home(), application.benefits()]);
    expect(home).toMatchObject({
      ok: true,
      value: {
        opportunityPreview: {
          kind: "authoritative",
          title: "Season-ticket loan",
          statusLabel: "Eligibility unknown",
          href: "/benefits#opportunity-season-ticket-loan"
        }
      }
    });
    expect(benefits).toMatchObject({
      ok: true,
      value: {
        workplace: { status: "verified", name: "OniBank", membershipStatusLabel: "Active membership" },
        activeFacts: [{ employeeContribution: "3%", employerContribution: "3%" }],
        opportunities: [
          { benefitKey: "ADDITIONAL_PENSION_MATCH", eligibility: "unknown", uptake: "inactive", includedInCurrentPlan: false },
          { benefitKey: "SEASON_TICKET_LOAN", eligibility: "unknown", uptake: "inactive", includedInCurrentPlan: false }
        ]
      }
    });
    const after = await sarah.client
      .from("simulation_runs")
      .select("run_id", { count: "exact", head: true });
    expect(after.count).toBe(before.count);
  });

  it("leaves Sarah's immutable financial context field-for-field unchanged", async () => {
    const source = new SupabaseFinancialContextSource(sarah.client, sarah.principal);
    const current = await source.getContextVersion(SARAH_V1_CONTEXT.version);
    expect(canonicalStringify(current)).toBe(canonicalStringify(SARAH_V1_CONTEXT));
  });

  it("keeps Sarah membership, offerings, and benefit state non-enumerable to Alex and anon", async () => {
    expect(alex.principal.userId).toBe(ALEX_ID);
    const [memberships, offerings, states, sourceOpportunities] = await Promise.all([
      alex.client.from("employer_memberships").select("user_id").eq("user_id", SARAH_ID),
      alex.client.from("employer_benefit_offerings").select("offering_id").eq("employer_id", ONIBANK_ID),
      alex.client.from("user_benefit_states").select("state_id").eq("user_id", SARAH_ID),
      new SupabaseEmployerBenefitSource(alex.client, alex.principal).getOpportunities()
    ]);
    expect(memberships.data).toEqual([]);
    expect(offerings.data).toEqual([]);
    expect(states.data).toEqual([]);
    expect(sourceOpportunities).toEqual([]);

    const anonymous = client();
    const [anonOfferings, anonStates] = await Promise.all([
      anonymous.from("employer_benefit_offerings").select("offering_id"),
      anonymous.from("user_benefit_states").select("state_id")
    ]);
    expect(anonOfferings.error).not.toBeNull();
    expect(anonStates.error).not.toBeNull();
  });
});
