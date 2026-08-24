import type { AssumptionDTO, MoneyDTO, ProjectionDTO } from "../dto/contracts";

export const ONBOARDING_STATUS_SCHEMA = "onboarding-status/1.0.0" as const;
export const FINANCIAL_CONTEXT_PREVIEW_SCHEMA = "financial-context-preview/1.0.0" as const;
export const FINANCIAL_CONTEXT_VERSION_SCHEMA = "financial-context-version/1.0.0" as const;

export interface DecimalMoneyInputDTO {
  readonly currency: "GBP";
  readonly amount: string;
}

export interface EvidencedMoneyInputDTO extends DecimalMoneyInputDTO {
  readonly evidenceState: "confirmed" | "estimated";
  readonly evidenceSource: string;
}

export interface FinancialOnboardingDraftDTO {
  readonly identity: {
    readonly contextId: string;
    readonly contextVersion: string;
    readonly currentAccountId: string;
    readonly incomeId: string;
  };
  readonly snapshotDate: string;
  readonly currentAccount: {
    readonly actualClearedBalance: EvidencedMoneyInputDTO;
    readonly remainingCurrentCycleReserve: EvidencedMoneyInputDTO;
    readonly overdraftLimit: DecimalMoneyInputDTO;
  };
  readonly desiredSafetyBuffer: EvidencedMoneyInputDTO;
  readonly income: {
    readonly monthlyNetIncome: EvidencedMoneyInputDTO;
    readonly paydayRule:
      | Readonly<{ type: "last_working_day" }>
      | Readonly<{ type: "fixed_day"; day: number }>;
  };
  readonly routineSpending: {
    readonly futureMonthlyTotal: EvidencedMoneyInputDTO;
    readonly items: readonly Readonly<{
      id: string;
      label: string;
      amount: DecimalMoneyInputDTO;
      required: boolean;
    }>[];
  };
  readonly requiredObligations: Readonly<{
    declaration: "none";
    items: readonly [];
  }> | Readonly<{
    declaration: "provided";
    items: readonly Readonly<{
      id: string;
      label: string;
      amount: EvidencedMoneyInputDTO;
      due: Readonly<{ type: "month_only" }> | Readonly<{ type: "day_of_month"; day: number }>;
      includedInRoutineEnvelope: boolean;
    }>[];
  }>;
  readonly goals: readonly Readonly<{
    id: string;
    label: string;
    currentBalance: EvidencedMoneyInputDTO;
    targetBalance: EvidencedMoneyInputDTO;
    normalContribution: DecimalMoneyInputDTO;
    paused: boolean;
  }>[];
  readonly goalPolicy: {
    readonly contributionBudgetEvidenceSource: string;
    readonly allocationOrder: readonly string[];
    readonly overflowGoalId: string | null;
  };
  readonly committedGoalTransfers: Readonly<{
    declaration: "none";
    items: readonly [];
  }> | Readonly<{
    declaration: "provided";
    items: readonly Readonly<{
      goalId: string;
      amount: DecimalMoneyInputDTO;
      timing: "after_next_funding_event";
      evidenceState: "confirmed" | "estimated";
    }>[];
  }>;
  readonly confirmedOneOffEvents: readonly [];
  readonly informationalContext: readonly (
    | Readonly<{
        kind: "pension_information";
        employeeContributionPercent: number;
        employerContributionPercent: number;
      }>
    | Readonly<{
        kind: "payroll_deductions_information";
        takeHomeAlreadyNetOfStudentLoan: true;
      }>
  )[];
  readonly workplace: Readonly<{
    name: string;
    associationSource: "user_provided";
    verificationStatus: "unverified";
  }> | null;
}

export type OnboardingStatusDTO =
  | Readonly<{
      apiVersion: "future-you.api/v1";
      schemaVersion: typeof ONBOARDING_STATUS_SCHEMA;
      kind: "onboarding_status";
      status: "NOT_STARTED";
      currentContextVersionId: null;
    }>
  | Readonly<{
      apiVersion: "future-you.api/v1";
      schemaVersion: typeof ONBOARDING_STATUS_SCHEMA;
      kind: "onboarding_status";
      status: "COMPLETE";
      currentContextVersionId: string;
    }>;

export interface GoalPreviewDTO {
  readonly goalId: string;
  readonly label: string;
  readonly currentBalance: MoneyDTO;
  readonly targetBalance: MoneyDTO;
  readonly normalContribution: MoneyDTO;
  readonly completion:
    | Readonly<{ status: "COMPLETED"; month: string }>
    | Readonly<{
        status: "NOT_REACHED_WITHIN_HORIZON";
        projectedThrough: string;
        horizonAllocationEvents: number;
      }>;
}

export interface FinancialContextPreviewDTO {
  readonly apiVersion: "future-you.api/v1";
  readonly schemaVersion: typeof FINANCIAL_CONTEXT_PREVIEW_SCHEMA;
  readonly kind: "financial_context_preview";
  readonly candidate: {
    readonly previewId: string;
    readonly canonicalRequestHash: string;
  };
  readonly contextSummary: {
    readonly actualCash: MoneyDTO;
    readonly remainingReserve: MoneyDTO;
    readonly currentSafetyBuffer: MoneyDTO;
    readonly desiredSafetyBuffer: MoneyDTO;
    readonly monthlyNetIncome: MoneyDTO;
    readonly monthlyRoutineSpending: MoneyDTO;
    readonly monthlyContributionCapacity: MoneyDTO;
  };
  readonly goals: readonly GoalPreviewDTO[];
  readonly baseline: {
    readonly requiredPaymentsCovered: boolean;
    readonly lowestCash: MoneyDTO;
    readonly existingPressure: boolean;
    readonly warnings: readonly Readonly<{ code: string; message: string }>[];
    readonly projection: ProjectionDTO;
  };
  readonly assumptions: readonly AssumptionDTO[];
  readonly confidence: ProjectionDTO["confidence"];
  readonly versions: {
    readonly contextSchemaVersion: string;
    readonly rulesVersion: string;
    readonly calendarVersion: string;
  };
}

export interface PreviewFinancialContextRequestDTO {
  readonly draft: FinancialOnboardingDraftDTO;
  readonly mode: "initial" | "revision";
  readonly expectedCurrentContextVersionId: string | null;
}

export interface ConfirmFinancialContextRequestDTO extends PreviewFinancialContextRequestDTO {
  readonly requestId: string;
  readonly reviewedCanonicalRequestHash: string;
}

export interface ConfirmFinancialContextResponseDTO {
  readonly apiVersion: "future-you.api/v1";
  readonly schemaVersion: typeof FINANCIAL_CONTEXT_VERSION_SCHEMA;
  readonly kind: "financial_context_version";
  readonly requestId: string;
  readonly contextVersionId: string;
  readonly currentContextVersionId: string;
  readonly created: boolean;
  readonly baseline: FinancialContextPreviewDTO;
}
