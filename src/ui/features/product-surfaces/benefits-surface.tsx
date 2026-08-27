"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { BenefitsSurfaceDTO } from "../../../application/product-surfaces/contracts";
import type { ApiErrorResponseDTO } from "../../../application/dto/contracts";
import { ProductShell } from "../../product-shell/product-shell";
import { SurfaceError, SurfaceLoading } from "../../product-shell/surface-state";

function apiMessage(value: unknown): string {
  return (value as Partial<ApiErrorResponseDTO> | null)?.error?.message
    ?? "Your benefits and opportunities are temporarily unavailable.";
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
      {!data && !error ? <SurfaceLoading label="Benefits"/> : null}
      {error ? <SurfaceError message={error} retry={retry}/> : null}
      {data ? (
        <>
          <header className="fy-benefits-intro">
            <h1>Benefits <span>&amp; opportunities</span></h1>
            <p>Useful things connected to your work, tax position and memberships.</p>
          </header>

          <section className="fy-opportunity-category is-work" aria-labelledby="work-opportunities-title">
            <header className="fy-opportunity-category-heading">
              <div><p>From your company</p><h2 id="work-opportunities-title">Work benefits</h2></div>
            </header>
            <div className="fy-benefit-group">
              <article className="fy-workplace-summary" data-testid="workplace-state">
                <div><span>Workplace</span><strong>{data.workplace.name ?? "Not added"}</strong></div>
                <div className="fy-status-stack">
                  <span>{data.workplace.statusLabel}</span>
                  {data.workplace.status === "verified" ? <span>{data.workplace.membershipStatusLabel}</span> : null}
                </div>
                {data.workplace.status !== "not_supplied" ? <p>{data.workplace.explanation}</p> : null}
              </article>

              {data.activeFacts.map((fact) => (
                <article className="fy-benefit-row is-active" key={fact.id} data-testid="active-pension-fact">
                  <header><div><span>In your plan</span><h3>{fact.title}</h3></div><strong>{fact.statusLabel}</strong></header>
                  <div className="fy-contribution-pair">
                    <div><span>You contribute</span><strong>{fact.employeeContribution}</strong></div>
                    <div><span>{fact.employerName} contributes</span><strong>{fact.employerContribution}</strong></div>
                  </div>
                  <p>{fact.treatment}</p>
                  <p className="fy-benefit-boundary">{fact.spendability}</p>
                  <details className="fy-opportunity-source">
                    <summary>Why this appears</summary>
                    <p>Confirmed in financial context {fact.provenance.contextVersion}. This is not a new opportunity or spendable balance.</p>
                  </details>
                </article>
              ))}

              {data.opportunities.map((opportunity) => (
                <article
                  className="fy-benefit-row"
                  id={opportunity.benefitKey === "SEASON_TICKET_LOAN" ? "opportunity-season-ticket-loan" : "opportunity-additional-pension-match"}
                  key={opportunity.id}
                  data-testid={`benefit-opportunity-${opportunity.benefitKey.toLowerCase()}`}
                >
                  <header><div><span>Worth checking</span><h3>{opportunity.title}</h3></div><strong>{opportunity.statusLabel}</strong></header>
                  <p>{opportunity.description}</p>
                  {opportunity.currentContribution ? <p className="fy-benefit-current">{opportunity.currentContribution}</p> : null}
                  <p className="fy-benefit-confidence">{opportunity.eligibilityLabel} {opportunity.uptakeLabel} {opportunity.planInclusionLabel}</p>
                  <p className="fy-benefit-boundary">{opportunity.numericalEffectLabel}</p>
                  {opportunity.benefitKey === "SEASON_TICKET_LOAN" ? (
                    <p className="fy-benefit-next-step">More information is needed before any future simulation.</p>
                  ) : null}
                  <details className="fy-opportunity-source">
                    <summary>Information source</summary>
                    <p>{opportunity.provenance.sourceReference}</p>
                    <p>Reference date: {opportunity.provenance.referenceDate}</p>
                  </details>
                </article>
              ))}

              {data.opportunities.length === 0 && data.emptyState ? (
                <article className="fy-category-empty" data-testid="benefits-empty-state">
                  <strong>{data.emptyState.title}</strong><p>{data.emptyState.description}</p>
                </article>
              ) : null}
            </div>
          </section>

          <section className="fy-opportunity-category is-tax" aria-labelledby="tax-opportunities-title">
            <header className="fy-opportunity-category-heading">
              <div><p>Based on confirmed details</p><h2 id="tax-opportunities-title">Tax &amp; allowances</h2></div>
            </header>
            <p className="fy-category-explainer">Current treatments, potential matches and checks are kept separate. Nothing here changes your plan automatically.</p>
            <div className="fy-benefit-group">
              {data.taxAndAllowances.length > 0 ? data.taxAndAllowances.map((opportunity) => (
                <article className="fy-benefit-row is-public" key={opportunity.id} data-testid={`tax-opportunity-${opportunity.id.toLowerCase()}`}>
                  <header><div><span>{opportunity.status === "active_treatment" ? "Current treatment" : "Official guidance"}</span><h3>{opportunity.title}</h3></div><strong>{opportunity.statusLabel}</strong></header>
                  <p>{opportunity.description}</p>
                  <p className="fy-benefit-current">{opportunity.matchedBecause}</p>
                  <p className="fy-benefit-confidence">{opportunity.eligibilityLabel}</p>
                  <p className="fy-benefit-boundary">{opportunity.planTreatmentLabel} {opportunity.numericalEffectLabel}</p>
                  <a className="fy-official-source-link" href={opportunity.provenance.sourceUrl} target="_blank" rel="noreferrer">
                    Read on {opportunity.provenance.publisher} <span aria-hidden="true">↗</span>
                  </a>
                </article>
              )) : (
                <article className="fy-category-empty"><strong>No matched tax checks yet</strong><p>Future You needs relevant confirmed plan details before surfacing a check here.</p></article>
              )}
            </div>
          </section>

          <section className="fy-opportunity-category is-loyalty" aria-labelledby="loyalty-opportunities-title">
            <header className="fy-opportunity-category-heading">
              <div><p>Cards &amp; memberships</p><h2 id="loyalty-opportunities-title">Loyalty schemes</h2></div>
            </header>
            <div className="fy-benefit-group">
              <article className="fy-loyalty-state">
                <span>{data.loyaltySchemes.statusLabel}</span>
                <strong>{data.loyaltySchemes.title}</strong>
                <p>{data.loyaltySchemes.description}</p>
              </article>
            </div>
          </section>

          <Link className="fy-context-settings" href="/settings/financial-context">Review the information used</Link>
        </>
      ) : null}
    </ProductShell>
  );
}
