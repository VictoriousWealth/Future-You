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
  EMPTY_GOAL_CONTRIBUTION_HISTORY_SOURCE,
  type GoalContributionHistory,
  type GoalContributionHistorySource
} from "../ports/goal-contribution-history-source";
import type {
  TaxOpportunityProfile,
  TaxOpportunityProfileSource
} from "../ports/tax-opportunity-profile-source";
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
  type GoalsProgressDTO,
  type GoalsSurfaceDTO,
  type GoalChartColorDTO,
  type GoalLineChartSeriesDTO,
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
  readonly taxOpportunityProfileSource?: TaxOpportunityProfileSource;
  readonly goalContributionHistorySource?: GoalContributionHistorySource;
  readonly simulator: SurfaceSimulator;
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
] as const;

const GOAL_CHART_COLORS: readonly GoalChartColorDTO[] = ["blue", "purple", "pink", "cyan", "green"];

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

function displayShortMonth(month: string): string {
  const monthNumber = Number(month.slice(5, 7));
  return `${(MONTHS[monthNumber - 1] ?? month).slice(0, 3)} ${month.slice(2, 4)}`;
}

function chartX(index: number, total: number): number {
  return total <= 1 ? 70 : 70 + Math.round((index * 860) / (total - 1));
}

function chartY(value: bigint, maximum: bigint): number {
  if (maximum <= 0n) return 330;
  const bounded = value < 0n ? 0n : value > maximum ? maximum : value;
  const scaled = Number((bounded * 300n + maximum / 2n) / maximum);
  return 330 - scaled;
}

function seriesWithPolyline(
  goalId: string,
  label: string,
  color: GoalChartColorDTO,
  values: readonly Readonly<{ period: string; periodLabel: string; amount: bigint; valueLabel: string }>[],
  maximum: bigint
): GoalLineChartSeriesDTO {
  const points = values.map((value, index) => ({
    period: value.period,
    periodLabel: value.periodLabel,
    x: chartX(index, values.length),
    y: chartY(value.amount, maximum),
    valueLabel: value.valueLabel
  }));
  return {
    goalId,
    label,
    color,
    polylinePoints: points.map((point) => `${point.x},${point.y}`).join(" "),
    points
  };
}

