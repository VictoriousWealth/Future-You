"use client";

import type { FinancialContextPreviewDTO } from "../../../application/onboarding/contracts";

export function FinancialContextPreviewView({ preview }: { preview: FinancialContextPreviewDTO }) {
  return (
    <section className="onboarding-preview" aria-labelledby="preview-title" data-testid="onboarding-preview">
      <p className="eyebrow">Your current path</p>
      <h2 id="preview-title">Here’s where these numbers take you</h2>
      <div className="preview-grid">
        <article>
          <span>Actual cash</span>
          <strong>{preview.contextSummary.actualCash.display}</strong>
        </article>
        <article>
          <span>Reserved until payday</span>
          <strong>{preview.contextSummary.remainingReserve.display}</strong>
        </article>
        <article>
          <span>Current safety buffer</span>
          <strong>{preview.contextSummary.currentSafetyBuffer.display}</strong>
        </article>
        <article>
          <span>Preferred safety buffer</span>
          <strong>{preview.contextSummary.desiredSafetyBuffer.display}</strong>
        </article>
        <article>
          <span>Monthly take-home</span>
          <strong>{preview.contextSummary.monthlyNetIncome.display}</strong>
        </article>
        <article>
          <span>Monthly goal capacity</span>
          <strong>{preview.contextSummary.monthlyContributionCapacity.display}</strong>
        </article>
      </div>
      {preview.baseline.warnings.length > 0 && (
        <div className="preview-warning" role="status">
          <strong>Existing pressure spotted</strong>
          {preview.baseline.warnings.map((warning) => (
            <p key={warning.code}>{warning.message}</p>
          ))}
        </div>
      )}
      <div className="goal-preview-list">
        {preview.goals.map((goal) => (
          <article key={goal.goalId}>
            <div>
              <h3>{goal.label}</h3>
              <p>{goal.currentBalance.display} of {goal.targetBalance.display}</p>
            </div>
            <div>
              <span>{goal.normalContribution.display}/month</span>
              <strong>
                {goal.completion.status === "COMPLETED"
                  ? goal.completion.month
                  : `Beyond ${goal.completion.projectedThrough}`}
              </strong>
            </div>
          </article>
        ))}
      </div>
      <details>
        <summary>Assumptions and confidence</summary>
        <p>Confidence: {preview.confidence}</p>
        <ul>
          {preview.assumptions.map((assumption) => (
            <li key={assumption.id}>{assumption.description}</li>
          ))}
        </ul>
      </details>
      <p className="preview-versions">
        Rules {preview.versions.rulesVersion} · Calendar {preview.versions.calendarVersion}
      </p>
    </section>
  );
}
