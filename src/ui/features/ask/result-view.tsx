import type { ScenarioOptionDTO } from "../../../application/dto/contracts";

export interface ResultViewProps {
  readonly option: ScenarioOptionDTO;
}

export function ResultView({ option }: ResultViewProps) {
  const view = option.presentation;
  return (
    <article className="result-stack" data-testid="scenario-result">
      <section className="result-hero" aria-labelledby="result-heading">
        <p className="eyebrow">{view.scenarioLabel}</p>
        <h2 id="result-heading">{view.classificationLabel}</h2>
        <p className="summary">{view.summary}</p>
        <p className="confidence" data-testid="confidence">{view.confidence}</p>
      </section>

      <section className="impact-card" aria-labelledby="immediate-heading">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Immediate impact</p>
            <h3 id="immediate-heading">Today’s choice, clearly separated</h3>
          </div>
          <span className="status-chip">{option.isCurrent ? "Current" : "What-if"}</span>
        </div>
        <dl className="impact-grid">
          <div>
            <dt>Current-account cash</dt>
            <dd>
              <span>{view.immediateImpact.cashBefore}</span>
              <span aria-hidden="true">→</span>
              <strong data-testid="cash-after">{view.immediateImpact.cashAfter}</strong>
            </dd>
          </div>
          <div>
            <dt>Safety buffer</dt>
            <dd>
              <span>{view.immediateImpact.safetyBufferBefore}</span>
              <span aria-hidden="true">→</span>
              <strong data-testid="buffer-after">{view.immediateImpact.safetyBufferAfter}</strong>
            </dd>
          </div>
          <div>
            <dt>Required payments</dt>
            <dd data-testid="required-payments">{view.immediateImpact.requiredPayments}</dd>
          </div>
          <div>
            <dt>Borrowing</dt>
            <dd data-testid="overdraft-usage">{view.immediateImpact.borrowing}</dd>
          </div>
        </dl>
        <p className="recovery" data-testid="buffer-recovery">
          {view.immediateImpact.recovery}
        </p>
      </section>

      <section className="impact-card" aria-labelledby="goals-heading">
        <p className="eyebrow">Future impact</p>
        <h3 id="goals-heading">What changes for your goals</h3>
        <div className="goal-list">
          {view.goalImpacts.map((goal) => (
            <div className="goal-row" key={goal.goalId}>
              <div>
                <strong>{goal.label}</strong>
                <span>{goal.delay}</span>
              </div>
              <p>
                <span>{goal.baselineCompletion}</span>
                <span aria-hidden="true">→</span>
                <strong>{goal.scenarioCompletion}</strong>
              </p>
            </div>
          ))}
        </div>
      </section>

      <details className="disclosure">
        <summary>Six-month path</summary>
        <div className="month-list" data-testid="monthly-path">
          {view.monthlyPath.map((month) => (
            <div className="month-row" key={month.period}>
              <strong>{month.period}</strong>
              <span>Cash {month.closingCash}</span>
              <span>Buffer {month.closingSafetyBuffer}</span>
              <span>Restored {month.bufferRestoration}</span>
              <span>Goals {month.goalContribution}</span>
            </div>
          ))}
        </div>
      </details>

      <details className="disclosure">
        <summary>How we calculated this</summary>
        <div className="assumption-groups" data-testid="assumption-manifest">
          {view.assumptionGroups.map((group) => (
            <section key={group.key}>
              <h3>{group.label}</h3>
              {group.items.length === 0 ? (
                <p>None</p>
              ) : (
                <ul>
                  {group.items.map((item, index) => (
                    <li key={`${group.key}-${index}`}>{item}</li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>
      </details>

      <details className="disclosure">
        <summary>Calculation versions</summary>
        <footer className="result-meta" aria-label="Result reproducibility">
          <span>Scenario</span>
          <code data-testid="scenario-id">{option.id}</code>
          <span>Run</span>
          <code data-testid="run-id">{option.runId}</code>
          <span>Context</span>
          <code>{option.contextVersion}</code>
          <span>Rules</span>
          <code>{option.rulesVersion}</code>
          <span>Calendar</span>
          <code>{option.calendarVersion}</code>
        </footer>
      </details>
    </article>
  );
}
