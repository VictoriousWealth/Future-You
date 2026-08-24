import type { FinancialContextSource } from "../ports/financial-context-source";
import type { FinancialContextVersionRepository } from "../ports/financial-context-version-repository";
import type { PreviewDependencies } from "./preview-financial-context";
import { PreviewFinancialContextUseCase } from "./preview-financial-context";
import { ConfirmFinancialContextUseCase } from "./confirm-financial-context";
import { GetOnboardingStatusUseCase } from "./get-onboarding-status";
import { GetCorrectionDraftUseCase } from "./get-correction-draft";

export interface OnboardingApplicationDependencies extends PreviewDependencies {
  readonly contextSource: FinancialContextSource;
  readonly versionRepository: FinancialContextVersionRepository;
}

export function createOnboardingApplication(dependencies: OnboardingApplicationDependencies) {
  return Object.freeze({
    getStatus: new GetOnboardingStatusUseCase(dependencies.contextSource),
    getCorrectionDraft: new GetCorrectionDraftUseCase(
      dependencies.contextSource,
      dependencies.versionRepository
    ),
    preview: new PreviewFinancialContextUseCase(dependencies),
    confirm: new ConfirmFinancialContextUseCase(dependencies)
  });
}

export type OnboardingApplication = ReturnType<typeof createOnboardingApplication>;
