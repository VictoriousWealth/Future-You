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
  "Cache-Control": "no-store",
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
  const status =
    error.code === "CONTEXT_NOT_FOUND"
      ? 404
      : error.code === "CONTEXT_VERSION_MISMATCH"
        ? 409
        : error.code === "SIMULATION_RUN_NOT_FOUND"
          ? 404
          : error.code === "INTERNAL_SIMULATOR_FAILURE"
            ? 500
            : error.code === "SIMULATION_REJECTED" ||
                error.code === "MATERIAL_INFORMATION_MISSING" ||
                error.code === "HORIZON_EXHAUSTED" ||
                error.code === "UNSUPPORTED_SCENARIO_TYPE"
          ? 422
          : error.code === "INVALID_MONEY"
            ? 400
            : 500;
  return jsonResponse(applicationErrorToDTO(error, correlationId), status);
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
