import {
  API_VERSION,
  ERROR_RESPONSE_SCHEMA,
  type ApiErrorCode,
  type ApiErrorResponseDTO
} from "../dto/contracts";
import type { RequestValidationIssue } from "../dto/request-validation";
import type { ApplicationError } from "../errors/application-error";

export function validationErrorToDTO(input: Readonly<{
  code: ApiErrorCode;
  message: string;
  correlationId: string;
  issues?: readonly RequestValidationIssue[];
}>): ApiErrorResponseDTO {
  const issues = input.issues ?? [];
  return {
    apiVersion: API_VERSION,
    schemaVersion: ERROR_RESPONSE_SCHEMA,
    error: {
      code: input.code,
      message: input.message,
      ...(issues[0]?.path ? { field: issues[0].path } : {}),
      details: { issues, missingFields: [] },
      retryable: false,
      correlationId: input.correlationId
    }
  };
}

export function applicationErrorToDTO(
  error: ApplicationError,
  correlationId: string
): ApiErrorResponseDTO {
  const apiCode: ApiErrorCode =
    error.code === "FINANCIAL_CONTEXT_NOT_FOUND"
      ? "FINANCIAL_CONTEXT_REQUIRED"
      : error.code;
  const issues = error.missingFields.map((field) => ({
    path: field,
    message: "Required material context."
  }));
  return {
    apiVersion: API_VERSION,
    schemaVersion: ERROR_RESPONSE_SCHEMA,
    error: {
      code: apiCode,
      message:
        apiCode === "FINANCIAL_CONTEXT_REQUIRED"
          ? "Complete financial onboarding before using this operation."
          : error.message,
      ...(error.missingFields[0] ? { field: error.missingFields[0] } : {}),
      details: { issues, missingFields: error.missingFields },
      retryable: false,
      correlationId
    }
  };
}
