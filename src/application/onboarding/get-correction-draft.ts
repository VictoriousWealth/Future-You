import { err, ok, type Result } from "../../domain/shared/result";
import type { FinancialContextSource } from "../ports/financial-context-source";
import type { FinancialContextVersionRepository } from "../ports/financial-context-version-repository";
import type { FinancialOnboardingDraftDTO } from "./contracts";
import { financialContextToCorrectionDraft } from "./context-to-draft";
import type { OnboardingOperationError } from "./preview-financial-context";

export interface CorrectionDraftDTO {
  readonly kind: "financial_context_correction_draft";
  readonly currentContextVersionId: string;
  readonly draft: FinancialOnboardingDraftDTO;
}

export class GetCorrectionDraftUseCase {
  constructor(
    private readonly contextSource: FinancialContextSource,
    private readonly versionRepository: FinancialContextVersionRepository
  ) {}

  async execute(): Promise<Result<CorrectionDraftDTO, OnboardingOperationError>> {
    const currentVersion = await this.contextSource.getCurrentContextVersionId();
    if (currentVersion === null) {
      return err({
        code: "FINANCIAL_CONTEXT_REQUIRED",
        message: "Complete financial onboarding before correcting a context.",
        issues: []
      });
    }
    const context = await this.contextSource.getContextVersion(currentVersion);
    if (context === null) {
      return err({
        code: "PERSISTENCE_FAILURE",
        message: "The current financial context could not be loaded.",
        issues: []
      });
    }
    const workplace = await this.versionRepository.getWorkplace();
    return ok({
      kind: "financial_context_correction_draft",
      currentContextVersionId: currentVersion,
      draft: financialContextToCorrectionDraft(context, workplace)
    });
  }
}
