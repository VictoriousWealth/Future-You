import type { MoneyDTO, RatioDTO } from "../dto/contracts";

export const PRODUCT_SURFACE_API_VERSION = "future-you.product-surfaces/v1" as const;
export const HOME_SURFACE_SCHEMA = "home-surface/1.2.0" as const;
export const GOALS_SURFACE_SCHEMA = "goals-surface/1.0.0" as const;
export const GOALS_PREVIEW_SURFACE_SCHEMA = "goals-preview-surface/1.0.0" as const;
export const BENEFITS_SURFACE_SCHEMA = "benefits-surface/1.3.0" as const;

export interface SurfaceContextDTO {
  readonly id: string;
  readonly version: string;
  readonly label: string;
  readonly isCurrent: boolean;
  readonly snapshotDate: string;
}

export interface SurfaceProgressDTO extends RatioDTO {
  /** A bounded CSS percentage prepared on the server. The browser applies it verbatim. */
  readonly fill: string;
  /** A bounded SVG dash pattern prepared on the server for the circular progress arc. */
  readonly ringDasharray: string;
  readonly accessibleLabel: string;
}

export interface SurfaceGoalDTO {
  readonly id: string;
  readonly label: string;
  readonly currentBalance: MoneyDTO;
  readonly targetBalance: MoneyDTO;
  readonly progress: SurfaceProgressDTO;
  readonly completion: {
    readonly status: "on_track" | "beyond_horizon";
    readonly month: string | null;
    readonly display: string;
    readonly statusLabel: string;
  };
}

export interface HomeSurfaceDTO {
  readonly apiVersion: typeof PRODUCT_SURFACE_API_VERSION;
  readonly schemaVersion: typeof HOME_SURFACE_SCHEMA;
  readonly kind: "home_surface";
  readonly displayName: string;
  readonly context: SurfaceContextDTO;
  readonly safetyBuffer: {
    readonly current: MoneyDTO;
    readonly preferred: MoneyDTO;
    readonly status: "at_or_above_preferred" | "below_preferred";
    readonly statusLabel: string;
  };
  readonly goals: readonly SurfaceGoalDTO[];
  readonly opportunityPreview:
    | Readonly<{ readonly kind: "none" }>
    | Readonly<{
        readonly kind: "authoritative";
        readonly title: string;
        readonly description: string;
        readonly statusLabel: string;
        readonly href: "/benefits#opportunity-season-ticket-loan";
        readonly actionLabel: "See details";
        readonly sourceReferenceDate: string;
      }>;
  readonly guidedStory:
    | Readonly<{ readonly available: false }>
    | Readonly<{
        readonly available: true;
        readonly label: "Play Sarah’s story";
        readonly href: "/story/sarah";
        readonly description: string;
      }>;
}

export interface GoalsSurfaceDTO {
  readonly apiVersion: typeof PRODUCT_SURFACE_API_VERSION;
  readonly schemaVersion: typeof GOALS_SURFACE_SCHEMA;
  readonly kind: "goals_surface";
  readonly mode: "current_path";
  readonly context: SurfaceContextDTO;
  readonly title: "Your goals";
  readonly summary: string;
  readonly goals: readonly SurfaceGoalDTO[];
}

export interface PreviewGoalDTO extends Omit<SurfaceGoalDTO, "completion"> {
  readonly baselineCompletion: {
    readonly month: string | null;
    readonly display: string;
  };
  readonly scenarioCompletion: {
    readonly month: string | null;
    readonly display: string;
  };
  readonly changeLabel: string;
}

export interface GoalsPreviewSurfaceDTO {
  readonly apiVersion: typeof PRODUCT_SURFACE_API_VERSION;
  readonly schemaVersion: typeof GOALS_PREVIEW_SURFACE_SCHEMA;
  readonly kind: "goals_preview_surface";
  readonly mode: "stored_hypothetical";
  readonly context: SurfaceContextDTO;
  readonly warning: string | null;
  readonly run: {
    readonly id: string;
    readonly scenarioId: string;
    readonly label: string;
    readonly classificationLabel: string;
    readonly hypotheticalLabel: "What-if preview";
    readonly selectionAffectsFinancialState: false;
  };
  readonly goals: readonly PreviewGoalDTO[];
}

