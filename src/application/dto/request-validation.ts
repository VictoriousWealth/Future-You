import { z } from "zod";
import type {
  AmountAlternativesRequestDTO,
  ApiErrorCode,
  BaselineRequestDTO,
  OneOffPurchaseRequestDTO,
  ScenarioOptionsRequestDTO,
  TimingAlternativeRequestDTO
} from "./contracts";

const requestId = z
  .string()
  .min(3)
  .max(64)
  .regex(/^[A-Za-z0-9][A-Za-z0-9_-]*$/, "Use letters, numbers, underscores, or hyphens.");

const contextVersionId = z.string().min(1).max(120).regex(/^[A-Za-z0-9@._:/-]+$/);
const yearMonth = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Expected YYYY-MM.");
const localDate = z.string().date();
const positiveMinorUnits = z
  .string()
  .regex(/^[1-9]\d{0,15}$/, "Expected positive base-10 integer minor units.");

const moneyInput = z
  .object({
    currency: z.literal("GBP"),
    minorUnits: positiveMinorUnits
  })
  .strict();

const oneOffChange = z
  .object({
    type: z.literal("one_off_purchase"),
    amount: moneyInput,
    purpose: z.string().trim().min(1).max(120),
    paymentPeriod: yearMonth,
    paymentTiming: z.literal("assumed_conservative"),
    paymentDate: localDate.nullable().optional(),
    datePrecision: z.enum(["exact", "month"]),
    fundingSource: z.literal("current_account"),
    paymentPattern: z.literal("single"),
    costTreatment: z.literal("additional_to_routine_spending")
  })
  .strict()
  .superRefine((change, context) => {
    if (change.datePrecision === "exact" && !change.paymentDate) {
      context.addIssue({
        code: "custom",
        path: ["paymentDate"],
        message: "An exact purchase requires paymentDate."
      });
    }
    if (change.datePrecision === "month" && change.paymentDate) {
      context.addIssue({
        code: "custom",
        path: ["paymentDate"],
        message: "A month-precision purchase must not supply an exact date."
      });
    }
    if (change.paymentDate && change.paymentDate.slice(0, 7) !== change.paymentPeriod) {
      context.addIssue({
        code: "custom",
        path: ["paymentDate"],
        message: "paymentDate must be inside paymentPeriod."
      });
    }
  })
  .transform((change) => ({ ...change, paymentDate: change.paymentDate ?? null }));

const oneOffPurchaseRequest = z
  .object({
    requestId,
    expectedContextVersionId: contextVersionId,
    change: oneOffChange,
    assumptionConfirmations: z
      .array(z.string().min(1).max(120))
      .max(0, "Assumption editing is not exposed in the Slice 2 boundary proof.")
  })
  .strict();

const baselineRequest = z
  .object({
    requestId,
    expectedContextVersionId: contextVersionId
  })
  .strict();

const amountAlternativesRequest = z
  .object({
    requestId,
    source: oneOffPurchaseRequest
  })
  .strict();

const timingAlternativeRequest = z
  .object({
    requestId,
    source: oneOffPurchaseRequest,
    targetPaymentPeriod: yearMonth
  })
  .strict()
  .superRefine((request, context) => {
    if (request.targetPaymentPeriod === request.source.change.paymentPeriod) {
      context.addIssue({
        code: "custom",
        path: ["targetPaymentPeriod"],
        message: "A timing alternative must use a different spending cycle."
      });
    }
  });

const scenarioOptionsRequest = z
  .object({
    requestId,
    source: oneOffPurchaseRequest,
    timingAlternativePeriod: yearMonth
  })
  .strict()
  .superRefine((request, context) => {
    if (request.timingAlternativePeriod === request.source.change.paymentPeriod) {
      context.addIssue({
        code: "custom",
        path: ["timingAlternativePeriod"],
        message: "The scenario-set timing option must use a different spending cycle."
      });
    }
  });

export interface RequestValidationIssue {
  readonly path: string;
  readonly message: string;
}

export type RequestValidationResult<T> =
  | Readonly<{ ok: true; value: T }>
  | Readonly<{
      ok: false;
      code: Extract<
        ApiErrorCode,
        "INVALID_REQUEST" | "INVALID_MONEY" | "UNSUPPORTED_CURRENCY" | "UNSUPPORTED_SCENARIO_TYPE"
      >;
      issues: readonly RequestValidationIssue[];
    }>;

type ValidationErrorCode =
  | "INVALID_REQUEST"
  | "INVALID_MONEY"
  | "UNSUPPORTED_CURRENCY"
  | "UNSUPPORTED_SCENARIO_TYPE";

function validationCode(issues: readonly z.core.$ZodIssue[]): ValidationErrorCode {
  const paths = issues.map((issue) => issue.path.join("."));
  if (paths.some((path) => path.endsWith("change.type"))) return "UNSUPPORTED_SCENARIO_TYPE";
  if (paths.some((path) => path.endsWith("amount.currency"))) return "UNSUPPORTED_CURRENCY";
  if (paths.some((path) => path.endsWith("amount.minorUnits"))) return "INVALID_MONEY";
  return "INVALID_REQUEST";
}

function parse<T>(schema: z.ZodType<T>, input: unknown): RequestValidationResult<T> {
  const result = schema.safeParse(input);
  if (result.success) return { ok: true, value: result.data };
  return {
    ok: false,
    code: validationCode(result.error.issues),
    issues: result.error.issues.map((issue) => ({
      path: issue.path.join(".") || "$",
      message: issue.message
    }))
  };
}

export function parseOneOffPurchaseRequest(
  input: unknown
): RequestValidationResult<OneOffPurchaseRequestDTO> {
  return parse(oneOffPurchaseRequest, input);
}

export function parseBaselineRequest(input: unknown): RequestValidationResult<BaselineRequestDTO> {
  return parse(baselineRequest, input);
}

export function parseAmountAlternativesRequest(
  input: unknown
): RequestValidationResult<AmountAlternativesRequestDTO> {
  return parse(amountAlternativesRequest, input);
}

export function parseTimingAlternativeRequest(
  input: unknown
): RequestValidationResult<TimingAlternativeRequestDTO> {
  return parse(timingAlternativeRequest, input);
}

export function parseScenarioOptionsRequest(
  input: unknown
): RequestValidationResult<ScenarioOptionsRequestDTO> {
  return parse(scenarioOptionsRequest, input);
}
