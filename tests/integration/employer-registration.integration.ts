import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import WebSocket from "ws";
import { afterAll, describe, expect, it } from "vitest";
import { RegistrationApplication } from "../../src/application/registration/application";
import { createOnboardingApplication } from "../../src/application/onboarding/application";
import type { AuthenticatedPrincipal } from "../../src/application/auth/authenticated-principal";
import type { RegistrationMail, RegistrationMailerPort } from "../../src/application/registration/ports";
import { SLICE_1_RULES } from "../../src/domain/simulator/engine";
import { ENGLAND_WALES_CALENDAR_METADATA, ENGLAND_WALES_WORKING_DAY_CALENDAR } from "../../src/fixtures/calendar/england-wales-bank-holidays";
import { SARAH_V1_CONTEXT, SARAH_V1_EXPECTED } from "../../src/fixtures/sarah-v1";
import { SARAH_V1_ONBOARDING_DRAFT } from "../../src/fixtures/sarah-v1-onboarding";
import { NodeRegistrationSecurity } from "../../src/infrastructure/registration/node-registration-security";
import { SupabaseRegistrationIdentity, SupabaseRequestPersonalEmailVerifier } from "../../src/infrastructure/registration/supabase-registration-identity";
import { SupabaseRegistrationPersistence } from "../../src/infrastructure/registration/supabase-registration-persistence";
import { SupabaseFinancialContextSource } from "../../src/infrastructure/context/supabase-financial-context-source";
import { SupabaseFinancialContextVersionRepository } from "../../src/infrastructure/context/supabase-financial-context-version-repository";
import { SupabaseSimulationRunStore } from "../../src/infrastructure/runs/supabase-simulation-run-store";
import type { Database } from "../../src/infrastructure/supabase/database.types";
import type { RequestSupabaseClient } from "../../src/infrastructure/supabase/server-client";
import { createSimulatorApplication } from "../../src/server/simulator-application";

const URL = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_PUBLISHABLE_KEY;
const PERSONAL_EMAIL = "track-a-personal@example.test";
const PERSONAL_PASSWORD = "Track-A-Personal-Login-2026!";

function localAdministrativeKey(): string {
  const output = execFileSync("supabase", ["status", "-o", "env"], { encoding: "utf8" });
  const line = output.split("\n").find((item) => item.startsWith("SERVICE_ROLE_KEY="));
  if (!line) throw new Error("The local registration administration key is unavailable.");
  return line.slice(line.indexOf("=") + 1).replace(/^"|"$/g, "");
}

class Mailbox implements RegistrationMailerPort {
  readonly messages: RegistrationMail[] = [];
  async send(message: RegistrationMail) { this.messages.push(message); }
  code(purpose: RegistrationMail["purpose"]): string {
    let message: RegistrationMail | undefined;
    for (let index = this.messages.length - 1; index >= 0; index -= 1) {
      if (this.messages[index]?.purpose === purpose) {
        message = this.messages[index];
        break;
      }
    }
    if (!message) throw new Error(`Missing ${purpose} test mail.`);
    return message.code;
  }
}

function publicClient(): RequestSupabaseClient {
  if (!URL || !KEY) throw new Error("Local Supabase integration environment is not configured.");
  return createClient<Database>(URL, KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    realtime: { transport: WebSocket as never }
  }) as unknown as RequestSupabaseClient;
}

