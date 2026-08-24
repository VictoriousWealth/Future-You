import { inputIdentity } from "../../domain/shared/identity";
import { formatMoney, signedGbp, type Money } from "../../domain/shared/money";
import type { ResolvedFinancialContext } from "../../domain/simulator/context";
import { canonicalClassificationSummary } from "../../domain/simulator/result-summary";
import type {
  Assumption,
  AssumptionManifest,
  FinancialContextSnapshot,
  GoalCompletion,
  InputScope,
  LedgerEvent,
  Projection,
  ProjectionPeriod,
  ScenarioDefinition,
  ScenarioSimulationResult,
  Severity
} from "../../domain/simulator/types";
import {
  API_VERSION,
  BASELINE_RESPONSE_SCHEMA,
  CONTEXT_RESPONSE_SCHEMA,
  SCENARIO_RESPONSE_SCHEMA,
  type AssumptionDTO,
  type AssumptionManifestDTO,
  type BaselineResponseDTO,
  type CalculationMetadataDTO,
  type CalendarUsageDTO,
  type CurrentFinancialContextResponseDTO,
  type GoalCompletionDTO,
  type LedgerTraceEventDTO,
  type MoneyDTO,
  type OneOffPurchaseRequestDTO,
  type OneOffPurchaseResponseDTO,
  type ProjectionDTO,
  type ProjectionPeriodDTO,
  type RatioDTO,
  type ScenarioComparisonDTO,
  type ScenarioPresentationDTO,
  type ScopeDTO
} from "../dto/contracts";
import type { CalendarFixtureMetadata } from "../use-cases/dependencies";
import { APPLICATION_VERSION } from "../version";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December"
] as const;

function moneyDisplay(minor: bigint): string {
  const sign = minor < 0n ? "-" : "";
  const absolute = minor < 0n ? -minor : minor;
  const pounds = absolute / 100n;
  const pennies = (absolute % 100n).toString().padStart(2, "0");
  return `${sign}£${pounds}.${pennies}`;
}

export function moneyToDTO(money: Money): MoneyDTO {
  return {
    currency: money.currency,
    minorUnits: money.minor.toString(),
    display: moneyDisplay(money.minor)
  };
}

export function signedMinorToDTO(minor: bigint): MoneyDTO {
  return moneyToDTO(signedGbp(minor));
}

function roundRatioToBasisPoints(numerator: bigint, denominator: bigint): number {
  if (denominator <= 0n) throw new RangeError("A DTO ratio requires a positive denominator.");
  const sign = numerator < 0n ? -1n : 1n;
  const absolute = numerator < 0n ? -numerator : numerator;
  const rounded = (absolute * 10_000n + denominator / 2n) / denominator;
  const signed = rounded * sign;
  const numeric = Number(signed);
  if (!Number.isSafeInteger(numeric)) throw new RangeError("Ratio basis points exceed JSON-safe range.");
  return numeric;
}

function ratioDisplay(basisPoints: number): string {
  const sign = basisPoints < 0 ? "-" : "";
  const absolute = Math.abs(basisPoints);
  return `${sign}${Math.floor(absolute / 100)}.${String(absolute % 100).padStart(2, "0")}%`;
}

export function ratioToDTO(ratio: Readonly<{ numerator: bigint; denominator: bigint }>): RatioDTO {
  const basisPoints = roundRatioToBasisPoints(ratio.numerator, ratio.denominator);
  return {
    numerator: ratio.numerator.toString(),
    denominator: ratio.denominator.toString(),
    basisPoints,
    display: ratioDisplay(basisPoints)
  };
}

function scopeToDTO(scope: InputScope): ScopeDTO {
  return scope === "CURRENT_PATH" ? "current_path" : { scenarioId: scope.scenarioId };
}

function categoryToDTO(category: Assumption["category"]): AssumptionDTO["category"] {
  return {
    CONFIRMED_FACT: "confirmed_fact",
    ACCEPTED_ESTIMATE: "accepted_estimate",
    SYSTEM_ASSUMPTION: "system_assumption",
    HYPOTHETICAL_CHANGE: "hypothetical_change",
    UNKNOWN_OR_EXCLUDED: "unknown_or_excluded"
  }[category] as AssumptionDTO["category"];
}