function goalsProgress(
  context: FinancialContextSnapshot,
  goals: readonly SurfaceGoalDTO[],
  baseline: BaselineResponseDTO["baseline"],
  history: GoalContributionHistory | null
): GoalsProgressDTO {
  const goalById = new Map(goals.map((goal) => [goal.id, goal]));
  const contextGoalById = new Map(context.goals.map((goal) => [goal.id, goal]));
  const forecastPeriods = [context.projectionStartPeriod, ...baseline.periods.map((period) => period.period)];
  const forecastSeries = goals.flatMap((goal, goalIndex) => {
    const contextGoal = contextGoalById.get(goal.id);
    const opening = contextGoal ? moneyValue(contextGoal.openingBalance) : null;
    const target = contextGoal ? moneyValue(contextGoal.targetBalance) : null;
    if (!opening || !target) return [];
    const values = [{
      period: context.projectionStartPeriod,
      periodLabel: "Now",
      amount: opening.minor,
      valueLabel: `${Math.round(roundedBasisPoints(opening.minor, target.minor) / 100)}% · ${surfaceMoney(opening.minor).display}`
    }, ...baseline.periods.map((period) => {
      const state = period.goalContributions.find((item) => item.goalId === goal.id);
      const balance = state ? BigInt(state.closingBalance.minorUnits) : opening.minor;
      return {
        period: period.period,
        periodLabel: displayShortMonth(period.period),
        amount: balance,
        valueLabel: `${Math.round(roundedBasisPoints(balance, target.minor) / 100)}% · ${surfaceMoney(balance).display}`
      };
    })];
    return [seriesWithPolyline(
      goal.id,
      goal.label,
      GOAL_CHART_COLORS[goalIndex % GOAL_CHART_COLORS.length]!,
      values,
      target.minor
    )];
  });

  const splitPeriods = baseline.periods.map((period) => {
    const total = period.goalContributions.reduce(
      (sum, contribution) => sum + BigInt(contribution.contribution.minorUnits),
      0n
    );
    return {
      period: period.period,
      periodLabel: displayShortMonth(period.period),
      total: surfaceMoney(total),
      segments: period.goalContributions.map((contribution, index) => {
        const amount = BigInt(contribution.contribution.minorUnits);
        const goal = goalById.get(contribution.goalId);
        const basisPoints = total === 0n ? 0 : Math.max(0, Math.min(10_000, roundedBasisPoints(amount, total)));
        return {
          goalId: contribution.goalId,
          label: goal?.label ?? contribution.goalId,
          color: GOAL_CHART_COLORS[index % GOAL_CHART_COLORS.length]!,
          amount: surfaceMoney(amount),
          width: `${basisPoints / 100}%`
        };
      })
    };
  });

  const contributionHistory: GoalsProgressDTO["contributionHistory"] = history && history.periods.length > 0
    ? (() => {
        const maximum = history.periods.reduce(
          (outerMaximum, period) => period.contributions.reduce(
            (periodMaximum, contribution) => contribution.amount.minor > periodMaximum
              ? contribution.amount.minor
              : periodMaximum,
            outerMaximum
          ),
          0n
        );
        const series = goals.map((goal, goalIndex) => seriesWithPolyline(
          goal.id,
          goal.label,
          GOAL_CHART_COLORS[goalIndex % GOAL_CHART_COLORS.length]!,
          history.periods.map((period) => {
            const amount = period.contributions.find((item) => item.goalId === goal.id)?.amount.minor ?? 0n;
            return {
              period: period.period,
              periodLabel: displayShortMonth(period.period),
              amount,
              valueLabel: surfaceMoney(amount).display
            };
          }),
          maximum
        ));
        return {
          status: "available" as const,
          title: "Past contributions" as const,
          description: "Recorded monthly contributions to each goal.",
          sourceLabel: history.sourceLabel,
          firstPeriodLabel: displayShortMonth(history.periods[0]!.period),
          lastPeriodLabel: displayShortMonth(history.throughPeriod),
          axisMaximum: surfaceMoney(maximum),
          series
        };
      })()
    : {
        status: "unavailable",
        title: "Past contributions",
        description: "Past contributions have not been recorded yet, so Future You will not infer them from your balances."
      };

  return {
    forecast: {
      title: "Goal forecast",
      description: "How each goal is expected to move towards 100% on your current plan.",
      firstPeriodLabel: "Now",
      lastPeriodLabel: displayShortMonth(forecastPeriods.at(-1)!),
      series: forecastSeries
    },
    monthlyContributionSplit: {
      title: "Monthly contribution split",
      description: "How your planned goal contribution is allocated each month.",
      periods: splitPeriods
    },
    contributionHistory
  };
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

function ageOnDate(dateOfBirth: string, referenceDate: string): number | null {
  const birth = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateOfBirth);
  const reference = /^(\d{4})-(\d{2})-(\d{2})$/.exec(referenceDate);
  if (!birth || !reference) return null;
  const birthYear = Number(birth[1]);
  const birthMonth = Number(birth[2]);
  const birthDay = Number(birth[3]);
  const referenceYear = Number(reference[1]);
  const referenceMonth = Number(reference[2]);
  const referenceDay = Number(reference[3]);
  const birthdayPassed = referenceMonth > birthMonth
    || (referenceMonth === birthMonth && referenceDay >= birthDay);
  return referenceYear - birthYear - (birthdayPassed ? 0 : 1);
}

function taxProvenance(
  profile: TaxOpportunityProfile,
  sourceReference: string,
  sourceUrl: string,
  profileEvidenceReferences: readonly string[]
): BenefitsSurfaceDTO["taxAndAllowances"][number]["provenance"] {
  return {
    sourceType: "official_public_guidance",
    publisher: "GOV.UK",
    sourceReference,
    sourceUrl,
    accessedDate: "2026-08-27",
    profileVersion: profile.profileVersion,
    profileEvidenceReferences
  };
}

