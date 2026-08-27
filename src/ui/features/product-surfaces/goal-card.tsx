import Link from "next/link";
import type { SurfaceGoalDTO } from "../../../application/product-surfaces/contracts";

export function GoalProgressRing({ progress }: Readonly<{
  progress: SurfaceGoalDTO["progress"];
}>) {
  return (
    <span
      className="fy-goal-ratio"
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
      <span>{progress.display}</span>
    </span>
  );
}

export function GoalProgressBar({ progress }: Readonly<{
  progress: SurfaceGoalDTO["progress"];
}>) {
  const completionClass = progress.fill === "100%" ? "is-complete" : "is-partial";
  return (
    <div className="fy-progress-track" role="img" aria-label={progress.accessibleLabel}>
      <span className={completionClass} style={{ width: progress.fill }}/>
    </div>
  );
}

export function GoalCard({ goal, compact = false }: Readonly<{
  goal: SurfaceGoalDTO;
  compact?: boolean;
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
        <GoalProgressRing progress={goal.progress}/>
        <GoalProgressBar progress={goal.progress}/>
      </Link>
    );
  }

  return (
    <Link
      className="fy-goal-card fy-goal-card-link current-row"
      href={href}
      prefetch={false}
      aria-label={`Edit ${goal.label}`}
      data-testid={`goal-${goal.id}`}
    >
      <h3>{goal.label}</h3>
      <strong>Target: {goal.targetBalance.display}</strong>
    </Link>
  );
}