function assumptionToDTO(assumption: Assumption): AssumptionDTO {
  return {
    id: assumption.id,
    category: categoryToDTO(assumption.category),
    description: assumption.description,
    source: assumption.source,
    material: assumption.material,
    editable:
      assumption.category === "SYSTEM_ASSUMPTION" ||
      assumption.category === "HYPOTHETICAL_CHANGE",
    likelyEffect: assumption.likelyEffect,
    scope: scopeToDTO(assumption.scope),
    affectedPeriods: assumption.affectedPeriods
  };
}

export function assumptionManifestToDTO(manifest: AssumptionManifest): AssumptionManifestDTO {
  return {
    confirmedFacts: manifest.confirmedFacts.map(assumptionToDTO),
    acceptedEstimates: manifest.acceptedEstimates.map(assumptionToDTO),
    systemAssumptions: manifest.systemAssumptions.map(assumptionToDTO),
    hypotheticalChanges: manifest.hypotheticalChanges.map(assumptionToDTO),
    unknownOrExcluded: manifest.unknownOrExcluded.map(assumptionToDTO)
  };
}

function calendarSourceForDate(
  date: string,
  metadata: CalendarFixtureMetadata
): "COMMITTED_FIXTURE" | "WEEKDAY_FALLBACK" {
  return date >= metadata.coverageStart && date <= metadata.coverageEnd
    ? "COMMITTED_FIXTURE"
    : "WEEKDAY_FALLBACK";
}

function goalCompletionToDTO(
  completion: GoalCompletion,
  metadata: CalendarFixtureMetadata
): GoalCompletionDTO {
  if (completion.status === "COMPLETED") {
    return {
      status: "COMPLETED",
      goalId: completion.goalId,
      date: completion.date,
      month: completion.period,
      calendarSource: calendarSourceForDate(completion.date, metadata)
    };
  }
  return {
    status: "NOT_REACHED_WITHIN_HORIZON",
    goalId: completion.goalId,
    projectedThrough: completion.projectedThrough,
    horizonAllocationEvents: completion.allocationEventsEvaluated
  };
}

function periodToDTO(period: ProjectionPeriod): ProjectionPeriodDTO {
  return {
    period: period.period,
    openingCash: moneyToDTO(period.openingCash),
    openingReservedCash: moneyToDTO(period.openingReservedCash),
    income: moneyToDTO(period.income),
    routineSpending: moneyToDTO(period.routineSpending),
    requiredObligations: moneyToDTO(period.requiredObligations),
    confirmedOneOffs: moneyToDTO(period.confirmedOneOffs),
    hypotheticalOneOffs: moneyToDTO(period.hypotheticalOneOffs),
    bufferRestoration: moneyToDTO(period.bufferRestoration),
    goalContributions: period.goalContributions.map((goal) => ({
      goalId: goal.goalId,
      openingBalance: moneyToDTO(goal.openingBalance),
      contribution: moneyToDTO(goal.contribution),
      closingBalance: moneyToDTO(goal.closingBalance)
    })),
    closingCash: moneyToDTO(period.closingCash),
    closingReservedCash: moneyToDTO(period.closingReservedCash),
    closingSafetyBuffer: moneyToDTO(period.closingSafetyBuffer),
    lowestClearedCash: moneyToDTO(period.lowestClearedCash),
    lowestSafetyBuffer: signedMinorToDTO(period.lowestSafetyBufferMinor),
    lowestBalanceEventId: period.lowestBalanceEventId,
    lowestBalanceDate: period.lowestBalanceDate,
    requiredPaymentsCovered: period.requiredPaymentsCovered,
    bufferAtAllocation: signedMinorToDTO(period.bufferAtAllocationMinor)
  };
}

