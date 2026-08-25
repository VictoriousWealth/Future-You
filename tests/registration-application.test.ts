import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { RegistrationApplication } from "../src/application/registration/application";
import {
  beginRegistrationRequestSchema,
  createPersonalAccountRequestSchema,
  RegistrationOperationError
} from "../src/application/registration/contracts";
import type {
  RegistrationIdentityPort,
  RegistrationMail,
  RegistrationMailerPort,
  RegistrationPersistencePort,
  RegistrationSecurityPort,
  WorkChallengeMaterial
} from "../src/application/registration/ports";
import { withRegistrationApplication } from "../src/server/http/registration-route";
import { HttpRegistrationMailer } from "../src/infrastructure/registration/registration-mailer";

class FixedSecurity implements RegistrationSecurityPort {
  normalizeCompanyId(value: string) { return value.toUpperCase().replaceAll(/[^A-Z0-9]/g, ""); }
  normalizeEmail(value: string) { return value.trim().toLowerCase(); }
  fingerprint(value: string) { return `fingerprint:${value}`.padEnd(64, "x").slice(0, 64); }
  requestFingerprint(value: unknown) { return this.fingerprint(JSON.stringify(value)); }
  issueWorkChallenge(): WorkChallengeMaterial { return { code: "654321", digest: "digest-654321", salt: "salt", keyVersion: "v1" }; }
  digestWorkCode(_registrationId: string, code: string) { return `digest-${code}`; }
  issueOpaqueToken() { return { token: "opaque-token-with-more-than-thirty-two-characters", digest: "opaque-digest" }; }
  digestOpaqueToken() { return "opaque-digest"; }
  digestAuthClaim() { return "auth-claim-digest"; }
}

class RecordingMailer implements RegistrationMailerPort {
  readonly messages: RegistrationMail[] = [];
  async send(message: RegistrationMail) { this.messages.push(message); }
}

class FakeIdentity implements RegistrationIdentityPort {
  calls = 0;
  mode: "CREATED" | "EXISTS" | "FAILURE" = "CREATED";
  async createPendingIdentity() {
    this.calls += 1;
    if (this.mode === "FAILURE") throw new Error("temporary identity failure");
    return this.mode === "CREATED"
      ? { kind: "CREATED" as const, personalConfirmationCode: "123456" }
      : { kind: "EXISTS" as const, personalConfirmationCode: null };
  }
  async resendPersonalConfirmation() {
    return { personalEmail: "personal@example.test", personalConfirmationCode: "999999" };
  }
}

class FakePersistence implements RegistrationPersistencePort {
  beginMode: "real" | "decoy" | "conflict" = "real";
  verifyCategory = "VERIFIED";
  reserveCategory: "RESERVED" | "EXISTING" | "PROCESSING" = "RESERVED";
  verifiedCandidate: string | null = null;
  accountConflict = false;
  releasedReservation = false;
  deliveryStatuses: string[] = [];

  async begin(input: Parameters<RegistrationPersistencePort["begin"]>[0]) {
    return {
      category: this.beginMode === "conflict" ? "IDEMPOTENCY_CONFLICT" as const : "ACCEPTED" as const,
      registrationId: input.registrationId,
      shouldDeliver: this.beginMode === "real",
      deliveryId: this.beginMode === "real" ? input.deliveryId : null,
      deliveryAddress: this.beginMode === "real" ? input.workEmail : null
    };
  }
  async markDelivery(input: Parameters<RegistrationPersistencePort["markDelivery"]>[0]) { this.deliveryStatuses.push(input.status); }
  async challenge() { return { state: "CODE_PENDING", digest: "digest-654321", salt: "salt", keyVersion: "v1", expiresAt: "2026-08-25T12:10:00.000Z" }; }
  async verifyWorkCode(input: Parameters<RegistrationPersistencePort["verifyWorkCode"]>[0]) {
    this.verifiedCandidate = input.candidateDigest;
    return { category: this.verifyCategory, verified: this.verifyCategory === "VERIFIED" };
  }
  async resendWorkCode(input: Parameters<RegistrationPersistencePort["resendWorkCode"]>[0]) {
    return { category: "ACCEPTED", shouldDeliver: true, deliveryId: input.deliveryId, deliveryAddress: "employee@onibank.test" };
  }
  async reservePersonalAccount() { return { category: this.reserveCategory, reserved: this.reserveCategory === "RESERVED" }; }
  async releasePersonalAccountReservation() { this.releasedReservation = true; return true; }
  async reservePersonalConfirmationResend(input: Parameters<RegistrationPersistencePort["reservePersonalConfirmationResend"]>[0]) {
    return { category: "ACCEPTED", shouldDeliver: true, deliveryId: input.deliveryId, authUserId: "user-1" };
  }
  async markAccountConflict() { this.accountConflict = true; }
  async activationStatus() { return { category: "OK" as const, state: "PERSONAL_EMAIL_CONFIRMED", authUserId: "user-1", personalEmailConfirmed: true, onboardingComplete: false, employerName: "OniBank" }; }
}

