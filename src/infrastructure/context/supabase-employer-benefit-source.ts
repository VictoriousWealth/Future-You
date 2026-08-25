import "server-only";
import type { AuthenticatedPrincipal } from "../../application/auth/authenticated-principal";
import type {
  EmployerBenefitKey,
  EmployerBenefitOpportunity,
  EmployerBenefitSource
} from "../../application/ports/employer-benefit-source";
import { PersistenceBoundaryError } from "../persistence/persistence-errors";
import type { RequestSupabaseClient } from "../supabase/server-client";

const BENEFIT_KEYS = new Set<EmployerBenefitKey>([
  "ADDITIONAL_PENSION_MATCH",
  "SEASON_TICKET_LOAN"
]);

export class SupabaseEmployerBenefitSource implements EmployerBenefitSource {
  constructor(
    private readonly client: RequestSupabaseClient,
    private readonly principal: AuthenticatedPrincipal
  ) {}

  async getOpportunities(): Promise<readonly EmployerBenefitOpportunity[]> {
    const { data: membership, error: membershipError } = await this.client
      .from("employer_memberships")
      .select("employer_id, employer_display_name, status")
      .eq("user_id", this.principal.userId)
      .maybeSingle();
    if (membershipError) {
      throw new PersistenceBoundaryError(
        "PERSISTENCE_FAILURE",
        "The employer membership for benefit information could not be read."
      );
    }
    if (!membership || membership.status !== "ACTIVE") return [];

    const [{ data: offerings, error: offeringsError }, { data: states, error: statesError }] = await Promise.all([
      this.client
        .from("employer_benefit_offerings")
        .select("offering_id, employer_id, benefit_key, display_name, category, offering_status, provenance_source_type, source_reference, reference_date, last_confirmed_date, numerical_simulation_supported, further_information_required, record_version, schema_version")
        .eq("employer_id", membership.employer_id)
        .eq("offering_status", "AVAILABLE")
        .order("benefit_key", { ascending: true })
        .order("record_version", { ascending: false }),
      this.client
        .from("user_benefit_states")
        .select("state_id, offering_id, eligibility_status, uptake_status, included_in_financial_baseline, information_completeness, provenance_source_type, source_reference, last_confirmed_date, schema_version")
        .eq("user_id", this.principal.userId)
        .eq("employer_id", membership.employer_id)
    ]);
    if (offeringsError || statesError) {
      throw new PersistenceBoundaryError(
        "PERSISTENCE_FAILURE",
        "The employer benefit information could not be read."
      );
    }

    const stateByOffering = new Map((states ?? []).map((state) => [state.offering_id, state]));
    const newestByBenefit = new Map<EmployerBenefitKey, EmployerBenefitOpportunity>();
    for (const offering of offerings ?? []) {
      if (!BENEFIT_KEYS.has(offering.benefit_key as EmployerBenefitKey)) continue;
      if (
        offering.offering_status !== "AVAILABLE"
        || offering.provenance_source_type !== "CANONICAL_DEMONSTRATION_REFERENCE"
        || offering.numerical_simulation_supported
        || !offering.further_information_required
      ) {
        throw new PersistenceBoundaryError(
          "PERSISTED_DATA_INVALID",
          "An employer benefit offering does not satisfy the supported informational contract."
        );
      }
      const key = offering.benefit_key as EmployerBenefitKey;
      if (newestByBenefit.has(key)) continue;
      const state = stateByOffering.get(offering.offering_id) ?? null;
      if (state && state.provenance_source_type !== "CANONICAL_DEMONSTRATION_FIXTURE") {
        throw new PersistenceBoundaryError(
          "PERSISTED_DATA_INVALID",
          "A user benefit state has unsupported provenance."
        );
      }
      newestByBenefit.set(key, {
        offeringId: offering.offering_id,
        employerId: offering.employer_id,
        employerName: membership.employer_display_name,
        benefitKey: key,
        displayName: offering.display_name,
        category: offering.category as EmployerBenefitOpportunity["category"],
        offeringStatus: "AVAILABLE",
        provenanceSourceType: "CANONICAL_DEMONSTRATION_REFERENCE",
        sourceReference: offering.source_reference,
        referenceDate: offering.reference_date,
        lastConfirmedDate: offering.last_confirmed_date,
        numericalSimulationSupported: false,
        furtherInformationRequired: true,
        recordVersion: offering.record_version,
        schemaVersion: offering.schema_version,
        userState: state
          ? {
              stateId: state.state_id,
              eligibilityStatus: state.eligibility_status as NonNullable<EmployerBenefitOpportunity["userState"]>["eligibilityStatus"],
              uptakeStatus: state.uptake_status as NonNullable<EmployerBenefitOpportunity["userState"]>["uptakeStatus"],
              includedInFinancialBaseline: state.included_in_financial_baseline,
              informationCompleteness: state.information_completeness as NonNullable<EmployerBenefitOpportunity["userState"]>["informationCompleteness"],
              provenanceSourceType: "CANONICAL_DEMONSTRATION_FIXTURE",
              sourceReference: state.source_reference,
              lastConfirmedDate: state.last_confirmed_date,
              schemaVersion: state.schema_version
            }
          : null
      });
    }
    return [...newestByBenefit.values()];
  }
}