function traceEventToDTO(event: LedgerEvent): LedgerTraceEventDTO {
  return {
    id: event.id,
    period: event.period,
    date: event.date,
    datePrecision: event.datePrecision === "EXACT" ? "exact" : "month",
    type: event.type.toLowerCase(),
    signedCash: signedMinorToDTO(event.signedCashMinor),
    reserveDelta: signedMinorToDTO(event.reserveDeltaMinor),
    required: event.required,
    evidenceState: event.evidenceState.toLowerCase() as LedgerTraceEventDTO["evidenceState"],
    scope: scopeToDTO(event.scope),
    dependsOn: event.dependsOn,
    goalId: event.goalId,
    description: event.description,
    runningCash: signedMinorToDTO(event.runningCashMinor),
    remainingReserved: signedMinorToDTO(event.remainingReservedMinor),
    safetyBuffer: signedMinorToDTO(event.safetyBufferMinor)
  };
}

export function projectionToDTO(
  projection: Projection,
  metadata: CalendarFixtureMetadata
): ProjectionDTO {
  const detailedPeriods = new Set(projection.periods.map((period) => period.period));
  return {
    identity: {
      baselineId: projection.baselineId,
      scenarioId: projection.scenarioId,
      parentScenarioId: projection.parentScenarioId,
      contextId: projection.contextId,
      contextVersion: projection.contextVersion,
      inputIdentity: projection.inputIdentity
    },
    versions: {
      rules: projection.rulesVersion,
      calendar: projection.calendarVersion,
      application: APPLICATION_VERSION
    },
    horizon: {
      ...projection.projectionHorizon,
      projectedAllocationEvents: projection.projectedAllocationEvents,
      projectedThrough: projection.projectedThrough
    },
    periods: projection.periods.map(periodToDTO),
    goalCompletions: projection.goalCompletions.map((completion) =>
      goalCompletionToDTO(completion, metadata)
    ),
    goalBalancesAtClassificationHorizon: projection.goalBalancesAtClassificationHorizon.map(
      (goal) => ({ goalId: goal.goalId, balance: moneyToDTO(goal.balance) })
    ),
    assumptions: assumptionManifestToDTO(projection.assumptions),
    confidence: projection.confidence.toLowerCase() as ProjectionDTO["confidence"],
    hardConsequences: {
      requiredPaymentsCovered: projection.requiredPaymentsCovered,
      cashBecameNegative: projection.cashBecameNegative,
      creditRequired: projection.creditRequired,
      creditUsed: moneyToDTO(projection.creditUsed)
    },
    minimumClearedCash: moneyToDTO(projection.minimumClearedCash),
    minimumSafetyBuffer: signedMinorToDTO(projection.minimumSafetyBufferMinor),
    minimumBalanceEventId: projection.minimumBalanceEventId,
    minimumBalanceDate: projection.minimumBalanceDate,
    trace: projection.ledger.filter((event) => detailedPeriods.has(event.period)).map(traceEventToDTO)
  };
}

function severityToDTO(severity: Severity): "minimal" | "noticeable" | "significant" | "risky" {
  return severity.toLowerCase() as "minimal" | "noticeable" | "significant" | "risky";
}

export function comparisonToDTO(
  result: ScenarioSimulationResult,
  metadata: CalendarFixtureMetadata
): ScenarioComparisonDTO {
  const comparison = result.comparison;
  return {
    baselineId: comparison.baselineId,
    scenarioId: comparison.scenarioId,
    goalImpacts: comparison.goalImpacts.map((impact) => ({
      goalId: impact.goalId,
      baselineCompletion: goalCompletionToDTO(impact.baselineCompletion, metadata),
      scenarioCompletion: goalCompletionToDTO(impact.scenarioCompletion, metadata),
      delayMonths: impact.delayMonths
    })),
    goalShortfallAtClassificationHorizon: moneyToDTO(
      comparison.goalShortfallAtClassificationHorizon
    ),
    classification: {
      code: comparison.classification.code,
      safetySeverity: severityToDTO(comparison.classification.safetySeverity),
      futureSeverity: severityToDTO(comparison.classification.futureSeverity),
      requiredPaymentFailure: comparison.classification.requiredPaymentFailure,
      negativeCash: comparison.classification.negativeCash,
      creditRequired: comparison.classification.creditRequired,
      minimumSafetyBuffer: signedMinorToDTO(comparison.classification.minimumSafetyBufferMinor),
      desiredSafetyBuffer: moneyToDTO(comparison.classification.desiredSafetyBuffer),
      minimumBufferRatio: ratioToDTO(comparison.classification.minimumBufferRatio),
      recoveryCycles: comparison.classification.recoveryCycles,
      goalShortfall: moneyToDTO(comparison.classification.goalShortfall),
      goalBudgetEquivalent: ratioToDTO(comparison.classification.goalBudgetEquivalent),
      maximumGoalDelayMonths: comparison.classification.maximumGoalDelayMonths,
      reasonCodes: comparison.classification.reasonCodes
    }
  };
}

