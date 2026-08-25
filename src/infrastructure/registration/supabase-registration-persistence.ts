import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  RegistrationActivationRecord,
  RegistrationBeginPersistenceInput,
  RegistrationBeginPersistenceResult,
  RegistrationChallengeRecord,
  RegistrationPersistencePort
} from "../../application/registration/ports";

type RpcRow = Record<string, unknown>;

function firstRow(data: unknown): RpcRow | null {
  if (Array.isArray(data)) return (data[0] as RpcRow | undefined) ?? null;
  return data && typeof data === "object" ? data as RpcRow : null;
}

function text(row: RpcRow, key: string): string | null {
  return typeof row[key] === "string" ? row[key] : null;
}

function bool(row: RpcRow, key: string): boolean {
  return row[key] === true;
}

export class SupabaseRegistrationPersistence implements RegistrationPersistencePort {
  constructor(private readonly client: SupabaseClient) {}

  private async rpc(name: string, parameters: Record<string, unknown>): Promise<RpcRow | null> {
    const { data, error } = await this.client.rpc(name, parameters);
    if (error) throw new Error(`Registration persistence operation failed: ${name}.`);
    return firstRow(data);
  }

  async begin(input: RegistrationBeginPersistenceInput): Promise<RegistrationBeginPersistenceResult> {
    const row = await this.rpc("registration_begin", {
      p_registration_id: input.registrationId,
      p_request_id: input.requestId,
      p_request_fingerprint: input.requestFingerprint,
      p_company_id: input.companyId,
      p_work_email_normalized: input.workEmail,
      p_work_email_fingerprint: input.workEmailFingerprint,
      p_code_digest: input.challenge.digest,
      p_code_salt: input.challenge.salt,
      p_code_key_version: input.challenge.keyVersion,
      p_delivery_id: input.deliveryId,
      p_correlation_id: input.correlationId,
      p_now: input.now.toISOString()
    });
    if (!row) throw new Error("Registration persistence returned no begin result.");
    return {
      category: text(row, "result_category") === "IDEMPOTENCY_CONFLICT" ? "IDEMPOTENCY_CONFLICT" : "ACCEPTED",
      registrationId: text(row, "registration_id") ?? input.registrationId,
      shouldDeliver: bool(row, "should_deliver"),
      deliveryId: text(row, "delivery_id"),
      deliveryAddress: text(row, "delivery_address")
    };
  }

  async markDelivery(input: Parameters<RegistrationPersistencePort["markDelivery"]>[0]): Promise<void> {
    await this.rpc("registration_mark_delivery", {
      p_registration_id: input.registrationId,
      p_delivery_id: input.deliveryId,
      p_status: input.status,
      p_correlation_id: input.correlationId,
      p_now: input.now.toISOString()
    });
  }

  async challenge(registrationId: string): Promise<RegistrationChallengeRecord | null> {
    const row = await this.rpc("registration_challenge_material", { p_registration_id: registrationId });
    if (!row) return null;
    return {
      state: text(row, "state") ?? "UNKNOWN",
      digest: text(row, "code_digest"),
      salt: text(row, "code_salt"),
      keyVersion: text(row, "code_key_version"),
      expiresAt: text(row, "code_expires_at")
    };
  }

  async verifyWorkCode(input: Parameters<RegistrationPersistencePort["verifyWorkCode"]>[0]) {
    const row = await this.rpc("registration_verify_work_code", {
      p_registration_id: input.registrationId,
      p_request_id: input.requestId,
      p_request_fingerprint: input.requestFingerprint,
      p_candidate_digest: input.candidateDigest,
      p_activation_digest: input.activationDigest,
      p_correlation_id: input.correlationId,
      p_now: input.now.toISOString()
    });
    return { category: row ? text(row, "result_category") ?? "INVALID" : "INVALID", verified: row ? bool(row, "verified") : false };
  }

