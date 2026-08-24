import Link from "next/link";
import type { OneOffPurchaseResponseDTO } from "../../../application/dto/contracts";

export function ConversationResultView({ result }: Readonly<{ result: OneOffPurchaseResponseDTO }>) {
  const view = result.presentation;
  return (
    <article className="fy-result" data-testid="scenario-result">
      <header className="fy-result-hero">
        <div className="fy-pill-row">
          <span className="fy-scenario-pill">What-if · {view.scenarioLabel}</span>
          <span className="fy-classification-pill">{view.classificationLabel}</span>
        </div>
        <p className="fy-result-kicker">Here’s what changes</p>
        <h2>{view.summary}</h2>
        <p className="fy-result-confidence" data-testid="confidence">{view.confidence}</p>
      </header>

      <section className="fy-impact-card" aria-labelledby={`impact-${result.calculation.runId}`}>
        <p className="fy-section-kicker">Before and after</p>
        <h3 id={`impact-${result.calculation.runId}`}>Your short-term position</h3>
        <div className="fy-buffer-shift">
          <div><span>Safety buffer now</span><strong>{view.immediateImpact.safetyBufferBefore}</strong></div>
          <span className="fy-arrow" aria-hidden="true">→</span>
          <div><span>After purchase</span><strong data-testid="buffer-after">{view.immediateImpact.safetyBufferAfter}</strong></div>
        </div>
        <div className="fy-fact-grid">
          <div><span>Bills</span><strong data-testid="required-payments">{view.immediateImpact.requiredPayments}</strong></div>
          <div><span>Borrowing</span><strong data-testid="overdraft-usage">{view.immediateImpact.borrowing}</strong></div>
          <div><span>Cash after</span><strong data-testid="cash-after">{view.immediateImpact.cashAfter}</strong></div>
          <div><span>Recovery</span><strong data-testid="buffer-recovery">{view.immediateImpact.recovery}</strong></div>
        </div>
      </section>

      <section className="fy-future-card">
        <p className="fy-section-kicker">Your future</p>
        <h3>What changes for your goals</h3>
        <div className="fy-goal-impact-list">
          {view.goalImpacts.map((goal) => (
            <div key={goal.goalId}>
              <span>{goal.label}</span>
              <strong>{goal.baselineCompletion} <i aria-hidden="true">→</i> {goal.scenarioCompletion}</strong>
              <small>{goal.delay}</small>
            </div>
          ))}
        </div>
        <Link className="fy-goals-preview-link" href={`/goals?runId=${encodeURIComponent(result.calculation.runId)}`}>
          Preview this path in Goals →
        </Link>
      </section>

      <details className="fy-details">
        <summary>How Future You modelled this</summary>
        <div className="fy-assumptions" data-testid="assumption-manifest">
          {view.assumptionGroups.map((group) => (
            <section key={group.key}>
              <h4>{group.label}</h4>
              {group.items.length ? <ul>{group.items.map((item) => <li key={item}>{item}</li>)}</ul> : <p>None</p>}
            </section>
          ))}
        </div>
      </details>

      <details className="fy-details">
        <summary>Six-month view and calculation identity</summary>
        <div className="fy-month-path" data-testid="monthly-path">
          {view.monthlyPath.map((month) => (
            <div key={month.period}><strong>{month.period}</strong><span>Buffer {month.closingSafetyBuffer}</span><span>Goals {month.goalContribution}</span></div>
          ))}
        </div>
        <code className="fy-run-id" data-testid="run-id">{result.calculation.runId}</code>
      </details>
    </article>
  );
}
