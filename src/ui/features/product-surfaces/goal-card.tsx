"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { SurfaceGoalDTO } from "../../../application/product-surfaces/contracts";

export const GOAL_PROGRESS_ANIMATION_MS = 2200;

function AnimatedProgressLabel({
  display,
  enabled,
  revealed
}: Readonly<{
  display: string;
  enabled: boolean;
  revealed: boolean;
}>) {
  const [visibleLabel, setVisibleLabel] = useState(enabled ? "0%" : display);

  useEffect(() => {
    if (!enabled) {
      setVisibleLabel(display);
      return;
    }
    if (!revealed) {
      setVisibleLabel("0%");
      return;
    }
    const match = /^(\d+)%$/.exec(display);
    if (!match || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setVisibleLabel(display);
      return;
    }
    const target = Number.parseInt(match[1] ?? "0", 10);
    let frame = 0;
    let startedAt: number | null = null;
    const tick = (timestamp: number) => {
      startedAt ??= timestamp;
      const elapsed = Math.min(1, (timestamp - startedAt) / GOAL_PROGRESS_ANIMATION_MS);
      const eased = elapsed < 0.5
        ? 4 * elapsed * elapsed * elapsed
        : 1 - Math.pow(-2 * elapsed + 2, 3) / 2;
      setVisibleLabel(elapsed === 1 ? display : `${Math.round(target * eased)}%`);
      if (elapsed < 1) frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [display, enabled, revealed]);

  return <span>{visibleLabel}</span>;
}

export function GoalProgressRing({ progress, animateProgress = false, progressRevealed = true }: Readonly<{
  progress: SurfaceGoalDTO["progress"];
  animateProgress?: boolean;
  progressRevealed?: boolean;
}>) {
  const pending = animateProgress && !progressRevealed;
  return (
    <span
      className={`fy-goal-ratio${pending ? " is-progress-pending" : ""}`}
      role="img"
      aria-label={progress.accessibleLabel}
    >
      <svg viewBox="0 0 100 100" aria-hidden="true">
        <circle className="fy-goal-ratio-track" cx="50" cy="50" r="41" pathLength="10000"/>
        <circle
          className="fy-goal-ratio-arc"
          cx="50"
          cy="50"
          r="41"
          pathLength="10000"
          strokeDasharray={progress.ringDasharray}
        />
      </svg>
      <AnimatedProgressLabel display={progress.display} enabled={animateProgress} revealed={progressRevealed}/>
    </span>
  );
}

export function GoalProgressBar({ progress, animateProgress = false, progressRevealed = true }: Readonly<{
  progress: SurfaceGoalDTO["progress"];
  animateProgress?: boolean;
  progressRevealed?: boolean;
}>) {
  const completionClass = progress.fill === "100%" ? "is-complete" : "is-partial";
  const pending = animateProgress && !progressRevealed;
  return (
    <div className={`fy-progress-track${pending ? " is-progress-pending" : ""}`} role="img" aria-label={progress.accessibleLabel}>
      <span className={completionClass} style={{ width: progress.fill }}/>
    </div>
  );
}

export function GoalCard({ goal, compact = false, showBalance = false, animateProgress = false, progressRevealed = true }: Readonly<{
  goal: SurfaceGoalDTO;
  compact?: boolean;
  showBalance?: boolean;
  animateProgress?: boolean;
  progressRevealed?: boolean;
}>) {
  const href = `/goals/${encodeURIComponent(goal.id)}`;

  if (compact) {
    return (
      <Link
        className="fy-goal-card fy-goal-card-link compact"
        href={href}
        prefetch={false}
        aria-label={`Edit ${goal.label}`}
        data-testid={`goal-${goal.id}`}
      >
        <header>
          <h3>{goal.label}</h3>
          <p>{goal.completion.display}</p>
        </header>
        <GoalProgressRing progress={goal.progress} animateProgress={animateProgress} progressRevealed={progressRevealed}/>
        {showBalance ? (
          <p className="fy-goal-card-balance">
            <strong>{goal.currentBalance.display}</strong>
            <span>of {goal.targetBalance.display}</span>
          </p>
        ) : null}
        <GoalProgressBar progress={goal.progress} animateProgress={animateProgress} progressRevealed={progressRevealed}/>
      </Link>
    );
  }

  return (
    <Link
      className="fy-goal-card fy-goal-card-link detailed"
      href={href}
      prefetch={false}
      aria-label={`Edit ${goal.label}`}
      data-testid={`goal-${goal.id}`}
    >
      <header>
        <div><h3>{goal.label}</h3></div>
        <GoalProgressRing progress={goal.progress}/>
      </header>
      <div className="fy-goal-money"><strong>{goal.currentBalance.display}</strong><span>of {goal.targetBalance.display}</span></div>
      <GoalProgressBar progress={goal.progress}/>
      <footer><span>Status</span><strong>{goal.completion.statusLabel}</strong></footer>
      <span className="fy-goal-completion">{goal.completion.display}</span>
    </Link>
  );
}
