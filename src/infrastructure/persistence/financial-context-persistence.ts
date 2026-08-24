import { z } from "zod";
import { createFinancialContext } from "../../domain/simulator/context";
import { mustLocalDate, mustYearMonth } from "../../domain/shared/date";
import { gbp, type Money } from "../../domain/shared/money";
import type {
  Evidence,
  FinancialContextSnapshot,
  InputScope,
  PlanningValue
} from "../../domain/simulator/types";
import { PersistenceBoundaryError } from "./persistence-errors";

export const FINANCIAL_CONTEXT_PERSISTENCE_SCHEMA =
  "future-you.financial-context/1.0.0" as const;

const identifier = z.string().min(1).max(160);
const localDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const yearMonth = z.string().regex(/^\d{4}-\d{2}$/);
const exactMinorUnits = z.string().regex(/^(0|[1-9]\d*)$/);

const moneySchema = z.object({
  currency: z.literal("GBP"),
  minorUnits: exactMinorUnits
}).strict();

const scopeSchema = z.union([
  z.literal("CURRENT_PATH"),
  z.object({ type: z.literal("SCENARIO"), scenarioId: identifier }).strict()
]);

const evidenceSchema = z.object({
  state: z.enum(["CONFIRMED", "ESTIMATED", "UNKNOWN", "HYPOTHETICAL"]),
  source: z.string().min(1).max(300),
  scope: scopeSchema,
  acceptedForPlanning: z.boolean(),
  lastConfirmedDate: localDate.nullable()
}).strict();

const planningMoneySchema = z.object({
  value: moneySchema.nullable(),
  evidence: evidenceSchema
}).strict().superRefine((value, context) => {
  if ((value.value === null) !== (value.evidence.state === "UNKNOWN")) {
    context.addIssue({
      code: "custom",
      message: "Only UNKNOWN planning values may contain null."
    });
  }
});

const persistedFinancialContextSchema = z.object({
  id: identifier,
  version: identifier,
  schemaVersion: z.string().min(1).max(120),
  snapshotDate: localDate,
  projectionStartPeriod: yearMonth,
  jurisdiction: z.literal("ENGLAND_AND_WALES"),
  currentAccount: z.object({
    id: identifier,
    clearedBalance: planningMoneySchema,
    reservedSpending: planningMoneySchema,
    overdraftLimit: moneySchema,
    overdraftIncludedAsCash: z.literal(false)
  }).strict(),
  desiredSafetyBuffer: planningMoneySchema,
  income: z.object({
    id: identifier,
    amount: planningMoneySchema,
    paydayRule: z.union([
      z.object({ type: z.literal("LAST_WORKING_DAY") }).strict(),
      z.object({ type: z.literal("FIXED_DAY"), day: z.number().int().min(1).max(31) }).strict()
    ]),
    recurrence: z.literal("MONTHLY")
  }).strict(),
  routineSpending: z.object({
    total: planningMoneySchema,
    items: z.array(z.object({
      id: identifier,
      label: z.string().min(1).max(160),
      amount: moneySchema,
      required: z.boolean()
    }).strict())
  }).strict(),
  requiredObligationsConfirmed: z.boolean(),
  requiredObligations: z.array(z.object({
    id: identifier,
    label: z.string().min(1).max(160),
    amount: planningMoneySchema,
    recurrence: z.literal("MONTHLY"),
    due: z.union([
      z.object({ type: z.literal("MONTH_ONLY") }).strict(),
      z.object({ type: z.literal("DAY_OF_MONTH"), day: z.number().int().min(1).max(31) }).strict()
    ]),
    includedInRoutineEnvelope: z.boolean()
  }).strict()),
  goals: z.array(z.object({
    id: identifier,
    label: z.string().min(1).max(160),
    openingBalance: planningMoneySchema,
    targetBalance: planningMoneySchema,
    paused: z.boolean()
  }).strict()),
  goalAllocationPolicy: z.object({
    normalContributionBudget: planningMoneySchema,
    orderedSlots: z.array(z.object({
      goalId: identifier,
      normalCap: moneySchema
    }).strict()),
    overflowGoalId: identifier.nullable(),
    lockedAllocations: z.array(z.object({
      period: yearMonth,
      goalId: identifier,
      amount: moneySchema
    }).strict())
  }).strict(),
  confirmedOneOffEvents: z.array(z.object({
    id: identifier,
    label: z.string().min(1).max(160),
    amount: planningMoneySchema,
    period: yearMonth,
    date: localDate.nullable(),
    datePrecision: z.enum(["EXACT", "MONTH"]),
    additionalToRoutineSpending: z.literal(true)
  }).strict()),
  informationalContext: z.array(z.discriminatedUnion("kind", [
    z.object({
      kind: z.literal("PENSION_INFORMATION"),
      employeeContributionPercent: z.number().finite().nonnegative(),
      employerContributionPercent: z.number().finite().nonnegative(),
      includedInNetIncomeAlready: z.literal(true),
      employerContributionSpendable: z.literal(false)
    }).strict(),
    z.object({
      kind: z.literal("PAYROLL_DEDUCTIONS_INFORMATION"),
      takeHomeAlreadyNetOfStudentLoan: z.literal(true)
    }).strict()
  ]))
}).strict();