function displayPeriod(period: string): string {
  const month = Number(period.slice(5, 7));
  return `${MONTHS[month - 1] ?? period} ${period.slice(0, 4)}`;
}

function completionDisplay(completion: GoalCompletion): string {
  return completion.status === "COMPLETED"
    ? displayPeriod(completion.period)
    : "Not reached within horizon";
}

function delayDisplay(delay: number | null): string {
  if (delay === null) return "Beyond projection horizon";
  if (delay === 0) return "No delay";
  if (delay < 0) return `${Math.abs(delay)} month${delay === -1 ? "" : "s"} earlier`;
  return `${delay} month${delay === 1 ? "" : "s"} later`;
}

function classificationLabel(code: ScenarioSimulationResult["comparison"]["classification"]["code"]): string {
  return {
    NOT_CURRENTLY_AFFORDABLE: "Not currently affordable",
    FINANCIALLY_RISKY: "Financially risky",
    AFFORDABLE_SIGNIFICANT_TRADE_OFF: "Affordable · Significant trade-off",
    AFFORDABLE_NOTICEABLE_TRADE_OFF: "Affordable · Noticeable trade-off",
    AFFORDABLE_MINIMAL_IMPACT: "Affordable · Minimal impact"
  }[code];
}

function confidenceDisplay(confidence: Projection["confidence"]): string {
  return {
    HIGH: "High confidence",
    MEDIUM: "Medium confidence",
    LOW: "Low confidence",
    INSUFFICIENT_INFORMATION: "Insufficient information"
  }[confidence];
}

function assumptionGroups(manifest: AssumptionManifest): ScenarioPresentationDTO["assumptionGroups"] {
  const dto = assumptionManifestToDTO(manifest);
  return [
    { key: "confirmedFacts", label: "Confirmed facts", items: dto.confirmedFacts.map((item) => item.description) },
    { key: "acceptedEstimates", label: "Accepted estimates", items: dto.acceptedEstimates.map((item) => item.description) },
    { key: "systemAssumptions", label: "System assumptions", items: dto.systemAssumptions.map((item) => item.description) },
    { key: "hypotheticalChanges", label: "Hypothetical change", items: dto.hypotheticalChanges.map((item) => item.description) },
    { key: "unknownOrExcluded", label: "Unknown or excluded", items: dto.unknownOrExcluded.map((item) => item.description) }
  ];
}

