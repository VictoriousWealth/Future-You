import type { Result } from "../../domain/shared/result";
import type { OneOffPurchaseResponseDTO } from "../dto/contracts";
import type { EmployerBenefitSource } from "../ports/employer-benefit-source";

export const SARAH_STORY_SCHEMA_VERSION = "sarah-guided-story/1.1.0" as const;
export const SARAH_STORY_ID = "sarah-trip-story" as const;
export const SARAH_STORY_VERSION = "1.1.0" as const;
export const SARAH_STORY_NARRATIVE_VERSION = "sarah-trip-narrative/1.1.0" as const;

export type SarahStoryStepState =
  | "INTRODUCTION"
  | "MEET_SARAH"
  | "DECISION_SETUP"
  | "QUESTION"
  | "CALCULATING"
  | "TRIP_RESULT"
  | "ALTERNATIVES"
  | "TIMING_ALTERNATIVE"
  | "OPPORTUNITY_INFORMATION"
  | "SUMMARY"
  | "COMPLETE";

export type SarahStoryControllerState =
  | "NOT_STARTED"
  | SarahStoryStepState
  | "PAUSED"
  | "ERROR";

export type SarahStoryScenarioKey =
  | "TRIP_650_SEPTEMBER"
  | "TRIP_500_SEPTEMBER"
  | "TRIP_400_SEPTEMBER"
  | "TRIP_650_OCTOBER";

export type SarahNarrativeState =
  | "IDLE"
  | "CURIOUS"
  | "UNCERTAIN"
  | "CONCERNED"
  | "THINKING"
  | "SURPRISED"
  | "RELIEVED_TO_UNDERSTAND"
  | "COMPLETE";

export type SarahStoryContentKind =
  | "introduction"
  | "profile"
  | "current_path"
  | "question"
  | "calculating"
  | "scenario"
  | "alternatives"
  | "timing"
  | "opportunity_boundary"
  | "summary"
  | "complete";

export interface SarahStoryProfileFactDTO {
  readonly label: string;
  readonly value: string;
  readonly provenance:
    | "existing_canonical_demographic_context_fact"
    | "approved_story_only_demonstration_context";
  readonly affectsSimulation: false;
}

export interface SarahStoryGoalDateDTO {
  readonly goalId: string;
  readonly label: string;
  readonly currentPath: string;
  readonly scenario: string;
  readonly change: string;
}

export interface SarahStoryScenarioDTO {
  readonly key: SarahStoryScenarioKey;
  readonly runId: string;
  readonly scenarioId: string;
  readonly label: string;
  readonly amount: string;
  readonly paymentMonth: string;
  readonly classification: string;
  readonly classificationCode:
    | "AFFORDABLE_SIGNIFICANT_TRADE_OFF"
    | "AFFORDABLE_NOTICEABLE_TRADE_OFF";
  readonly summary: string;
  readonly safetyBufferBefore: string;
  readonly safetyBufferAfter: string;
  readonly requiredPayments: string;
  readonly borrowing: string;
  readonly recovery: string;
  readonly goalDates: readonly SarahStoryGoalDateDTO[];
  readonly assumptions: readonly string[];
  readonly selectionAffectsFinancialState: false;
}

export interface SarahStoryStepDTO {
  readonly id: string;
  readonly state: SarahStoryStepState;
  readonly ordinal: number;
  readonly total: number;
  readonly eyebrow: string;
  readonly title: string;
  readonly dialogue: string;
  readonly templateId: string;
  readonly narrativeState: SarahNarrativeState;
  readonly characterPosition: "start" | "quarter" | "middle" | "three_quarters" | "end";
  readonly contentKind: SarahStoryContentKind;
  readonly scenarioKey: SarahStoryScenarioKey | null;
}

