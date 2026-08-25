import { err, ok, type Result } from "../../domain/shared/result";
import type { Money } from "../../domain/shared/money";
import type {
  FinancialContextSnapshot,
  InformationalPensionContext
} from "../../domain/simulator/types";
import type { BaselineRequestDTO, BaselineResponseDTO, GoalCompletionDTO, MoneyDTO, OneOffPurchaseResponseDTO, RatioDTO } from "../dto/contracts";
import type { ApplicationError } from "../errors/application-error";
import type { FinancialContextSource } from "../ports/financial-context-source";
import type { WorkplaceAssociationSource } from "../ports/workplace-association-source";
import {
  BENEFITS_SURFACE_SCHEMA,
  GOALS_PREVIEW_SURFACE_SCHEMA,
  GOALS_SURFACE_SCHEMA,
  HOME_SURFACE_SCHEMA,
  PRODUCT_SURFACE_API_VERSION,
  type BenefitsSurfaceDTO,
  type GoalsPreviewSurfaceDTO,
  type GoalsSurfaceDTO,
  type HomeSurfaceDTO,
  type PreviewGoalDTO,
  type SurfaceContextDTO,
  type SurfaceGoalDTO,
  type SurfaceProgressDTO
} from "./contracts";

interface SurfaceSimulator {
  readonly generateBaseline: {
    execute(request: BaselineRequestDTO): Promise<Result<BaselineResponseDTO, ApplicationError>>;
  };
  readonly getSimulationRun: {
    execute(runId: string): Promise<Result<OneOffPurchaseResponseDTO, ApplicationError>>;
  };
}

export interface ProductSurfaceDependencies {
  readonly displayName: string;
  readonly contextSource: FinancialContextSource;
  readonly workplaceSource: WorkplaceAssociationSource;
  readonly simulator: SurfaceSimulator;
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
] as const;

function surfaceError(code: ApplicationError["code"], message: string): Result<never, ApplicationError> {
  return err({ code, message, missingFields: [] });
}

function moneyValue(value: { readonly value: Money | null }): Money | null {
  return value.value;
}

