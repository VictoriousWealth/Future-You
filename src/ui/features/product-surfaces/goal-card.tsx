import type { SurfaceGoalDTO } from "../../../application/product-surfaces/contracts";

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
        <span className="fy-goal-ratio" aria-label={goal.progress.accessibleLabel}>{goal.progress.display}</span>
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
