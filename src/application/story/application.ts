import type { OneOffPurchaseResponseDTO } from "../dto/contracts";
import {
  SARAH_STORY_ID,
  SARAH_STORY_NARRATIVE_VERSION,
  SARAH_STORY_SCHEMA_VERSION,
  SARAH_STORY_VERSION,
  type SarahStoryBundleDTO,
  type SarahStoryGoalDateDTO,
  type SarahStoryLoadResult,
  type SarahStoryManifest,
  type SarahStoryOpportunityReader,
  type SarahStoryRunReader,
  type SarahStoryScenarioDTO,
  type SarahStoryScenarioKey,
  type SarahStoryStepDTO
} from "./contracts";

const UNAVAILABLE = Object.freeze({
  kind: "unavailable" as const,
  message: "Sarah’s story is unavailable right now. No financial result has been changed." as const,
  retryable: true
});

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
] as const;

function displayMonth(period: string): string {
  const monthNumber = Number(period.slice(5, 7));
  const month = MONTHS[monthNumber - 1];
  return month && /^\d{4}-\d{2}$/.test(period) ? `${month} ${period.slice(0, 4)}` : period;
}

function goalDate(run: OneOffPurchaseResponseDTO, label: string) {
  return run.presentation.goalImpacts.find((goal) => goal.label === label);
}

function storyScenario(
  key: SarahStoryScenarioKey,
  run: OneOffPurchaseResponseDTO
): SarahStoryScenarioDTO {
  return {
    key,
    runId: run.calculation.runId,
    scenarioId: run.scenario.id,
    label: run.presentation.scenarioLabel,
    amount: run.scenario.change.amount.minorUnits === "65000"
      ? "£650"
      : run.scenario.change.amount.minorUnits === "50000"
        ? "£500"
        : "£400",
    paymentMonth: displayMonth(run.scenario.change.paymentPeriod),
    classification: run.presentation.classificationLabel,
    classificationCode: run.result.comparison.classification.code as SarahStoryScenarioDTO["classificationCode"],
    summary: run.presentation.summary,
    safetyBufferBefore: run.presentation.immediateImpact.safetyBufferBefore,
    safetyBufferAfter: run.presentation.immediateImpact.safetyBufferAfter,
    requiredPayments: run.presentation.immediateImpact.requiredPayments,
    borrowing: run.presentation.immediateImpact.borrowing,
    recovery: run.presentation.immediateImpact.recovery,
    goalDates: run.presentation.goalImpacts.map((goal): SarahStoryGoalDateDTO => ({
      goalId: goal.goalId,
      label: goal.label,
      currentPath: goal.baselineCompletion,
      scenario: goal.scenarioCompletion,
      change: goal.delay
    })),
    assumptions: [
      "One payment",
      "Paid from the current account",
      "Additional to routine spending",
      `Conservative timing within ${displayMonth(run.scenario.change.paymentPeriod)}`
    ],
    selectionAffectsFinancialState: false
  };
}

function validateRun(
  key: SarahStoryScenarioKey,
  run: OneOffPurchaseResponseDTO,
  manifest: SarahStoryManifest
): boolean {
  const expected = manifest.requiredRuns[key];
  const facts = manifest.expectedFacts.scenarioFacts[key];
  const emergency = goalDate(run, "Emergency fund");
  const holiday = goalDate(run, "Holiday");
  const house = goalDate(run, "House deposit");
  return run.calculation.runId === expected.runId
    && run.scenario.id === expected.scenarioId
    && run.context.version === manifest.requiredContextVersion
    && run.calculation.contextVersion === manifest.requiredContextVersion
    && run.calculation.baselineId === manifest.requiredBaselineId
    && run.calculation.rulesVersion === manifest.requiredRulesVersion
    && run.calculation.calendarVersion === manifest.requiredCalendarVersion
    && run.scenario.change.amount.minorUnits === expected.amountMinorUnits
    && run.scenario.change.paymentPeriod === expected.paymentPeriod
    && run.result.comparison.classification.code === expected.classificationCode
    && run.presentation.immediateImpact.safetyBufferAfter === facts.safetyBufferAfter
    && run.presentation.immediateImpact.requiredPayments === facts.requiredPayments
    && run.presentation.immediateImpact.borrowing === facts.borrowing
    && (facts.recovery === undefined || run.presentation.immediateImpact.recovery === facts.recovery)
    && emergency?.scenarioCompletion === facts.emergencyFundDate
    && (facts.holidayDate === undefined || holiday?.scenarioCompletion === facts.holidayDate)
    && (facts.houseDepositDate === undefined || house?.scenarioCompletion === facts.houseDepositDate);
}