function displayMoney(minor: bigint): string {
  const sign = minor < 0n ? "-" : "";
  const absolute = minor < 0n ? -minor : minor;
  const whole = (absolute / 100n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const pennies = absolute % 100n;
  return `${sign}£${whole}${pennies === 0n ? "" : `.${pennies.toString().padStart(2, "0")}`}`;
}

function surfaceMoney(minor: bigint): MoneyDTO {
  return { currency: "GBP", minorUnits: minor.toString(), display: displayMoney(minor) };
}

function roundedBasisPoints(numerator: bigint, denominator: bigint): number {
  if (denominator <= 0n) return 0;
  const rounded = (numerator * 10_000n + denominator / 2n) / denominator;
  const value = Number(rounded);
  if (!Number.isSafeInteger(value)) throw new RangeError("Goal ratio exceeds the JSON-safe range.");
  return value;
}

function ratio(numerator: bigint, denominator: bigint, label: string): SurfaceProgressDTO {
  const basisPoints = roundedBasisPoints(numerator, denominator);
  const bounded = Math.max(0, Math.min(10_000, basisPoints));
  const wholePercent = Math.round(basisPoints / 100);
  const base: RatioDTO = {
    numerator: numerator.toString(),
    denominator: denominator.toString(),
    basisPoints,
    display: `${wholePercent}%`
  };
  return {
    ...base,
    fill: `${bounded / 100}%`,
    ringDasharray: `${bounded} ${10_000 - bounded}`,
    accessibleLabel: `${label} is ${wholePercent}% funded`
  };
}

function displayMonth(month: string): string {
  const monthNumber = Number(month.slice(5, 7));
  return `${MONTHS[monthNumber - 1] ?? month} ${month.slice(0, 4)}`;
}

function completionPresentation(completion: GoalCompletionDTO) {
  return completion.status === "COMPLETED"
    ? {
        status: "on_track" as const,
        month: completion.month,
        display: displayMonth(completion.month),
        statusLabel: "On track"
      }
    : {
        status: "beyond_horizon" as const,
        month: null,
        display: "Beyond current projection",
        statusLabel: "Longer-term goal"
      };
}

function contextDTO(context: FinancialContextSnapshot, isCurrent: boolean): SurfaceContextDTO {
  return {
    id: context.id,
    version: context.version,
    label: isCurrent ? "Current plan" : "Earlier financial plan",
    isCurrent,
    snapshotDate: context.snapshotDate
  };
}

function mapGoals(
  context: FinancialContextSnapshot,
  completions: readonly GoalCompletionDTO[]
): Result<readonly SurfaceGoalDTO[], ApplicationError> {
  const byGoal = new Map(completions.map((completion) => [completion.goalId, completion]));
  const output: SurfaceGoalDTO[] = [];
  for (const goal of context.goals) {
    const current = moneyValue(goal.openingBalance);
    const target = moneyValue(goal.targetBalance);
    const completion = byGoal.get(goal.id);
    if (!current || !target || !completion) {
      return surfaceError("MATERIAL_INFORMATION_MISSING", "A goal is missing confirmed surface data.");
    }
    output.push({
      id: goal.id,
      label: goal.label,
      currentBalance: surfaceMoney(current.minor),
      targetBalance: surfaceMoney(target.minor),
      progress: ratio(current.minor, target.minor, goal.label),
      completion: completionPresentation(completion)
    });
  }
  return ok(output);
}

function currentBuffer(context: FinancialContextSnapshot): Result<bigint, ApplicationError> {
  const cash = moneyValue(context.currentAccount.clearedBalance);
  const reserve = moneyValue(context.currentAccount.reservedSpending);
  if (!cash || !reserve) {
    return surfaceError("MATERIAL_INFORMATION_MISSING", "Current cash and reserve are required.");
  }
  return ok(cash.minor - reserve.minor);
}

function previewGoals(
  context: FinancialContextSnapshot,
  run: OneOffPurchaseResponseDTO
): Result<readonly PreviewGoalDTO[], ApplicationError> {
  const impacts = new Map(run.result.comparison.goalImpacts.map((impact) => [impact.goalId, impact]));
  const presentation = new Map(run.presentation.goalImpacts.map((impact) => [impact.goalId, impact]));
  const output: PreviewGoalDTO[] = [];
  for (const goal of context.goals) {
    const current = moneyValue(goal.openingBalance);
    const target = moneyValue(goal.targetBalance);
    const impact = impacts.get(goal.id);
    const labels = presentation.get(goal.id);
    if (!current || !target || !impact || !labels) {
      return surfaceError("PERSISTED_DATA_INVALID", "A stored run is missing its original goal evidence.");
    }
    output.push({
      id: goal.id,
      label: goal.label,
      currentBalance: surfaceMoney(current.minor),
      targetBalance: surfaceMoney(target.minor),
      progress: ratio(current.minor, target.minor, goal.label),
      baselineCompletion: {
        month: impact.baselineCompletion.status === "COMPLETED" ? impact.baselineCompletion.month : null,
        display: labels.baselineCompletion
      },
      scenarioCompletion: {
        month: impact.scenarioCompletion.status === "COMPLETED" ? impact.scenarioCompletion.month : null,
        display: labels.scenarioCompletion
      },
      changeLabel: labels.delay
    });
  }
  return ok(output);
}

export class ProductSurfaceApplication {
  constructor(private readonly dependencies: ProductSurfaceDependencies) {}

  private async current(): Promise<Result<{
    readonly context: FinancialContextSnapshot;
    readonly baseline: BaselineResponseDTO;
  }, ApplicationError>> {
    const version = await this.dependencies.contextSource.getCurrentContextVersionId();
    if (!version) {
      return surfaceError("FINANCIAL_CONTEXT_NOT_FOUND", "A current financial context is required.");
    }
    const context = await this.dependencies.contextSource.getContextVersion(version);
    if (!context) {
      return surfaceError("CONTEXT_VERSION_NOT_FOUND", "The current financial context could not be read.");
    }
    const baseline = await this.dependencies.simulator.generateBaseline.execute({
      requestId: `surface-current-${version}`,
      expectedContextVersionId: version
    });
    return baseline.ok ? ok({ context, baseline: baseline.value }) : baseline;
  }

  async home(): Promise<Result<HomeSurfaceDTO, ApplicationError>> {
    const current = await this.current();
    if (!current.ok) return current;
    const goals = mapGoals(current.value.context, current.value.baseline.baseline.goalCompletions);
    if (!goals.ok) return goals;
    const buffer = currentBuffer(current.value.context);
    if (!buffer.ok) return buffer;
    const preferred = moneyValue(current.value.context.desiredSafetyBuffer);
    if (!preferred) return surfaceError("MATERIAL_INFORMATION_MISSING", "A preferred safety buffer is required.");
    const atPreferred = buffer.value >= preferred.minor;
    return ok({
      apiVersion: PRODUCT_SURFACE_API_VERSION,
      schemaVersion: HOME_SURFACE_SCHEMA,
      kind: "home_surface",
      displayName: this.dependencies.displayName,
      context: contextDTO(current.value.context, true),
      safetyBuffer: {
        current: surfaceMoney(buffer.value),
        preferred: surfaceMoney(preferred.minor),
        status: atPreferred ? "at_or_above_preferred" : "below_preferred",
        statusLabel: atPreferred ? "At your preferred level" : "Below your preferred level"
      },
      goals: goals.value,
      opportunityPreview: { kind: "none" }
    });
  }

  async goals(): Promise<Result<GoalsSurfaceDTO, ApplicationError>> {
    const current = await this.current();
    if (!current.ok) return current;
    const goals = mapGoals(current.value.context, current.value.baseline.baseline.goalCompletions);
    if (!goals.ok) return goals;
    return ok({
      apiVersion: PRODUCT_SURFACE_API_VERSION,
      schemaVersion: GOALS_SURFACE_SCHEMA,
      kind: "goals_surface",
      mode: "current_path",
      context: contextDTO(current.value.context, true),
      title: "Your goals",
      summary: "These dates come from your current confirmed financial plan.",
      goals: goals.value
    });
  }

  async goalsPreview(runId: string): Promise<Result<GoalsPreviewSurfaceDTO, ApplicationError>> {
    const runResult = await this.dependencies.simulator.getSimulationRun.execute(runId);
    if (!runResult.ok) {
      return runResult.error.code === "RUN_NOT_FOUND"
        ? surfaceError("RUN_NOT_FOUND", "The requested goals preview was not found.")
        : runResult;
    }
    const run = runResult.value;
    const context = await this.dependencies.contextSource.getContextVersion(run.context.version);
    if (!context) return surfaceError("RUN_NOT_FOUND", "The requested goals preview was not found.");
    const currentVersion = await this.dependencies.contextSource.getCurrentContextVersionId();
    const isCurrent = currentVersion === context.version;
    const goals = previewGoals(context, run);
    if (!goals.ok) return goals;
    return ok({
      apiVersion: PRODUCT_SURFACE_API_VERSION,
      schemaVersion: GOALS_PREVIEW_SURFACE_SCHEMA,
      kind: "goals_preview_surface",
      mode: "stored_hypothetical",
      context: contextDTO(context, isCurrent),
      warning: isCurrent
        ? null
        : "This what-if uses an earlier financial plan. Its original baseline and result are shown together.",
      run: {
        id: run.calculation.runId,
        scenarioId: run.scenario.id,
        label: run.presentation.scenarioLabel,
        classificationLabel: run.presentation.classificationLabel,
        hypotheticalLabel: "What-if preview",
        selectionAffectsFinancialState: false
      },
      goals: goals.value
    });
  }

  async benefits(): Promise<Result<BenefitsSurfaceDTO, ApplicationError>> {
    const version = await this.dependencies.contextSource.getCurrentContextVersionId();
    if (!version) return surfaceError("FINANCIAL_CONTEXT_NOT_FOUND", "A current financial context is required.");
    const context = await this.dependencies.contextSource.getContextVersion(version);
    if (!context) return surfaceError("CONTEXT_VERSION_NOT_FOUND", "The current financial context could not be read.");
    const workplace = await this.dependencies.workplaceSource.getWorkplace();
    const pensions = context.informationalContext.filter(
      (fact): fact is InformationalPensionContext => fact.kind === "PENSION_INFORMATION"
    );
    const activeFacts = pensions.map((fact, index) => ({
      id: `active-pension-${index + 1}`,
      title: "Workplace pension",
      statusLabel: "Active · Confirmed in your plan" as const,
      employeeContribution: `${fact.employeeContributionPercent}% employee contribution`,
      employerContribution: `${fact.employerContributionPercent}% employer contribution`,
      treatment: fact.includedInNetIncomeAlready
        ? "Your confirmed take-home pay already reflects your contribution."
        : "This contribution is informational only.",
      spendability: fact.employerContributionSpendable
        ? "Employer contribution treatment is recorded in your plan."
        : "Employer contributions are not spendable cash."
    }));
    const workplaceDTO: BenefitsSurfaceDTO["workplace"] = workplace
      ? workplace.verificationStatus === "verified"
        ? {
            status: "verified",
            name: workplace.name,
            statusLabel: "Employer-provisioned · Verified",
            explanation: "This membership confirms your employer, but no benefit is treated as active cash automatically."
          }
        : {
            status: "unverified",
            name: workplace.name,
            statusLabel: "User-provided · Not verified",
            explanation: "A workplace name does not confirm which benefits are offered or whether you are eligible."
          }
      : {
          status: "not_supplied",
          name: null,
          statusLabel: "No workplace added"
        };
    const emptyState: BenefitsSurfaceDTO["emptyState"] = activeFacts.length > 0
      ? null
      : workplace
        ? {
            kind: "no_verified_catalogue",
            title: "No verified benefit information yet",
            description: "We will not infer benefits from your workplace name."
          }
        : {
            kind: "no_workplace",
            title: "No workplace information yet",
            description: "You can use Future You without adding a workplace."
          };
    return ok({
      apiVersion: PRODUCT_SURFACE_API_VERSION,
      schemaVersion: BENEFITS_SURFACE_SCHEMA,
      kind: "benefits_surface",
      context: contextDTO(context, true),
      workplace: workplaceDTO,
      activeFacts,
      opportunities: [],
      emptyState
    });
  }
}
