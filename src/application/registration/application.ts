import { randomUUID } from "node:crypto";
import { API_VERSION } from "../dto/contracts";
import {
  REGISTRATION_ACCOUNT_SCHEMA,
  REGISTRATION_ATTEMPT_SCHEMA,
  REGISTRATION_STATUS_SCHEMA,
  REGISTRATION_VERIFICATION_SCHEMA,
  RegistrationOperationError,
  type BeginRegistrationRequest,
  type CreatePersonalAccountRequest,
  type RegistrationAccountDTO,
  type RegistrationAttemptDTO,
  type RegistrationStatusDTO,
  type RegistrationVerificationDTO,
  type ResendWorkCodeRequest,
  type VerifyPersonalEmailRequest,
  type VerifyWorkCodeRequest
} from "./contracts";
import type {
  PersonalEmailVerificationPort,
  RegistrationIdentityPort,
  RegistrationMailerPort,
  RegistrationPersistencePort,
  RegistrationSecurityPort
} from "./ports";

export interface RegistrationApplicationDependencies {
  readonly persistence: RegistrationPersistencePort;
  readonly security: RegistrationSecurityPort;
  readonly mailer: RegistrationMailerPort;
  readonly identity: RegistrationIdentityPort;
  readonly verifyPersonalEmail?: PersonalEmailVerificationPort;
  readonly now?: () => Date;
  readonly uuid?: () => string;
}

