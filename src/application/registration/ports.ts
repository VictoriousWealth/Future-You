export interface WorkChallengeMaterial {
  readonly code: string;
  readonly digest: string;
  readonly salt: string;
  readonly keyVersion: string;
}

export interface RegistrationSecurityPort {
  normalizeCompanyId(value: string): string;
  normalizeEmail(value: string): string;
  fingerprint(value: string): string;
  requestFingerprint(value: unknown): string;
  issueWorkChallenge(registrationId: string): WorkChallengeMaterial;
  digestWorkCode(registrationId: string, code: string, salt: string, keyVersion: string): string;
  issueOpaqueToken(): Readonly<{ token: string; digest: string }>;
  digestOpaqueToken(token: string): string;
  digestAuthClaim(nonce: string): string;
}

export interface RegistrationMail {
  readonly to: string;
  readonly purpose: "WORK_CODE" | "PERSONAL_CONFIRMATION";
  readonly code: string;
  readonly registrationId: string;
  readonly deliveryId: string;
}

export interface RegistrationMailerPort {
  send(message: RegistrationMail): Promise<void>;
}

export interface PendingIdentityResult {
  readonly kind: "CREATED" | "EXISTS";
  readonly personalConfirmationCode: string | null;
}

export interface RegistrationIdentityPort {
  createPendingIdentity(input: Readonly<{
    registrationId: string;
    claimNonce: string;
    personalEmail: string;
    password: string;
    displayName: string;
  }>): Promise<PendingIdentityResult>;
  resendPersonalConfirmation(authUserId: string): Promise<Readonly<{
    personalEmail: string;
    personalConfirmationCode: string;
  }>>;
}

export interface PersonalEmailVerificationPort {
  verify(input: Readonly<{ authUserId: string; code: string }>): Promise<boolean>;
}

export interface RegistrationBeginPersistenceInput {
  readonly registrationId: string;
  readonly requestId: string;
  readonly requestFingerprint: string;
  readonly companyId: string;
  readonly workEmail: string;
  readonly workEmailFingerprint: string;
  readonly challenge: WorkChallengeMaterial;
  readonly deliveryId: string;
  readonly correlationId: string;
  readonly now: Date;
}

export interface RegistrationBeginPersistenceResult {
  readonly category: "ACCEPTED" | "IDEMPOTENCY_CONFLICT";
  readonly registrationId: string;
  readonly shouldDeliver: boolean;
  readonly deliveryId: string | null;
  readonly deliveryAddress: string | null;
}

export interface RegistrationChallengeRecord {
  readonly state: string;
  readonly digest: string | null;
  readonly salt: string | null;
  readonly keyVersion: string | null;
  readonly expiresAt: string | null;
}

export interface RegistrationActivationRecord {
  readonly category: "OK" | "ACTIVATION_INVALID";
  readonly state: string | null;
  readonly authUserId: string | null;
  readonly personalEmailConfirmed: boolean;
  readonly onboardingComplete: boolean;
  readonly employerName: string | null;
}

export interface RegistrationPersistencePort {
  begin(input: RegistrationBeginPersistenceInput): Promise<RegistrationBeginPersistenceResult>;
  markDelivery(input: Readonly<{
    registrationId: string;
    deliveryId: string;
    status: "SENT" | "FAILED";
    correlationId: string;
    now: Date;
  }>): Promise<void>;
  challenge(registrationId: string): Promise<RegistrationChallengeRecord | null>;
  verifyWorkCode(input: Readonly<{
    registrationId: string;
    requestId: string;
    requestFingerprint: string;
    candidateDigest: string;
    activationDigest: string;
    correlationId: string;
    now: Date;
  }>): Promise<Readonly<{ category: string; verified: boolean }>>;
  resendWorkCode(input: Readonly<{
    registrationId: string;
    requestId: string;
    requestFingerprint: string;
    challenge: WorkChallengeMaterial;
    deliveryId: string;
    correlationId: string;
    now: Date;
  }>): Promise<Readonly<{
    category: string;
    shouldDeliver: boolean;
    deliveryId: string | null;
    deliveryAddress: string | null;
  }>>;
  reservePersonalAccount(input: Readonly<{
    registrationId: string;
    requestId: string;
    requestFingerprint: string;
    activationDigest: string;
    personalEmail: string;
    personalEmailFingerprint: string;
    authClaimDigest: string;
    rotatedActivationDigest: string;
    deliveryId: string;
    correlationId: string;
    now: Date;
  }>): Promise<Readonly<{ category: string; reserved: boolean }>>;
  releasePersonalAccountReservation(input: Readonly<{
    registrationId: string;
    requestId: string;
    requestFingerprint: string;
    rotatedActivationDigest: string;
    correlationId: string;
    now: Date;
  }>): Promise<boolean>;
  reservePersonalConfirmationResend(input: Readonly<{
    registrationId: string;
    requestId: string;
    requestFingerprint: string;
    activationDigest: string;
    deliveryId: string;
    correlationId: string;
    now: Date;
  }>): Promise<Readonly<{
    category: string;
    shouldDeliver: boolean;
    deliveryId: string | null;
    authUserId: string | null;
  }>>;
  markAccountConflict(registrationId: string, correlationId: string, now: Date): Promise<void>;
  activationStatus(input: Readonly<{
    registrationId: string;
    activationDigest: string;
    now: Date;
  }>): Promise<RegistrationActivationRecord>;
}
