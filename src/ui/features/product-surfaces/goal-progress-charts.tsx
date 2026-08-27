"use client";

import { useState, type Dispatch, type SetStateAction } from "react";
import type {
  GoalChartColorDTO,
  GoalLineChartSeriesDTO,
  GoalsProgressDTO
} from "../../../application/product-surfaces/contracts";

function seriesClass(color: GoalChartColorDTO): string {
  return `is-${color}`;
}

interface ChartLegendItem {
  readonly goalId: string;
  readonly label: string;
  readonly color: GoalChartColorDTO;
}

function toggleHiddenGoal(
  update: Dispatch<SetStateAction<readonly string[]>>,
  goalId: string
) {
  update((current) => current.includes(goalId)
    ? current.filter((id) => id !== goalId)
    : [...current, goalId]);
}

function ChartLegend({ items, hiddenGoalIds, onToggle }: Readonly<{
  items: readonly ChartLegendItem[];
  hiddenGoalIds: readonly string[];
  onToggle: (goalId: string) => void;
}>) {
  return (
    <ul className="fy-chart-legend" aria-label="Chart key">
      {items.map((item) => {
        const visible = !hiddenGoalIds.includes(item.goalId);
        return (
        <li className={`${seriesClass(item.color)}${visible ? "" : " is-hidden"}`} key={item.goalId}>
          <button
            type="button"
            aria-label={`${visible ? "Hide" : "Show"} ${item.label}`}
            aria-pressed={visible}
            onClick={() => onToggle(item.goalId)}
          >
            <i aria-hidden="true"/><span>{item.label}</span>
          </button>
        </li>
        );
      })}
    </ul>
  );
}

function LineChart({
  label,
  series,
  firstPeriodLabel,
  lastPeriodLabel,
  topLabel,
  bottomLabel,
  hiddenGoalIds
}: Readonly<{
  label: string;
  series: readonly GoalLineChartSeriesDTO[];
  firstPeriodLabel: string;
  lastPeriodLabel: string;
  topLabel: string;
  bottomLabel: string;
  hiddenGoalIds: readonly string[];
}>) {
  const visibleSeries = series.filter((item) => !hiddenGoalIds.includes(item.goalId));
  return (
    <div className="fy-line-chart">
      <div className="fy-line-chart-y" aria-hidden="true"><span>{topLabel}</span><span>{bottomLabel}</span></div>
      <svg viewBox="0 0 1000 360" role="img" aria-label={label} preserveAspectRatio="xMidYMid meet">
        <g className="fy-chart-grid" aria-hidden="true">
          <line x1="70" y1="30" x2="930" y2="30"/>
          <line x1="70" y1="180" x2="930" y2="180"/>
          <line x1="70" y1="330" x2="930" y2="330"/>
        </g>
        {visibleSeries.map((item) => (
          <g className={`fy-chart-series ${seriesClass(item.color)}`} key={item.goalId}>
            <polyline points={item.polylinePoints}/>
            {item.points.map((point, pointIndex) => (
              <circle
                className="fy-chart-point-marker"
                cx={point.x}
                cy={point.y}
                r="9"
                key={`${item.goalId}-${point.period}-${pointIndex}`}
              />
            ))}
          </g>
        ))}
        <g className="fy-chart-tooltip-layer">
          {visibleSeries.flatMap((item) => item.points.map((point, pointIndex) => {
              const tooltipX = Math.max(220, Math.min(780, point.x));
              const tooltipY = point.y < 105 ? point.y + 125 : point.y - 22;
              const accessibleLabel = `${item.label}, ${point.periodLabel}: ${point.valueLabel}`;
              return (
                <g
                  className={`fy-chart-point ${seriesClass(item.color)}`}
                  tabIndex={0}
                  role="img"
                  aria-label={accessibleLabel}
                  key={`${item.goalId}-${point.period}-${pointIndex}`}
                >
                  <circle className="fy-chart-point-hit" cx={point.x} cy={point.y} r="28"/>
                  <circle className="fy-chart-point-active" cx={point.x} cy={point.y} r="14"/>
                  <g className="fy-chart-point-tooltip" transform={`translate(${tooltipX} ${tooltipY})`} aria-hidden="true">
                    <rect x="-200" y="-112" width="400" height="108" rx="18"/>
                    <text textAnchor="middle">
                      <tspan className="fy-chart-tooltip-title" x="0" y="-72">{item.label}</tspan>
                      <tspan x="0" y="-29">{point.periodLabel} · {point.valueLabel}</tspan>
                    </text>
                  </g>
                </g>
              );
            }))}
        </g>
      </svg>
      <div className="fy-line-chart-x" aria-hidden="true"><span>{firstPeriodLabel}</span><span>{lastPeriodLabel}</span></div>
    </div>
  );
}

export function GoalProgressCharts({ progress }: Readonly<{ progress: GoalsProgressDTO }>) {
  const history = progress.contributionHistory;
  const splitLegend = progress.monthlyContributionSplit.periods[0]?.segments ?? [];
  const [hiddenForecastGoals, setHiddenForecastGoals] = useState<readonly string[]>([]);
  const [hiddenSplitGoals, setHiddenSplitGoals] = useState<readonly string[]>([]);
  const [hiddenHistoryGoals, setHiddenHistoryGoals] = useState<readonly string[]>([]);
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
          hiddenGoalIds={hiddenForecastGoals}
        />
        <ChartLegend
          items={progress.forecast.series}
          hiddenGoalIds={hiddenForecastGoals}
          onToggle={(goalId) => toggleHiddenGoal(setHiddenForecastGoals, goalId)}
        />
      </article>

      <article className="fy-progress-chart-card">
        <header><h3>{progress.monthlyContributionSplit.title}</h3><p>{progress.monthlyContributionSplit.description}</p></header>
        <div className="fy-contribution-split" role="img" aria-label="Planned monthly contribution split by goal">
          {progress.monthlyContributionSplit.periods.map((period) => (
            <div className="fy-contribution-split-row" key={period.period}>
              <span>{period.periodLabel}</span>
              <div className="fy-contribution-split-bar">
                {period.segments.map((segment) => {
                  const visible = !hiddenSplitGoals.includes(segment.goalId);
                  return (
                  <span
                    className={`fy-contribution-split-segment ${seriesClass(segment.color)}${visible ? "" : " is-hidden"}`}
                    style={{ width: segment.width }}
                    key={segment.goalId}
                    tabIndex={visible ? 0 : -1}
                    aria-hidden={visible ? undefined : true}
                    aria-label={`${period.periodLabel}, ${segment.label}: ${segment.amount.display}`}
                  >
                    <span className="fy-split-tooltip" role="tooltip">
                      <strong>{segment.label}</strong>
                      <small>{period.periodLabel} · {segment.amount.display}</small>
                    </span>
                  </span>
                  );
                })}
              </div>
              <strong>{period.total.display}</strong>
            </div>
          ))}
        </div>
        <ChartLegend
          items={splitLegend}
          hiddenGoalIds={hiddenSplitGoals}
          onToggle={(goalId) => toggleHiddenGoal(setHiddenSplitGoals, goalId)}
        />
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
              hiddenGoalIds={hiddenHistoryGoals}
            />
            <ChartLegend
              items={history.series}
              hiddenGoalIds={hiddenHistoryGoals}
              onToggle={(goalId) => toggleHiddenGoal(setHiddenHistoryGoals, goalId)}
            />
            <small className="fy-chart-source">{history.sourceLabel}</small>
          </>
        ) : <p className="fy-chart-empty">{history.description}</p>}
      </article>
    </div>
  );
}