export function scenarioPresentation(
  context: FinancialContextSnapshot,
  definition: ScenarioDefinition,
  result: ScenarioSimulationResult,
  labelOverride?: string
): ScenarioPresentationDTO {
  if (definition.change.type !== "ONE_OFF_PURCHASE") {
    throw new TypeError("Slice 2 can present only one-off purchases.");
  }
  const change = definition.change;
  const baselinePeriod = result.baseline.periods.find((period) => period.period === change.paymentPeriod);
  const scenarioPeriod = result.scenario.periods.find((period) => period.period === change.paymentPeriod);
  if (!baselinePeriod || !scenarioPeriod) throw new Error("Decision period is not in detailed output.");

  const restored = result.scenario.allocationHistory.find(
    (entry) =>
      entry.period > change.paymentPeriod &&
      entry.safetyBufferAfterAllocationMinor >= result.comparison.classification.desiredSafetyBuffer.minor
  );
  const labels = new Map(context.goals.map((goal) => [goal.id, goal.label]));

  return {
    scenarioLabel: labelOverride ?? `${formatMoney(change.amount)} ${change.purpose}`,
    classificationLabel: classificationLabel(result.comparison.classification.code),
    summary: canonicalClassificationSummary(result.comparison.classification.code),
    headlineKey: "payable_but_buffer_tight",
    immediateImpact: {
      cashBefore: formatMoney(baselinePeriod.closingCash),
      cashAfter: formatMoney(scenarioPeriod.closingCash),
      safetyBufferBefore: formatMoney(baselinePeriod.closingSafetyBuffer),
      safetyBufferAfter: formatMoney(
        signedGbp(result.comparison.classification.minimumSafetyBufferMinor)
      ),
      requiredPayments: result.scenario.requiredPaymentsCovered ? "Bills covered" : "Required payment missed",
      borrowing: result.scenario.creditRequired
        ? "Borrowing required"
        : `${formatMoney(result.scenario.creditUsed)} overdraft`,
      recovery: restored ? `Restored in ${displayPeriod(restored.period)}` : "Not restored within horizon"
    },
    goalImpacts: result.comparison.goalImpacts.map((impact) => ({
      goalId: impact.goalId,
      label: labels.get(impact.goalId) ?? impact.goalId,
      baselineCompletion: completionDisplay(impact.baselineCompletion),
      scenarioCompletion: completionDisplay(impact.scenarioCompletion),
      delay: delayDisplay(impact.delayMonths)
    })),
    monthlyPath: result.scenario.periods.map((period) => ({
      period: displayPeriod(period.period),
      closingCash: formatMoney(period.closingCash),
      closingSafetyBuffer: formatMoney(period.closingSafetyBuffer),
      bufferRestoration: formatMoney(period.bufferRestoration),
      goalContribution: formatMoney(
        signedGbp(period.goalContributions.reduce((sum, goal) => sum + goal.contribution.minor, 0n))
      )
    })),
    assumptionGroups: assumptionGroups(result.scenario.assumptions),
    confidence: confidenceDisplay(result.scenario.confidence),
    availableActions: ["view_monthly_path", "view_calculation", "preview_goals"]
  };
}

export function baselinePresentation(
  context: FinancialContextSnapshot,
  baseline: Projection
): ScenarioPresentationDTO {
  const firstPeriod = baseline.periods[0];
  if (!firstPeriod) throw new Error("A baseline presentation requires one detailed period.");
  const labels = new Map(context.goals.map((goal) => [goal.id, goal.label]));
  return {
    scenarioLabel: "Your current path",
    classificationLabel: "Your current path",
    summary: "Your current plan keeps required payments covered without using your overdraft.",
    headlineKey: "current_path",
    immediateImpact: {
      cashBefore: formatMoney(firstPeriod.closingCash),
      cashAfter: formatMoney(firstPeriod.closingCash),
      safetyBufferBefore: formatMoney(firstPeriod.closingSafetyBuffer),
      safetyBufferAfter: formatMoney(firstPeriod.closingSafetyBuffer),
      requiredPayments: baseline.requiredPaymentsCovered ? "Bills covered" : "Required payment missed",
      borrowing: baseline.creditRequired ? "Borrowing required" : `${formatMoney(baseline.creditUsed)} overdraft`,
      recovery: `Safety buffer remains at ${formatMoney(firstPeriod.closingSafetyBuffer)}`
    },
    goalImpacts: baseline.goalCompletions.map((completion) => ({
      goalId: completion.goalId,
      label: labels.get(completion.goalId) ?? completion.goalId,
      baselineCompletion: completionDisplay(completion),
      scenarioCompletion: completionDisplay(completion),
      delay: "Current plan"
    })),
    monthlyPath: baseline.periods.map((period) => ({
      period: displayPeriod(period.period),
      closingCash: formatMoney(period.closingCash),
      closingSafetyBuffer: formatMoney(period.closingSafetyBuffer),
      bufferRestoration: formatMoney(period.bufferRestoration),
      goalContribution: formatMoney(
        signedGbp(period.goalContributions.reduce((sum, goal) => sum + goal.contribution.minor, 0n))
      )
    })),
    assumptionGroups: assumptionGroups(baseline.assumptions),
    confidence: confidenceDisplay(baseline.confidence),
    availableActions: ["view_monthly_path", "view_calculation", "preview_goals"]
  };
}