export interface SarahStoryBundleDTO {
  readonly schemaVersion: typeof SARAH_STORY_SCHEMA_VERSION;
  readonly storyId: typeof SARAH_STORY_ID;
  readonly storyVersion: typeof SARAH_STORY_VERSION;
  readonly narrativeTemplateVersion: typeof SARAH_STORY_NARRATIVE_VERSION;
  readonly contextVersion: string;
  readonly baselineId: string;
  readonly rulesVersion: string;
  readonly calendarVersion: string;
  readonly demonstrationLabel: "Sarah is a demonstration character";
  readonly profile: {
    readonly name: string;
    readonly introduction: string;
    readonly facts: readonly SarahStoryProfileFactDTO[];
    readonly provenanceNote: string;
  };
  readonly currentPath: {
    readonly preferredSafetyBuffer: string;
    readonly goalDates: readonly Readonly<{
      readonly goalId: string;
      readonly label: string;
      readonly completion: string;
    }>[];
  };
  readonly scenarios: Readonly<Record<SarahStoryScenarioKey, SarahStoryScenarioDTO>>;
  readonly steps: readonly SarahStoryStepDTO[];
  readonly opportunityBoundary: {
    readonly offeringId: string;
    readonly benefitKey: "SEASON_TICKET_LOAN";
    readonly title: string;
    readonly employerName: string;
    readonly statusLabel: "Eligibility unknown";
    readonly explanation: string;
    readonly sourceReference: string;
    readonly referenceDate: string;
    readonly eligibility: "unknown";
    readonly uptake: "inactive";
    readonly includedInCalculation: false;
    readonly includedInCurrentPlan: false;
    readonly numericalSimulationSupported: false;
  };
  readonly asset: {
    readonly id: "sarah-prototype-vector";
    readonly source: "user_supplied_html_prototype";
    readonly fileType: "inline_svg_component";
    readonly decorative: true;
  };
  readonly progressPersistence: "session_only";
  readonly providerCallsRequired: false;
}

export interface SarahStoryManifestProfile {
  readonly name: string;
  readonly introduction: string;
  readonly facts: readonly SarahStoryProfileFactDTO[];
  readonly provenanceNote: string;
}

export interface SarahStoryManifestStep {
  readonly id: string;
  readonly state: SarahStoryStepState;
  readonly eyebrow: string;
  readonly title: string;
  readonly dialogueTemplate: string;
  readonly templateId: string;
  readonly narrativeState: SarahNarrativeState;
  readonly characterPosition: SarahStoryStepDTO["characterPosition"];
  readonly contentKind: SarahStoryContentKind;
  readonly scenarioKey: SarahStoryScenarioKey | null;
}

export interface SarahStoryManifest {
  readonly storyId: typeof SARAH_STORY_ID;
  readonly storyVersion: typeof SARAH_STORY_VERSION;
  readonly narrativeTemplateVersion: typeof SARAH_STORY_NARRATIVE_VERSION;
  readonly requiredContextVersion: string;
  readonly requiredBaselineId: string;
  readonly requiredRulesVersion: string;
  readonly requiredCalendarVersion: string;
  readonly requiredRuns: Readonly<Record<SarahStoryScenarioKey, Readonly<{
    readonly runId: string;
    readonly scenarioId: string;
    readonly amountMinorUnits: string;
    readonly paymentPeriod: string;
    readonly classificationCode: SarahStoryScenarioDTO["classificationCode"];
  }>>>;
  readonly expectedFacts: Readonly<{
    readonly preferredSafetyBuffer: string;
    readonly currentGoalDates: Readonly<Record<"Emergency fund" | "Holiday" | "House deposit", string>>;
    readonly scenarioFacts: Readonly<Record<SarahStoryScenarioKey, Readonly<{
      readonly safetyBufferAfter: string;
      readonly emergencyFundDate: string;
      readonly holidayDate?: string;
      readonly houseDepositDate?: string;
      readonly requiredPayments: string;
      readonly borrowing: string;
      readonly recovery?: string;
    }>>>;
  }>;
  readonly profile: SarahStoryManifestProfile;
  readonly steps: readonly SarahStoryManifestStep[];
  readonly requiredOpportunity: Readonly<{
    readonly benefitKey: "SEASON_TICKET_LOAN";
    readonly employerName: "OniBank";
    readonly referenceDate: "2026-08-31";
  }>;
}

export interface SarahStoryRunReader {
  execute(runId: string): Promise<Result<OneOffPurchaseResponseDTO, Readonly<{
    readonly code: string;
    readonly message: string;
  }>>>;
}

export type SarahStoryOpportunityReader = EmployerBenefitSource;

export type SarahStoryLoadResult =
  | Readonly<{ readonly kind: "ready"; readonly story: SarahStoryBundleDTO }>
  | Readonly<{
      readonly kind: "unavailable";
      readonly message: "Sarah’s story is unavailable right now. No financial result has been changed.";
      readonly retryable: boolean;
    }>;
