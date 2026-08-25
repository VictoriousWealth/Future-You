"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type {
  GoalsPreviewSurfaceDTO,
  GoalsSurfaceDTO
} from "../../../application/product-surfaces/contracts";
import type { ApiErrorResponseDTO } from "../../../application/dto/contracts";
import { ProductShell } from "../../product-shell/product-shell";
import { SurfaceError, SurfaceLoading } from "../../product-shell/surface-state";
import { GoalCard, GoalProgressBar, GoalProgressRing } from "./goal-card";

function apiMessage(value: unknown): string {
  return (value as Partial<ApiErrorResponseDTO> | null)?.error?.message ?? "Your goals are temporarily unavailable.";
}

export function GoalsSurface() {
  const search = useSearchParams();
  const runId = search.get("runId");
  const [data, setData] = useState<GoalsSurfaceDTO | GoalsPreviewSurfaceDTO | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const retry = useCallback(() => setAttempt((value) => value + 1), []);

  useEffect(() => {
    let active = true;
    setData(null);
    setError(null);
    const endpoint = runId ? `/api/v1/goals/preview?runId=${encodeURIComponent(runId)}` : "/api/v1/goals";
    fetch(endpoint, { cache: "no-store" })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(apiMessage(body));
        if (active) setData(body as GoalsSurfaceDTO | GoalsPreviewSurfaceDTO);
      })
      .catch((caught: Error) => { if (active) setError(caught.message); });
    return () => { active = false; };
  }, [runId, attempt]);

  return (
    <ProductShell active="goals" className="fy-goals-shell" testId="goals-surface">
      {!data && !error ? <SurfaceLoading label="goals"/> : null}
      {error ? <SurfaceError message={error} retry={retry}/> : null}
      {data ? (
        <>
          <header className="fy-surface-heading">
            <p>{data.mode === "current_path" ? "Your current path" : data.run.hypotheticalLabel}</p>
            <h1>{data.mode === "current_path" ? "Your goals" : data.run.label}</h1>
            <span>{data.mode === "current_path" ? data.summary : data.run.classificationLabel}</span>
          </header>
          {data.mode === "stored_hypothetical" && data.warning ? (
            <aside className="fy-historical-warning" data-testid="historical-preview-warning"><strong>Earlier plan</strong><p>{data.warning}</p></aside>
          ) : null}
          {data.mode === "stored_hypothetical" ? (
            <div className="fy-preview-banner" data-testid="hypothetical-preview">
              <span>Viewing only</span><strong>This path has not changed your real balances.</strong>
              <Link href="/goals">Return to current path</Link>
            </div>
          ) : null}
          <section className="fy-goals-list" aria-label="Financial goals">
            {data.goals.length === 0 ? (
              <div className="fy-inline-empty" data-testid="goals-empty-state">
                <strong>No goals are confirmed in this financial plan.</strong>
                <span>Create a new immutable financial-context version to add goals.</span>
                <Link href="/settings/financial-context">Review financial context →</Link>
              </div>
            ) : data.mode === "current_path"
              ? data.goals.map((goal) => <GoalCard goal={goal} key={goal.id}/>)
              : data.goals.map((goal) => (
                  <article className="fy-goal-card fy-preview-goal" key={goal.id} data-testid={`preview-goal-${goal.id}`}>
                    <header><div><p>Confirmed balance</p><h3>{goal.label}</h3></div><GoalProgressRing progress={goal.progress}/></header>
                    <div className="fy-goal-money"><strong>{goal.currentBalance.display}</strong><span>of {goal.targetBalance.display}</span></div>
                    <GoalProgressBar progress={goal.progress}/>
                    <div className="fy-date-shift"><div><span>Original path</span><strong>{goal.baselineCompletion.display}</strong></div><i aria-hidden="true">→</i><div><span>With this what-if</span><strong>{goal.scenarioCompletion.display}</strong></div></div>
                    <footer><span>Impact</span><strong>{goal.changeLabel}</strong></footer>
                  </article>
                ))}
          </section>
          <p className="fy-surface-footnote">Balances shown are confirmed context values, not hypothetical future balances.</p>
        </>
      ) : null}
    </ProductShell>
  );
}