function fallbackPeriods(projection: Projection): readonly string[] {
  return projection.assumptions.systemAssumptions
    .filter((assumption) => assumption.id.startsWith("calendar-fallback-"))
    .flatMap((assumption) => assumption.affectedPeriods);
}

export function calendarUsageToDTO(
  projections: readonly Projection[],
  metadata: CalendarFixtureMetadata
): CalendarUsageDTO {
  const firstFallbackPeriod = [...new Set(projections.flatMap(fallbackPeriods))].sort()[0] ?? null;
  const committedFixtureUsed = projections.some((projection) =>
    projection.ledger.some(
      (event) =>
        event.type === "INCOME" &&
        event.date >= metadata.coverageStart &&
        event.date <= metadata.coverageEnd
    )
  );
  return {
    version: metadata.version,
    coverage: {
      jurisdiction: metadata.jurisdiction,
      start: metadata.coverageStart,
      end: metadata.coverageEnd,
      source: metadata.source
    },
    committedFixtureUsed,
    fallbackUsed: firstFallbackPeriod !== null,
    firstFallbackPeriod
  };
}

function calculationMetadata(
  projection: Projection,
  projectionsUsed: readonly Projection[],
  metadata: CalendarFixtureMetadata
): CalculationMetadataDTO {
  return {
    runId: `run-${inputIdentity({
      baselineId: projection.baselineId,
      scenarioId: projection.scenarioId,
      inputIdentity: projection.inputIdentity
    }).slice("fnv1a64:".length)}`,
    rulesVersion: projection.rulesVersion,
    calendarVersion: projection.calendarVersion,
    contextVersion: projection.contextVersion,
    baselineId: projection.baselineId,
    scenarioId: projection.scenarioId,
    parentScenarioId: projection.parentScenarioId,
    projectionHorizon: {
      detailedPeriods: projection.projectionHorizon.detailedPeriods,
      classificationAllocationEvents: projection.projectionHorizon.classificationAllocationEvents,
      maximumGoalAllocationEvents: projection.projectionHorizon.maxGoalProjectionAllocationEvents
    },
    calendar: calendarUsageToDTO(projectionsUsed, metadata)
  };
}

function oneOffChangeToDTO(
  definition: ScenarioDefinition
): OneOffPurchaseRequestDTO["change"] {
  if (definition.change.type !== "ONE_OFF_PURCHASE") {
    throw new TypeError("Only a one-off purchase can be mapped to the Slice 2 request shape.");
  }
  return {
    type: "one_off_purchase",
    amount: {
      currency: definition.change.amount.currency,
      minorUnits: definition.change.amount.minor.toString()
    },
    purpose: definition.change.purpose,
    paymentPeriod: definition.change.paymentPeriod,
    paymentTiming: "assumed_conservative",
    paymentDate: definition.change.paymentDate,
    datePrecision: definition.change.datePrecision === "EXACT" ? "exact" : "month",
    fundingSource: "current_account",
    paymentPattern: "single",
    costTreatment: "additional_to_routine_spending"
  };
}

export function toBaselineResponse(
  requestId: string,
  correlationId: string,
  context: FinancialContextSnapshot,
  baseline: Projection,
  calendarMetadata: CalendarFixtureMetadata
): BaselineResponseDTO {
  return {
    apiVersion: API_VERSION,
    schemaVersion: BASELINE_RESPONSE_SCHEMA,
    kind: "baseline_projection",
    requestId,
    correlationId,
    calculation: calculationMetadata(baseline, [baseline], calendarMetadata),
    context: { id: context.id, version: context.version },
    baseline: projectionToDTO(baseline, calendarMetadata)
  };
}

