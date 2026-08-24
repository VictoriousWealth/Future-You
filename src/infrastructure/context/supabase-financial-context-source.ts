import "server-only";
import type { AuthenticatedPrincipal } from "../../application/auth/authenticated-principal";
import type { FinancialContextSource } from "../../application/ports/financial-context-source";
import type { FinancialContextSnapshot } from "../../domain/simulator/types";
import type { RequestSupabaseClient } from "../supabase/server-client";
import { financialContextFromPersistence } from "../persistence/financial-context-persistence";
import { PersistenceBoundaryError } from "../persistence/persistence-errors";

export class SupabaseFinancialContextSource implements FinancialContextSource {
  constructor(
    private readonly client: RequestSupabaseClient,
    private readonly principal: AuthenticatedPrincipal
  ) {}

  async getCurrentContextVersionId(): Promise<string | null> {
    const { data, error } = await this.client
      .from("profiles")
      .select("current_financial_context_version_id")
      .eq("user_id", this.principal.userId)
      .maybeSingle();
    if (error) {
      throw new PersistenceBoundaryError(
        "PERSISTENCE_FAILURE",
        "The current financial-context pointer could not be read."
      );
    }
    return data?.current_financial_context_version_id ?? null;
  }

  async getContextVersion(contextVersionId: string): Promise<FinancialContextSnapshot | null> {
    const { data, error } = await this.client
      .from("financial_context_versions")
      .select("version_id, context_id, domain_schema_version, persistence_schema_version, payload")
      .eq("user_id", this.principal.userId)
      .eq("version_id", contextVersionId)
      .maybeSingle();
    if (error) {
      throw new PersistenceBoundaryError(
        "PERSISTENCE_FAILURE",
        "The financial context could not be read."
      );
    }
    if (!data) return null;
    const context = financialContextFromPersistence(
      data.payload,
      data.persistence_schema_version
    );
    if (
      context.version !== data.version_id ||
      context.id !== data.context_id ||
      context.schemaVersion !== data.domain_schema_version
    ) {
      throw new PersistenceBoundaryError(
        "PERSISTED_DATA_INVALID",
        "Persisted financial-context identity metadata did not match its payload."
      );
    }
    return context;
  }
}