export type PersistedFinancialContext = z.infer<typeof persistedFinancialContextSchema>;

function moneyToPersistence(money: Money): PersistedFinancialContext["currentAccount"]["overdraftLimit"] {
  return { currency: money.currency, minorUnits: money.minor.toString() };
}

function moneyFromPersistence(value: z.infer<typeof moneySchema>): Money {
  return gbp(BigInt(value.minorUnits));
}

function scopeToPersistence(scope: InputScope): z.infer<typeof scopeSchema> {
  return scope === "CURRENT_PATH"
    ? scope
    : { type: "SCENARIO", scenarioId: scope.scenarioId };
}

function scopeFromPersistence(scope: z.infer<typeof scopeSchema>): InputScope {
  return scope === "CURRENT_PATH"
    ? scope
    : { type: "SCENARIO", scenarioId: scope.scenarioId };
}

function evidenceToPersistence(evidence: Evidence): z.infer<typeof evidenceSchema> {
  return {
    state: evidence.state,
    source: evidence.source,
    scope: scopeToPersistence(evidence.scope),
    acceptedForPlanning: evidence.acceptedForPlanning,
    lastConfirmedDate: evidence.lastConfirmedDate
  };
}

function evidenceFromPersistence(evidence: z.infer<typeof evidenceSchema>): Evidence {
  return {
    state: evidence.state,
    source: evidence.source,
    scope: scopeFromPersistence(evidence.scope),
    acceptedForPlanning: evidence.acceptedForPlanning,
    lastConfirmedDate:
      evidence.lastConfirmedDate === null ? null : mustLocalDate(evidence.lastConfirmedDate)
  };
}

function planningMoneyToPersistence(
  planning: PlanningValue<Money>
): z.infer<typeof planningMoneySchema> {
  return {
    value: planning.value === null ? null : moneyToPersistence(planning.value),
    evidence: evidenceToPersistence(planning.evidence)
  };
}

function planningMoneyFromPersistence(
  planning: z.infer<typeof planningMoneySchema>
): PlanningValue<Money> {
  if (planning.value === null) {
    return {
      value: null,
      evidence: {
        ...evidenceFromPersistence(planning.evidence),
        state: "UNKNOWN"
      }
    };
  }
  return {
    value: moneyFromPersistence(planning.value),
    evidence: evidenceFromPersistence(planning.evidence)
  };
}

export function financialContextToPersistence(
  context: FinancialContextSnapshot
): PersistedFinancialContext {
  const validated = createFinancialContext(context);
  if (!validated.ok) {
    throw new PersistenceBoundaryError(
      "PERSISTED_DATA_INVALID",
      "Financial context failed domain validation before persistence."
    );
  }
  return {
    id: context.id,
    version: context.version,
    schemaVersion: context.schemaVersion,
    snapshotDate: context.snapshotDate,
    projectionStartPeriod: context.projectionStartPeriod,
    jurisdiction: context.jurisdiction,
    currentAccount: {
      id: context.currentAccount.id,
      clearedBalance: planningMoneyToPersistence(context.currentAccount.clearedBalance),
      reservedSpending: planningMoneyToPersistence(context.currentAccount.reservedSpending),
      overdraftLimit: moneyToPersistence(context.currentAccount.overdraftLimit),
      overdraftIncludedAsCash: false
    },
    desiredSafetyBuffer: planningMoneyToPersistence(context.desiredSafetyBuffer),
    income: {
      id: context.income.id,
      amount: planningMoneyToPersistence(context.income.amount),
      paydayRule: context.income.paydayRule,
      recurrence: "MONTHLY"
    },
    routineSpending: {
      total: planningMoneyToPersistence(context.routineSpending.total),
      items: context.routineSpending.items.map((item) => ({
        id: item.id,
        label: item.label,
        amount: moneyToPersistence(item.amount),
        required: item.required
      }))
    },
    requiredObligationsConfirmed: context.requiredObligationsConfirmed,
    requiredObligations: context.requiredObligations.map((obligation) => ({
      id: obligation.id,
      label: obligation.label,
      amount: planningMoneyToPersistence(obligation.amount),
      recurrence: "MONTHLY",
      due: obligation.due,
      includedInRoutineEnvelope: obligation.includedInRoutineEnvelope
    })),
    goals: context.goals.map((goal) => ({
      id: goal.id,
      label: goal.label,
      openingBalance: planningMoneyToPersistence(goal.openingBalance),
      targetBalance: planningMoneyToPersistence(goal.targetBalance),
      paused: goal.paused
    })),
    goalAllocationPolicy: {
      normalContributionBudget: planningMoneyToPersistence(
        context.goalAllocationPolicy.normalContributionBudget
      ),
      orderedSlots: context.goalAllocationPolicy.orderedSlots.map((slot) => ({
        goalId: slot.goalId,
        normalCap: moneyToPersistence(slot.normalCap)
      })),
      overflowGoalId: context.goalAllocationPolicy.overflowGoalId,
      lockedAllocations: context.goalAllocationPolicy.lockedAllocations.map((allocation) => ({
        period: allocation.period,
        goalId: allocation.goalId,
        amount: moneyToPersistence(allocation.amount)
      }))
    },
    confirmedOneOffEvents: context.confirmedOneOffEvents.map((event) => ({
      id: event.id,
      label: event.label,
      amount: planningMoneyToPersistence(event.amount),
      period: event.period,
      date: event.date,
      datePrecision: event.datePrecision,
      additionalToRoutineSpending: true
    })),
    informationalContext: context.informationalContext.map((information) => ({ ...information }))
  };
}

