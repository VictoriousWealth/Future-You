import { z } from "zod";
import { API_VERSION } from "../dto/contracts";

export const REGISTRATION_ATTEMPT_SCHEMA = "employer-registration-attempt/1.0.0" as const;
export const REGISTRATION_VERIFICATION_SCHEMA = "employer-registration-verification/1.0.0" as const;
export const REGISTRATION_ACCOUNT_SCHEMA = "employer-registration-account/1.0.0" as const;
export const REGISTRATION_STATUS_SCHEMA = "employer-registration-status/1.0.0" as const;

const requestId = z.string().trim().min(8).max(100);
const email = z.string().trim().email().max(320);

export const beginRegistrationRequestSchema = z.object({
  companyId: z.string().trim().min(4).max(40),
  workEmail: email,
  requestId
}).strict();

export const verifyWorkCodeRequestSchema = z.object({
  code: z.string().regex(/^\d{6}$/),
  requestId
}).strict();

export const resendWorkCodeRequestSchema = z.object({ requestId }).strict();

export const createPersonalAccountRequestSchema = z.object({
  personalEmail: email,
  password: z.string().min(12).max(128),
  passwordConfirmation: z.string().min(12).max(128),
  displayName: z.string().trim().min(1).max(120),
  requestId
}).strict();

export const verifyPersonalEmailRequestSchema = z.object({
  code: z.string().regex(/^\d{6}$/),
  requestId
}).strict();

export type BeginRegistrationRequest = z.infer<typeof beginRegistrationRequestSchema>;
export type VerifyWorkCodeRequest = z.infer<typeof verifyWorkCodeRequestSchema>;
export type ResendWorkCodeRequest = z.infer<typeof resendWorkCodeRequestSchema>;
export type CreatePersonalAccountRequest = z.infer<typeof createPersonalAccountRequestSchema>;
export type VerifyPersonalEmailRequest = z.infer<typeof verifyPersonalEmailRequestSchema>;

export interface RegistrationAttemptDTO {
  readonly apiVersion: typeof API_VERSION;
  readonly schemaVersion: typeof REGISTRATION_ATTEMPT_SCHEMA;
  readonly kind: "employer_registration_attempt";
  readonly registrationId: string;
  readonly accepted: true;
  readonly maskedWorkEmail: string;
  readonly nextStep: "VERIFY_WORK_EMAIL";
}

export interface RegistrationVerificationDTO {
  readonly apiVersion: typeof API_VERSION;
  readonly schemaVersion: typeof REGISTRATION_VERIFICATION_SCHEMA;
  readonly kind: "employer_registration_verification";
  readonly verified: true;
  readonly nextStep: "CREATE_PERSONAL_ACCOUNT";
}

export interface RegistrationAccountDTO {
  readonly apiVersion: typeof API_VERSION;
  readonly schemaVersion: typeof REGISTRATION_ACCOUNT_SCHEMA;
  readonly kind: "employer_registration_account";
  readonly accepted: true;
  readonly nextStep: "CONFIRM_PERSONAL_EMAIL_AND_ONBOARD";
}

export interface RegistrationStatusDTO {
  readonly apiVersion: typeof API_VERSION;
  readonly schemaVersion: typeof REGISTRATION_STATUS_SCHEMA;
  readonly kind: "employer_registration_status";
  readonly state: string;
  readonly employerName: string;
  readonly personalEmailConfirmed: boolean;
  readonly onboardingComplete: boolean;
}

export type RegistrationErrorCode =
  | "INVALID_REQUEST"
  | "IDEMPOTENCY_CONFLICT"
  | "ACTIVATION_INVALID"
  | "CODE_INVALID"
  | "ATTEMPTS_EXHAUSTED"
  | "RATE_LIMITED"
  | "EMAILS_MUST_DIFFER"
  | "PASSWORDS_DO_NOT_MATCH"
  | "ACCOUNT_EXISTS"
  | "ACCOUNT_CREATION_IN_PROGRESS"
  | "EMAIL_DELIVERY_FAILED"
  | "CONFIGURATION_INVALID"
  | "PERSISTENCE_FAILURE";

export class RegistrationOperationError extends Error {
  constructor(
    readonly code: RegistrationErrorCode,
    message: string,
    readonly retryable = false
  ) {
    super(message);
    this.name = "RegistrationOperationError";
  }
}
