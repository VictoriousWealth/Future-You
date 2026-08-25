export type EmployerBenefitKey = "ADDITIONAL_PENSION_MATCH" | "SEASON_TICKET_LOAN";

export interface EmployerBenefitOpportunity {
  readonly offeringId: string;
  readonly employerId: string;
  readonly employerName: string;
  readonly benefitKey: EmployerBenefitKey;
  readonly displayName: string;
  readonly category: "PENSION" | "TRAVEL";
  readonly offeringStatus: "AVAILABLE";
  readonly provenanceSourceType: "CANONICAL_DEMONSTRATION_REFERENCE";
  readonly sourceReference: string;
  readonly referenceDate: string;
  readonly lastConfirmedDate: string | null;
  readonly numericalSimulationSupported: false;
  readonly furtherInformationRequired: true;
  readonly recordVersion: number;
  readonly schemaVersion: string;
  readonly userState: null | Readonly<{
    readonly stateId: string;
    readonly eligibilityStatus: "UNKNOWN" | "CONFIRMED_ELIGIBLE" | "NOT_ELIGIBLE";
    readonly uptakeStatus: "INACTIVE" | "ACTIVE";
    readonly includedInFinancialBaseline: boolean;
    readonly informationCompleteness: "INCOMPLETE" | "COMPLETE";
    readonly provenanceSourceType: "CANONICAL_DEMONSTRATION_FIXTURE";
    readonly sourceReference: string;
    readonly lastConfirmedDate: string | null;
    readonly schemaVersion: string;
  }>;
}

export interface EmployerBenefitSource {
  getOpportunities(): Promise<readonly EmployerBenefitOpportunity[]>;
}

export const EMPTY_EMPLOYER_BENEFIT_SOURCE: EmployerBenefitSource = Object.freeze({
  async getOpportunities() {
    return [];
  }
});
