import type {
  SarahStoryBundleDTO,
  SarahStoryControllerState,
  SarahStoryScenarioKey,
  SarahStoryStepState
} from "../../../application/story/contracts";

export interface SarahStoryPresentationState {
  readonly controllerState: SarahStoryControllerState;
  readonly activeStepIndex: number;
  readonly resumeState: SarahStoryStepState | null;
  readonly selectedScenarioKey: SarahStoryScenarioKey | null;
  readonly currentAnimationSkipped: boolean;
  readonly animationDisabled: boolean;
}

export type SarahStoryEvent =
  | Readonly<{ readonly type: "START" }>
  | Readonly<{ readonly type: "NEXT" }>
  | Readonly<{ readonly type: "SKIP_STEP" }>
  | Readonly<{ readonly type: "SKIP_ANIMATION" }>
  | Readonly<{ readonly type: "SKIP_TO_SUMMARY" }>
  | Readonly<{ readonly type: "PAUSE" }>
  | Readonly<{ readonly type: "RESUME" }>
  | Readonly<{ readonly type: "RESTART" }>
  | Readonly<{ readonly type: "SET_ANIMATION_DISABLED"; readonly value: boolean }>
  | Readonly<{ readonly type: "FAIL" }>;

export function initialSarahStoryState(animationDisabled = false): SarahStoryPresentationState {
  return {
    controllerState: "NOT_STARTED",
    activeStepIndex: -1,
    resumeState: null,
    selectedScenarioKey: null,
    currentAnimationSkipped: false,
    animationDisabled
  };
}

function selectedForStep(story: SarahStoryBundleDTO, index: number): SarahStoryScenarioKey | null {
  return story.steps[index]?.scenarioKey ?? null;
}

function moveTo(
  state: SarahStoryPresentationState,
  story: SarahStoryBundleDTO,
  index: number
): SarahStoryPresentationState {
  const step = story.steps[index];
  if (!step) return state;
  return {
    ...state,
    controllerState: step.state,
    activeStepIndex: index,
    resumeState: null,
    selectedScenarioKey: selectedForStep(story, index),
    currentAnimationSkipped: false
  };
}

export function reduceSarahStory(
  state: SarahStoryPresentationState,
  event: SarahStoryEvent,
  story: SarahStoryBundleDTO
): SarahStoryPresentationState {
  switch (event.type) {
    case "START":
      return state.controllerState === "NOT_STARTED" ? moveTo(state, story, 0) : state;
    case "NEXT":
    case "SKIP_STEP":
      if (state.controllerState === "NOT_STARTED" || state.controllerState === "ERROR") return state;
      return moveTo(state, story, Math.min(state.activeStepIndex + 1, story.steps.length - 1));
    case "SKIP_ANIMATION":
      return state.activeStepIndex >= 0 ? { ...state, currentAnimationSkipped: true } : state;
    case "SKIP_TO_SUMMARY": {
      const summaryIndex = story.steps.findIndex((step) => step.state === "SUMMARY");
      return summaryIndex >= 0 ? moveTo(state, story, summaryIndex) : state;
    }
    case "PAUSE":
      if (
        state.activeStepIndex < 0
        || state.controllerState === "PAUSED"
        || state.controllerState === "ERROR"
        || state.controllerState === "COMPLETE"
      ) return state;
      return {
        ...state,
        resumeState: state.controllerState as SarahStoryStepState,
        controllerState: "PAUSED"
      };
    case "RESUME":
      return state.controllerState === "PAUSED" && state.resumeState
        ? { ...state, controllerState: state.resumeState, resumeState: null }
        : state;
    case "RESTART":
      return initialSarahStoryState(state.animationDisabled);
    case "SET_ANIMATION_DISABLED":
      return {
        ...state,
        animationDisabled: event.value,
        currentAnimationSkipped: event.value || state.currentAnimationSkipped
      };
    case "FAIL":
      return { ...state, controllerState: "ERROR", resumeState: null };
  }
}
