import type { NextResponse } from "next/server";
import type { RegistrationApplication } from "../../application/registration/application";
import { RegistrationOperationError } from "../../application/registration/contracts";
import type { ApiErrorCode, ApiErrorResponseDTO } from "../../application/dto/contracts";
import { resolveRegistrationApplication } from "../registration-application";
import { apiErrorResponse } from "./api-response";

export type RegistrationApplicationResolver = () => Promise<RegistrationApplication>;

const rateWindows = new Map<string, { count: number; startedAt: number }>();

export function registrationRateLimit(
  request: Request,
  action: string,
  correlationId: string,
  maximum = 20
): NextResponse<ApiErrorResponseDTO> | null {
  const suppliedLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(suppliedLength) && suppliedLength > 8_192) {
    return apiErrorResponse(413, "INVALID_REQUEST", "Registration requests are limited to 8 KB.", correlationId);
  }
  const address = request.headers.get("x-forwarded-for")?.split(",", 1)[0]?.trim()
    ?? request.headers.get("x-real-ip")
    ?? "local";
  const key = `${action}:${address}`;
  const now = Date.now();
  const current = rateWindows.get(key);
  if (!current || now - current.startedAt >= 60_000) {
    rateWindows.set(key, { count: 1, startedAt: now });
    return null;
  }
  current.count += 1;
  if (current.count > maximum) {
    return apiErrorResponse(429, "RATE_LIMITED", "Too many registration requests. Try again shortly.", correlationId, [], true);
  }
  return null;
}

function mappedError(error: RegistrationOperationError): Readonly<{
  status: number;
  code: ApiErrorCode;
}> {
  switch (error.code) {
    case "IDEMPOTENCY_CONFLICT": return { status: 409, code: "REGISTRATION_IDEMPOTENCY_KEY_REUSED" };
    case "ACTIVATION_INVALID": return { status: 401, code: "REGISTRATION_ACTIVATION_INVALID" };
    case "CODE_INVALID": return { status: 422, code: "REGISTRATION_CODE_INVALID" };
    case "ATTEMPTS_EXHAUSTED": return { status: 429, code: "REGISTRATION_CODE_ATTEMPTS_EXHAUSTED" };
    case "RATE_LIMITED": return { status: 429, code: "RATE_LIMITED" };
    case "EMAILS_MUST_DIFFER": return { status: 422, code: "REGISTRATION_EMAILS_MUST_DIFFER" };
    case "PASSWORDS_DO_NOT_MATCH": return { status: 422, code: "INVALID_REQUEST" };
    case "ACCOUNT_EXISTS": return { status: 409, code: "REGISTRATION_PERSONAL_LOGIN_UNAVAILABLE" };
    case "ACCOUNT_CREATION_IN_PROGRESS": return { status: 409, code: "REGISTRATION_ACCOUNT_CREATION_IN_PROGRESS" };
    case "EMAIL_DELIVERY_FAILED": return { status: 503, code: "REGISTRATION_EMAIL_DELIVERY_FAILED" };
    case "CONFIGURATION_INVALID": return { status: 503, code: "REGISTRATION_CONFIGURATION_INVALID" };
    case "PERSISTENCE_FAILURE": return { status: 503, code: "PERSISTENCE_FAILURE" };
    case "INVALID_REQUEST": return { status: 400, code: "INVALID_REQUEST" };
  }
}

export async function withRegistrationApplication(
  correlationId: string,
  operation: (application: RegistrationApplication) => Promise<Response>,
  resolver: RegistrationApplicationResolver = resolveRegistrationApplication
): Promise<Response> {
  try {
    return await operation(await resolver());
  } catch (error) {
    if (error instanceof RegistrationOperationError) {
      const mapped = mappedError(error);
      return apiErrorResponse(mapped.status, mapped.code, error.message, correlationId, [], error.retryable);
    }
    return apiErrorResponse(503, "PERSISTENCE_FAILURE", "Registration is temporarily unavailable.", correlationId, [], true);
  }
}