export function toOneOffPurchaseResponse(
  request: OneOffPurchaseRequestDTO,
  correlationId: string,
  context: FinancialContextSnapshot,
  definition: ScenarioDefinition,
  result: ScenarioSimulationResult,
  calendarMetadata: CalendarFixtureMetadata,
  labelOverride?: string
): OneOffPurchaseResponseDTO {
  if (definition.change.type !== "ONE_OFF_PURCHASE") {
    throw new TypeError("Only one-off purchase definitions can cross this boundary.");
  }
  const baseline = projectionToDTO(result.baseline, calendarMetadata);
  const projection = projectionToDTO(result.scenario, calendarMetadata);
  const comparison = comparisonToDTO(result, calendarMetadata);
  const calculation = calculationMetadata(result.scenario, [result.baseline, result.scenario], calendarMetadata);
  const presentation = scenarioPresentation(context, definition, result, labelOverride);
  const outputIdentity = inputIdentity({ calculation, baseline, projection, comparison, presentation });
  const label = labelOverride ?? `${formatMoney(definition.change.amount)} ${definition.change.purpose}`;
  return {
    apiVersion: API_VERSION,
    schemaVersion: SCENARIO_RESPONSE_SCHEMA,
    kind: "one_off_purchase_simulation",
    requestId: request.requestId,
    correlationId,
    calculation,
    context: { id: context.id, version: context.version },
    scenario: {
      id: definition.id,
      label,
      status: "evaluated",
      baselineId: definition.baselineId,
      parentScenarioId: definition.parentScenarioId,
      derivedFromScenarioId: definition.derivedFromScenarioId,
      contextVersion: context.version,
      isCurrent: false,
      isHypothetical: true,
      selectionAffectsFinancialState: false,
      change: oneOffChangeToDTO(definition)
    },
    baseline,
    result: { projection, comparison },
    presentation,
    excludedOpportunities: [],
    reproducibility: {
      inputIdentity: result.scenario.inputIdentity,
      outputIdentity
    }
  };
}

export function toCurrentContextResponse(
  correlationId: string,
  context: FinancialContextSnapshot,
  resolved: ResolvedFinancialContext,
  rulesVersion: string,
  calendarMetadata: CalendarFixtureMetadata
): CurrentFinancialContextResponseDTO {
  return {
    apiVersion: API_VERSION,
    schemaVersion: CONTEXT_RESPONSE_SCHEMA,
    kind: "current_financial_context",
    correlationId,
    context: {
      id: context.id,
      version: context.version,
      schemaVersion: context.schemaVersion,
      snapshotDate: context.snapshotDate,
      projectionStartPeriod: context.projectionStartPeriod,
      jurisdiction: "england_and_wales",
      currentAccount: {
        clearedBalance: moneyToDTO(resolved.clearedBalance),
        reservedSpending: moneyToDTO(resolved.reservedSpending),
        overdraftLimit: moneyToDTO(context.currentAccount.overdraftLimit),
        overdraftIncludedAsCash: false
      },
      desiredSafetyBuffer: moneyToDTO(resolved.desiredSafetyBuffer),
      monthlyNetIncome: moneyToDTO(resolved.incomeAmount),
      goals: resolved.goals.map((goal) => ({
        id: goal.id,
        label: goal.label,
        openingBalance: moneyToDTO(goal.openingBalance),
        targetBalance: moneyToDTO(goal.targetBalance)
      }))
    },
    simulatorVersions: {
      rules: rulesVersion,
      calendar: calendarMetadata.version,
      application: APPLICATION_VERSION
    },
    calendar: {
      version: calendarMetadata.version,
      coverage: {
        jurisdiction: calendarMetadata.jurisdiction,
        start: calendarMetadata.coverageStart,
        end: calendarMetadata.coverageEnd,
        source: calendarMetadata.source
      }
    }
  };
}
