import { NextResponse } from "next/server";
import {
  type ApiErrorCode,
  type ApiErrorResponseDTO
} from "../../application/dto/contracts";
import type { ApplicationError } from "../../application/errors/application-error";
import type { RequestValidationIssue } from "../../application/dto/request-validation";
import {
  applicationErrorToDTO,
  validationErrorToDTO
} from "../../application/mappers/error-to-dto";

const JSON_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0",
  "Content-Type": "application/json; charset=utf-8"
} as const;

export function jsonResponse<T>(body: T, status = 200): NextResponse<T> {
  return NextResponse.json(body, { status, headers: JSON_HEADERS });
}

export function apiErrorResponse(
  status: number,
  code: ApiErrorCode,
  message: string,
  correlationId: string,
  details: readonly RequestValidationIssue[] = [],
  retryable = false
): NextResponse<ApiErrorResponseDTO> {
  const body = validationErrorToDTO({ code, message, correlationId, issues: details });
  if (retryable) {
    return jsonResponse({ ...body, error: { ...body.error, retryable: true } }, status);
  }
  return jsonResponse(body, status);
}

export function applicationErrorResponse(
  error: ApplicationError,
  correlationId: string
): NextResponse<ApiErrorResponseDTO> {
  const status = applicationErrorStatus(error.code);
  return jsonResponse(applicationErrorToDTO(error, correlationId), status);
}

function applicationErrorStatus(code: ApplicationError["code"]): number {
  switch (code) {
    case "FINANCIAL_CONTEXT_NOT_FOUND":
    case "CONTEXT_VERSION_NOT_FOUND":
    case "RUN_NOT_FOUND":
      return 404;
    case "CONTEXT_VERSION_MISMATCH":
    case "IDEMPOTENCY_KEY_REUSED":
      return 409;
    case "PERSISTENCE_FAILURE":
      return 503;
    case "SIMULATION_REJECTED":
    case "MATERIAL_INFORMATION_MISSING":
    case "HORIZON_EXHAUSTED":
    case "UNSUPPORTED_SCENARIO_TYPE":
      return 422;
    case "INVALID_MONEY":
      return 400;
    case "PERSISTED_DATA_INVALID":
    case "PERSISTED_SCHEMA_UNSUPPORTED":
    case "INTERNAL_SIMULATOR_FAILURE":
      return 500;
  }
}

export function internalSimulatorErrorResponse(correlationId: string): NextResponse<ApiErrorResponseDTO> {
  return apiErrorResponse(
    500,
    "INTERNAL_SIMULATOR_FAILURE",
    "The simulator could not complete the request.",
    correlationId
  );
}

export async function readJsonBody(
  request: Request
): Promise<Readonly<{ ok: true; value: unknown }> | Readonly<{ ok: false }>> {
  try {
    return { ok: true, value: await request.json() };
  } catch {
    return { ok: false };
  }
}
