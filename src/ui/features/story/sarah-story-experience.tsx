"use client";

import Link from "next/link";
import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import type {
  SarahStoryBundleDTO,
  SarahStoryLoadResult,
  SarahStoryScenarioDTO
} from "../../../application/story/contracts";
import { FutureYouWordmark } from "../../brand/future-you-wordmark";
import { SarahStoryCharacter } from "./sarah-story-character";
import {
  initialSarahStoryState,
  reduceSarahStory
} from "./sarah-story-machine";

const MOTION_PREFERENCE_KEY = "future-you.sarah-story.animation-disabled";

export function SarahStoryScenarioCard({ scenario, compact = false }: Readonly<{
  scenario: SarahStoryScenarioDTO;
  compact?: boolean;
}>) {
  return (
    <article className={`fy-story-result ${compact ? "compact" : ""}`} data-testid={`story-result-${scenario.key.toLowerCase()}`}>
      <div className="fy-story-result-heading">
        <div><span>{scenario.label}</span><strong>{scenario.classification}</strong></div>
        <em>What-if only</em>
      </div>
      <div className="fy-story-buffer-change" aria-label={`Safety buffer ${scenario.safetyBufferBefore} to ${scenario.safetyBufferAfter}`}>
        <span><small>Before</small><strong>{scenario.safetyBufferBefore}</strong></span>
        <i aria-hidden="true">→</i>
        <span><small>After</small><strong>{scenario.safetyBufferAfter}</strong></span>
      </div>
      <ul className="fy-story-proof-list">
        <li><span>Bills</span><strong>{scenario.requiredPayments}</strong></li>
        <li><span>Borrowing</span><strong>{scenario.borrowing}</strong></li>
        <li><span>Safety buffer</span><strong>{scenario.recovery}</strong></li>
      </ul>
      {!compact ? (
        <div className="fy-story-goal-impact">
          <h3>Future impact</h3>
          {scenario.goalDates.map((goal) => (
            <div key={goal.goalId}>
              <span>{goal.label}</span>
              <strong>{goal.currentPath} <i aria-hidden="true">→</i> {goal.scenario}</strong>
              <small>{goal.change}</small>
            </div>
          ))}
        </div>
      ) : null}
      <details className="fy-story-assumptions">
        <summary>Assumptions used</summary>
        <ul>{scenario.assumptions.map((assumption) => <li key={assumption}>{assumption}</li>)}</ul>
      </details>
    </article>
  );
}

function CurrentPath({ story }: Readonly<{ story: SarahStoryBundleDTO }>) {
  return (
    <article className="fy-story-current-path" data-testid="story-current-path">
      <div><span>Preferred safety buffer</span><strong>{story.currentPath.preferredSafetyBuffer}</strong></div>
      <h3>Current goal dates</h3>
      <ul>
        {story.currentPath.goalDates.map((goal) => (
          <li key={goal.goalId}><span>{goal.label}</span><strong>{goal.completion}</strong></li>
        ))}
      </ul>
    </article>
  );
}