export function financialContextFromPersistence(
  input: unknown,
  persistenceSchemaVersion: string
): FinancialContextSnapshot {
  if (persistenceSchemaVersion !== FINANCIAL_CONTEXT_PERSISTENCE_SCHEMA) {
    throw new PersistenceBoundaryError(
      "PERSISTED_SCHEMA_UNSUPPORTED",
      "The persisted financial-context schema is not supported by this application build."
    );
  }
  const parsed = persistedFinancialContextSchema.safeParse(input);
  if (!parsed.success) {
    throw new PersistenceBoundaryError(
      "PERSISTED_DATA_INVALID",
      "The persisted financial context did not match its canonical schema."
    );
  }
  const value = parsed.data;
  const domain: FinancialContextSnapshot = {
    id: value.id,
    version: value.version,
    schemaVersion: value.schemaVersion,
    snapshotDate: mustLocalDate(value.snapshotDate),
    projectionStartPeriod: mustYearMonth(value.projectionStartPeriod),
    jurisdiction: value.jurisdiction,
    currentAccount: {
      id: value.currentAccount.id,
      clearedBalance: planningMoneyFromPersistence(value.currentAccount.clearedBalance),
      reservedSpending: planningMoneyFromPersistence(value.currentAccount.reservedSpending),
      overdraftLimit: moneyFromPersistence(value.currentAccount.overdraftLimit),
      overdraftIncludedAsCash: false
    },
    desiredSafetyBuffer: planningMoneyFromPersistence(value.desiredSafetyBuffer),
    income: {
      id: value.income.id,
      amount: planningMoneyFromPersistence(value.income.amount),
      paydayRule: value.income.paydayRule,
      recurrence: "MONTHLY"
    },
    routineSpending: {
      total: planningMoneyFromPersistence(value.routineSpending.total),
      items: value.routineSpending.items.map((item) => ({
        id: item.id,
        label: item.label,
        amount: moneyFromPersistence(item.amount),
        required: item.required
      }))
    },
    requiredObligationsConfirmed: value.requiredObligationsConfirmed,
    requiredObligations: value.requiredObligations.map((obligation) => ({
      id: obligation.id,
      label: obligation.label,
      amount: planningMoneyFromPersistence(obligation.amount),
      recurrence: "MONTHLY",
      due: obligation.due,
      includedInRoutineEnvelope: obligation.includedInRoutineEnvelope
    })),
    goals: value.goals.map((goal) => ({
      id: goal.id,
      label: goal.label,
      openingBalance: planningMoneyFromPersistence(goal.openingBalance),
      targetBalance: planningMoneyFromPersistence(goal.targetBalance),
      paused: goal.paused
    })),
    goalAllocationPolicy: {
      normalContributionBudget: planningMoneyFromPersistence(
        value.goalAllocationPolicy.normalContributionBudget
      ),
      orderedSlots: value.goalAllocationPolicy.orderedSlots.map((slot) => ({
        goalId: slot.goalId,
        normalCap: moneyFromPersistence(slot.normalCap)
      })),
      overflowGoalId: value.goalAllocationPolicy.overflowGoalId,
      lockedAllocations: value.goalAllocationPolicy.lockedAllocations.map((allocation) => ({
        period: mustYearMonth(allocation.period),
        goalId: allocation.goalId,
        amount: moneyFromPersistence(allocation.amount)
      }))
    },
    confirmedOneOffEvents: value.confirmedOneOffEvents.map((event) => ({
      id: event.id,
      label: event.label,
      amount: planningMoneyFromPersistence(event.amount),
      period: mustYearMonth(event.period),
      date: event.date === null ? null : mustLocalDate(event.date),
      datePrecision: event.datePrecision,
      additionalToRoutineSpending: true
    })),
    informationalContext: value.informationalContext.map((information) => ({ ...information }))
  };
  const validated = createFinancialContext(domain);
  if (!validated.ok) {
    throw new PersistenceBoundaryError(
      "PERSISTED_DATA_INVALID",
      "The persisted financial context failed domain validation after rehydration."
    );
  }
  return validated.value;
}
