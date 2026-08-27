import type { Money } from "../../domain/shared/money";
import type { InformationalPensionContext } from "../../domain/simulator/types";
import type { EmployerBenefitOpportunity, EmployerBenefitSource } from "../ports/employer-benefit-source";
import type { FinancialContextSource } from "../ports/financial-context-source";
import type { WorkplaceAssociationSource } from "../ports/workplace-association-source";
import { ConversationApplicationError } from "./application-error";
import type { DemoConversationTrustedDataSource, DemoTrustedFact } from "./demo-contracts";

export interface DemoTrustedDataDependencies {
  readonly contextSource: FinancialContextSource;
  readonly workplaceSource: WorkplaceAssociationSource;
  readonly employerBenefitSource: EmployerBenefitSource;
}

function money(value: { readonly value: Money | null }, label: string): Money {
  if (!value.value) {
    throw new ConversationApplicationError(
      "PERSISTENCE_FAILURE",
      `${label} is unavailable in the trusted financial context.`
    );
  }
  return value.value;
}

function displayMoney(minor: bigint): string {
  const sign = minor < 0n ? "-" : "";
  const absolute = minor < 0n ? -minor : minor;
  const pounds = (absolute / 100n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const pennies = absolute % 100n;
  return `${sign}£${pounds}${pennies === 0n ? "" : `.${pennies.toString().padStart(2, "0")}`}`;
}

function eligibleOpportunity(
  opportunity: EmployerBenefitOpportunity,
  workplaceName: string
): boolean {
  const state = opportunity.userState;
  return opportunity.employerName === workplaceName
    && opportunity.offeringStatus === "AVAILABLE"
    && !opportunity.numericalSimulationSupported
    && opportunity.furtherInformationRequired
    && state !== null
    && state.eligibilityStatus === "UNKNOWN"
    && state.uptakeStatus === "INACTIVE"
    && !state.includedInFinancialBaseline
    && state.informationCompleteness === "INCOMPLETE";
}

/**
 * Builds only the presentation-ready facts the demo wording stage needs. It never
 * exposes raw rows, owner IDs, context IDs, benefit IDs or financial-context payloads.
 */
export class DemoConversationTrustedDataReader implements DemoConversationTrustedDataSource {
  constructor(private readonly dependencies: DemoTrustedDataDependencies) {}

  async goals(contextVersionId: string): Promise<readonly DemoTrustedFact[]> {
    const context = await this.dependencies.contextSource.getContextVersion(contextVersionId);
    if (!context) {
      throw new ConversationApplicationError("PERSISTENCE_FAILURE", "The trusted goal data could not be read.");
    }
    if (context.goals.length === 0) {
      return [{ key: "GOALS_EMPTY", text: "You do not currently have any goals in this financial plan." }];
    }
    return context.goals.map((goal, index) => ({
      key: `GOAL_${index + 1}`,
      text: `${goal.label}: ${displayMoney(money(goal.openingBalance, "Goal balance").minor)} saved toward ${displayMoney(money(goal.targetBalance, "Goal target").minor)}.${goal.paused ? " This goal is paused." : ""}`
    }));
  }

  async workBenefits(contextVersionId: string): Promise<readonly DemoTrustedFact[]> {
    const [context, workplace, opportunities] = await Promise.all([
      this.dependencies.contextSource.getContextVersion(contextVersionId),
      this.dependencies.workplaceSource.getWorkplace(),
      this.dependencies.employerBenefitSource.getOpportunities()
    ]);
    if (!context) {
      throw new ConversationApplicationError("PERSISTENCE_FAILURE", "The trusted workplace data could not be read.");
    }

    const facts: DemoTrustedFact[] = [];
    const verifiedEmployer = workplace?.verificationStatus === "verified" ? workplace.name : null;
    if (verifiedEmployer) {
      facts.push({
        key: "WORKPLACE",
        text: `Your verified workplace is ${verifiedEmployer}, and your membership is active.`
      });
    } else if (workplace) {
      facts.push({
        key: "WORKPLACE",
        text: `${workplace.name} is recorded as an unverified workplace, so Future You does not infer benefits from its name.`
      });
    } else {
      facts.push({
        key: "WORKPLACE",
        text: "You do not currently have a workplace associated with Future You."
      });
    }

    const pensions = context.informationalContext.filter(
      (fact): fact is InformationalPensionContext => fact.kind === "PENSION_INFORMATION"
    );
    pensions.forEach((pension, index) => {
      const employer = verifiedEmployer ?? "Your employer";
      facts.push({
        key: `ACTIVE_PENSION_${index + 1}`,
        text: `Your workplace pension is active: you contribute ${pension.employeeContributionPercent}% and ${employer} contributes ${pension.employerContributionPercent}%. The employer contribution is retirement value, not spendable cash, and your confirmed take-home pay already reflects your contribution.`
      });
    });

    const trusted = verifiedEmployer
      ? opportunities.filter((opportunity) => eligibleOpportunity(opportunity, verifiedEmployer))
      : [];
    for (const opportunity of trusted) {
      if (opportunity.benefitKey === "ADDITIONAL_PENSION_MATCH") {
        facts.push({
          key: "BENEFIT_ADDITIONAL_PENSION_MATCH",
          text: `${opportunity.employerName} lists an additional pension match up to 5%. Your eligibility has not been confirmed, it is not active, and no numerical effect has been calculated.`
        });
      } else if (opportunity.benefitKey === "SEASON_TICKET_LOAN") {
        facts.push({
          key: "BENEFIT_SEASON_TICKET_LOAN",
          text: `${opportunity.employerName} lists a season-ticket loan. Your eligibility is unknown, it is not included in your current financial plan, and no numerical effect has been calculated.`
        });
      }
    }

    if (pensions.length === 0 && trusted.length === 0) {
      facts.push({
        key: "BENEFITS_EMPTY",
        text: verifiedEmployer
          ? "Future You does not have confirmed benefit information for this workplace yet."
          : "Future You has no verified workplace benefit information to show."
      });
    }
    return facts;
  }
}
