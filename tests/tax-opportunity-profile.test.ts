import { describe, expect, it } from "vitest";
import { ProductSurfaceApplication } from "../src/application/product-surfaces/application";
import type { FinancialContextSource } from "../src/application/ports/financial-context-source";
import type { WorkplaceAssociationSource } from "../src/application/ports/workplace-association-source";
import { canonicalStringify } from "../src/domain/shared/identity";
import { createSarahV1Context, SARAH_V1_CONTEXT, SARAH_V1_PROFILE } from "../src/fixtures/sarah-v1";
import {
  SARAH_V1_TAX_OPPORTUNITY_PROFILE,
  SARAH_V1_TAX_OPPORTUNITY_PROFILE_SOURCE
} from "../src/fixtures/sarah-v1-tax-opportunity-profile";
import { SarahV1ContextSource } from "../src/infrastructure/context/sarah-v1-context-source";
import { SARAH_EMPLOYER_BENEFIT_SOURCE } from "./fixtures/employer-benefits";

const verifiedOniBank: WorkplaceAssociationSource = {
  async getWorkplace() {
    return {
      name: "OniBank",
      associationSource: "employer_provisioned",
      verificationStatus: "verified"
    };
  }
};

function application(
  contextSource: FinancialContextSource,
  withTaxProfile: boolean
) {
  const dependencies = {
    displayName: "Sarah Wonk",
    contextSource,
    workplaceSource: verifiedOniBank,
    employerBenefitSource: SARAH_EMPLOYER_BENEFIT_SOURCE,
    simulator: {
      generateBaseline: { async execute(): Promise<never> { throw new Error("Benefits called the simulator"); } },
      getSimulationRun: { async execute(): Promise<never> { throw new Error("Benefits called the simulator"); } }
    }
  };
  return withTaxProfile
    ? new ProductSurfaceApplication({
        ...dependencies,
        taxOpportunityProfileSource: SARAH_V1_TAX_OPPORTUNITY_PROFILE_SOURCE
      })
    : new ProductSurfaceApplication(dependencies);
}

describe("Sarah's versioned tax and allowance opportunity profile", () => {
  it("records the minimum synthetic evidence without changing the immutable financial context", () => {
    expect(SARAH_V1_PROFILE).toMatchObject({
      studentLoanPlan: "PLAN_2",
      taxOpportunityProfileVersion: "sarah-tax-opportunity-profile@2026-09-01"
    });
    expect(SARAH_V1_TAX_OPPORTUNITY_PROFILE).toMatchObject({
      schemaVersion: "tax-opportunity-profile/1.0.0",
      effectiveTaxYear: "2026-27",
      residence: {
        ukTaxResident: { value: true },
        incomeTaxNation: { value: "ENGLAND" },
        localAuthority: { value: "Manchester City Council" }
      },
      incomeTax: {
        taxCode: { value: "1257L" },
        employmentCount: { value: 1 },
        grossEmploymentIncomeMinor: { value: 3_850_000n },
        incomeTaxBand: { value: "BASIC_RATE" },
        otherTaxableIncomeStatus: { value: "NONE_DECLARED" }
      },
      pension: { taxReliefMethod: { value: "NET_PAY" } },
      studentFinance: {
        repaymentPlan: { value: "PLAN_2" },
        deductionIncludedInTakeHome: { value: true }
      },
      firstHome: {
        hasEverOwnedResidentialProperty: { value: false },
        lifetimeIsaStatus: { value: "NONE_RECORDED" },
        intendedPurchasePriceMinor: { value: 25_000_000n }
      }
    });
    expect(canonicalStringify(SARAH_V1_CONTEXT)).toBe(canonicalStringify(createSarahV1Context()));
  });

  it("builds five evidence-backed states and keeps all personalised effects non-numerical", async () => {
    const result = await application(new SarahV1ContextSource(), true).benefits();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.schemaVersion).toBe("benefits-surface/1.3.0");
    expect(result.value.taxAndAllowances.map(({ id, status }) => [id, status])).toEqual([
      ["PERSONAL_ALLOWANCE", "active_treatment"],
      ["PENSION_TAX_RELIEF", "active_treatment"],
      ["LIFETIME_ISA_FIRST_HOME", "potential_fit"],
      ["COUNCIL_TAX_SINGLE_PERSON_DISCOUNT", "potential_fit"],
      ["PERSONAL_SAVINGS_ALLOWANCE", "details_required"]
    ]);
    expect(result.value.taxAndAllowances.every((item) =>
      item.personalisedEffectCalculated === false
      && item.provenance.publisher === "GOV.UK"
      && item.provenance.profileVersion === SARAH_V1_TAX_OPPORTUNITY_PROFILE.profileVersion
      && item.provenance.profileEvidenceReferences.length > 0
    )).toBe(true);
    const serialized = JSON.stringify(result.value);
    expect(serialized).not.toContain("2001-05-14");
    expect(serialized).not.toContain("3850000");
    expect(serialized).not.toContain("WORKING_FROM_HOME");
    expect(serialized).not.toContain("MARRIAGE_ALLOWANCE");
    expect(serialized).not.toContain("HELP_TO_SAVE");
  });

  it("does not infer tax eligibility from Sarah's pension, goals, salary or employer when the profile is absent", async () => {
    const result = await application(new SarahV1ContextSource(), false).benefits();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.activeFacts).toHaveLength(1);
    expect(result.value.opportunities).toHaveLength(2);
    expect(result.value.taxAndAllowances).toEqual([]);
  });

  it("keeps the Council Tax bill and every frozen financial value untouched", async () => {
    const councilTax = SARAH_V1_CONTEXT.routineSpending.items.find((item) => item.id === "council-tax");
    expect(councilTax?.amount.minor).toBe(9_000n);
    expect(SARAH_V1_CONTEXT.currentAccount.clearedBalance.value?.minor).toBe(275_000n);
    expect(SARAH_V1_CONTEXT.desiredSafetyBuffer.value?.minor).toBe(90_000n);
    expect(SARAH_V1_CONTEXT.income.amount.value?.minor).toBe(245_000n);
  });
});
