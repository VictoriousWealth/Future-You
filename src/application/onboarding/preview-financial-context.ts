import { generateBaseline } from "../../domain/simulator/engine";
import { inputIdentity } from "../../domain/shared/identity";
import { addMonths, dateInMonth, daysInMonth } from "../../domain/shared/date";
import { signedGbp } from "../../domain/shared/money";
import { err, ok, type Result } from "../../domain/shared/result";
import { moneyToDTO, projectionToDTO, signedMinorToDTO } from "../mappers/domain-to-dto";
import type { CalendarFixtureMetadata } from "../use-cases/dependencies";
import type { WorkingDayCalendar } from "../../domain/calendar/working-day-calendar";
import type { FinancialContextSnapshot, SimulationRules } from "../../domain/simulator/types";
import {
  API_VERSION,
  type AssumptionDTO
} from "../dto/contracts";
import {
  FINANCIAL_CONTEXT_PREVIEW_SCHEMA,
  type FinancialContextPreviewDTO,
  type PreviewFinancialContextRequestDTO
} from "./contracts";
import {
  financialOnboardingDraftToContext,
  type CandidateContextErrorCode
} from "./draft-to-context";
import { createFinancialContext } from "../../domain/simulator/context";
import type { OnboardingValidationIssue } from "./validation";

export interface OnboardingOperationError {
  readonly code:
    | CandidateContextErrorCode
    | "ONBOARDING_INFORMATION_INSUFFICIENT"
    | "ONBOARDING_PREVIEW_MISMATCH"
    | "FINANCIAL_CONTEXT_REQUIRED"
    | "CONTEXT_VERSION_CONFLICT"
    | "IDEMPOTENCY_KEY_REUSED"
    | "PERSISTENCE_FAILURE";
  readonly message: string;
  readonly issues: readonly OnboardingValidationIssue[];
}

export interface PreviewDependencies {
  readonly rules: SimulationRules;
  readonly calendar: WorkingDayCalendar;
  readonly calendarMetadata: CalendarFixtureMetadata;
}

export interface PreparedFinancialContextPreview {
  readonly canonicalRequestHash: string;
  readonly context: FinancialContextSnapshot;
  readonly preview: FinancialContextPreviewDTO;
}

function alignToNextFundingEvent(
  context: FinancialContextSnapshot,
  dependencies: PreviewDependencies
): FinancialContextSnapshot {
  const snapshotPeriod = context.snapshotDate.slice(0, 7) as FinancialContextSnapshot["projectionStartPeriod"];
  const fundingDate =
    context.income.paydayRule.type === "FIXED_DAY"
      ? dateInMonth(
          snapshotPeriod,
          Math.min(context.income.paydayRule.day, daysInMonth(snapshotPeriod))
        )
      : dependencies.calendar.lastWorkingDay(snapshotPeriod, context.jurisdiction).date;
  const projectionStartPeriod =
    context.snapshotDate <= fundingDate ? snapshotPeriod : addMonths(snapshotPeriod, 1);
  if (projectionStartPeriod === context.projectionStartPeriod) return context;
  const shifted = createFinancialContext({
    ...context,
    projectionStartPeriod,
    goalAllocationPolicy: {
      ...context.goalAllocationPolicy,
      lockedAllocations: context.goalAllocationPolicy.lockedAllocations.map((allocation) => ({
        ...allocation,
        period: projectionStartPeriod
      }))
    }
  });
  if (!shifted.ok) throw new TypeError("A funding-period alignment broke context invariants.");
  return shifted.value;
}

function allAssumptions(projection: FinancialContextPreviewDTO["baseline"]["projection"]): AssumptionDTO[] {
  return [
    ...projection.assumptions.confirmedFacts,
    ...projection.assumptions.acceptedEstimates,
    ...projection.assumptions.systemAssumptions,
    ...projection.assumptions.unknownOrExcluded,
    ...projection.assumptions.hypotheticalChanges
  ];
}

