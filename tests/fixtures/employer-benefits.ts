import type {
  EmployerBenefitOpportunity,
  EmployerBenefitSource
} from "../../src/application/ports/employer-benefit-source";

const common = Object.freeze({
  employerId: "44444444-4444-4444-8444-444444444444",
  employerName: "OniBank",
  offeringStatus: "AVAILABLE" as const,
  provenanceSourceType: "CANONICAL_DEMONSTRATION_REFERENCE" as const,
  sourceReference: "Canonical OniBank demonstration benefit record",
  referenceDate: "2026-08-31",
  lastConfirmedDate: "2026-08-31",
  numericalSimulationSupported: false as const,
  furtherInformationRequired: true as const,
  recordVersion: 1,
  schemaVersion: "future-you.employer-benefit-offering/1.0.0"
});

function state(id: string): NonNullable<EmployerBenefitOpportunity["userState"]> {
  return {
    stateId: id,
    eligibilityStatus: "UNKNOWN",
    uptakeStatus: "INACTIVE",
    includedInFinancialBaseline: false,
    informationCompleteness: "INCOMPLETE",
    provenanceSourceType: "CANONICAL_DEMONSTRATION_FIXTURE",
    sourceReference: "Canonical Sarah opportunity status v1",
    lastConfirmedDate: "2026-08-31",
    schemaVersion: "future-you.user-benefit-state/1.0.0"
  };
}

export const SARAH_EMPLOYER_BENEFIT_OPPORTUNITIES: readonly EmployerBenefitOpportunity[] = Object.freeze([
  {
    ...common,
    offeringId: "77777777-7777-4777-8777-777777777701",
    benefitKey: "ADDITIONAL_PENSION_MATCH",
    displayName: "Additional pension match",
    category: "PENSION",
    userState: state("88888888-8888-4888-8888-888888888801")
  },
  {
    ...common,
    offeringId: "77777777-7777-4777-8777-777777777702",
    benefitKey: "SEASON_TICKET_LOAN",
    displayName: "Season-ticket loan",
    category: "TRAVEL",
    userState: state("88888888-8888-4888-8888-888888888802")
  }
]);

export const SARAH_EMPLOYER_BENEFIT_SOURCE: EmployerBenefitSource = Object.freeze({
  async getOpportunities() {
    return SARAH_EMPLOYER_BENEFIT_OPPORTUNITIES;
  }
});

export const EMPTY_EMPLOYER_BENEFIT_SOURCE: EmployerBenefitSource = Object.freeze({
  async getOpportunities() {
    return [];
  }
});
