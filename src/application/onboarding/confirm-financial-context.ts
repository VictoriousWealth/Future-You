import { err, ok, type Result } from "../../domain/shared/result";
import { API_VERSION } from "../dto/contracts";
import type { FinancialContextSource } from "../ports/financial-context-source";
import type { FinancialContextVersionRepository } from "../ports/financial-context-version-repository";
import {
  FINANCIAL_CONTEXT_VERSION_SCHEMA,
  type ConfirmFinancialContextRequestDTO,
  type ConfirmFinancialContextResponseDTO
} from "./contracts";
import {
  prepareFinancialContextPreview,
  type OnboardingOperationError,
  type PreviewDependencies
} from "./preview-financial-context";

export interface ConfirmFinancialContextDependencies extends PreviewDependencies {
  readonly contextSource: FinancialContextSource;
  readonly versionRepository: FinancialContextVersionRepository;
}

export class ConfirmFinancialContextUseCase {
  constructor(private readonly dependencies: ConfirmFinancialContextDependencies) {}

  async execute(
    request: ConfirmFinancialContextRequestDTO
  ): Promise<Result<ConfirmFinancialContextResponseDTO, OnboardingOperationError>> {
    const prepared = prepareFinancialContextPreview(request, this.dependencies);
    if (!prepared.ok) return prepared;
    if (prepared.value.canonicalRequestHash !== request.reviewedCanonicalRequestHash) {
      return err({
        code: "ONBOARDING_PREVIEW_MISMATCH",
        message: "The submitted values no longer match the reviewed preview.",
        issues: [
          {
            path: "reviewedCanonicalRequestHash",
            message: "Request a new preview and review it before confirming."
          }
        ]
      });
    }

    const stored = await this.dependencies.versionRepository.confirm({
      operation: request.mode === "initial" ? "initial_context" : "context_revision",
      requestId: request.requestId,
      requestIdentity: prepared.value.canonicalRequestHash,
      expectedCurrentContextVersionId: request.expectedCurrentContextVersionId,
      context: prepared.value.context,
      onboardingRequestHash: prepared.value.canonicalRequestHash,
      rulesVersion: this.dependencies.rules.version,
      calendarVersion: this.dependencies.calendar.version,
      source:
        request.mode === "initial" ? "manual onboarding" : "manual confirmed-context update",
      origin: request.mode === "initial" ? "onboarding" : "user_update",
      confirmationReason:
        request.mode === "initial"
          ? "User reviewed and confirmed the manual onboarding preview."
          : "User reviewed and confirmed a correction to current financial facts."
    });

    if (stored.status === "idempotency_conflict") {
      return err({
        code: "IDEMPOTENCY_KEY_REUSED",
        message: "This request ID has already been used with different onboarding values.",
        issues: []
      });
    }
    if (stored.status === "context_conflict" || stored.contextVersionId === null) {
      return err({
        code: "CONTEXT_VERSION_CONFLICT",
        message: "The context version could not be activated because the current pointer changed.",
        issues: []
      });
    }

    if (request.draft.workplace !== null) {
      await this.dependencies.versionRepository.saveWorkplace(request.draft.workplace);
    }

    return ok({
      apiVersion: API_VERSION,
      schemaVersion: FINANCIAL_CONTEXT_VERSION_SCHEMA,
      kind: "financial_context_version",
      requestId: request.requestId,
      contextVersionId: stored.contextVersionId,
      currentContextVersionId: stored.contextVersionId,
      created: stored.status === "created",
      baseline: prepared.value.preview
    });
  }
}
