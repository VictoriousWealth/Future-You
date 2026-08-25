"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { BenefitsSurfaceDTO } from "../../../application/product-surfaces/contracts";
import type { ApiErrorResponseDTO } from "../../../application/dto/contracts";
import { ContextPill } from "../../product-shell/context-pill";
import { ProductIcon } from "../../product-shell/product-icon";
import { ProductShell } from "../../product-shell/product-shell";
import { SurfaceError, SurfaceLoading } from "../../product-shell/surface-state";

function apiMessage(value: unknown): string {
  return (value as Partial<ApiErrorResponseDTO> | null)?.error?.message ?? "Your benefits information is temporarily unavailable.";
}

export function BenefitsSurface() {
  const [data, setData] = useState<BenefitsSurfaceDTO | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const retry = useCallback(() => setAttempt((value) => value + 1), []);

  useEffect(() => {
    let active = true;
    setError(null);
    fetch("/api/v1/benefits", { cache: "no-store" })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(apiMessage(body));
        if (active) setData(body as BenefitsSurfaceDTO);
      })
      .catch((caught: Error) => { if (active) setError(caught.message); });
    return () => { active = false; };
  }, [attempt]);

  return (
    <ProductShell active="benefits" className="fy-benefits-shell" testId="benefits-surface">
      {!data && !error ? <SurfaceLoading label="benefits"/> : null}
      {error ? <SurfaceError message={error} retry={retry}/> : null}
      {data ? (
        <>
          <ContextPill label={`${data.context.label} active`}/>
          <header className="fy-surface-heading">
            <p>What your plan confirms</p><h1>Your benefits</h1>
            <span>Facts and opportunities stay separate until a source confirms them.</span>
          </header>
          <section className="fy-workplace-card" data-testid="workplace-state">
            <span className="fy-benefit-icon"><ProductIcon name="benefits"/></span>
            <div><p>Workplace</p><h2>{data.workplace.name ?? "Not added"}</h2><strong>{data.workplace.statusLabel}</strong></div>
            {data.workplace.status === "unverified" ? <small>{data.workplace.explanation}</small> : null}
          </section>
          {data.activeFacts.length > 0 ? (
            <section className="fy-active-benefits" aria-labelledby="active-benefits-title">
              <div className="fy-section-heading"><div><p>Confirmed facts</p><h2 id="active-benefits-title">Active in your plan</h2></div></div>
              {data.activeFacts.map((fact) => (
                <article className="fy-active-benefit" key={fact.id} data-testid="active-pension-fact">
                  <span className="fy-active-label">{fact.statusLabel}</span>
                  <h3>{fact.title}</h3>
                  <div className="fy-contribution-pair"><div><span>You</span><strong>{fact.employeeContribution}</strong></div><div><span>Employer</span><strong>{fact.employerContribution}</strong></div></div>
                  <p>{fact.treatment}</p><p>{fact.spendability}</p>
                  <details className="fy-benefit-details">
                    <summary>Why this appears</summary>
                    <p>This is a confirmed informational fact in your current financial plan. It is not a new opportunity or spendable balance.</p>
                  </details>
                </article>
              ))}
            </section>
          ) : null}
          {data.emptyState ? (
            <section className="fy-benefits-empty" data-testid="benefits-empty-state">
              <span aria-hidden="true">✦</span><h2>{data.emptyState.title}</h2><p>{data.emptyState.description}</p>
            </section>
          ) : (
            <section className="fy-no-opportunities" data-testid="no-opportunities-state">
              <span>Opportunities</span><h2>No verified opportunities are being assumed.</h2>
              <p>Your active pension fact is shown above. We have not treated any unverified benefit as money you have.</p>
            </section>
          )}
          <Link className="fy-context-settings" href="/settings/financial-context">Review financial context →</Link>
        </>
      ) : null}
    </ProductShell>
  );
}
