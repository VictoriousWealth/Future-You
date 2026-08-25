"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { HomeSurfaceDTO } from "../../../application/product-surfaces/contracts";
import type { ApiErrorResponseDTO } from "../../../application/dto/contracts";
import { ProductIcon } from "../../product-shell/product-icon";
import { ProductShell } from "../../product-shell/product-shell";
import { SurfaceError, SurfaceLoading } from "../../product-shell/surface-state";
import { GoalCard } from "./goal-card";

const DECISIONS = [
  { label: "Can I afford a £650 trip?", prompt: "Can I afford a £650 trip next month?", icon: "ask" as const, tone: "blue" },
  { label: "Can I afford something?", prompt: "Can I afford something next month?", icon: "buffer" as const, tone: "pink" },
  { label: "What would cheaper change?", prompt: "What would a cheaper option change?", icon: "goals" as const, tone: "purple" },
  { label: "Explain my current path", prompt: "Explain my current path", icon: "home" as const, tone: "cyan" }
] as const;

function apiMessage(value: unknown): string {
  return (value as Partial<ApiErrorResponseDTO> | null)?.error?.message ?? "Your Home overview is temporarily unavailable.";
}

export function HomeSurface() {
  const [data, setData] = useState<HomeSurfaceDTO | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const load = useCallback(() => setAttempt((value) => value + 1), []);

  useEffect(() => {
    let active = true;
    setError(null);
    fetch("/api/v1/home", { cache: "no-store" })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(apiMessage(body));
        if (active) setData(body as HomeSurfaceDTO);
      })
      .catch((caught: Error) => { if (active) setError(caught.message); });
    return () => { active = false; };
  }, [attempt]);

  return (
    <ProductShell active="home" className="fy-home-shell" testId="home-surface">
      {!data && !error ? <SurfaceLoading label="future"/> : null}
      {error ? <SurfaceError message={error} retry={load}/> : null}
      {data ? (
        <>
          <section className="fy-home-intro">
            <h1 className="fy-personal-greeting">Welcome back,<br/><strong>{data.displayName}!</strong></h1>
            <p className="fy-home-question">What are you thinking about?</p>
            <Link className="fy-home-hero" href={`/ask?prompt=${encodeURIComponent(DECISIONS[0].prompt)}`}>
              <span className="fy-home-spark" aria-hidden="true">✦</span>
              <strong>Ask Future You</strong>
              <small>{DECISIONS[0].label}</small>
              <i aria-hidden="true">→</i>
            </Link>
            <div className="fy-home-decisions" aria-label="Supported questions">
              {DECISIONS.slice(1).map((decision) => (
                <Link className={`fy-home-decision ${decision.tone}`} href={`/ask?prompt=${encodeURIComponent(decision.prompt)}`} key={decision.prompt}>
                  <ProductIcon name={decision.icon}/><strong>{decision.label}</strong><span aria-hidden="true">→</span>
                </Link>
              ))}
            </div>
          </section>

          <section className="fy-overview-section" aria-labelledby="right-now-title">
            <div className="fy-section-heading">
              <div><p>Your current path</p><h2 id="right-now-title">Your future right now</h2></div>
              <Link href="/goals">All goals</Link>
            </div>
            <article className="fy-buffer-card">
              <span className="fy-buffer-icon"><ProductIcon name="buffer"/></span>
              <div><p>Safety buffer</p><strong>{data.safetyBuffer.current.display}</strong><small>Preferred {data.safetyBuffer.preferred.display}</small></div>
              <i>{data.safetyBuffer.statusLabel}</i>
            </article>
            <div className="fy-home-goals">
              {data.goals.length > 0
                ? data.goals.map((goal) => <GoalCard goal={goal} compact key={goal.id}/>)
                : <section className="fy-inline-empty"><strong>No goals are confirmed yet.</strong><span>Add them through your financial-context settings before modelling their dates.</span></section>}
            </div>
          </section>

          {data.opportunityPreview.kind === "authoritative" ? (
            <section className="fy-opportunity-preview">
              <p>Future You spotted</p><h2>{data.opportunityPreview.title}</h2>
              <span>{data.opportunityPreview.description}</span><Link href="/benefits">See the source →</Link>
            </section>
          ) : (
            <Link className="fy-benefits-handoff" href="/benefits">
              <span>Benefits</span><strong>See the workplace facts in your plan</strong><i aria-hidden="true">→</i>
            </Link>
          )}
        </>
      ) : null}
    </ProductShell>
  );
}
