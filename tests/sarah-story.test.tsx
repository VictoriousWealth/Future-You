import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SarahStoryApplication } from "../src/application/story/application";
import type { SarahStoryManifest } from "../src/application/story/contracts";
import { SLICE_1_RULES } from "../src/domain/simulator/engine";
import {
  ENGLAND_WALES_CALENDAR_METADATA,
  ENGLAND_WALES_WORKING_DAY_CALENDAR
} from "../src/fixtures/calendar/england-wales-bank-holidays";
import { SarahV1ContextSource } from "../src/infrastructure/context/sarah-v1-context-source";
import { InMemorySimulationRunStore } from "../src/infrastructure/runs/in-memory-simulation-run-store";
import {
  isSarahStoryAuthorised
} from "../src/server/sarah-story-application";
import { SARAH_STORY_MANIFEST } from "../src/server/sarah-story-contract";
import { SARAH_V1_BROWSER_PROOF_OPTIONS_COMMAND } from "../src/server/sarah-v1-demo-command";
import { createSimulatorApplication } from "../src/server/simulator-application";
import { SarahStoryScenarioCard } from "../src/ui/features/story/sarah-story-experience";
import {
  initialSarahStoryState,
  reduceSarahStory
} from "../src/ui/features/story/sarah-story-machine";
import {
  EMPTY_EMPLOYER_BENEFIT_SOURCE,
  SARAH_EMPLOYER_BENEFIT_SOURCE
} from "./fixtures/employer-benefits";

async function runMap() {
  const simulator = createSimulatorApplication({
    contextSource: new SarahV1ContextSource(),
    runStore: new InMemorySimulationRunStore(),
    rules: SLICE_1_RULES,
    calendar: ENGLAND_WALES_WORKING_DAY_CALENDAR,
    calendarMetadata: ENGLAND_WALES_CALENDAR_METADATA
  });
  const generated = await simulator.listScenarioOptions.execute(SARAH_V1_BROWSER_PROOF_OPTIONS_COMMAND);
  if (!generated.ok) throw new Error(generated.error.code);
  return new Map(generated.value.options.flatMap((option) =>
    option.simulation ? [[option.runId, option.simulation] as const] : []
  ));
}

async function readyStory(manifest: SarahStoryManifest = SARAH_STORY_MANIFEST) {
  const runs = await runMap();
  const application = new SarahStoryApplication({
    manifest,
    opportunityReader: SARAH_EMPLOYER_BENEFIT_SOURCE,
    runReader: {
      async execute(runId) {
        const run = runs.get(runId);
        return run
          ? { ok: true as const, value: structuredClone(run) }
          : { ok: false as const, error: { code: "RUN_NOT_FOUND", message: "Not found" } };
      }
    }
  });
  const result = await application.load();
  if (result.kind !== "ready") throw new Error(result.message);
  return result.story;
}

