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
import type {
  EmployerBenefitOpportunity,
  EmployerBenefitSource
} from "../ports/employer-benefit-source";
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
  readonly sarahStoryAvailable?: boolean;
  readonly contextSource: FinancialContextSource;
  readonly workplaceSource: WorkplaceAssociationSource;
  readonly employerBenefitSource: EmployerBenefitSource;
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

function trustedOpportunities(
  workplace: Awaited<ReturnType<WorkplaceAssociationSource["getWorkplace"]>>,
  opportunities: readonly EmployerBenefitOpportunity[]
): readonly EmployerBenefitOpportunity[] {
  if (!workplace || workplace.verificationStatus !== "verified") return [];
  return opportunities.filter((opportunity) =>
    opportunity.employerName === workplace.name
    && opportunity.offeringStatus === "AVAILABLE"
    && !opportunity.numericalSimulationSupported
    && opportunity.furtherInformationRequired
  );
}

function opportunityDTO(
  opportunity: EmployerBenefitOpportunity,
  pension: InformationalPensionContext | undefined
): BenefitsSurfaceDTO["opportunities"][number] | null {
  const userState = opportunity.userState;
  if (
    !userState
    || userState.eligibilityStatus !== "UNKNOWN"
    || userState.uptakeStatus !== "INACTIVE"
    || userState.includedInFinancialBaseline
    || userState.informationCompleteness !== "INCOMPLETE"
  ) return null;
  const common = {
    id: opportunity.offeringId,
    benefitKey: opportunity.benefitKey,
    status: "available" as const,
    employerName: opportunity.employerName,
    eligibility: "unknown" as const,
    uptake: "inactive" as const,
    uptakeLabel: "Not active." as const,
    includedInCurrentPlan: false as const,
    planInclusionLabel: "Not included in your current financial plan." as const,
    numericalSimulationSupported: false as const,
    numericalEffectLabel: "No numerical effect has been calculated." as const,
    furtherInformationRequired: true as const,
    provenance: {
      sourceType: "canonical_employer_reference" as const,
      sourceReference: opportunity.sourceReference,
      referenceDate: opportunity.referenceDate,
      lastConfirmedDate: opportunity.lastConfirmedDate,
      recordVersion: opportunity.recordVersion,
      schemaVersion: opportunity.schemaVersion,
      userStateId: userState.stateId
    }
  };
  if (opportunity.benefitKey === "ADDITIONAL_PENSION_MATCH") {
    return {
      ...common,
      title: "Additional pension match",
      statusLabel: "Available opportunity",
      description: `${opportunity.employerName} appears to match contributions up to 5%.`,
      currentContribution: pension ? `You currently contribute ${pension.employeeContributionPercent}%.` : null,
      eligibilityLabel: "Eligibility has not been confirmed."
    };
  }
  return {
    ...common,
    title: "Season-ticket loan",
    statusLabel: "Eligibility unknown",
    description: `${opportunity.employerName} lists this opportunity.`,
    currentContribution: null,
    eligibilityLabel: "Eligibility unknown"
  };
}

