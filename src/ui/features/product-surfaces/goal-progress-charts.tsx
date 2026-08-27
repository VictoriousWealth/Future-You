import type {
  GoalChartColorDTO,
  GoalLineChartSeriesDTO,
  GoalsProgressDTO
} from "../../../application/product-surfaces/contracts";

function seriesClass(color: GoalChartColorDTO): string {
  return `is-${color}`;
}

function ChartLegend({ series }: Readonly<{ series: readonly GoalLineChartSeriesDTO[] }>) {
  return (
    <ul className="fy-chart-legend" aria-label="Chart key">
      {series.map((item) => (
        <li className={seriesClass(item.color)} key={item.goalId}>
          <i aria-hidden="true"/><span>{item.label}</span>
        </li>
      ))}
    </ul>
  );
}

function LineChart({
  label,
  series,
  firstPeriodLabel,
  lastPeriodLabel,
  topLabel,
  bottomLabel
}: Readonly<{
  label: string;
  series: readonly GoalLineChartSeriesDTO[];
  firstPeriodLabel: string;
  lastPeriodLabel: string;
  topLabel: string;
  bottomLabel: string;
}>) {
  return (
    <div className="fy-line-chart">
      <div className="fy-line-chart-y" aria-hidden="true"><span>{topLabel}</span><span>{bottomLabel}</span></div>
      <svg viewBox="0 0 1000 360" role="img" aria-label={label} preserveAspectRatio="xMidYMid meet">
        <g className="fy-chart-grid" aria-hidden="true">
          <line x1="70" y1="30" x2="930" y2="30"/>
          <line x1="70" y1="180" x2="930" y2="180"/>
          <line x1="70" y1="330" x2="930" y2="330"/>
        </g>
        {series.map((item) => (
          <g className={`fy-chart-series ${seriesClass(item.color)}`} key={item.goalId}>
            <polyline points={item.polylinePoints}/>
            {item.points.map((point) => (
              <circle cx={point.x} cy={point.y} r="9" key={`${item.goalId}-${point.period}`}>
                <title>{`${item.label}, ${point.periodLabel}: ${point.valueLabel}`}</title>
              </circle>
            ))}
          </g>
        ))}
      </svg>
      <div className="fy-line-chart-x" aria-hidden="true"><span>{firstPeriodLabel}</span><span>{lastPeriodLabel}</span></div>
    </div>
  );
}

export function GoalProgressCharts({ progress }: Readonly<{ progress: GoalsProgressDTO }>) {
  const history = progress.contributionHistory;
  const splitLegend = progress.monthlyContributionSplit.periods[0]?.segments ?? [];
  return (
    <div className="fy-goal-progress-charts">
      <article className="fy-progress-chart-card">
        <header><h3>{progress.forecast.title}</h3><p>{progress.forecast.description}</p></header>
        <LineChart
          label="Forecast percentage for each goal"
          series={progress.forecast.series}
          firstPeriodLabel={progress.forecast.firstPeriodLabel}
          lastPeriodLabel={progress.forecast.lastPeriodLabel}
          topLabel="100%"
          bottomLabel="0%"
        />
        <ChartLegend series={progress.forecast.series}/>
      </article>

      <article className="fy-progress-chart-card">
        <header><h3>{progress.monthlyContributionSplit.title}</h3><p>{progress.monthlyContributionSplit.description}</p></header>
        <div className="fy-contribution-split" role="img" aria-label="Planned monthly contribution split by goal">
          {progress.monthlyContributionSplit.periods.map((period) => (
            <div className="fy-contribution-split-row" key={period.period}>
              <span>{period.periodLabel}</span>
              <div className="fy-contribution-split-bar">
                {period.segments.map((segment) => (
                  <i
                    className={seriesClass(segment.color)}
                    style={{ width: segment.width }}
                    key={segment.goalId}
                    title={`${segment.label}: ${segment.amount.display}`}
                  />
                ))}
              </div>
              <strong>{period.total.display}</strong>
            </div>
          ))}
        </div>
        <ul className="fy-chart-legend" aria-label="Contribution key">
          {splitLegend.map((item) => (
            <li className={seriesClass(item.color)} key={item.goalId}><i aria-hidden="true"/><span>{item.label}</span></li>
          ))}
        </ul>
      </article>

      <article className="fy-progress-chart-card">
        <header><h3>{history.title}</h3><p>{history.description}</p></header>
        {history.status === "available" ? (
          <>
            <LineChart
              label="Recorded past monthly contributions by goal"
              series={history.series}
              firstPeriodLabel={history.firstPeriodLabel}
              lastPeriodLabel={history.lastPeriodLabel}
              topLabel={history.axisMaximum.display}
              bottomLabel="£0"
            />
            <ChartLegend series={history.series}/>
            <small className="fy-chart-source">{history.sourceLabel}</small>
          </>
        ) : <p className="fy-chart-empty">{history.description}</p>}
      </article>
    </div>
  );
}