function taxAndAllowanceOpportunities(
  profile: TaxOpportunityProfile | null,
  pensions: readonly InformationalPensionContext[],
  context: FinancialContextSnapshot,
  verifiedEmployerName: string | null
): BenefitsSurfaceDTO["taxAndAllowances"] {
  if (!profile || profile.effectiveTaxYear !== "2026-27") return [];
  const opportunities: BenefitsSurfaceDTO["taxAndAllowances"][number][] = [];
  const noPersonalisedEffect = "No personalised numerical effect has been calculated." as const;

  if (
    profile.residence.incomeTaxNation.value === "ENGLAND"
    && profile.incomeTax.taxCode.value === "1257L"
    && profile.incomeTax.employmentCount.value === 1
  ) {
    opportunities.push({
      id: "PERSONAL_ALLOWANCE",
      title: "Standard Personal Allowance",
      category: "income_tax",
      status: "active_treatment",
      statusLabel: "In your tax code",
      description: "Your 1257L tax code reflects the standard £12,570 Personal Allowance for the 2026/27 tax year.",
      matchedBecause: "Matched to your confirmed tax code, one employment and England Income Tax position.",
      eligibilityLabel: "This describes your current payroll setting, not a new cash benefit.",
      includedInCurrentPlan: true,
      planTreatmentLabel: "Already reflected in your confirmed take-home pay.",
      personalisedEffectCalculated: false,
      numericalEffectLabel: noPersonalisedEffect,
      provenance: taxProvenance(
        profile,
        "Income Tax rates and Personal Allowances; P9X tax codes from 6 April 2026",
        "https://www.gov.uk/income-tax-rates",
        [
          profile.incomeTax.taxCode.sourceReference,
          profile.incomeTax.employmentCount.sourceReference,
          profile.residence.incomeTaxNation.sourceReference
        ]
      )
    });
  }

  if (pensions.length > 0 && profile.pension.taxReliefMethod.value === "NET_PAY") {
    opportunities.push({
      id: "PENSION_TAX_RELIEF",
      title: "Pension tax relief",
      category: "pension",
      status: "active_treatment",
      statusLabel: "Applied automatically",
      description: `${verifiedEmployerName ?? "Your workplace"} uses a net pay arrangement for this pension, so your contribution is taken before Income Tax and relief is applied automatically.`,
      matchedBecause: "Matched to your confirmed pension scheme method and active workplace-pension fact.",
      eligibilityLabel: "There is no additional basic-rate relief for Future You to claim on this contribution.",
      includedInCurrentPlan: true,
      planTreatmentLabel: "Already reflected in your confirmed take-home pay.",
      personalisedEffectCalculated: false,
      numericalEffectLabel: noPersonalisedEffect,
      provenance: taxProvenance(
        profile,
        "Workplace pensions: Managing your pension",
        "https://www.gov.uk/workplace-pensions/managing-your-pension",
        [profile.pension.taxReliefMethod.sourceReference]
      )
    });
  }

  const age = ageOnDate(profile.identityAndHousehold.dateOfBirth.value, profile.referenceDate);
  const firstHome = profile.firstHome;
  if (
    age !== null
    && age >= 18
    && age < 40
    && profile.residence.ukTaxResident.value
    && firstHome.hasEverOwnedResidentialProperty.value === false
    && firstHome.lifetimeIsaStatus.value === "NONE_RECORDED"
    && firstHome.intendedPurchasePriceMinor.value !== null
    && firstHome.intendedPurchasePriceMinor.value <= 45_000_000n
    && firstHome.mortgageIntended.value === true
    && firstHome.mainResidenceIntended.value === true
    && firstHome.purchaseCountry.value === "UK"
  ) {
    opportunities.push({
      id: "LIFETIME_ISA_FIRST_HOME",
      title: "Lifetime ISA for a first home",
      category: "home",
      status: "potential_fit",
      statusLabel: "Potential fit",
      description: "A Lifetime ISA accepts up to £4,000 a tax year and adds a 25% government bonus. First-home withdrawals require additional conditions, including a property price of £450,000 or less and at least 12 months since the first payment.",
      matchedBecause: `Matched because you are ${age}, UK-resident, have never owned a home and are planning a mortgaged UK main residence within the price limit.`,
      eligibilityLabel: "You appear able to explore opening one, but Future You has not confirmed an account, provider terms or a qualifying future withdrawal.",
      includedInCurrentPlan: false,
      planTreatmentLabel: "Not included in your current financial plan.",
      personalisedEffectCalculated: false,
      numericalEffectLabel: noPersonalisedEffect,
      provenance: taxProvenance(
        profile,
        "Lifetime ISA: Overview and first-home withdrawal rules",
        "https://www.gov.uk/lifetime-isa",
        [
          profile.identityAndHousehold.dateOfBirth.sourceReference,
          profile.residence.ukTaxResident.sourceReference,
          firstHome.hasEverOwnedResidentialProperty.sourceReference,
          firstHome.intendedPurchasePriceMinor.sourceReference,
          firstHome.mortgageIntended.sourceReference,
          firstHome.mainResidenceIntended.sourceReference
        ]
      )
    });
  }

  if (
    profile.identityAndHousehold.countedCouncilTaxAdults.value === 1
    && profile.identityAndHousehold.singlePersonDiscountStatus.value === "NOT_CONFIRMED"
  ) {
    const councilTax = context.routineSpending.items.find((item) => item.id === "council-tax");
    const confirmedBill = councilTax
      ? `Your confirmed ${displayMoney(councilTax.amount.minor)} monthly Council Tax bill has not been changed.`
      : "No Council Tax amount has been changed in your financial plan.";
    opportunities.push({
      id: "COUNCIL_TAX_SINGLE_PERSON_DISCOUNT",
      title: "Council Tax single-person discount",
      category: "council_tax",
      status: "potential_fit",
      statusLabel: "Worth checking",
      description: "A full Council Tax bill assumes at least two counted adults. A person who lives alone, or only with disregarded adults, can usually apply for 25% off.",
      matchedBecause: `Matched because your household profile records one counted adult for ${profile.residence.localAuthority.value}.`,
      eligibilityLabel: `Future You does not know whether the discount is already on your Council Tax account; check your bill or ask ${profile.residence.localAuthority.value}.`,
      includedInCurrentPlan: false,
      planTreatmentLabel: confirmedBill,
      personalisedEffectCalculated: false,
      numericalEffectLabel: noPersonalisedEffect,
      provenance: taxProvenance(
        profile,
        "Paying the right level of Council Tax: discounts",
        "https://www.gov.uk/government/publications/paying-the-right-level-of-council-tax-a-plain-english-guide-to-council-tax/paying-the-right-level-of-council-tax-a-plain-english-guide-to-council-tax",
        [
          profile.identityAndHousehold.countedCouncilTaxAdults.sourceReference,
          profile.identityAndHousehold.singlePersonDiscountStatus.sourceReference,
          profile.residence.localAuthority.sourceReference
        ]
      )
    });
  }

  if (
    profile.incomeTax.incomeTaxBand.value === "BASIC_RATE"
    && profile.savings.taxableInterestAnnualMinor.value === null
  ) {
    opportunities.push({
      id: "PERSONAL_SAVINGS_ALLOWANCE",
      title: "Personal Savings Allowance",
      category: "savings",
      status: "details_required",
      statusLabel: "Interest needed",
      description: "For 2026/27, a basic-rate taxpayer can usually receive up to £1,000 of savings interest before paying tax on it. Interest inside an ISA does not use this allowance.",
      matchedBecause: "Matched to your confirmed basic-rate Income Tax position.",
      eligibilityLabel: "Add annual interest from savings outside ISAs before Future You can tell whether this allowance is relevant in practice.",
      includedInCurrentPlan: false,
      planTreatmentLabel: "No savings-interest treatment has been added to your plan.",
      personalisedEffectCalculated: false,
      numericalEffectLabel: noPersonalisedEffect,
      provenance: taxProvenance(
        profile,
        "Tax on savings interest: How much tax you pay",
        "https://www.gov.uk/apply-tax-free-interest-on-savings",
        [
          profile.incomeTax.incomeTaxBand.sourceReference,
          profile.savings.taxableInterestAnnualMinor.sourceReference,
          profile.savings.currentTaxYearIsaContributionsMinor.sourceReference
        ]
      )
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
    const history = await (
      this.dependencies.goalContributionHistorySource ?? EMPTY_GOAL_CONTRIBUTION_HISTORY_SOURCE
    ).getHistory(current.value.context.version);
    return ok({
      apiVersion: PRODUCT_SURFACE_API_VERSION,
      schemaVersion: GOALS_SURFACE_SCHEMA,
      kind: "goals_surface",
      mode: "current_path",
      context: contextDTO(current.value.context, true),
      title: "Your goals",
      summary: "These dates come from your current confirmed financial plan.",
      goals: goals.value,
      progress: goalsProgress(current.value.context, goals.value, current.value.baseline.baseline, history)
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
    const [workplace, employerOpportunities, taxOpportunityProfile] = await Promise.all([
      this.dependencies.workplaceSource.getWorkplace(),
      this.dependencies.employerBenefitSource.getOpportunities(),
      this.dependencies.taxOpportunityProfileSource?.getProfile() ?? Promise.resolve(null)
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
    const taxAndAllowances = taxAndAllowanceOpportunities(
      taxOpportunityProfile,
      pensions,
      context,
      workplace?.verificationStatus === "verified" ? workplace.name : null
    );
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