export function prepareFinancialContextPreview(
  request: PreviewFinancialContextRequestDTO,
  dependencies: PreviewDependencies
): Result<PreparedFinancialContextPreview, OnboardingOperationError> {
  const candidate = financialOnboardingDraftToContext(request.draft);
  if (!candidate.ok) {
    return err({
      code: candidate.code,
      message: "The onboarding information could not form a valid financial context.",
      issues: candidate.issues
    });
  }

  const alignedContext = alignToNextFundingEvent(candidate.context, dependencies);
  const canonicalRequestHash = inputIdentity({
    mode: request.mode,
    expectedCurrentContextVersionId: request.expectedCurrentContextVersionId,
    financialContext: alignedContext,
    workplace: request.draft.workplace
  });
  const baselineId = `onboarding-${canonicalRequestHash.slice("fnv1a64:".length)}`;
  const baseline = generateBaseline({
    baselineId,
    context: alignedContext,
    rules: dependencies.rules,
    calendar: dependencies.calendar
  });
  if (!baseline.ok) {
    return err({
      code:
        baseline.error.code === "INSUFFICIENT_INFORMATION"
          ? "ONBOARDING_INFORMATION_INSUFFICIENT"
          : "ONBOARDING_INPUT_INVALID",
      message: baseline.error.message,
      issues: baseline.error.missingFields.map((field) => ({
        path: `draft.${field}`,
        message: "This material value is required for the baseline."
      }))
    });
  }

  const projection = projectionToDTO(baseline.value, dependencies.calendarMetadata);
  const actualCash = alignedContext.currentAccount.clearedBalance.value!;
  const remainingReserve = alignedContext.currentAccount.reservedSpending.value!;
  const currentBufferMinor = actualCash.minor - remainingReserve.minor;
  const desiredBuffer = alignedContext.desiredSafetyBuffer.value!;
  const contributionCapacity = alignedContext.goalAllocationPolicy.normalContributionBudget.value!;
  const warnings: { code: string; message: string }[] = [];
  if (currentBufferMinor < desiredBuffer.minor) {
    warnings.push({
      code: "BASELINE_BUFFER_BELOW_PREFERENCE",
      message: "Your current unallocated safety buffer is below your preferred level before any new decision."
    });
  }
  if (!baseline.value.requiredPaymentsCovered) {
    warnings.push({
      code: "BASELINE_REQUIRED_PAYMENT_PRESSURE",
      message: "The current path does not cover every modelled required payment."
    });
  }
  if (baseline.value.cashBecameNegative) {
    warnings.push({
      code: "BASELINE_NEGATIVE_CASH",
      message: "The current path becomes negative without adding a hypothetical decision."
    });
  }
  if (projection.assumptions.systemAssumptions.some((item) => item.id.startsWith("calendar-fallback-"))) {
    warnings.push({
      code: "CALENDAR_FALLBACK_WARNING",
      message: "Some projections extend beyond our current bank-holiday calendar. Future You used weekdays for those later paydays. Your monthly goal estimates are unchanged."
    });
  }

  const goalSlotById = new Map(
    alignedContext.goalAllocationPolicy.orderedSlots.map((slot) => [slot.goalId, slot])
  );
  const completionById = new Map(projection.goalCompletions.map((item) => [item.goalId, item]));
  const preview: FinancialContextPreviewDTO = {
    apiVersion: API_VERSION,
    schemaVersion: FINANCIAL_CONTEXT_PREVIEW_SCHEMA,
    kind: "financial_context_preview",
    candidate: {
      previewId: `preview-${canonicalRequestHash.slice("fnv1a64:".length)}`,
      canonicalRequestHash
    },
    contextSummary: {
      actualCash: moneyToDTO(actualCash),
      remainingReserve: moneyToDTO(remainingReserve),
      currentSafetyBuffer: signedMinorToDTO(currentBufferMinor),
      desiredSafetyBuffer: moneyToDTO(desiredBuffer),
      monthlyNetIncome: moneyToDTO(alignedContext.income.amount.value!),
      monthlyRoutineSpending: moneyToDTO(alignedContext.routineSpending.total.value!),
      monthlyContributionCapacity: moneyToDTO(contributionCapacity)
    },
    goals: alignedContext.goals.map((goal) => {
      const completion = completionById.get(goal.id)!;
      return {
        goalId: goal.id,
        label: goal.label,
        currentBalance: moneyToDTO(goal.openingBalance.value!),
        targetBalance: moneyToDTO(goal.targetBalance.value!),
        normalContribution: moneyToDTO(goalSlotById.get(goal.id)!.normalCap),
        completion:
          completion.status === "COMPLETED"
            ? { status: "COMPLETED" as const, month: completion.month }
            : {
                status: "NOT_REACHED_WITHIN_HORIZON" as const,
                projectedThrough: completion.projectedThrough,
                horizonAllocationEvents: completion.horizonAllocationEvents
              }
      };
    }),
    baseline: {
      requiredPaymentsCovered: baseline.value.requiredPaymentsCovered,
      lowestCash: moneyToDTO(signedGbp(baseline.value.minimumClearedCash.minor)),
      existingPressure:
        currentBufferMinor < desiredBuffer.minor ||
        baseline.value.cashBecameNegative ||
        !baseline.value.requiredPaymentsCovered,
      warnings,
      projection
    },
    assumptions: allAssumptions(projection),
    confidence: projection.confidence,
    versions: {
      contextSchemaVersion: alignedContext.schemaVersion,
      rulesVersion: dependencies.rules.version,
      calendarVersion: dependencies.calendar.version
    }
  };

  return ok({ canonicalRequestHash, context: alignedContext, preview });
}

export class PreviewFinancialContextUseCase {
  constructor(private readonly dependencies: PreviewDependencies) {}

  execute(
    request: PreviewFinancialContextRequestDTO
  ): Result<FinancialContextPreviewDTO, OnboardingOperationError> {
    const prepared = prepareFinancialContextPreview(request, this.dependencies);
    return prepared.ok ? ok(prepared.value.preview) : prepared;
  }
}