const TOKEN_PATTERN = /\{\{([A-Z0-9_]+)\}\}/g;

function renderDialogue(template: string, facts: Readonly<Record<string, string>>): string | null {
  let valid = true;
  const rendered = template.replace(TOKEN_PATTERN, (_match, key: string) => {
    const value = facts[key];
    if (value === undefined) {
      valid = false;
      return "";
    }
    return value;
  });
  return valid && !rendered.includes("{{") && !rendered.includes("}}") ? rendered : null;
}

function currentPathFrom(run: OneOffPurchaseResponseDTO) {
  return run.presentation.goalImpacts.map((goal) => ({
    goalId: goal.goalId,
    label: goal.label,
    completion: goal.baselineCompletion
  }));
}

export class SarahStoryApplication {
  constructor(private readonly dependencies: Readonly<{
    readonly runReader: SarahStoryRunReader;
    readonly opportunityReader: SarahStoryOpportunityReader;
    readonly manifest: SarahStoryManifest;
  }>) {}

  async load(): Promise<SarahStoryLoadResult> {
    const { manifest } = this.dependencies;
    let entries: readonly Readonly<[SarahStoryScenarioKey, Awaited<ReturnType<SarahStoryRunReader["execute"]>>]>[];
    let benefitOpportunities: Awaited<ReturnType<SarahStoryOpportunityReader["getOpportunities"]>>;
    try {
      [entries, benefitOpportunities] = await Promise.all([
        Promise.all(
          (Object.keys(manifest.requiredRuns) as SarahStoryScenarioKey[]).map(async (key) => {
            const loaded = await this.dependencies.runReader.execute(manifest.requiredRuns[key].runId);
            return [key, loaded] as const;
          })
        ),
        this.dependencies.opportunityReader.getOpportunities()
      ]);
    } catch {
      return UNAVAILABLE;
    }
    if (entries.some(([, loaded]) => !loaded.ok)) return UNAVAILABLE;

    const runs = Object.fromEntries(
      entries.map(([key, loaded]) => [key, loaded.ok ? loaded.value : null])
    ) as Record<SarahStoryScenarioKey, OneOffPurchaseResponseDTO | null>;
    for (const key of Object.keys(runs) as SarahStoryScenarioKey[]) {
      const run = runs[key];
      if (!run || !validateRun(key, run, manifest)) return UNAVAILABLE;
    }

    const trip650 = runs.TRIP_650_SEPTEMBER;
    const october = runs.TRIP_650_OCTOBER;
    if (!trip650 || !october) return UNAVAILABLE;
    const opportunity = benefitOpportunities.find((candidate) =>
      candidate.benefitKey === manifest.requiredOpportunity.benefitKey
      && candidate.employerName === manifest.requiredOpportunity.employerName
      && candidate.referenceDate === manifest.requiredOpportunity.referenceDate
      && candidate.offeringStatus === "AVAILABLE"
      && !candidate.numericalSimulationSupported
      && candidate.furtherInformationRequired
      && candidate.userState?.eligibilityStatus === "UNKNOWN"
      && candidate.userState.uptakeStatus === "INACTIVE"
      && !candidate.userState.includedInFinancialBaseline
      && candidate.userState.informationCompleteness === "INCOMPLETE"
    );
    if (!opportunity) return UNAVAILABLE;
    const baselineGoalDates = currentPathFrom(trip650);
    const expectedCurrent = manifest.expectedFacts.currentGoalDates;
    if (
      trip650.result.comparison.classification.desiredSafetyBuffer.display.replace(".00", "")
        !== manifest.expectedFacts.preferredSafetyBuffer
      || baselineGoalDates.some((goal) => expectedCurrent[goal.label as keyof typeof expectedCurrent] !== goal.completion)
      || october.presentation.goalImpacts.some((goal, index) =>
        goal.scenarioCompletion !== trip650.presentation.goalImpacts[index]?.scenarioCompletion
      )
    ) return UNAVAILABLE;

    const scenarios = Object.fromEntries(
      (Object.keys(runs) as SarahStoryScenarioKey[]).map((key) => [key, storyScenario(key, runs[key]!)])
    ) as Record<SarahStoryScenarioKey, SarahStoryScenarioDTO>;
    const dialogueFacts = Object.freeze({
      PREFERRED_BUFFER: manifest.expectedFacts.preferredSafetyBuffer,
      TRIP_650_AMOUNT: scenarios.TRIP_650_SEPTEMBER.amount,
      TRIP_650_BUFFER: scenarios.TRIP_650_SEPTEMBER.safetyBufferAfter,
      TRIP_650_RECOVERY: scenarios.TRIP_650_SEPTEMBER.recovery,
      TRIP_650_EMERGENCY: goalDate(trip650, "Emergency fund")?.scenarioCompletion ?? "",
      TRIP_500_BUFFER: scenarios.TRIP_500_SEPTEMBER.safetyBufferAfter,
      TRIP_400_BUFFER: scenarios.TRIP_400_SEPTEMBER.safetyBufferAfter,
      OCTOBER_MONTH: scenarios.TRIP_650_OCTOBER.paymentMonth,
      OPPORTUNITY_EMPLOYER: opportunity.employerName,
      OPPORTUNITY_NAME: opportunity.displayName
    });
    const total = manifest.steps.length;
    const steps: SarahStoryStepDTO[] = [];
    for (const [index, step] of manifest.steps.entries()) {
      const dialogue = renderDialogue(step.dialogueTemplate, dialogueFacts);
      if (!dialogue) return UNAVAILABLE;
      steps.push({
        id: step.id,
        state: step.state,
        ordinal: index + 1,
        total,
        eyebrow: step.eyebrow,
        title: step.title,
        dialogue,
        templateId: step.templateId,
        narrativeState: step.narrativeState,
        characterPosition: step.characterPosition,
        contentKind: step.contentKind,
        scenarioKey: step.scenarioKey
      });
    }
    if (new Set(steps.map((step) => step.id)).size !== steps.length) return UNAVAILABLE;

    const story: SarahStoryBundleDTO = {
      schemaVersion: SARAH_STORY_SCHEMA_VERSION,
      storyId: SARAH_STORY_ID,
      storyVersion: SARAH_STORY_VERSION,
      narrativeTemplateVersion: SARAH_STORY_NARRATIVE_VERSION,
      contextVersion: manifest.requiredContextVersion,
      baselineId: manifest.requiredBaselineId,
      rulesVersion: manifest.requiredRulesVersion,
      calendarVersion: manifest.requiredCalendarVersion,
      demonstrationLabel: "Sarah is a demonstration character",
      profile: manifest.profile,
      currentPath: {
        preferredSafetyBuffer: manifest.expectedFacts.preferredSafetyBuffer,
        goalDates: baselineGoalDates
      },
      scenarios,
      steps,
      opportunityBoundary: {
        offeringId: opportunity.offeringId,
        benefitKey: "SEASON_TICKET_LOAN",
        title: opportunity.displayName,
        employerName: opportunity.employerName,
        statusLabel: "Eligibility unknown",
        explanation: `${opportunity.employerName} lists this opportunity. It is not included in Sarah’s current financial plan.`,
        sourceReference: opportunity.sourceReference,
        referenceDate: opportunity.referenceDate,
        eligibility: "unknown",
        uptake: "inactive",
        includedInCalculation: false,
        includedInCurrentPlan: false,
        numericalSimulationSupported: false
      },
      asset: {
        id: "sarah-prototype-vector",
        source: "user_supplied_html_prototype",
        fileType: "inline_svg_component",
        decorative: true
      },
      progressPersistence: "session_only",
      providerCallsRequired: false
    };
    return { kind: "ready", story };
  }
}