function taxAndAllowanceOpportunities(
  context: FinancialContextSnapshot,
  pensions: readonly InformationalPensionContext[]
): BenefitsSurfaceDTO["taxAndAllowances"] {
  const opportunities: BenefitsSurfaceDTO["taxAndAllowances"][number][] = [];
  if (pensions.length > 0) {
    opportunities.push({
      id: "PENSION_TAX_RELIEF",
      title: "Pension tax relief",
      status: "details_required",
      statusLabel: "Check details",
      description: "Pension contributions can receive tax relief. Whether it happens automatically or must be claimed depends on the pension scheme and Income Tax position.",
      matchedBecause: "Shown because your plan confirms an active workplace pension.",
      eligibilityLabel: "Your scheme’s tax-relief method is not confirmed in Future You.",
      includedInCurrentPlan: false,
      numericalEffectLabel: "No numerical effect has been calculated.",
      provenance: {
        sourceType: "official_public_guidance",
        publisher: "GOV.UK",
        sourceReference: "Tax on your private pension contributions: Tax relief",
        sourceUrl: "https://www.gov.uk/tax-on-your-private-pension/pension-tax-relief",
        accessedDate: "2026-08-27"
      }
    });
  }
  const hasFirstHomeGoal = context.goals.some((goal) => {
    const label = goal.label.toLowerCase();
    return label.includes("house deposit") || label.includes("home deposit") || label.includes("first home");
  });
  if (hasFirstHomeGoal) {
    opportunities.push({
      id: "LIFETIME_ISA_FIRST_HOME",
      title: "Lifetime ISA for a first home",
      status: "details_required",
      statusLabel: "Eligibility not checked",
      description: "A Lifetime ISA can support a first-home purchase or later-life saving, subject to eligibility and withdrawal rules.",
      matchedBecause: "Shown because your plan includes a house-deposit goal.",
      eligibilityLabel: "Your age and first-time-buyer status are not confirmed in Future You.",
      includedInCurrentPlan: false,
      numericalEffectLabel: "No numerical effect has been calculated.",
      provenance: {
        sourceType: "official_public_guidance",
        publisher: "GOV.UK",
        sourceReference: "Lifetime ISA: Overview",
        sourceUrl: "https://www.gov.uk/lifetime-isa",
        accessedDate: "2026-08-27"
      }
    });
  }
  return opportunities;
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
    const [workplace, employerOpportunities] = await Promise.all([
      this.dependencies.workplaceSource.getWorkplace(),
      this.dependencies.employerBenefitSource.getOpportunities()
    ]);
    const opportunities = trustedOpportunities(workplace, employerOpportunities);
    const seasonTicket = opportunities.find((opportunity) =>
      opportunity.benefitKey === "SEASON_TICKET_LOAN"
      && opportunity.userState?.eligibilityStatus === "UNKNOWN"
      && opportunity.userState.uptakeStatus === "INACTIVE"
      && !opportunity.userState.includedInFinancialBaseline
    );
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
      opportunityPreview: seasonTicket
        ? {
            kind: "authoritative",
            title: "Season-ticket loan",
            description: `${seasonTicket.employerName} lists a season-ticket loan. Your eligibility has not been confirmed.`,
            statusLabel: "Eligibility unknown",
            href: "/benefits#opportunity-season-ticket-loan",
            actionLabel: "See details",
            sourceReferenceDate: seasonTicket.referenceDate
          }
        : { kind: "none" },
      guidedStory: this.dependencies.sarahStoryAvailable
        ? {
            available: true,
            label: "Play Sarah’s story",
            href: "/story/sarah",
            description: "Follow the frozen £650 trip decision from uncertainty to understanding."
          }
        : { available: false }
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
    const [workplace, employerOpportunities] = await Promise.all([
      this.dependencies.workplaceSource.getWorkplace(),
      this.dependencies.employerBenefitSource.getOpportunities()
    ]);
    const pensions = context.informationalContext.filter(
      (fact): fact is InformationalPensionContext => fact.kind === "PENSION_INFORMATION"
    );
    const activeFacts = pensions.map((fact, index) => ({
      id: `active-pension-${index + 1}`,
      title: "Workplace pension",
      statusLabel: "Active" as const,
      employerName: workplace?.verificationStatus === "verified" ? workplace.name : "Your employer",
      employeeContribution: `${fact.employeeContributionPercent}%`,
      employerContribution: `${fact.employerContributionPercent}%`,
      treatment: fact.includedInNetIncomeAlready
        ? "Your confirmed take-home pay already reflects your contribution."
        : "This contribution is informational only.",
      spendability: fact.employerContributionSpendable
        ? "Employer contribution treatment is recorded in your plan."
        : "Retirement value — not spendable cash.",
      provenance: {
        sourceType: "immutable_financial_context" as const,
        contextVersion: context.version,
        factKey: "PENSION_INFORMATION" as const
      }
    }));
    const workplaceDTO: BenefitsSurfaceDTO["workplace"] = workplace
      ? workplace.verificationStatus === "verified"
        ? {
            status: "verified",
            name: workplace.name,
            statusLabel: "Verified workplace",
            membershipStatusLabel: "Active membership",
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
    const opportunities = trustedOpportunities(workplace, employerOpportunities)
      .map((opportunity) => opportunityDTO(opportunity, pensions[0]))
      .filter((opportunity): opportunity is NonNullable<typeof opportunity> => opportunity !== null);
    const taxAndAllowances = taxAndAllowanceOpportunities(context, pensions);
    const emptyState: BenefitsSurfaceDTO["emptyState"] = opportunities.length > 0
      ? null
      : workplace
        ? workplace.verificationStatus === "verified"
          ? {
              kind: "no_known_information",
              title: "No confirmed benefit information yet",
              description: "We do not have confirmed benefit information for this workplace yet."
            }
          : {
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
      opportunities,
      taxAndAllowances,
      loyaltySchemes: {
        status: "not_connected",
        statusLabel: "Not connected",
        title: "No loyalty schemes connected",
        description: "Future You has no trusted loyalty-card or rewards data for you, so no memberships or offers are being assumed."
      },
      emptyState
    });
  }
}