export interface BenefitsSurfaceDTO {
  readonly apiVersion: typeof PRODUCT_SURFACE_API_VERSION;
  readonly schemaVersion: typeof BENEFITS_SURFACE_SCHEMA;
  readonly kind: "benefits_surface";
  readonly context: SurfaceContextDTO;
  readonly workplace:
    | Readonly<{ readonly status: "not_supplied"; readonly name: null; readonly statusLabel: string }>
    | Readonly<{
        readonly status: "unverified";
        readonly name: string;
        readonly statusLabel: string;
        readonly explanation: string;
      }>
    | Readonly<{
        readonly status: "verified";
        readonly name: string;
        readonly statusLabel: "Verified workplace";
        readonly membershipStatusLabel: "Active membership";
        readonly explanation: string;
      }>;
  readonly activeFacts: readonly Readonly<{
    readonly id: string;
    readonly title: string;
    readonly statusLabel: "Active";
    readonly employerName: string;
    readonly employeeContribution: string;
    readonly employerContribution: string;
    readonly treatment: string;
    readonly spendability: string;
    readonly provenance: Readonly<{
      readonly sourceType: "immutable_financial_context";
      readonly contextVersion: string;
      readonly factKey: "PENSION_INFORMATION";
    }>;
  }>[];
  readonly opportunities: readonly Readonly<{
    readonly id: string;
    readonly benefitKey: "ADDITIONAL_PENSION_MATCH" | "SEASON_TICKET_LOAN";
    readonly title: string;
    readonly status: "available";
    readonly statusLabel: "Available opportunity" | "Eligibility unknown";
    readonly employerName: string;
    readonly description: string;
    readonly currentContribution: string | null;
    readonly eligibility: "unknown";
    readonly eligibilityLabel: "Eligibility has not been confirmed." | "Eligibility unknown";
    readonly uptake: "inactive";
    readonly uptakeLabel: "Not active.";
    readonly includedInCurrentPlan: false;
    readonly planInclusionLabel: "Not included in your current financial plan.";
    readonly numericalSimulationSupported: false;
    readonly numericalEffectLabel: "No numerical effect has been calculated.";
    readonly furtherInformationRequired: true;
    readonly provenance: Readonly<{
      readonly sourceType: "canonical_employer_reference";
      readonly sourceReference: string;
      readonly referenceDate: string;
      readonly lastConfirmedDate: string | null;
      readonly recordVersion: number;
      readonly schemaVersion: string;
      readonly userStateId: string;
    }>;
  }>[];
  readonly taxAndAllowances: readonly Readonly<{
    readonly id:
      | "PERSONAL_ALLOWANCE"
      | "PENSION_TAX_RELIEF"
      | "LIFETIME_ISA_FIRST_HOME"
      | "COUNCIL_TAX_SINGLE_PERSON_DISCOUNT"
      | "PERSONAL_SAVINGS_ALLOWANCE";
    readonly title: string;
    readonly category: "income_tax" | "pension" | "home" | "council_tax" | "savings";
    readonly status: "active_treatment" | "potential_fit" | "details_required";
    readonly statusLabel: string;
    readonly description: string;
    readonly matchedBecause: string;
    readonly eligibilityLabel: string;
    readonly includedInCurrentPlan: boolean;
    readonly planTreatmentLabel: string;
    readonly personalisedEffectCalculated: false;
    readonly numericalEffectLabel: "No personalised numerical effect has been calculated.";
    readonly provenance: Readonly<{
      readonly sourceType: "official_public_guidance";
      readonly publisher: "GOV.UK";
      readonly sourceReference: string;
      readonly sourceUrl: string;
      readonly accessedDate: string;
      readonly profileVersion: string;
      readonly profileEvidenceReferences: readonly string[];
    }>;
  }>[];
  readonly loyaltySchemes: Readonly<{
    readonly status: "not_connected";
    readonly statusLabel: "Not connected";
    readonly title: "No loyalty schemes connected";
    readonly description: string;
  }>;
  readonly emptyState: null | Readonly<{
    readonly kind: "no_workplace" | "no_verified_catalogue" | "no_known_information";
    readonly title: string;
    readonly description: string;
  }>;
}

export type ProductSurfaceDTO =
  | HomeSurfaceDTO
  | GoalsSurfaceDTO
  | GoalsPreviewSurfaceDTO
  | BenefitsSurfaceDTO;
