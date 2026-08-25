import type { CSSProperties } from "react";
import type { SurfaceGoalDTO } from "../../../application/product-surfaces/contracts";

type GoalProgressStyle = CSSProperties & {
  readonly "--fy-goal-progress": string;
};

export function GoalProgressRing({ progress }: Readonly<{
  progress: SurfaceGoalDTO["progress"];
}>) {
  const style: GoalProgressStyle = { "--fy-goal-progress": progress.fill };

  return (
    <span
      className="fy-goal-ratio"
      role="img"
      aria-label={progress.accessibleLabel}
      style={style}
    >
      <span>{progress.display}</span>
    </span>
  );
}

export function GoalCard({ goal, compact = false }: Readonly<{
  goal: SurfaceGoalDTO;
  compact?: boolean;
}>) {
  return (
    <article className={`fy-goal-card ${compact ? "compact" : ""}`} data-testid={`goal-${goal.id}`}>
      <header>
        <div>
          <p>{goal.completion.statusLabel}</p>
          <h3>{goal.label}</h3>
        </div>
        <GoalProgressRing progress={goal.progress}/>
      </header>
      <div className="fy-goal-money">
        <strong>{goal.currentBalance.display}</strong>
        <span>of {goal.targetBalance.display}</span>
      </div>
      <div className="fy-progress-track" role="img" aria-label={goal.progress.accessibleLabel}>
        <span style={{ width: goal.progress.fill }}/>
      </div>
      <footer><span>Expected</span><strong>{goal.completion.display}</strong></footer>
    </article>
  );
}
