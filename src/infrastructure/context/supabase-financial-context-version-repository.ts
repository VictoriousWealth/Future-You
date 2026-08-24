import "server-only";
import type { AuthenticatedPrincipal } from "../../application/auth/authenticated-principal";
import type {
  ConfirmContextVersionCommand,
  ConfirmContextVersionResult,
  FinancialContextVersionRepository,
  WorkplaceAssociation
} from "../../application/ports/financial-context-version-repository";
import { inputIdentity } from "../../domain/shared/identity";
import {
  FINANCIAL_CONTEXT_PERSISTENCE_SCHEMA,
  financialContextToPersistence
} from "../persistence/financial-context-persistence";
import { PersistenceBoundaryError } from "../persistence/persistence-errors";
import type { Json } from "../supabase/database.types";
import type { RequestSupabaseClient } from "../supabase/server-client";

interface ConfirmationRpcRow {
  readonly status: "created" | "existing" | "idempotency_conflict" | "context_conflict";
  readonly context_version_id: string | null;
}

export class SupabaseFinancialContextVersionRepository
  implements FinancialContextVersionRepository
{
  constructor(
    private readonly client: RequestSupabaseClient,
    private readonly principal: AuthenticatedPrincipal
  ) {}

  async confirm(command: ConfirmContextVersionCommand): Promise<ConfirmContextVersionResult> {
    const persisted = financialContextToPersistence(command.context);
    const requestIdentity = inputIdentity({
      operation: command.operation,
      requestId: command.requestId,
      canonicalRequestHash: command.requestIdentity,
      expectedCurrentContextVersionId: command.expectedCurrentContextVersionId
    });
    const { data, error } = await this.client.rpc("confirm_financial_context_version", {
      p_operation: command.operation,
      p_request_id: command.requestId,
      p_request_identity: requestIdentity,
      p_expected_current_version_id: command.expectedCurrentContextVersionId ?? "",
      p_version_id: command.context.version,
      p_context_id: command.context.id,
      p_domain_schema_version: command.context.schemaVersion,
      p_persistence_schema_version: FINANCIAL_CONTEXT_PERSISTENCE_SCHEMA,
      p_payload: persisted as unknown as Json,
      p_source: command.source,
      p_origin: command.origin,
      p_confirmation_reason: command.confirmationReason,
      p_rules_version: command.rulesVersion,
      p_calendar_version: command.calendarVersion,
      p_onboarding_request_hash: command.onboardingRequestHash
    });
    if (error) {
      throw new PersistenceBoundaryError(
        "PERSISTENCE_FAILURE",
        "The financial-context version could not be confirmed atomically."
      );
    }
    const row = (data as ConfirmationRpcRow[] | null)?.[0];
    if (!row || !row.status) {
      throw new PersistenceBoundaryError(
        "PERSISTED_DATA_INVALID",
        "The context-confirmation transaction returned an invalid result."
      );
    }
    return {
      status: row.status,
      contextVersionId: row.context_version_id
    } as ConfirmContextVersionResult;
  }

  async saveWorkplace(association: WorkplaceAssociation): Promise<void> {
    const { error } = await this.client.from("workplace_associations").upsert({
      user_id: this.principal.userId,
      workplace_name: association.name,
      association_source: association.associationSource,
      verification_status: association.verificationStatus
    });
    if (error) {
      throw new PersistenceBoundaryError(
        "PERSISTENCE_FAILURE",
        "The optional workplace association could not be saved."
      );
    }
  }

  async getWorkplace(): Promise<WorkplaceAssociation | null> {
    const { data, error } = await this.client
      .from("workplace_associations")
      .select("workplace_name, association_source, verification_status")
      .eq("user_id", this.principal.userId)
      .maybeSingle();
    if (error) {
      throw new PersistenceBoundaryError(
        "PERSISTENCE_FAILURE",
        "The optional workplace association could not be read."
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
