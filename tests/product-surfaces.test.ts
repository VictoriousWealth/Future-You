import { beforeEach, describe, expect, it } from "vitest";
import { ProductSurfaceApplication } from "../src/application/product-surfaces/application";
import type { WorkplaceAssociationSource } from "../src/application/ports/workplace-association-source";
import type { EmployerBenefitSource } from "../src/application/ports/employer-benefit-source";
import type { FinancialContextSource } from "../src/application/ports/financial-context-source";
import type { FinancialContextSnapshot } from "../src/domain/simulator/types";
import { createSimulatorApplication } from "../src/server/simulator-application";
import { SARAH_V1_BROWSER_PROOF_COMMAND } from "../src/server/sarah-v1-demo-command";
import { SARAH_V1_CONTEXT } from "../src/fixtures/sarah-v1";
import { SARAH_V1_TAX_OPPORTUNITY_PROFILE_SOURCE } from "../src/fixtures/sarah-v1-tax-opportunity-profile";
import { SarahV1ContextSource } from "../src/infrastructure/context/sarah-v1-context-source";
import { InMemorySimulationRunStore } from "../src/infrastructure/runs/in-memory-simulation-run-store";
import { SLICE_1_RULES } from "../src/domain/simulator/engine";
import {
  ENGLAND_WALES_CALENDAR_METADATA,
  ENGLAND_WALES_WORKING_DAY_CALENDAR
} from "../src/fixtures/calendar/england-wales-bank-holidays";
import {
  EMPTY_EMPLOYER_BENEFIT_SOURCE,
  SARAH_EMPLOYER_BENEFIT_SOURCE
} from "./fixtures/employer-benefits";

class WorkplaceSource implements WorkplaceAssociationSource {
  constructor(
    private readonly name: string | null,
    private readonly verified = false
  ) {}
  async getWorkplace() {
    return this.name
      ? this.verified
        ? { name: this.name, associationSource: "employer_provisioned" as const, verificationStatus: "verified" as const }
        : { name: this.name, associationSource: "user_provided" as const, verificationStatus: "unverified" as const }
      : null;
  }
}

function setup(
  contextSource: FinancialContextSource = new SarahV1ContextSource(),
  workplaceSource: WorkplaceAssociationSource = new WorkplaceSource("OniBank", true),
  employerBenefitSource: EmployerBenefitSource = SARAH_EMPLOYER_BENEFIT_SOURCE
) {
  const runStore = new InMemorySimulationRunStore();
  const simulator = createSimulatorApplication({
    contextSource,
    rules: SLICE_1_RULES,
    calendar: ENGLAND_WALES_WORKING_DAY_CALENDAR,
    calendarMetadata: ENGLAND_WALES_CALENDAR_METADATA,
    runStore
  });
  return {
    simulator,
    runStore,
    application: new ProductSurfaceApplication({
      displayName: "Sarah Wonk",
      contextSource,
      workplaceSource,
      employerBenefitSource,
      taxOpportunityProfileSource: SARAH_V1_TAX_OPPORTUNITY_PROFILE_SOURCE,
      simulator
    })
  };
}