function StepEvidence({ story, contentKind, scenario }: Readonly<{
  story: SarahStoryBundleDTO;
  contentKind: SarahStoryBundleDTO["steps"][number]["contentKind"];
  scenario: SarahStoryScenarioDTO | null;
}>) {
  if (contentKind === "profile") {
    return (
      <article className="fy-story-profile" data-testid="story-profile">
        <h3>{story.profile.name}</h3>
        <p>{story.profile.introduction}</p>
        <dl>{story.profile.facts.map((fact) => <div key={fact.label}><dt>{fact.label}</dt><dd>{fact.value}</dd></div>)}</dl>
        <small>{story.profile.provenanceNote}</small>
      </article>
    );
  }
  if (contentKind === "current_path") return <CurrentPath story={story}/>;
  if (contentKind === "scenario" && scenario) return <SarahStoryScenarioCard scenario={scenario}/>;
  if (contentKind === "alternatives") {
    return (
      <div className="fy-story-alternative-grid" data-testid="story-alternatives">
        <SarahStoryScenarioCard compact scenario={story.scenarios.TRIP_500_SEPTEMBER}/>
        <SarahStoryScenarioCard compact scenario={story.scenarios.TRIP_400_SEPTEMBER}/>
      </div>
    );
  }
  if (contentKind === "timing") return <SarahStoryScenarioCard scenario={story.scenarios.TRIP_650_OCTOBER}/>;
  if (contentKind === "opportunity_boundary") {
    return (
      <article className="fy-story-opportunity" data-testid="story-opportunity-boundary">
        <span>Information only</span><h3>{story.opportunityBoundary.title}</h3>
        <p>{story.opportunityBoundary.explanation}</p>
        <strong>Not included in calculation</strong>
      </article>
    );
  }
  if (contentKind === "summary" || contentKind === "complete") {
    return (
      <section className="fy-story-summary" data-testid="story-summary">
        <CurrentPath story={story}/>
        <div className="fy-story-summary-options">
          {Object.values(story.scenarios).map((item) => <SarahStoryScenarioCard scenario={item} key={item.key}/>) }
        </div>
      </section>
    );
  }
  if (contentKind === "calculating") {
    return <div className="fy-story-calculating" role="status"><span aria-hidden="true"/><strong>Reading stored deterministic results</strong></div>;
  }
  if (contentKind === "question" && scenario) {
    return <blockquote className="fy-story-question">“Can I afford a {scenario.amount} trip next month?”</blockquote>;
  }
  return (
    <article className="fy-story-intro-card">
      <span>Current path</span><strong>{story.currentPath.preferredSafetyBuffer} preferred safety buffer</strong>
      <small>All amounts and dates are server-provided.</small>
    </article>
  );
}

function UnavailableStory({ message }: Readonly<{ message: string }>) {
  return (
    <main className="fy-story-unavailable" id="story-main">
      <FutureYouWordmark/>
      <p className="eyebrow">Guided demonstration</p>
      <h1>Sarah’s story is unavailable</h1>
      <p>{message}</p>
      <div><button type="button" onClick={() => window.location.reload()}>Retry</button><Link href="/home">Exit story</Link></div>
    </main>
  );
}

export function SarahStoryExperience({ result }: Readonly<{ result: SarahStoryLoadResult }>) {
  if (result.kind === "unavailable") return <UnavailableStory message={result.message}/>;
  return <ReadySarahStory story={result.story}/>;
}

