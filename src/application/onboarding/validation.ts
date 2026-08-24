import { z } from "zod";
import type {
  ConfirmFinancialContextRequestDTO,
  FinancialOnboardingDraftDTO,
  PreviewFinancialContextRequestDTO
} from "./contracts";

const identifier = z
  .string()
  .min(1)
  .max(120)
  .regex(/^[A-Za-z0-9][A-Za-z0-9@._:/-]*$/);
const requestId = z
  .string()
  .min(3)
  .max(64)
  .regex(/^[A-Za-z0-9][A-Za-z0-9_-]*$/);
const date = z.string().date();
const label = z.string().trim().min(1).max(160);
const source = z.string().trim().min(1).max(300);

const decimalMoney = z.object({
  currency: z.literal("GBP"),
  amount: z.string().max(200)
}).strict();

const evidencedMoney = decimalMoney.extend({
  evidenceState: z.enum(["confirmed", "estimated"]),
  evidenceSource: source
}).strict();

const goal = z.object({
  id: identifier,
  label,
  currentBalance: evidencedMoney,
  targetBalance: evidencedMoney,
  normalContribution: decimalMoney,
  paused: z.boolean()
}).strict();

const obligation = z.object({
  id: identifier,
  label,
  amount: evidencedMoney,
  due: z.union([
    z.object({ type: z.literal("month_only") }).strict(),
    z.object({ type: z.literal("day_of_month"), day: z.number().int().min(1).max(31) }).strict()
  ]),
  includedInRoutineEnvelope: z.boolean()
}).strict();

const declaredObligations = z.discriminatedUnion("declaration", [
  z.object({ declaration: z.literal("none"), items: z.tuple([]) }).strict(),
  z.object({ declaration: z.literal("provided"), items: z.array(obligation).min(1).max(30) }).strict()
]);

const transfer = z.object({
  goalId: identifier,
  amount: decimalMoney,
  timing: z.literal("after_next_funding_event"),
  evidenceState: z.enum(["confirmed", "estimated"])
}).strict();

const declaredTransfers = z.discriminatedUnion("declaration", [
  z.object({ declaration: z.literal("none"), items: z.tuple([]) }).strict(),
  z.object({ declaration: z.literal("provided"), items: z.array(transfer).min(1).max(30) }).strict()
]);

const informationalContext = z.array(z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("pension_information"),
    employeeContributionPercent: z.number().finite().nonnegative().max(100),
    employerContributionPercent: z.number().finite().nonnegative().max(100)
  }).strict(),
  z.object({
    kind: z.literal("payroll_deductions_information"),
    takeHomeAlreadyNetOfStudentLoan: z.literal(true)
  }).strict()
])).max(2);

const workplace = z.object({
  name: label,
  associationSource: z.literal("user_provided"),
  verificationStatus: z.literal("unverified")
}).strict().nullable();

const draft = z.object({
  identity: z.object({
    contextId: identifier,
    contextVersion: identifier,
    currentAccountId: identifier,
    incomeId: identifier
  }).strict(),
  snapshotDate: date,
  currentAccount: z.object({
    actualClearedBalance: evidencedMoney,
    remainingCurrentCycleReserve: evidencedMoney,
    overdraftLimit: decimalMoney
  }).strict(),
  desiredSafetyBuffer: evidencedMoney,
  income: z.object({
    monthlyNetIncome: evidencedMoney,
    paydayRule: z.discriminatedUnion("type", [
      z.object({ type: z.literal("last_working_day") }).strict(),
      z.object({ type: z.literal("fixed_day"), day: z.number().int().min(1).max(31) }).strict()
    ])
  }).strict(),
  routineSpending: z.object({
    futureMonthlyTotal: evidencedMoney,
    items: z.array(z.object({
      id: identifier,
      label,
      amount: decimalMoney,
      required: z.boolean()
    }).strict()).max(40)
  }).strict(),
  requiredObligations: declaredObligations,
  goals: z.array(goal).min(1).max(20),
  goalPolicy: z.object({
    contributionBudgetEvidenceSource: source,
    allocationOrder: z.array(identifier).min(1).max(20),
    overflowGoalId: identifier.nullable()
  }).strict(),
  committedGoalTransfers: declaredTransfers,
  confirmedOneOffEvents: z.tuple([]),
  informationalContext,
  workplace
}).strict().superRefine((value, context) => {
  const goalIds = value.goals.map((item) => item.id);
  const uniqueGoalIds = new Set(goalIds);
  if (uniqueGoalIds.size !== goalIds.length) {
    context.addIssue({ code: "custom", path: ["goals"], message: "Goal IDs must be unique." });
  }
  const order = value.goalPolicy.allocationOrder;
  if (new Set(order).size !== order.length || order.length !== goalIds.length ||
      order.some((id) => !uniqueGoalIds.has(id))) {
    context.addIssue({
      code: "custom",
      path: ["goalPolicy", "allocationOrder"],
      message: "Allocation order must contain every goal exactly once."
    });
  }
  if (value.goalPolicy.overflowGoalId !== null && !uniqueGoalIds.has(value.goalPolicy.overflowGoalId)) {
    context.addIssue({
      code: "custom",
      path: ["goalPolicy", "overflowGoalId"],
      message: "Overflow destination must be one of the supplied goals."
    });
  }
  if (value.committedGoalTransfers.items.some((item) => !uniqueGoalIds.has(item.goalId))) {
    context.addIssue({
      code: "custom",
      path: ["committedGoalTransfers", "items"],
      message: "Every committed transfer must reference a supplied goal."
    });
  }
});

const previewRequest = z.object({
  draft,
  mode: z.enum(["initial", "revision"]),
  expectedCurrentContextVersionId: identifier.nullable()
}).strict().superRefine((value, context) => {
  if (value.mode === "initial" && value.expectedCurrentContextVersionId !== null) {
    context.addIssue({
      code: "custom",
      path: ["expectedCurrentContextVersionId"],
      message: "Initial onboarding must not name an existing context version."
    });
  }
  if (value.mode === "revision" && value.expectedCurrentContextVersionId === null) {
    context.addIssue({
      code: "custom",
      path: ["expectedCurrentContextVersionId"],
      message: "A revision must name the current context version being corrected."
    });
  }
});

const confirmRequest = previewRequest.and(z.object({
  requestId,
  reviewedCanonicalRequestHash: z.string().regex(/^fnv1a64:[0-9a-f]{16}$/)
}).strict());

export interface OnboardingValidationIssue {
  readonly path: string;
  readonly message: string;
}

export type OnboardingValidationResult<T> =
  | Readonly<{ ok: true; value: T }>
  | Readonly<{ ok: false; issues: readonly OnboardingValidationIssue[] }>;

function parse<T>(schema: z.ZodType<T>, input: unknown): OnboardingValidationResult<T> {
  const result = schema.safeParse(input);
  if (result.success) return { ok: true, value: result.data };
  return {
    ok: false,
    issues: result.error.issues.map((issue) => ({
      path: issue.path.join(".") || "$",
      message: issue.message
    }))
  };
}

export function parseFinancialOnboardingDraft(input: unknown): OnboardingValidationResult<FinancialOnboardingDraftDTO> {
  return parse(draft, input);
}

export function parsePreviewFinancialContextRequest(input: unknown): OnboardingValidationResult<PreviewFinancialContextRequestDTO> {
  return parse(previewRequest, input);
}

export function parseConfirmFinancialContextRequest(input: unknown): OnboardingValidationResult<ConfirmFinancialContextRequestDTO> {
  return parse(confirmRequest, input);
}
