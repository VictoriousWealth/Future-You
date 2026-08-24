import type { ApiErrorCode } from "../../application/dto/contracts";
import type { OnboardingOperationError } from "../../application/onboarding/preview-financial-context";
import { apiErrorResponse } from "./api-response";
import type { OnboardingValidationIssue } from "../../application/onboarding/validation";

export function onboardingOperationErrorResponse(
  error: OnboardingOperationError,
  correlationId: string
): Response {
  const status =
    error.code === "IDEMPOTENCY_KEY_REUSED" || error.code === "CONTEXT_VERSION_CONFLICT"
      ? 409
      : error.code === "FINANCIAL_CONTEXT_REQUIRED"
        ? 404
      : error.code === "PERSISTENCE_FAILURE"
        ? 503
        : error.code === "ONBOARDING_INFORMATION_INSUFFICIENT"
          ? 422
          : 400;
  return apiErrorResponse(
    status,
    error.code as ApiErrorCode,
    error.message,
    correlationId,
    error.issues,
    status === 503
  );
}

export function onboardingValidationCode(
  issues: readonly OnboardingValidationIssue[]
): ApiErrorCode {
  const paths = issues.map((item) => item.path);
  if (paths.some((path) => path.includes("paydayRule"))) return "PAYDAY_RULE_UNSUPPORTED";
  if (paths.some((path) => path.includes("remainingCurrentCycleReserve"))) {
    return "CURRENT_CYCLE_RESERVE_INVALID";
  }
  if (paths.some((path) => path.includes("goalPolicy") || path.includes("goals"))) {
    return "GOAL_POLICY_INVALID";
  }
  if (paths.some((path) => path.endsWith("currency") || path.endsWith("amount"))) {
    return "MONEY_INPUT_INVALID";
  }
  return "ONBOARDING_INPUT_INVALID";
}
