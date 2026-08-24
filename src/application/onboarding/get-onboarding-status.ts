import { API_VERSION } from "../dto/contracts";
import type { FinancialContextSource } from "../ports/financial-context-source";
import {
  ONBOARDING_STATUS_SCHEMA,
  type OnboardingStatusDTO
} from "./contracts";

export class GetOnboardingStatusUseCase {
  constructor(private readonly contextSource: FinancialContextSource) {}

  async execute(): Promise<OnboardingStatusDTO> {
    const version = await this.contextSource.getCurrentContextVersionId();
    return version === null
      ? {
          apiVersion: API_VERSION,
          schemaVersion: ONBOARDING_STATUS_SCHEMA,
          kind: "onboarding_status",
          status: "NOT_STARTED",
          currentContextVersionId: null
        }
      : {
          apiVersion: API_VERSION,
          schemaVersion: ONBOARDING_STATUS_SCHEMA,
          kind: "onboarding_status",
          status: "COMPLETE",
          currentContextVersionId: version
        };
  }
}