describe("Slice 6 product-surface application", () => {
  let configured: ReturnType<typeof setup>;

  beforeEach(() => {
    configured = setup();
  });

  it("builds Home from one current baseline and one explicitly sourced informational opportunity", async () => {
    const result = await configured.application.home();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toMatchObject({
      kind: "home_surface",
      displayName: "Sarah Wonk",
      context: { version: "sarah-v1@2026-09-01", isCurrent: true },
      safetyBuffer: {
        current: { minorUnits: "90000", display: "£900" },
        preferred: { minorUnits: "90000", display: "£900" },
        statusLabel: "At your preferred level"
      },
      opportunityPreview: {
        kind: "authoritative",
        title: "Season-ticket loan",
        description: "OniBank lists a season-ticket loan. Your eligibility has not been confirmed.",
        statusLabel: "Eligibility unknown",
        href: "/benefits#opportunity-season-ticket-loan",
        actionLabel: "See details",
        sourceReferenceDate: "2026-08-31"
      }
    });
    expect(result.value.goals.map((goal) => [goal.label, goal.currentBalance.display, goal.completion.display])).toEqual([
      ["Emergency fund", "£3,300", "December 2026"],
      ["House deposit", "£7,200", "June 2029"],
      ["Holiday", "£350", "May 2027"]
    ]);
    expect(JSON.stringify(result.value)).not.toContain("saves");
    expect(JSON.stringify(result.value)).not.toContain("monthly value");
    expect(() => JSON.stringify(result.value)).not.toThrow();
  });

  it("builds the current Goals view with exact server ratios and dates", async () => {
    const result = await configured.application.goals();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.goals[0]).toMatchObject({
      label: "Emergency fund",
      currentBalance: { minorUnits: "330000", display: "£3,300" },
      targetBalance: { minorUnits: "450000", display: "£4,500" },
      progress: {
        numerator: "330000",
        denominator: "450000",
        basisPoints: 7333,
        display: "73%",
        fill: "73.33%",
        ringDasharray: "7333 2667"
      },
      completion: { month: "2026-12", display: "December 2026", statusLabel: "On track" }
    });
  });

  it("reads an immutable £650 run for Goals preview and keeps current balances confirmed", async () => {
    const run = await configured.simulator.simulateOneOffPurchase.execute(SARAH_V1_BROWSER_PROOF_COMMAND);
    expect(run.ok).toBe(true);
    if (!run.ok) return;
    const preview = await configured.application.goalsPreview(run.value.calculation.runId);
    expect(preview.ok).toBe(true);
    if (!preview.ok) return;
    expect(preview.value).toMatchObject({
      mode: "stored_hypothetical",
      warning: null,
      run: {
        id: run.value.calculation.runId,
        label: "£650 trip",
        classificationLabel: "Affordable · Significant trade-off",
        selectionAffectsFinancialState: false
      }
    });
    const emergency = preview.value.goals.find((goal) => goal.label === "Emergency fund");
    expect(emergency).toMatchObject({
      currentBalance: { minorUnits: "330000", display: "£3,300" },
      baselineCompletion: { month: "2026-12", display: "December 2026" },
      scenarioCompletion: { month: "2027-02", display: "February 2027" },
      changeLabel: "2 months later"
    });
  });

  it("keeps a V1 preview paired with V1 after V2 becomes current", async () => {
    const original = setup();
    const run = await original.simulator.simulateOneOffPurchase.execute(SARAH_V1_BROWSER_PROOF_COMMAND);
    if (!run.ok) throw new Error(run.error.message);
    const v2: FinancialContextSnapshot = { ...SARAH_V1_CONTEXT, version: "sarah-v2@2026-10-01" };
    const versionedSource: FinancialContextSource = {
      async getCurrentContextVersionId() { return v2.version; },
      async getContextVersion(version) {
        if (version === SARAH_V1_CONTEXT.version) return SARAH_V1_CONTEXT;
        if (version === v2.version) return v2;
        return null;
      }
    };
    const app = new ProductSurfaceApplication({
      displayName: "Sarah Wonk",
      contextSource: versionedSource,
      workplaceSource: new WorkplaceSource("OniBank", true),
      employerBenefitSource: SARAH_EMPLOYER_BENEFIT_SOURCE,
      simulator: {
        generateBaseline: original.simulator.generateBaseline,
        getSimulationRun: original.simulator.getSimulationRun
      }
    });
    const preview = await app.goalsPreview(run.value.calculation.runId);
    expect(preview.ok).toBe(true);
    if (!preview.ok) return;
    expect(preview.value.context).toMatchObject({
      version: "sarah-v1@2026-09-01",
      label: "Earlier financial plan",
      isCurrent: false
    });
    expect(preview.value.warning).toMatch(/original baseline and result are shown together/i);
    expect(JSON.stringify(preview.value)).not.toContain("sarah-v2@2026-10-01");
  });

  it("composes verified membership, context pension facts and inert sourced opportunities", async () => {
    const result = await configured.application.benefits();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toMatchObject({
      workplace: {
        status: "verified",
        name: "OniBank",
        statusLabel: "Verified workplace",
        membershipStatusLabel: "Active membership"
      },
      activeFacts: [{
        title: "Workplace pension",
        statusLabel: "Active",
        employerName: "OniBank",
        employeeContribution: "3%",
        employerContribution: "3%",
        spendability: "Retirement value — not spendable cash.",
        provenance: {
          sourceType: "immutable_financial_context",
          contextVersion: "sarah-v1@2026-09-01",
          factKey: "PENSION_INFORMATION"
        }
      }],
      opportunities: [
        {
          benefitKey: "ADDITIONAL_PENSION_MATCH",
          title: "Additional pension match",
          statusLabel: "Available opportunity",
          currentContribution: "You currently contribute 3%.",
          eligibility: "unknown",
          uptake: "inactive",
          includedInCurrentPlan: false,
          numericalSimulationSupported: false
        },
        {
          benefitKey: "SEASON_TICKET_LOAN",
          title: "Season-ticket loan",
          statusLabel: "Eligibility unknown",
          eligibility: "unknown",
          uptake: "inactive",
          includedInCurrentPlan: false,
          numericalSimulationSupported: false
        }
      ],
      taxAndAllowances: [
        {
          id: "PERSONAL_ALLOWANCE",
          status: "active_treatment",
          includedInCurrentPlan: true,
          provenance: { publisher: "GOV.UK" }
        },
        {
          id: "PENSION_TAX_RELIEF",
          status: "active_treatment",
          includedInCurrentPlan: true,
          provenance: { publisher: "GOV.UK" }
        },
        {
          id: "LIFETIME_ISA_FIRST_HOME",
          status: "potential_fit",
          includedInCurrentPlan: false,
          provenance: { publisher: "GOV.UK" }
        },
        {
          id: "COUNCIL_TAX_SINGLE_PERSON_DISCOUNT",
          status: "potential_fit",
          includedInCurrentPlan: false,
          provenance: { publisher: "GOV.UK" }
        },
        {
          id: "PERSONAL_SAVINGS_ALLOWANCE",
          status: "details_required",
          includedInCurrentPlan: false,
          provenance: { publisher: "GOV.UK" }
        }
      ],
      loyaltySchemes: {
        status: "not_connected",
        title: "No loyalty schemes connected"
      },
      emptyState: null
    });
    const serialized = JSON.stringify(result.value);
    expect(serialized).toMatch(/season.?ticket/i);
    expect(serialized).toContain("match contributions up to 5%");
    expect(serialized).not.toContain('"status":"eligible"');
    expect(serialized).not.toContain('"eligibility":"eligible"');
    expect(serialized).not.toContain("£100");
  });

  it("shows honest empty Benefits states and never calls the simulator", async () => {
    const noFacts: FinancialContextSnapshot = { ...SARAH_V1_CONTEXT, informationalContext: [] };
    const contextSource: FinancialContextSource = {
      async getCurrentContextVersionId() { return noFacts.version; },
      async getContextVersion() { return noFacts; }
    };
    const simulator = {
      generateBaseline: { async execute(): Promise<never> { throw new Error("Benefits called the simulator"); } },
      getSimulationRun: { async execute(): Promise<never> { throw new Error("Benefits called the simulator"); } }
    };
    const withoutWorkplace = new ProductSurfaceApplication({
      displayName: "Alex",
      contextSource,
      workplaceSource: new WorkplaceSource(null),
      employerBenefitSource: EMPTY_EMPLOYER_BENEFIT_SOURCE,
      simulator
    });
    const noWorkplace = await withoutWorkplace.benefits();
    expect(noWorkplace.ok && noWorkplace.value.emptyState?.kind).toBe("no_workplace");
    const unverified = new ProductSurfaceApplication({
      displayName: "Alex",
      contextSource,
      workplaceSource: new WorkplaceSource("Example Workplace"),
      employerBenefitSource: EMPTY_EMPLOYER_BENEFIT_SOURCE,
      simulator
    });
    const noCatalogue = await unverified.benefits();
    expect(noCatalogue.ok && noCatalogue.value.emptyState?.kind).toBe("no_verified_catalogue");

    const verifiedWithoutReferenceRecords = new ProductSurfaceApplication({
      displayName: "Alex",
      contextSource,
      workplaceSource: new WorkplaceSource("Employer Without Catalogue", true),
      employerBenefitSource: EMPTY_EMPLOYER_BENEFIT_SOURCE,
      simulator
    });
    const noConfirmedInformation = await verifiedWithoutReferenceRecords.benefits();
    expect(noConfirmedInformation.ok && noConfirmedInformation.value.emptyState).toEqual({
      kind: "no_known_information",
      title: "No confirmed benefit information yet",
      description: "We do not have confirmed benefit information for this workplace yet."
    });
  });

  it("does not surface explicit records without a verified matching membership", async () => {
    const unverified = setup(
      new SarahV1ContextSource(),
      new WorkplaceSource("OniBank"),
      SARAH_EMPLOYER_BENEFIT_SOURCE
    );
    const benefits = await unverified.application.benefits();
    const home = await unverified.application.home();
    expect(benefits.ok && benefits.value.opportunities).toEqual([]);
    expect(benefits.ok && benefits.value.emptyState?.kind).toBe("no_verified_catalogue");
    expect(home.ok && home.value.opportunityPreview).toEqual({ kind: "none" });

    const differentEmployer = setup(
      new SarahV1ContextSource(),
      new WorkplaceSource("Different Employer", true),
      SARAH_EMPLOYER_BENEFIT_SOURCE
    );
    const differentEmployerBenefits = await differentEmployer.application.benefits();
    const differentEmployerHome = await differentEmployer.application.home();
    expect(differentEmployerBenefits.ok && differentEmployerBenefits.value.opportunities).toEqual([]);
    expect(differentEmployerBenefits.ok && differentEmployerBenefits.value.emptyState?.kind).toBe("no_known_information");
    expect(differentEmployerHome.ok && differentEmployerHome.value.opportunityPreview).toEqual({ kind: "none" });
  });

  it("returns the same not-found error for foreign-shaped and nonexistent run IDs", async () => {
    const missing = await configured.application.goalsPreview("run-0000000000000000");
    const foreign = await configured.application.goalsPreview("run-ffffffffffffffff");
    expect(missing).toEqual(foreign);
    expect(missing).toMatchObject({ ok: false, error: { code: "RUN_NOT_FOUND" } });
  });
});
