import type { FinancialContextSnapshot } from "../../domain/simulator/types";

export interface ConfirmContextVersionCommand {
  readonly operation: "initial_context" | "context_revision";
  readonly requestId: string;
  readonly requestIdentity: string;
  readonly expectedCurrentContextVersionId: string | null;
  readonly context: FinancialContextSnapshot;
  readonly onboardingRequestHash: string;
  readonly rulesVersion: string;
  readonly calendarVersion: string;
  readonly source: "manual onboarding" | "manual confirmed-context update";
  readonly origin: "onboarding" | "user_update";
  readonly confirmationReason: string;
}

export type ConfirmContextVersionResult =
  | Readonly<{ status: "created" | "existing"; contextVersionId: string }>
  | Readonly<{ status: "idempotency_conflict" | "context_conflict"; contextVersionId: string | null }>;

export interface WorkplaceAssociation {
  readonly name: string;
  readonly associationSource: "user_provided";
  readonly verificationStatus: "unverified";
}

export interface FinancialContextVersionRepository {
  confirm(command: ConfirmContextVersionCommand): Promise<ConfirmContextVersionResult>;
  saveWorkplace(association: WorkplaceAssociation): Promise<void>;
  getWorkplace(): Promise<WorkplaceAssociation | null>;
}
