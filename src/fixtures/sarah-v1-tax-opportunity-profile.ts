import type {
  ProfileEvidence,
  ProfileEvidenceSource,
  TaxOpportunityProfile
} from "../application/ports/tax-opportunity-profile-source";
import { deepFreeze } from "../domain/shared/immutable";

const CONFIRMED_DATE = "2026-09-01";

function evidence<T>(
  value: T,
  sourceType: ProfileEvidenceSource,
  sourceReference: string
): ProfileEvidence<T> {
  return { value, sourceType, sourceReference, confirmedDate: CONFIRMED_DATE };
}

/**
 * Synthetic, non-simulator profile evidence for the canonical Sarah demonstration.
 * These facts support tax-and-allowance matching only. They are not financial-context
 * facts and must never alter Sarah's frozen baseline or scenario calculations.
 */
export const SARAH_V1_TAX_OPPORTUNITY_PROFILE = deepFreeze({
  schemaVersion: "tax-opportunity-profile/1.0.0",
  profileVersion: "sarah-tax-opportunity-profile@2026-09-01",
  effectiveTaxYear: "2026-27",
  referenceDate: CONFIRMED_DATE,
  residence: {
    ukTaxResident: evidence(true, "canonical_demo_profile", "Sarah v1 confirmed UK tax residence"),
    incomeTaxNation: evidence("ENGLAND", "canonical_demo_profile", "Sarah v1 confirmed England Income Tax nation"),
    localAuthority: evidence("Manchester City Council", "council_tax_account", "Sarah v1 Manchester Council Tax account")
  },
  identityAndHousehold: {
    dateOfBirth: evidence("2001-05-14", "canonical_demo_profile", "Sarah v1 synthetic date of birth"),
    relationshipStatus: evidence("SINGLE", "user_confirmed", "Sarah v1 confirmed relationship status"),
    dependentChildren: evidence(0, "user_confirmed", "Sarah v1 confirmed dependent-child count"),
    countedCouncilTaxAdults: evidence(1, "user_confirmed", "Sarah v1 confirmed household composition"),
    singlePersonDiscountStatus: evidence("NOT_CONFIRMED", "council_tax_account", "Sarah v1 Council Tax discount status not confirmed")
  },
  incomeTax: {
    taxCode: evidence("1257L", "payslip", "Sarah v1 August 2026 synthetic OniBank payslip"),
    employmentCount: evidence(1, "user_confirmed", "Sarah v1 confirmed employment count"),
    grossEmploymentIncomeMinor: evidence(3_850_000n, "payslip", "Sarah v1 confirmed annual gross salary"),
    incomeTaxBand: evidence("BASIC_RATE", "canonical_demo_profile", "Sarah v1 reviewed 2026/27 Income Tax position"),
    otherTaxableIncomeStatus: evidence("NONE_DECLARED", "user_confirmed", "Sarah v1 other taxable income declaration"),
    selfAssessmentStatus: evidence("NOT_REGISTERED", "user_confirmed", "Sarah v1 Self Assessment status")
  },
  pension: {
    taxReliefMethod: evidence("NET_PAY", "pension_scheme_information", "OniBank workplace-pension scheme information for Sarah v1")
  },
  studentFinance: {
    repaymentPlan: evidence("PLAN_2", "payslip", "Sarah v1 August 2026 synthetic student-loan deduction"),
    deductionIncludedInTakeHome: evidence(true, "payslip", "Sarah v1 confirmed take-home treatment")
  },
  firstHome: {
    hasEverOwnedResidentialProperty: evidence(false, "user_confirmed", "Sarah v1 first-time-buyer declaration"),
    lifetimeIsaStatus: evidence("NONE_RECORDED", "user_confirmed", "Sarah v1 savings-product declaration"),
    intendedPurchasePriceMinor: evidence(25_000_000n, "user_confirmed", "Sarah v1 intended first-home price"),
    mortgageIntended: evidence(true, "user_confirmed", "Sarah v1 first-home funding intention"),
    mainResidenceIntended: evidence(true, "user_confirmed", "Sarah v1 first-home occupancy intention"),
    purchaseCountry: evidence("UK", "user_confirmed", "Sarah v1 first-home location intention")
  },
  savings: {
    taxableInterestAnnualMinor: evidence(null, "user_confirmed", "Sarah v1 taxable savings interest not supplied"),
    currentTaxYearIsaContributionsMinor: evidence(null, "user_confirmed", "Sarah v1 current-year ISA subscriptions not supplied")
  },
  otherEligibility: {
    universalCreditStatus: evidence("NOT_RECEIVING", "user_confirmed", "Sarah v1 Universal Credit status"),
    tradingIncomeStatus: evidence("NONE_DECLARED", "user_confirmed", "Sarah v1 trading-income declaration"),
    propertyIncomeStatus: evidence("NONE_DECLARED", "user_confirmed", "Sarah v1 property-income declaration"),
    dividendIncomeStatus: evidence("NONE_DECLARED", "user_confirmed", "Sarah v1 dividend-income declaration"),
    taxableCapitalGainsStatus: evidence("NONE_DECLARED", "user_confirmed", "Sarah v1 capital-gains declaration"),
    employeeExpenseEvidenceStatus: evidence("NONE_RECORDED", "user_confirmed", "Sarah v1 employee-expense evidence status")
  }
} as const satisfies TaxOpportunityProfile);

export const SARAH_V1_TAX_OPPORTUNITY_PROFILE_SOURCE = Object.freeze({
  async getProfile(): Promise<TaxOpportunityProfile> {
    return SARAH_V1_TAX_OPPORTUNITY_PROFILE;
  }
});
