import "server-only";
import type { SarahStoryManifest } from "../application/story/contracts";

export const SARAH_DEMO_USER_ID = "11111111-1111-4111-8111-111111111111";

export const SARAH_STORY_MANIFEST = Object.freeze({
  storyId: "sarah-trip-story",
  storyVersion: "1.1.0",
  narrativeTemplateVersion: "sarah-trip-narrative/1.1.0",
  requiredContextVersion: "sarah-v1@2026-09-01",
  requiredBaselineId: "baseline-ec13101a3fe66f17",
  requiredRulesVersion: "fy-sim/1.0.0",
  requiredCalendarVersion: "govuk-england-and-wales-2026-2028@2026-08-23",
  requiredRuns: {
    TRIP_650_SEPTEMBER: {
      runId: "run-19b9e20a1ed382dc",
      scenarioId: "scenario-d3cae357a08bfdfb",
      amountMinorUnits: "65000",
      paymentPeriod: "2026-09",
      classificationCode: "AFFORDABLE_SIGNIFICANT_TRADE_OFF"
    },
    TRIP_500_SEPTEMBER: {
      runId: "run-3b1f93a202af641a",
      scenarioId: "scenario-2fe8f14464ecd680",
      amountMinorUnits: "50000",
      paymentPeriod: "2026-09",
      classificationCode: "AFFORDABLE_SIGNIFICANT_TRADE_OFF"
    },
    TRIP_400_SEPTEMBER: {
      runId: "run-84e655ad5797d8d2",
      scenarioId: "scenario-d3ba6039de278c53",
      amountMinorUnits: "40000",
      paymentPeriod: "2026-09",
      classificationCode: "AFFORDABLE_NOTICEABLE_TRADE_OFF"
    },
    TRIP_650_OCTOBER: {
      runId: "run-3728df098b2960e5",
      scenarioId: "scenario-cb9d2532d9a6a729",
      amountMinorUnits: "65000",
      paymentPeriod: "2026-10",
      classificationCode: "AFFORDABLE_SIGNIFICANT_TRADE_OFF"
    }
  },
  expectedFacts: {
    preferredSafetyBuffer: "£900",
    currentGoalDates: {
      "Emergency fund": "December 2026",
      Holiday: "May 2027",
      "House deposit": "June 2029"
    },
    scenarioFacts: {
      TRIP_650_SEPTEMBER: {
        safetyBufferAfter: "£250",
        emergencyFundDate: "February 2027",
        holidayDate: "June 2027",
        houseDepositDate: "July 2029",
        requiredPayments: "Bills covered",
        borrowing: "£0 overdraft",
        recovery: "Restored in November 2026"
      },
      TRIP_500_SEPTEMBER: {
        safetyBufferAfter: "£400",
        emergencyFundDate: "January 2027",
        requiredPayments: "Bills covered",
        borrowing: "£0 overdraft"
      },
      TRIP_400_SEPTEMBER: {
        safetyBufferAfter: "£500",
        emergencyFundDate: "January 2027",
        requiredPayments: "Bills covered",
        borrowing: "£0 overdraft"
      },
      TRIP_650_OCTOBER: {
        safetyBufferAfter: "£250",
        emergencyFundDate: "February 2027",
        holidayDate: "June 2027",
        houseDepositDate: "July 2029",
        requiredPayments: "Bills covered",
        borrowing: "£0 overdraft",
        recovery: "Restored in November 2026"
      }
    }
  },
  profile: {
    name: "Sarah Wonk",
    introduction: "Sarah is Future You’s frozen demonstration profile. Her circumstances are not the current viewer’s profile.",
    facts: [
      {
        label: "Age",
        value: "25",
        provenance: "existing_canonical_demographic_context_fact",
        affectsSimulation: false
      },
      {
        label: "Location",
        value: "Manchester",
        provenance: "existing_canonical_demographic_context_fact",
        affectsSimulation: false
      },
      {
        label: "Work",
        value: "Customer Insights Analyst at OniBank",
        provenance: "existing_canonical_demographic_context_fact",
        affectsSimulation: false
      }
    ],
    provenanceNote: "These profile details introduce the canonical demo only. They are separate from simulation inputs and do not change any result."
  },
  steps: [
    {
      id: "introduction",
      state: "INTRODUCTION",
      eyebrow: "Guided demonstration",
      title: "A decision, followed into the future",
      dialogueTemplate: "This is Sarah’s demonstration story. It uses her frozen financial plan and stored results—not the current viewer’s finances.",
      templateId: "SARAH_STORY_INTRODUCTION",
      narrativeState: "IDLE",
      characterPosition: "start",
      contentKind: "introduction",
      scenarioKey: null
    },
    {
      id: "meet-sarah",
      state: "MEET_SARAH",
      eyebrow: "Meet Sarah",
      title: "One canonical demo profile",
      dialogueTemplate: "Sarah is 25, lives in Manchester and works as a Customer Insights Analyst at OniBank.",
      templateId: "SARAH_MEET_PROFILE",
      narrativeState: "CURIOUS",
      characterPosition: "quarter",
      contentKind: "profile",
      scenarioKey: null
    },
    {
      id: "decision-setup",
      state: "DECISION_SETUP",
      eyebrow: "Her current path",
      title: "First, understand what is already protected",
      dialogueTemplate: "Sarah’s preferred safety buffer is {{PREFERRED_BUFFER}}. Her current goal dates come from the unchanged baseline stored with the simulation.",
      templateId: "SARAH_CURRENT_PATH",
      narrativeState: "CURIOUS",
      characterPosition: "quarter",
      contentKind: "current_path",
      scenarioKey: null
    },
    {
      id: "question",
      state: "QUESTION",
      eyebrow: "The decision",
      title: "Can I afford a £650 trip next month?",
      dialogueTemplate: "I want to take the trip. What would {{TRIP_650_AMOUNT}} do to my future?",
      templateId: "SARAH_QUESTION_TRIP_650",
      narrativeState: "UNCERTAIN",
      characterPosition: "middle",
      contentKind: "question",
      scenarioKey: "TRIP_650_SEPTEMBER"
    },
    {
      id: "calculating",
      state: "CALCULATING",
      eyebrow: "Deterministic check",
      title: "Retrieve the stored result",
      dialogueTemplate: "Future You checks the immutable what-if run. No model writes or calculates the financial answer.",
      templateId: "SARAH_RETRIEVE_STORED_RESULT",
      narrativeState: "THINKING",
      characterPosition: "middle",
      contentKind: "calculating",
      scenarioKey: "TRIP_650_SEPTEMBER"
    },
    {
      id: "trip-result",
      state: "TRIP_RESULT",
      eyebrow: "The £650 result",
      title: "Affordable—with a significant trade-off",
      dialogueTemplate: "The trip leaves Sarah’s safety buffer at {{TRIP_650_BUFFER}}. Bills remain covered, no overdraft is required, and the buffer is {{TRIP_650_RECOVERY}}.",
      templateId: "SARAH_RESULT_650_SIGNIFICANT",
      narrativeState: "CONCERNED",
      characterPosition: "three_quarters",
      contentKind: "scenario",
      scenarioKey: "TRIP_650_SEPTEMBER"
    },
    {
      id: "alternatives",
      state: "ALTERNATIVES",
      eyebrow: "Amount alternatives",
      title: "See the trade-off change",
      dialogueTemplate: "At £500, the lowest safety buffer is {{TRIP_500_BUFFER}}. At £400, it is {{TRIP_400_BUFFER}}. These are choices to understand, not recommendations.",
      templateId: "SARAH_COMPARE_AMOUNTS",
      narrativeState: "SURPRISED",
      characterPosition: "three_quarters",
      contentKind: "alternatives",
      scenarioKey: "TRIP_500_SEPTEMBER"
    },
    {
      id: "timing-alternative",
      state: "TIMING_ALTERNATIVE",
      eyebrow: "Timing alternative",
      title: "What if Sarah waits until October?",
      dialogueTemplate: "Waiting until {{OCTOBER_MONTH}} moves the pressure into October. The lowest buffer remains £250 and the frozen goal-completion dates do not improve.",
      templateId: "SARAH_COMPARE_OCTOBER",
      narrativeState: "THINKING",
      characterPosition: "middle",
      contentKind: "timing",
      scenarioKey: "TRIP_650_OCTOBER"
    },
    {
      id: "opportunity-information",
      state: "OPPORTUNITY_INFORMATION",
      eyebrow: "Sourced opportunity",
      title: "Information stays separate from cash",
      dialogueTemplate: "{{OPPORTUNITY_EMPLOYER}} lists a {{OPPORTUNITY_NAME}}. Sarah’s eligibility is unknown, and it is not included in her current plan or any trip result.",
      templateId: "SARAH_OPPORTUNITY_BOUNDARY",
      narrativeState: "THINKING",
      characterPosition: "three_quarters",
      contentKind: "opportunity_boundary",
      scenarioKey: null
    },
    {
      id: "summary",
      state: "SUMMARY",
      eyebrow: "What Sarah understands",
      title: "The choice stays with Sarah",
      dialogueTemplate: "Sarah can now see what each amount and month changes. Future You has explained the consequences without choosing for her.",
      templateId: "SARAH_UNDERSTANDS_OPTIONS",
      narrativeState: "RELIEVED_TO_UNDERSTAND",
      characterPosition: "end",
      contentKind: "summary",
      scenarioKey: null
    },
    {
      id: "complete",
      state: "COMPLETE",
      eyebrow: "Story complete",
      title: "Uncertainty became understanding",
      dialogueTemplate: "The current path and every what-if remain unchanged. Sarah can restart the story or return to Future You.",
      templateId: "SARAH_STORY_COMPLETE",
      narrativeState: "COMPLETE",
      characterPosition: "end",
      contentKind: "complete",
      scenarioKey: null
    }
  ],
  requiredOpportunity: {
    benefitKey: "SEASON_TICKET_LOAN",
    employerName: "OniBank",
    referenceDate: "2026-08-31"
  }
} as const satisfies SarahStoryManifest);