  async resendWorkCode(input: Parameters<RegistrationPersistencePort["resendWorkCode"]>[0]) {
    const row = await this.rpc("registration_resend_work_code", {
      p_registration_id: input.registrationId,
      p_request_id: input.requestId,
      p_request_fingerprint: input.requestFingerprint,
      p_code_digest: input.challenge.digest,
      p_code_salt: input.challenge.salt,
      p_code_key_version: input.challenge.keyVersion,
      p_delivery_id: input.deliveryId,
      p_correlation_id: input.correlationId,
      p_now: input.now.toISOString()
    });
    return {
      category: row ? text(row, "result_category") ?? "ACCEPTED" : "ACCEPTED",
      shouldDeliver: row ? bool(row, "should_deliver") : false,
      deliveryId: row ? text(row, "delivery_id") : null,
      deliveryAddress: row ? text(row, "delivery_address") : null
    };
  }

  async reservePersonalAccount(input: Parameters<RegistrationPersistencePort["reservePersonalAccount"]>[0]) {
    const row = await this.rpc("registration_reserve_personal_account", {
      p_registration_id: input.registrationId,
      p_request_id: input.requestId,
      p_request_fingerprint: input.requestFingerprint,
      p_activation_digest: input.activationDigest,
      p_personal_email_normalized: input.personalEmail,
      p_personal_email_fingerprint: input.personalEmailFingerprint,
      p_auth_claim_digest: input.authClaimDigest,
      p_rotated_activation_digest: input.rotatedActivationDigest,
      p_delivery_id: input.deliveryId,
      p_correlation_id: input.correlationId,
      p_now: input.now.toISOString()
    });
    return { category: row ? text(row, "result_category") ?? "PERSISTENCE_FAILURE" : "PERSISTENCE_FAILURE", reserved: row ? bool(row, "reserved") : false };
  }

  async releasePersonalAccountReservation(input: Parameters<RegistrationPersistencePort["releasePersonalAccountReservation"]>[0]) {
    const { data, error } = await this.client.rpc("registration_release_personal_account_reservation", {
      p_registration_id: input.registrationId,
      p_request_id: input.requestId,
      p_request_fingerprint: input.requestFingerprint,
      p_rotated_activation_digest: input.rotatedActivationDigest,
      p_correlation_id: input.correlationId,
      p_now: input.now.toISOString()
    });
    if (error) throw new Error("Registration persistence operation failed: registration_release_personal_account_reservation.");
    return data === true;
  }

  async reservePersonalConfirmationResend(input: Parameters<RegistrationPersistencePort["reservePersonalConfirmationResend"]>[0]) {
    const row = await this.rpc("registration_reserve_personal_confirmation_resend", {
      p_registration_id: input.registrationId,
      p_request_id: input.requestId,
      p_request_fingerprint: input.requestFingerprint,
      p_activation_digest: input.activationDigest,
      p_delivery_id: input.deliveryId,
      p_correlation_id: input.correlationId,
      p_now: input.now.toISOString()
    });
    return {
      category: row ? text(row, "result_category") ?? "PERSISTENCE_FAILURE" : "PERSISTENCE_FAILURE",
      shouldDeliver: row ? bool(row, "should_deliver") : false,
      deliveryId: row ? text(row, "delivery_id") : null,
      authUserId: row ? text(row, "auth_user_id") : null
    };
  }

  async markAccountConflict(registrationId: string, correlationId: string, now: Date): Promise<void> {
    await this.rpc("registration_mark_account_conflict", {
      p_registration_id: registrationId,
      p_correlation_id: correlationId,
      p_now: now.toISOString()
    });
  }

  async activationStatus(input: Parameters<RegistrationPersistencePort["activationStatus"]>[0]): Promise<RegistrationActivationRecord> {
    const row = await this.rpc("registration_activation_status", {
      p_registration_id: input.registrationId,
      p_activation_digest: input.activationDigest,
      p_now: input.now.toISOString()
    });
    if (!row) return { category: "ACTIVATION_INVALID", state: null, authUserId: null, personalEmailConfirmed: false, onboardingComplete: false, employerName: null };
    return {
      category: text(row, "result_category") === "OK" ? "OK" : "ACTIVATION_INVALID",
      state: text(row, "state"),
      authUserId: text(row, "auth_user_id"),
      personalEmailConfirmed: bool(row, "personal_email_confirmed"),
      onboardingComplete: bool(row, "onboarding_complete"),
      employerName: text(row, "employer_display_name")
    };
  }
}
