export type ProfileEvidenceSource =
  | "canonical_demo_profile"
  | "user_confirmed"
  | "payslip"
  | "pension_scheme_information"
  | "council_tax_account";

export interface ProfileEvidence<T> {
  readonly value: T;
  readonly sourceType: ProfileEvidenceSource;
  readonly sourceReference: string;
  readonly confirmedDate: string;
}

export interface TaxOpportunityProfile {
  readonly schemaVersion: "tax-opportunity-profile/1.0.0";
  readonly profileVersion: string;
  readonly effectiveTaxYear: "2026-27";
  readonly referenceDate: string;
  readonly residence: Readonly<{
    readonly ukTaxResident: ProfileEvidence<boolean>;
    readonly incomeTaxNation: ProfileEvidence<"ENGLAND" | "WALES" | "SCOTLAND" | "NORTHERN_IRELAND">;
    readonly localAuthority: ProfileEvidence<string>;
  }>;
  readonly identityAndHousehold: Readonly<{
    readonly dateOfBirth: ProfileEvidence<string>;
    readonly relationshipStatus: ProfileEvidence<
      "SINGLE" | "MARRIED" | "CIVIL_PARTNERSHIP" | "COHABITING" | "DIVORCED" | "WIDOWED" | "NOT_PROVIDED"
    >;
    readonly dependentChildren: ProfileEvidence<number | null>;
    readonly countedCouncilTaxAdults: ProfileEvidence<number | null>;
    readonly singlePersonDiscountStatus: ProfileEvidence<"ACTIVE" | "NOT_CONFIRMED" | "NOT_APPLICABLE">;
  }>;
  readonly incomeTax: Readonly<{
    readonly taxCode: ProfileEvidence<string>;
    readonly employmentCount: ProfileEvidence<number>;
    readonly grossEmploymentIncomeMinor: ProfileEvidence<bigint>;
    readonly incomeTaxBand: ProfileEvidence<"BASIC_RATE" | "HIGHER_RATE" | "ADDITIONAL_RATE" | "UNKNOWN">;
    readonly otherTaxableIncomeStatus: ProfileEvidence<"NONE_DECLARED" | "DECLARED" | "UNKNOWN">;
    readonly selfAssessmentStatus: ProfileEvidence<"REGISTERED" | "NOT_REGISTERED" | "UNKNOWN">;
  }>;
  readonly pension: Readonly<{
    readonly taxReliefMethod: ProfileEvidence<"NET_PAY" | "RELIEF_AT_SOURCE" | "SALARY_SACRIFICE" | "UNKNOWN">;
  }>;
  readonly studentFinance: Readonly<{
    readonly repaymentPlan: ProfileEvidence<"PLAN_1" | "PLAN_2" | "PLAN_4" | "PLAN_5" | "POSTGRADUATE" | "NONE" | "UNKNOWN">;
    readonly deductionIncludedInTakeHome: ProfileEvidence<boolean>;
  }>;
  readonly firstHome: Readonly<{
    readonly hasEverOwnedResidentialProperty: ProfileEvidence<boolean | null>;
    readonly lifetimeIsaStatus: ProfileEvidence<"NONE_RECORDED" | "OPEN" | "CLOSED" | "UNKNOWN">;
    readonly intendedPurchasePriceMinor: ProfileEvidence<bigint | null>;
    readonly mortgageIntended: ProfileEvidence<boolean | null>;
    readonly mainResidenceIntended: ProfileEvidence<boolean | null>;
    readonly purchaseCountry: ProfileEvidence<"UK" | "OUTSIDE_UK" | "UNKNOWN">;
  }>;
  readonly savings: Readonly<{
    readonly taxableInterestAnnualMinor: ProfileEvidence<bigint | null>;
    readonly currentTaxYearIsaContributionsMinor: ProfileEvidence<bigint | null>;
  }>;
  readonly otherEligibility: Readonly<{
    readonly universalCreditStatus: ProfileEvidence<"RECEIVING" | "NOT_RECEIVING" | "UNKNOWN">;
    readonly tradingIncomeStatus: ProfileEvidence<"NONE_DECLARED" | "DECLARED" | "UNKNOWN">;
    readonly propertyIncomeStatus: ProfileEvidence<"NONE_DECLARED" | "DECLARED" | "UNKNOWN">;
    readonly dividendIncomeStatus: ProfileEvidence<"NONE_DECLARED" | "DECLARED" | "UNKNOWN">;
    readonly taxableCapitalGainsStatus: ProfileEvidence<"NONE_DECLARED" | "DECLARED" | "UNKNOWN">;
    readonly employeeExpenseEvidenceStatus: ProfileEvidence<"NONE_RECORDED" | "RECORDED" | "UNKNOWN">;
  }>;
}

export interface TaxOpportunityProfileSource {
  getProfile(): Promise<TaxOpportunityProfile | null>;
}

export const EMPTY_TAX_OPPORTUNITY_PROFILE_SOURCE: TaxOpportunityProfileSource = Object.freeze({
  async getProfile() {
    return null;
  }
});