function maskEmail(email: string): string {
  const [local = "", domain = ""] = email.split("@", 2);
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}${"•".repeat(Math.max(3, local.length - visible.length))}@${domain}`;
}

export class RegistrationApplication {
  private readonly now: () => Date;
  private readonly uuid: () => string;

  constructor(private readonly dependencies: RegistrationApplicationDependencies) {
    this.now = dependencies.now ?? (() => new Date());
    this.uuid = dependencies.uuid ?? randomUUID;
  }

  async begin(request: BeginRegistrationRequest): Promise<RegistrationAttemptDTO> {
    const registrationId = this.uuid();
    const deliveryId = this.uuid();
    const correlationId = this.uuid();
    const companyId = this.dependencies.security.normalizeCompanyId(request.companyId);
    const workEmail = this.dependencies.security.normalizeEmail(request.workEmail);
    const challenge = this.dependencies.security.issueWorkChallenge(registrationId);
    const requestFingerprint = this.dependencies.security.requestFingerprint({ companyId, workEmail });
    const result = await this.dependencies.persistence.begin({
      registrationId,
      requestId: request.requestId,
      requestFingerprint,
      companyId,
      workEmail,
      workEmailFingerprint: this.dependencies.security.fingerprint(workEmail),
      challenge,
      deliveryId,
      correlationId,
      now: this.now()
    });
    if (result.category === "IDEMPOTENCY_CONFLICT") {
      throw new RegistrationOperationError("IDEMPOTENCY_CONFLICT", "This registration request ID was already used with different details.");
    }
    if (result.shouldDeliver && result.deliveryId && result.deliveryAddress) {
      try {
        await this.dependencies.mailer.send({
          to: result.deliveryAddress,
          purpose: "WORK_CODE",
          code: challenge.code,
          registrationId: result.registrationId,
          deliveryId: result.deliveryId
        });
        await this.dependencies.persistence.markDelivery({
          registrationId: result.registrationId,
          deliveryId: result.deliveryId,
          status: "SENT",
          correlationId,
          now: this.now()
        });
      } catch {
        await this.dependencies.persistence.markDelivery({
          registrationId: result.registrationId,
          deliveryId: result.deliveryId,
          status: "FAILED",
          correlationId,
          now: this.now()
        });
        throw new RegistrationOperationError("EMAIL_DELIVERY_FAILED", "We could not send the verification email. Try again shortly.", true);
      }
    }
    return {
      apiVersion: API_VERSION,
      schemaVersion: REGISTRATION_ATTEMPT_SCHEMA,
      kind: "employer_registration_attempt",
      registrationId: result.registrationId,
      accepted: true,
      maskedWorkEmail: maskEmail(workEmail),
      nextStep: "VERIFY_WORK_EMAIL"
    };
  }

  async verifyWorkCode(
    registrationId: string,
    request: VerifyWorkCodeRequest
  ): Promise<Readonly<{ dto: RegistrationVerificationDTO; activationToken: string }>> {
    const material = await this.dependencies.persistence.challenge(registrationId);
    const candidateDigest = material?.salt && material.keyVersion
      ? this.dependencies.security.digestWorkCode(registrationId, request.code, material.salt, material.keyVersion)
      : this.dependencies.security.fingerprint(`decoy:${registrationId}:${request.code}`);
    const activation = this.dependencies.security.issueOpaqueToken();
    const result = await this.dependencies.persistence.verifyWorkCode({
      registrationId,
      requestId: request.requestId,
      requestFingerprint: this.dependencies.security.requestFingerprint({ code: request.code }),
      candidateDigest,
      activationDigest: activation.digest,
      correlationId: this.uuid(),
      now: this.now()
    });
    if (result.category === "IDEMPOTENCY_CONFLICT") {
      throw new RegistrationOperationError("IDEMPOTENCY_CONFLICT", "This verification request ID was already used with a different code.");
    }
    if (result.category === "EXHAUSTED") {
      throw new RegistrationOperationError("ATTEMPTS_EXHAUSTED", "We could not verify that code. Start registration again.");
    }
    if (!result.verified) {
      throw new RegistrationOperationError("CODE_INVALID", "We could not verify that code. Check it or request a new one.");
    }
    return {
      activationToken: activation.token,
      dto: {
        apiVersion: API_VERSION,
        schemaVersion: REGISTRATION_VERIFICATION_SCHEMA,
        kind: "employer_registration_verification",
        verified: true,
        nextStep: "CREATE_PERSONAL_ACCOUNT"
      }
    };
  }

  async resendWorkCode(registrationId: string, request: ResendWorkCodeRequest): Promise<RegistrationAttemptDTO> {
    const deliveryId = this.uuid();
    const correlationId = this.uuid();
    const challenge = this.dependencies.security.issueWorkChallenge(registrationId);
    const result = await this.dependencies.persistence.resendWorkCode({
      registrationId,
      requestId: request.requestId,
      requestFingerprint: this.dependencies.security.requestFingerprint({ registrationId, operation: "resend" }),
      challenge,
      deliveryId,
      correlationId,
      now: this.now()
    });
    if (result.category === "IDEMPOTENCY_CONFLICT") throw new RegistrationOperationError("IDEMPOTENCY_CONFLICT", "This resend request ID was reused.");
    if (result.category === "RATE_LIMITED") throw new RegistrationOperationError("RATE_LIMITED", "Please wait before requesting another code.", true);
    if (result.shouldDeliver && result.deliveryId && result.deliveryAddress) {
      try {
        await this.dependencies.mailer.send({
          to: result.deliveryAddress,
          purpose: "WORK_CODE",
          code: challenge.code,
          registrationId,
          deliveryId: result.deliveryId
        });
        await this.dependencies.persistence.markDelivery({ registrationId, deliveryId: result.deliveryId, status: "SENT", correlationId, now: this.now() });
      } catch {
        await this.dependencies.persistence.markDelivery({ registrationId, deliveryId: result.deliveryId, status: "FAILED", correlationId, now: this.now() });
        throw new RegistrationOperationError("EMAIL_DELIVERY_FAILED", "We could not send the verification email.", true);
      }
    }
    return {
      apiVersion: API_VERSION,
      schemaVersion: REGISTRATION_ATTEMPT_SCHEMA,
      kind: "employer_registration_attempt",
      registrationId,
      accepted: true,
      maskedWorkEmail: "your work email",
      nextStep: "VERIFY_WORK_EMAIL"
    };
  }

  async createPersonalAccount(
    registrationId: string,
    activationToken: string,
    request: CreatePersonalAccountRequest
  ): Promise<Readonly<{ dto: RegistrationAccountDTO; rotatedActivationToken: string }>> {
    if (request.password !== request.passwordConfirmation) {
      throw new RegistrationOperationError("PASSWORDS_DO_NOT_MATCH", "The passwords do not match.");
    }
    const personalEmail = this.dependencies.security.normalizeEmail(request.personalEmail);
    const claim = this.dependencies.security.issueOpaqueToken();
    const rotated = this.dependencies.security.issueOpaqueToken();
    const deliveryId = this.uuid();
    const correlationId = this.uuid();
    const requestFingerprint = this.dependencies.security.requestFingerprint({
      personalEmail,
      displayName: request.displayName,
      password: this.dependencies.security.fingerprint(request.password)
    });
    const reserved = await this.dependencies.persistence.reservePersonalAccount({
      registrationId,
      requestId: request.requestId,
      requestFingerprint,
      activationDigest: this.dependencies.security.digestOpaqueToken(activationToken),
      personalEmail,
      personalEmailFingerprint: this.dependencies.security.fingerprint(personalEmail),
      authClaimDigest: this.dependencies.security.digestAuthClaim(claim.token),
      rotatedActivationDigest: rotated.digest,
      deliveryId,
      correlationId,
      now: this.now()
    });
    if (reserved.category === "IDEMPOTENCY_CONFLICT") throw new RegistrationOperationError("IDEMPOTENCY_CONFLICT", "This account request ID was reused with different details.");
    if (reserved.category === "EMAILS_MUST_DIFFER") throw new RegistrationOperationError("EMAILS_MUST_DIFFER", "Use a personal email that is different from your verified work email.");
    if (reserved.category === "ACTIVATION_INVALID") throw new RegistrationOperationError("ACTIVATION_INVALID", "Your activation has expired. Start registration again.");
    if (reserved.category === "PROCESSING") {
      throw new RegistrationOperationError(
        "ACCOUNT_CREATION_IN_PROGRESS",
        "Your personal Login is already being created. Wait briefly, then try again.",
        true
      );
    }
    if (reserved.category === "EXISTING") {
      return {
        rotatedActivationToken: rotated.token,
        dto: {
          apiVersion: API_VERSION,
          schemaVersion: REGISTRATION_ACCOUNT_SCHEMA,
          kind: "employer_registration_account",
          accepted: true,
          nextStep: "CONFIRM_PERSONAL_EMAIL_AND_ONBOARD"
        }
      };
    }
    if (!reserved.reserved) throw new RegistrationOperationError("PERSISTENCE_FAILURE", "The account could not be reserved.", true);

    let identity: Awaited<ReturnType<RegistrationIdentityPort["createPendingIdentity"]>>;
    try {
      identity = await this.dependencies.identity.createPendingIdentity({
        registrationId,
        claimNonce: claim.token,
        personalEmail,
        password: request.password,
        displayName: request.displayName
      });
    } catch {
      await this.dependencies.persistence.markDelivery({
        registrationId,
        deliveryId,
        status: "FAILED",
        correlationId,
        now: this.now()
      });
      await this.dependencies.persistence.releasePersonalAccountReservation({
        registrationId,
        requestId: request.requestId,
        requestFingerprint,
        rotatedActivationDigest: rotated.digest,
        correlationId: this.uuid(),
        now: this.now()
      });
      throw new RegistrationOperationError(
        "PERSISTENCE_FAILURE",
        "Your personal Login could not be created yet. Try the same request again.",
        true
      );
    }
    if (identity.kind === "EXISTS" || !identity.personalConfirmationCode) {
      await this.dependencies.persistence.markDelivery({
        registrationId,
        deliveryId,
        status: "FAILED",
        correlationId,
        now: this.now()
      });
      await this.dependencies.persistence.markAccountConflict(registrationId, this.uuid(), this.now());
      throw new RegistrationOperationError("ACCOUNT_EXISTS", "If you already have an account, use Login or account recovery. No new account was created.");
    }
    try {
      await this.dependencies.mailer.send({
        to: personalEmail,
        purpose: "PERSONAL_CONFIRMATION",
        code: identity.personalConfirmationCode,
        registrationId,
        deliveryId
      });
      await this.dependencies.persistence.markDelivery({
        registrationId,
        deliveryId,
        status: "SENT",
        correlationId,
        now: this.now()
      });
    } catch {
      await this.dependencies.persistence.markDelivery({
        registrationId,
        deliveryId,
        status: "FAILED",
        correlationId,
        now: this.now()
      });
      throw new RegistrationOperationError("EMAIL_DELIVERY_FAILED", "Your account is reserved, but the confirmation email could not be sent. Try again shortly.", true);
    }
    return {
      rotatedActivationToken: rotated.token,
      dto: {
        apiVersion: API_VERSION,
        schemaVersion: REGISTRATION_ACCOUNT_SCHEMA,
        kind: "employer_registration_account",
        accepted: true,
        nextStep: "CONFIRM_PERSONAL_EMAIL_AND_ONBOARD"
      }
    };
  }

  async resendPersonalConfirmation(
    registrationId: string,
    activationToken: string,
    request: ResendWorkCodeRequest
  ): Promise<RegistrationAccountDTO> {
    const deliveryId = this.uuid();
    const correlationId = this.uuid();
    const reserved = await this.dependencies.persistence.reservePersonalConfirmationResend({
      registrationId,
      requestId: request.requestId,
      requestFingerprint: this.dependencies.security.requestFingerprint({ registrationId, operation: "resend-personal-confirmation" }),
      activationDigest: this.dependencies.security.digestOpaqueToken(activationToken),
      deliveryId,
      correlationId,
      now: this.now()
    });
    if (reserved.category === "IDEMPOTENCY_CONFLICT") throw new RegistrationOperationError("IDEMPOTENCY_CONFLICT", "This resend request ID was reused.");
    if (reserved.category === "ACTIVATION_INVALID") throw new RegistrationOperationError("ACTIVATION_INVALID", "Your activation has expired. Start registration again.");
    if (reserved.category === "RATE_LIMITED") throw new RegistrationOperationError("RATE_LIMITED", "Please wait before requesting another personal-email code.", true);
    if (reserved.shouldDeliver && reserved.deliveryId && reserved.authUserId) {
      try {
        const confirmation = await this.dependencies.identity.resendPersonalConfirmation(reserved.authUserId);
        await this.dependencies.mailer.send({
          to: confirmation.personalEmail,
          purpose: "PERSONAL_CONFIRMATION",
          code: confirmation.personalConfirmationCode,
          registrationId,
          deliveryId: reserved.deliveryId
        });
        await this.dependencies.persistence.markDelivery({ registrationId, deliveryId: reserved.deliveryId, status: "SENT", correlationId, now: this.now() });
      } catch {
        await this.dependencies.persistence.markDelivery({ registrationId, deliveryId: reserved.deliveryId, status: "FAILED", correlationId, now: this.now() });
        throw new RegistrationOperationError("EMAIL_DELIVERY_FAILED", "We could not resend the personal-email code.", true);
      }
    }
    return {
      apiVersion: API_VERSION,
      schemaVersion: REGISTRATION_ACCOUNT_SCHEMA,
      kind: "employer_registration_account",
      accepted: true,
      nextStep: "CONFIRM_PERSONAL_EMAIL_AND_ONBOARD"
    };
  }

  async status(registrationId: string, activationToken: string): Promise<RegistrationStatusDTO> {
    const result = await this.dependencies.persistence.activationStatus({
      registrationId,
      activationDigest: this.dependencies.security.digestOpaqueToken(activationToken),
      now: this.now()
    });
    if (result.category !== "OK" || !result.state || !result.employerName) {
      throw new RegistrationOperationError("ACTIVATION_INVALID", "Your activation has expired. Start registration again.");
    }
    return {
      apiVersion: API_VERSION,
      schemaVersion: REGISTRATION_STATUS_SCHEMA,
      kind: "employer_registration_status",
      state: result.state,
      employerName: result.employerName,
      personalEmailConfirmed: result.personalEmailConfirmed,
      onboardingComplete: result.onboardingComplete
    };
  }

  async verifyPersonalEmail(
    registrationId: string,
    activationToken: string,
    request: VerifyPersonalEmailRequest
  ): Promise<RegistrationStatusDTO> {
    if (!this.dependencies.verifyPersonalEmail) throw new RegistrationOperationError("CONFIGURATION_INVALID", "Personal email verification is unavailable.", true);
    const activation = await this.dependencies.persistence.activationStatus({
      registrationId,
      activationDigest: this.dependencies.security.digestOpaqueToken(activationToken),
      now: this.now()
    });
    if (activation.category !== "OK" || !activation.authUserId) throw new RegistrationOperationError("ACTIVATION_INVALID", "Your activation has expired. Start registration again.");
    if (activation.personalEmailConfirmed) return this.status(registrationId, activationToken);
    const verified = await this.dependencies.verifyPersonalEmail.verify({ authUserId: activation.authUserId, code: request.code });
    if (!verified) throw new RegistrationOperationError("CODE_INVALID", "We could not verify that personal email code.");
    return this.status(registrationId, activationToken);
  }
}