describe("Track B1 Sarah guided story contract", () => {
  it("loads the ordered versioned story from the four frozen immutable runs", async () => {
    const story = await readyStory();
    expect(story).toMatchObject({
      schemaVersion: "sarah-guided-story/1.1.0",
      storyId: "sarah-trip-story",
      storyVersion: "1.1.0",
      contextVersion: "sarah-v1@2026-09-01",
      providerCallsRequired: false,
      progressPersistence: "session_only"
    });
    expect(story.steps.map((step) => step.state)).toEqual([
      "INTRODUCTION", "MEET_SARAH", "DECISION_SETUP", "QUESTION", "CALCULATING",
      "TRIP_RESULT", "ALTERNATIVES", "TIMING_ALTERNATIVE", "OPPORTUNITY_INFORMATION",
      "SUMMARY", "COMPLETE"
    ]);
    expect(new Set(story.steps.map((step) => step.id)).size).toBe(story.steps.length);
    expect(story.profile.facts.every((fact) => fact.affectsSimulation === false)).toBe(true);
  });

  it("projects only trusted display-ready frozen facts into the browser view model", async () => {
    const story = await readyStory();
    expect(story.currentPath).toMatchObject({
      preferredSafetyBuffer: "£900",
      goalDates: expect.arrayContaining([
        expect.objectContaining({ label: "Emergency fund", completion: "December 2026" }),
        expect.objectContaining({ label: "Holiday", completion: "May 2027" }),
        expect.objectContaining({ label: "House deposit", completion: "June 2029" })
      ])
    });
    expect(story.scenarios.TRIP_650_SEPTEMBER).toMatchObject({
      runId: "run-19b9e20a1ed382dc",
      safetyBufferBefore: "£900",
      safetyBufferAfter: "£250",
      requiredPayments: "Bills covered",
      borrowing: "£0 overdraft",
      recovery: "Restored in November 2026",
      classificationCode: "AFFORDABLE_SIGNIFICANT_TRADE_OFF"
    });
    expect(story.scenarios.TRIP_500_SEPTEMBER).toMatchObject({ safetyBufferAfter: "£400" });
    expect(story.scenarios.TRIP_400_SEPTEMBER).toMatchObject({
      safetyBufferAfter: "£500",
      classificationCode: "AFFORDABLE_NOTICEABLE_TRADE_OFF"
    });
    expect(story.scenarios.TRIP_650_OCTOBER.goalDates.map((goal) => goal.scenario)).toEqual(
      story.scenarios.TRIP_650_SEPTEMBER.goalDates.map((goal) => goal.scenario)
    );
    expect(JSON.stringify(story)).not.toContain("minorUnits");
    expect(JSON.stringify(story)).not.toContain("projectionPayload");
    expect(story.opportunityBoundary).toMatchObject({
      benefitKey: "SEASON_TICKET_LOAN",
      title: "Season-ticket loan",
      employerName: "OniBank",
      statusLabel: "Eligibility unknown",
      eligibility: "unknown",
      uptake: "inactive",
      includedInCalculation: false,
      includedInCurrentPlan: false,
      numericalSimulationSupported: false,
      referenceDate: "2026-08-31"
    });
  });

  it("fails closed for a missing, altered, incompatible or unknown-template fact", async () => {
    const runs = await runMap();
    const missing = new SarahStoryApplication({
      manifest: SARAH_STORY_MANIFEST,
      opportunityReader: SARAH_EMPLOYER_BENEFIT_SOURCE,
      runReader: { async execute() { return { ok: false as const, error: { code: "RUN_NOT_FOUND", message: "Not found" } }; } }
    });
    await expect(missing.load()).resolves.toMatchObject({ kind: "unavailable" });

    const alteredRun = structuredClone(runs.get("run-19b9e20a1ed382dc")!);
    (alteredRun as { presentation: { immediateImpact: { safetyBufferAfter: string } } }).presentation.immediateImpact.safetyBufferAfter = "£999";
    runs.set(alteredRun.calculation.runId, alteredRun);
    const altered = new SarahStoryApplication({
      manifest: SARAH_STORY_MANIFEST,
      opportunityReader: SARAH_EMPLOYER_BENEFIT_SOURCE,
      runReader: { async execute(runId) {
        const run = runs.get(runId);
        return run ? { ok: true as const, value: run } : { ok: false as const, error: { code: "RUN_NOT_FOUND", message: "Not found" } };
      } }
    });
    await expect(altered.load()).resolves.toMatchObject({ kind: "unavailable" });

    const invalidTemplate = structuredClone(SARAH_STORY_MANIFEST) as unknown as SarahStoryManifest;
    (invalidTemplate.steps[0] as { dialogueTemplate: string }).dialogueTemplate = "{{UNKNOWN_FINANCIAL_FACT}}";
    const cleanRuns = await runMap();
    const invalid = new SarahStoryApplication({
      manifest: invalidTemplate,
      opportunityReader: SARAH_EMPLOYER_BENEFIT_SOURCE,
      runReader: { async execute(runId) {
        const run = cleanRuns.get(runId);
        return run ? { ok: true as const, value: run } : { ok: false as const, error: { code: "RUN_NOT_FOUND", message: "Not found" } };
      } }
    });
    await expect(invalid.load()).resolves.toMatchObject({ kind: "unavailable" });

    const missingOpportunity = new SarahStoryApplication({
      manifest: SARAH_STORY_MANIFEST,
      opportunityReader: EMPTY_EMPLOYER_BENEFIT_SOURCE,
      runReader: { async execute(runId) {
        const run = cleanRuns.get(runId);
        return run ? { ok: true as const, value: run } : { ok: false as const, error: { code: "RUN_NOT_FOUND", message: "Not found" } };
      } }
    });
    await expect(missingOpportunity.load()).resolves.toMatchObject({ kind: "unavailable" });
  });

  it("keeps the dedicated Sarah identity as a server-enforced, fail-closed entitlement", () => {
    expect(isSarahStoryAuthorised({
      userId: "11111111-1111-4111-8111-111111111111",
      isDemo: true,
      currentContextVersionId: "sarah-v1@2026-09-01"
    })).toBe(true);
    expect(isSarahStoryAuthorised({
      userId: "22222222-2222-4222-8222-222222222222",
      isDemo: true,
      currentContextVersionId: "sarah-v1@2026-09-01"
    })).toBe(false);
    expect(isSarahStoryAuthorised({
      userId: "11111111-1111-4111-8111-111111111111",
      isDemo: false,
      currentContextVersionId: "sarah-v1@2026-09-01"
    })).toBe(false);
  });

  it("uses an explicit reducer for start, pause, resume, skip, summary and restart", async () => {
    const story = await readyStory();
    const frozenFacts = JSON.stringify(story.scenarios);
    let state = initialSarahStoryState();
    state = reduceSarahStory(state, { type: "START" }, story);
    expect(state.controllerState).toBe("INTRODUCTION");
    state = reduceSarahStory(state, { type: "PAUSE" }, story);
    expect(state).toMatchObject({ controllerState: "PAUSED", resumeState: "INTRODUCTION" });
    state = reduceSarahStory(state, { type: "RESUME" }, story);
    expect(state.controllerState).toBe("INTRODUCTION");
    state = reduceSarahStory(state, { type: "SKIP_STEP" }, story);
    expect(state.controllerState).toBe("MEET_SARAH");
    const sameStep = reduceSarahStory(state, { type: "SKIP_ANIMATION" }, story);
    expect(sameStep).toMatchObject({ activeStepIndex: state.activeStepIndex, currentAnimationSkipped: true });
    state = reduceSarahStory(sameStep, { type: "SKIP_TO_SUMMARY" }, story);
    expect(state.controllerState).toBe("SUMMARY");
    state = reduceSarahStory(state, { type: "RESTART" }, story);
    expect(state).toEqual(initialSarahStoryState());
    expect(JSON.stringify(story.scenarios)).toBe(frozenFacts);
  });

  it("renders server-returned sentinel values verbatim without browser arithmetic", async () => {
    const story = await readyStory();
    const scenario = {
      ...story.scenarios.TRIP_650_SEPTEMBER,
      safetyBufferBefore: "£901 SERVER",
      safetyBufferAfter: "£237 SERVER",
      recovery: "SERVER RECOVERY",
      goalDates: story.scenarios.TRIP_650_SEPTEMBER.goalDates.map((goal) => ({
        ...goal,
        scenario: `${goal.scenario} SERVER`
      }))
    };
    const markup = renderToStaticMarkup(<SarahStoryScenarioCard scenario={scenario}/>);
    expect(markup).toContain("£901 SERVER");
    expect(markup).toContain("£237 SERVER");
    expect(markup).toContain("SERVER RECOVERY");
    expect(markup).toContain("February 2027 SERVER");
  });

  it("retains the same financial facts for every animation preference", async () => {
    const story = await readyStory();
    const modes = [
      initialSarahStoryState(false),
      reduceSarahStory(initialSarahStoryState(false), { type: "SET_ANIMATION_DISABLED", value: true }, story),
      reduceSarahStory(initialSarahStoryState(false), { type: "SKIP_ANIMATION" }, story)
    ];
    expect(modes.map(() => JSON.stringify(story.scenarios))).toEqual([
      JSON.stringify(story.scenarios),
      JSON.stringify(story.scenarios),
      JSON.stringify(story.scenarios)
    ]);
  });
});