function setup() {
  const persistence = new FakePersistence();
  const mailer = new RecordingMailer();
  const identity = new FakeIdentity();
  let index = 0;
  const application = new RegistrationApplication({
    persistence,
    mailer,
    identity,
    security: new FixedSecurity(),
    now: () => new Date("2026-08-25T12:00:00.000Z"),
    uuid: () => `00000000-0000-4000-8000-${String(++index).padStart(12, "0")}`
  });
  return { application, persistence, mailer, identity };
}

describe("employer-provisioned registration application", () => {
  it("normalises Company ID/work email and sends a six-digit work challenge", async () => {
    const { application, mailer, persistence } = setup();
    const result = await application.begin({ companyId: "fy-7k3m-9q2d", workEmail: " Employee@OniBank.Test ", requestId: "begin-request-0001" });
    expect(result.accepted).toBe(true);
    expect(result.maskedWorkEmail).toBe("em••••••@onibank.test");
    expect(mailer.messages).toEqual([{ to: "employee@onibank.test", purpose: "WORK_CODE", code: "654321", registrationId: result.registrationId, deliveryId: "00000000-0000-4000-8000-000000000002" }]);
    expect(persistence.deliveryStatuses).toEqual(["SENT"]);
  });

  it("returns the same accepted public shape for a decoy without sending mail", async () => {
    const { application, mailer, persistence } = setup();
    persistence.beginMode = "decoy";
    const result = await application.begin({ companyId: "unknown", workEmail: "nobody@example.test", requestId: "begin-request-0002" });
    expect(result).toMatchObject({ accepted: true, nextStep: "VERIFY_WORK_EMAIL" });
    expect(mailer.messages).toEqual([]);
  });

  it("source-grounds verification in the server-issued digest and never calculates with a browser amount", async () => {
    const { application, persistence } = setup();
    const result = await application.verifyWorkCode("registration-1", { code: "654321", requestId: "verify-request-0001" });
    expect(persistence.verifiedCandidate).toBe("digest-654321");
    expect(result.dto.verified).toBe(true);
    expect(result.activationToken.length).toBeGreaterThan(32);
  });

  it("uses a neutral invalid-code outcome and never advances after invalid verification", async () => {
    const { application, persistence } = setup();
    persistence.verifyCategory = "INVALID";
    await expect(application.verifyWorkCode("registration-1", { code: "000000", requestId: "verify-request-0002" }))
      .rejects.toMatchObject({ code: "CODE_INVALID" });
  });

  it("creates a pending personal identity and sends its confirmation code", async () => {
    const { application, mailer, identity } = setup();
    const result = await application.createPersonalAccount("registration-1", "activation", {
      personalEmail: "Personal@Example.Test",
      displayName: "Ari Morgan",
      password: "Long-Personal-Password-2026!",
      passwordConfirmation: "Long-Personal-Password-2026!",
      requestId: "account-request-0001"
    });
    expect(identity.calls).toBe(1);
    expect(result.dto.nextStep).toBe("CONFIRM_PERSONAL_EMAIL_AND_ONBOARD");
    expect(mailer.messages.at(-1)).toMatchObject({ to: "personal@example.test", purpose: "PERSONAL_CONFIRMATION", code: "123456" });
  });

  it("rejects mismatched passwords before identity creation", async () => {
    const { application, identity } = setup();
    await expect(application.createPersonalAccount("registration-1", "activation", {
      personalEmail: "personal@example.test", displayName: "Ari", password: "Long-Password-2026!", passwordConfirmation: "Different-Password-2026!", requestId: "account-request-0002"
    })).rejects.toMatchObject({ code: "PASSWORDS_DO_NOT_MATCH" });
    expect(identity.calls).toBe(0);
  });

  it("returns neutral Login/recovery guidance for an existing personal account", async () => {
    const { application, identity, persistence } = setup();
    identity.mode = "EXISTS";
    await expect(application.createPersonalAccount("registration-1", "activation", {
      personalEmail: "existing@example.test", displayName: "Ari", password: "Long-Password-2026!", passwordConfirmation: "Long-Password-2026!", requestId: "account-request-0003"
    })).rejects.toMatchObject({ code: "ACCOUNT_EXISTS", message: expect.stringContaining("Login") });
    expect(persistence.accountConflict).toBe(true);
  });

  it("does not expose an account-existence code at the public API boundary", async () => {
    const { application } = setup();
    const response = await withRegistrationApplication(
      "00000000-0000-4000-8000-000000000099",
      async () => { throw new RegistrationOperationError("ACCOUNT_EXISTS", "Use Login or account recovery."); },
      async () => application
    );
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({
      error: {
        code: "REGISTRATION_PERSONAL_LOGIN_UNAVAILABLE",
        message: "Use Login or account recovery."
      }
    });
  });

  it("releases a reservation when Auth identity creation fails before a user exists", async () => {
    const { application, identity, persistence } = setup();
    identity.mode = "FAILURE";
    await expect(application.createPersonalAccount("registration-1", "activation", {
      personalEmail: "personal@example.test", displayName: "Ari", password: "Long-Password-2026!", passwordConfirmation: "Long-Password-2026!", requestId: "account-request-recoverable"
    })).rejects.toMatchObject({ code: "PERSISTENCE_FAILURE", retryable: true });
    expect(persistence.releasedReservation).toBe(true);
    expect(persistence.deliveryStatuses).toEqual(["FAILED"]);
  });

  it("does not call the identity provider again for an exact completed account retry", async () => {
    const { application, persistence, identity } = setup();
    persistence.reserveCategory = "EXISTING";
    const result = await application.createPersonalAccount("registration-1", "activation", {
      personalEmail: "personal@example.test", displayName: "Ari", password: "Long-Password-2026!", passwordConfirmation: "Long-Password-2026!", requestId: "account-request-retry"
    });
    expect(result.dto.accepted).toBe(true);
    expect(identity.calls).toBe(0);
  });

  it("does not call the identity provider for a concurrent account-creation follower", async () => {
    const { application, persistence, identity } = setup();
    persistence.reserveCategory = "PROCESSING";
    await expect(application.createPersonalAccount("registration-1", "activation", {
      personalEmail: "personal@example.test", displayName: "Ari", password: "Long-Password-2026!", passwordConfirmation: "Long-Password-2026!", requestId: "account-request-concurrent"
    })).rejects.toMatchObject({ code: "ACCOUNT_CREATION_IN_PROGRESS", retryable: true });
    expect(identity.calls).toBe(0);
  });

  it("reserves and sends a rate-limited personal-confirmation resend", async () => {
    const { application, mailer } = setup();
    const result = await application.resendPersonalConfirmation(
      "registration-1",
      "activation",
      { requestId: "personal-resend-request-0001" }
    );
    expect(result.accepted).toBe(true);
    expect(mailer.messages.at(-1)).toEqual({
      to: "personal@example.test",
      purpose: "PERSONAL_CONFIRMATION",
      code: "999999",
      registrationId: "registration-1",
      deliveryId: "00000000-0000-4000-8000-000000000001"
    });
  });

  it("deduplicates one provider delivery without suppressing a genuine resend", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 202 }));
    vi.stubGlobal("fetch", fetchMock);
    try {
      const mailer = new HttpRegistrationMailer("https://mail.example.test/send", "mail-token");
      const common = {
        to: "employee@example.test",
        purpose: "WORK_CODE" as const,
        code: "654321",
        registrationId: "registration-1"
      };
      await mailer.send({ ...common, deliveryId: "delivery-1" });
      await mailer.send({ ...common, deliveryId: "delivery-2" });
      const references = fetchMock.mock.calls.map((call) =>
        JSON.parse(String((call[1] as RequestInit).body)).idempotencyReference
      );
      expect(references).toEqual([
        "registration-1:WORK_CODE:delivery-1",
        "registration-1:WORK_CODE:delivery-2"
      ]);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("keeps strict runtime request contracts", () => {
    expect(beginRegistrationRequestSchema.safeParse({ companyId: "FY-1234", workEmail: "a@b.test", requestId: "request-123", ownerId: "foreign" }).success).toBe(false);
    expect(createPersonalAccountRequestSchema.safeParse({ personalEmail: "a@b.test", password: "short", passwordConfirmation: "short", displayName: "A", requestId: "request-123" }).success).toBe(false);
  });

  it("contains no Math.random, plaintext-code logging, or browser Supabase signUp path", () => {
    const securitySource = readFileSync(resolve("src/infrastructure/registration/node-registration-security.ts"), "utf8");
    const registrationSource = readFileSync(resolve("src/application/registration/application.ts"), "utf8");
    const signupSource = readFileSync(resolve("src/ui/auth/signup-form.tsx"), "utf8");
    expect(securitySource).not.toContain("Math.random");
    expect(registrationSource).not.toMatch(/console\.|logger\./);
    expect(signupSource).not.toContain("auth.signUp");
  });

  it("uses typed operation failures", () => {
    const error = new RegistrationOperationError("RATE_LIMITED", "wait", true);
    expect(error).toMatchObject({ code: "RATE_LIMITED", retryable: true });
  });
});