describe("employer-provisioned registration with local Supabase Auth", () => {
  const clients: RequestSupabaseClient[] = [];

  afterAll(async () => {
    await Promise.all(clients.map((client) => client.auth.signOut()));
  });

  it("activates one employer-provisioned identity, confirms onboarding, and preserves simulator authority", async () => {
    if (!URL) throw new Error("SUPABASE_URL is unavailable.");
    const admin = createClient<Database>(URL, localAdministrativeKey(), {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      realtime: { transport: WebSocket as never }
    });
    const verificationClient = publicClient();
    clients.push(verificationClient);
    const mailbox = new Mailbox();
    const persistence = new SupabaseRegistrationPersistence(admin as never);
    const security = new NodeRegistrationSecurity(
      "integration-code-pepper-2026-at-least-32-characters",
      "integration-fingerprint-pepper-2026-at-least-32-characters"
    );
    const application = new RegistrationApplication({
      persistence,
      security,
      mailer: mailbox,
      identity: new SupabaseRegistrationIdentity(admin as never),
      verifyPersonalEmail: new SupabaseRequestPersonalEmailVerifier(admin as never, verificationClient)
    });

    const attempt = await application.begin({
      companyId: "FY-7K3M-9Q2D",
      workEmail: "integration@onibank.example.test",
      requestId: "track-a-integration-begin"
    });
    expect(attempt).toMatchObject({ accepted: true, nextStep: "VERIFY_WORK_EMAIL" });
    expect(mailbox.messages).toHaveLength(1);

    const workVerification = await application.verifyWorkCode(attempt.registrationId, {
      code: mailbox.code("WORK_CODE"),
      requestId: "track-a-integration-work-code"
    });
    expect(workVerification.dto.verified).toBe(true);

    const account = await application.createPersonalAccount(
      attempt.registrationId,
      workVerification.activationToken,
      {
        personalEmail: PERSONAL_EMAIL,
        displayName: "Track A Member",
        password: PERSONAL_PASSWORD,
        passwordConfirmation: PERSONAL_PASSWORD,
        requestId: "track-a-integration-account"
      }
    );
    expect(account.dto.accepted).toBe(true);
    expect(mailbox.messages).toHaveLength(2);

    const beforeConfirmation = publicClient();
    const beforeLogin = await beforeConfirmation.auth.signInWithPassword({ email: PERSONAL_EMAIL, password: PERSONAL_PASSWORD });
    expect(beforeLogin.error).not.toBeNull();

    const confirmed = await application.verifyPersonalEmail(
      attempt.registrationId,
      account.rotatedActivationToken,
      { code: mailbox.code("PERSONAL_CONFIRMATION"), requestId: "track-a-integration-personal-code" }
    );
    expect(confirmed.personalEmailConfirmed).toBe(true);

    const { data: verificationSession } = await verificationClient.auth.getUser();
    const userId = verificationSession.user?.id;
    if (!userId) throw new Error("Personal confirmation did not establish the expected Auth session.");
    const principal: AuthenticatedPrincipal = { userId };

    const { data: membership } = await verificationClient
      .from("employer_memberships")
      .select("employer_display_name, work_email_normalized, status, source")
      .single();
    expect(membership).toEqual({
      employer_display_name: "OniBank",
      work_email_normalized: "integration@onibank.example.test",
      status: "ACTIVE",
      source: "employer_provisioned"
    });

    const contextSource = new SupabaseFinancialContextSource(verificationClient, principal);
    const onboarding = createOnboardingApplication({
      contextSource,
      versionRepository: new SupabaseFinancialContextVersionRepository(verificationClient, principal),
      rules: SLICE_1_RULES,
      calendar: ENGLAND_WALES_WORKING_DAY_CALENDAR,
      calendarMetadata: ENGLAND_WALES_CALENDAR_METADATA
    });
    const previewRequest = {
      draft: SARAH_V1_ONBOARDING_DRAFT,
      mode: "initial" as const,
      expectedCurrentContextVersionId: null
    };
    const preview = onboarding.preview.execute(previewRequest);
    if (!preview.ok) throw new Error(preview.error.code);
    const contextConfirmation = await onboarding.confirm.execute({
      ...previewRequest,
      requestId: "track-a-integration-onboarding",
      reviewedCanonicalRequestHash: preview.value.candidate.canonicalRequestHash
    });
    if (!contextConfirmation.ok) throw new Error(contextConfirmation.error.code);
    expect(contextConfirmation.value.contextVersionId).toBe(SARAH_V1_CONTEXT.version);

    const { data: activeProfile } = await verificationClient
      .from("profiles")
      .select("account_activation_state, registration_origin, current_financial_context_version_id")
      .single();
    expect(activeProfile).toEqual({
      account_activation_state: "ACTIVE",
      registration_origin: "employer_provisioned",
      current_financial_context_version_id: SARAH_V1_CONTEXT.version
    });

    const simulator = createSimulatorApplication({
      contextSource,
      runStore: new SupabaseSimulationRunStore(verificationClient, principal),
      rules: SLICE_1_RULES,
      calendar: ENGLAND_WALES_WORKING_DAY_CALENDAR,
      calendarMetadata: ENGLAND_WALES_CALENDAR_METADATA
    });
    const simulation = await simulator.simulateOneOffPurchase.execute({
      requestId: "track-a-integration-trip",
      expectedContextVersionId: SARAH_V1_CONTEXT.version,
      change: {
        type: "one_off_purchase",
        amount: { currency: "GBP", minorUnits: "65000" },
        purpose: "trip",
        paymentPeriod: "2026-09",
        paymentTiming: "assumed_conservative",
        paymentDate: null,
        datePrecision: "month",
        fundingSource: "current_account",
        paymentPattern: "single",
        costTreatment: "additional_to_routine_spending"
      },
      assumptionConfirmations: []
    });
    if (!simulation.ok) throw new Error(simulation.error.code);
    expect(simulation.value.presentation.immediateImpact.safetyBufferAfter).toBe("£250");
    expect(simulation.value.result.comparison.classification.code).toBe(SARAH_V1_EXPECTED.trip650September.classification);

    const workEmailLogin = await publicClient().auth.signInWithPassword({
      email: "integration@onibank.example.test",
      password: PERSONAL_PASSWORD
    });
    expect(workEmailLogin.error).not.toBeNull();

    const bypass = await publicClient().auth.signUp({
      email: "unprovisioned@example.test",
      password: "Unprovisioned-Password-2026!"
    });
    expect(bypass.error).not.toBeNull();

    const foreign = publicClient();
    clients.push(foreign);
    const { error: foreignLoginError } = await foreign.auth.signInWithPassword({
      email: "sarah@example.test",
      password: "Sarah-Local-Only-2026!"
    });
    expect(foreignLoginError).toBeNull();
    const { count: foreignMemberships } = await foreign
      .from("employer_memberships")
      .select("user_id", { count: "exact", head: true })
      .eq("user_id", userId);
    expect(foreignMemberships).toBe(0);
    const { data: canonicalSarahMembership } = await foreign
      .from("employer_memberships")
      .select("user_id, work_email_normalized, status")
      .single();
    expect(canonicalSarahMembership).toEqual({
      user_id: "11111111-1111-4111-8111-111111111111",
      work_email_normalized: "sarah.wonk@onibank.test",
      status: "ACTIVE"
    });
  });

  it("serialises concurrent exact account reservations before any Auth identity is created", async () => {
    if (!URL) throw new Error("SUPABASE_URL is unavailable.");
    const admin = createClient<Database>(URL, localAdministrativeKey(), {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      realtime: { transport: WebSocket as never }
    });
    const mailbox = new Mailbox();
    const persistence = new SupabaseRegistrationPersistence(admin as never);
    const security = new NodeRegistrationSecurity(
      "integration-code-pepper-2026-at-least-32-characters",
      "integration-fingerprint-pepper-2026-at-least-32-characters"
    );
    const application = new RegistrationApplication({
      persistence,
      security,
      mailer: mailbox,
      identity: new SupabaseRegistrationIdentity(admin as never)
    });
    const attempt = await application.begin({
      companyId: "FY-7K3M-9Q2D",
      workEmail: "concurrent@onibank.example.test",
      requestId: "track-a-concurrency-begin"
    });
    const verified = await application.verifyWorkCode(attempt.registrationId, {
      code: mailbox.code("WORK_CODE"),
      requestId: "track-a-concurrency-work-code"
    });
    const personalEmail = "concurrency-personal@example.test";
    const common = {
      registrationId: attempt.registrationId,
      requestId: "track-a-concurrency-account",
      requestFingerprint: security.requestFingerprint({ personalEmail, displayName: "Concurrency Member", password: security.fingerprint("Concurrency-Password-2026!") }),
      activationDigest: security.digestOpaqueToken(verified.activationToken),
      personalEmail,
      personalEmailFingerprint: security.fingerprint(personalEmail),
      authClaimDigest: security.digestAuthClaim("concurrency-claim-nonce"),
      correlationId: randomUUID(),
      now: new Date()
    };
    const [first, second] = await Promise.all([
      persistence.reservePersonalAccount({
        ...common,
        rotatedActivationDigest: security.digestOpaqueToken("concurrency-rotation-one"),
        deliveryId: randomUUID()
      }),
      persistence.reservePersonalAccount({
        ...common,
        rotatedActivationDigest: security.digestOpaqueToken("concurrency-rotation-two"),
        deliveryId: randomUUID()
      })
    ]);
    expect([first.category, second.category].sort()).toEqual(["PROCESSING", "RESERVED"]);
    expect([first.reserved, second.reserved].filter(Boolean)).toHaveLength(1);
    const { data: listedUsers, error: listError } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    expect(listError).toBeNull();
    expect(listedUsers.users.some((user) => user.email === personalEmail)).toBe(false);
  });

  it("does not attach an employer provision to an existing personal account", async () => {
    if (!URL) throw new Error("SUPABASE_URL is unavailable.");
    const admin = createClient<Database>(URL, localAdministrativeKey(), {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      realtime: { transport: WebSocket as never }
    });
    const mailbox = new Mailbox();
    const security = new NodeRegistrationSecurity(
      "integration-code-pepper-2026-at-least-32-characters",
      "integration-fingerprint-pepper-2026-at-least-32-characters"
    );
    const application = new RegistrationApplication({
      persistence: new SupabaseRegistrationPersistence(admin as never),
      security,
      mailer: mailbox,
      identity: new SupabaseRegistrationIdentity(admin as never)
    });
    const attempt = await application.begin({
      companyId: "FY-7K3M-9Q2D",
      workEmail: "collision@onibank.example.test",
      requestId: "track-a-collision-begin"
    });
    const verified = await application.verifyWorkCode(attempt.registrationId, {
      code: mailbox.code("WORK_CODE"),
      requestId: "track-a-collision-work-code"
    });
    await expect(application.createPersonalAccount(attempt.registrationId, verified.activationToken, {
      personalEmail: "sarah@example.test",
      displayName: "Existing Sarah Attempt",
      password: "Different-Password-2026!",
      passwordConfirmation: "Different-Password-2026!",
      requestId: "track-a-collision-account"
    })).rejects.toMatchObject({ code: "ACCOUNT_EXISTS", message: expect.stringContaining("Login") });
    const { data: sarahMemberships } = await admin
      .from("employer_memberships")
      .select("employer_display_name, work_email_normalized, status")
      .eq("user_id", "11111111-1111-4111-8111-111111111111");
    expect(sarahMemberships).toEqual([{
      employer_display_name: "OniBank",
      work_email_normalized: "sarah.wonk@onibank.test",
      status: "ACTIVE"
    }]);
  });
});