function ReadySarahStory({ story }: Readonly<{ story: SarahStoryBundleDTO }>) {
  const [storedPreference, setStoredPreference] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [state, dispatch] = useReducer(
    (current: ReturnType<typeof initialSarahStoryState>, event: Parameters<typeof reduceSarahStory>[1]) =>
      reduceSarahStory(current, event, story),
    initialSarahStoryState(false)
  );
  const storyHeading = useRef<HTMLHeadingElement>(null);
  const summaryHeading = useRef<HTMLHeadingElement>(null);
  const started = state.activeStepIndex >= 0;
  const step = started ? story.steps[state.activeStepIndex] ?? null : null;
  const scenario = step?.scenarioKey ? story.scenarios[step.scenarioKey] : null;
  const paused = state.controllerState === "PAUSED";
  const motionDisabled = reducedMotion || state.animationDisabled || state.currentAnimationSkipped;
  const complete = step?.state === "COMPLETE";
  const progress = useMemo(() => started ? `${state.activeStepIndex + 1} / ${story.steps.length}` : "Ready", [started, state.activeStepIndex, story.steps.length]);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(media.matches);
    update();
    media.addEventListener("change", update);
    const persisted = window.localStorage.getItem(MOTION_PREFERENCE_KEY) === "true";
    setStoredPreference(persisted);
    dispatch({ type: "SET_ANIMATION_DISABLED", value: persisted });
    return () => media.removeEventListener("change", update);
  }, []);

  const setAnimationDisabled = (value: boolean) => {
    window.localStorage.setItem(MOTION_PREFERENCE_KEY, String(value));
    setStoredPreference(value);
    dispatch({ type: "SET_ANIMATION_DISABLED", value });
  };

  const start = () => {
    dispatch({ type: "START" });
    window.requestAnimationFrame(() => storyHeading.current?.focus());
  };

  const skipToSummary = () => {
    dispatch({ type: "SKIP_TO_SUMMARY" });
    window.requestAnimationFrame(() => summaryHeading.current?.focus());
  };

  const restart = () => {
    dispatch({ type: "RESTART" });
    window.requestAnimationFrame(() => storyHeading.current?.focus());
  };

  return (
    <div
      className={`fy-story-shell ${motionDisabled ? "motion-disabled" : ""} ${paused ? "story-paused" : ""}`.trim()}
      data-story-state={state.controllerState}
      data-story-step={step?.id ?? "not-started"}
      data-reduced-motion={reducedMotion ? "true" : "false"}
      data-testid="sarah-story"
    >
      <a className="fy-skip-link" href="#story-main">Skip to story content</a>
      <header className="fy-story-header">
        <Link href="/home" aria-label="Future You home"><FutureYouWordmark/></Link>
        <span>{story.demonstrationLabel}</span>
        <Link href="/home">Exit</Link>
      </header>

      {started ? (
        <nav className="fy-story-controls" aria-label="Story playback controls">
          <button type="button" onClick={() => dispatch({ type: paused ? "RESUME" : "PAUSE" })} disabled={complete}>
            {paused ? "Resume" : "Pause"}
          </button>
          <button type="button" onClick={() => dispatch({ type: "SKIP_STEP" })} disabled={complete}>Skip step</button>
          <button type="button" onClick={() => dispatch({ type: "SKIP_ANIMATION" })} disabled={motionDisabled}>Skip animation</button>
          <button type="button" onClick={skipToSummary} disabled={step?.state === "SUMMARY" || complete}>Skip to summary</button>
          <button type="button" onClick={() => setAnimationDisabled(!storedPreference)}>
            {storedPreference ? "Enable animation" : "Disable animation"}
          </button>
          <button type="button" onClick={restart}>Restart</button>
          {!complete ? <button className="primary" type="button" onClick={() => dispatch({ type: "NEXT" })} disabled={paused}>Next step</button> : null}
          <Link href="/home">Exit story</Link>
        </nav>
      ) : null}

      <main id="story-main" className="fy-story-main">
        {!started ? (
          <section className="fy-story-ready" data-testid="story-ready">
            <div>
              <p className="eyebrow">Guided demonstration</p>
              <h1 ref={storyHeading} tabIndex={-1}>See a money choice become a future path</h1>
              <p>Walk through Sarah’s real frozen £650 trip result, its amount alternatives and its October timing option.</p>
              <button type="button" onClick={start}>Play Sarah’s story</button>
              <small>No AI provider is used. Nothing in Sarah’s financial plan is changed.</small>
            </div>
            <div className="fy-story-ready-stage"><SarahStoryCharacter step={null} motionDisabled={motionDisabled} paused={false}/></div>
          </section>
        ) : step ? (
          <>
            <section className="fy-story-stage" aria-labelledby="story-step-heading">
              <div className="fy-story-dialogue">
                <div className="fy-story-progress"><span>Step {progress}</span><progress value={state.activeStepIndex + 1} max={story.steps.length}/></div>
                <p className="eyebrow">{step.eyebrow}</p>
                <h1 id="story-step-heading" ref={step.state === "SUMMARY" ? summaryHeading : storyHeading} tabIndex={-1}>{step.title}</h1>
                <p className="fy-story-speech">{step.dialogue}</p>
                <p className="sr-only" aria-live="polite">Step {step.ordinal} of {step.total}: {step.title}</p>
              </div>
              <div className="fy-story-character-stage"><SarahStoryCharacter step={step} motionDisabled={motionDisabled} paused={paused}/></div>
            </section>
            <section className="fy-story-evidence" aria-label="Trusted story evidence">
              <StepEvidence story={story} contentKind={step.contentKind} scenario={scenario}/>
            </section>
          </>
        ) : null}
      </main>
    </div>
  );
}
