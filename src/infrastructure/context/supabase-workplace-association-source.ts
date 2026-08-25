import "server-only";
import type { AuthenticatedPrincipal } from "../../application/auth/authenticated-principal";
import type { WorkplaceAssociation } from "../../application/ports/financial-context-version-repository";
import type { WorkplaceAssociationSource } from "../../application/ports/workplace-association-source";
import { PersistenceBoundaryError } from "../persistence/persistence-errors";
import type { RequestSupabaseClient } from "../supabase/server-client";

export class SupabaseWorkplaceAssociationSource implements WorkplaceAssociationSource {
  constructor(
    private readonly client: RequestSupabaseClient,
    private readonly principal: AuthenticatedPrincipal
  ) {}

  async getWorkplace(): Promise<WorkplaceAssociation | null> {
    const { data: membership, error: membershipError } = await this.client
      .from("employer_memberships")
      .select("employer_display_name, status")
      .eq("user_id", this.principal.userId)
      .maybeSingle();
    if (membershipError) {
      throw new PersistenceBoundaryError(
        "PERSISTENCE_FAILURE",
        "The verified employer membership could not be read."
      );
    }
    if (membership?.status === "ACTIVE") {
      return {
        name: membership.employer_display_name,
        associationSource: "employer_provisioned",
        verificationStatus: "verified"
      };
    }
    const { data, error } = await this.client
      .from("workplace_associations")
      .select("workplace_name, association_source, verification_status")
      .eq("user_id", this.principal.userId)
      .maybeSingle();
    if (error) {
      throw new PersistenceBoundaryError(
        "PERSISTENCE_FAILURE",
        "The workplace association could not be read."
      );
    }
    if (!data) return null;
    return {
      name: data.workplace_name,
      associationSource: "user_provided",
      verificationStatus: "unverified"
    };
  }
}
