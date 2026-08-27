import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { GoalsProgressDTO } from "../src/application/product-surfaces/contracts";
import { GoalProgressCharts } from "../src/ui/features/product-surfaces/goal-progress-charts";

const series = [{
  goalId: "goal-server",
  label: "SERVER GOAL",
  color: "blue" as const,
  polylinePoints: "70,321 930,123",
  points: [
    { period: "2099-01", periodLabel: "Jan 99", x: 70, y: 321, valueLabel: "£SERVER-FIRST" },
    { period: "2099-02", periodLabel: "Feb 99", x: 930, y: 123, valueLabel: "£SERVER-LAST" }
  ]
}];

const progress: GoalsProgressDTO = {
  forecast: {
    title: "Goal forecast",
    description: "SERVER FORECAST DESCRIPTION",
    firstPeriodLabel: "SERVER FIRST",
    lastPeriodLabel: "SERVER LAST",
    series
  },
  monthlyContributionSplit: {
    title: "Monthly contribution split",
    description: "SERVER SPLIT DESCRIPTION",
    periods: [{
      period: "2099-01",
      periodLabel: "Jan 99",
      total: { currency: "GBP", minorUnits: "999999", display: "£SERVER-TOTAL" },
      segments: [{
        goalId: "goal-server",
        label: "SERVER GOAL",
        color: "blue",
        amount: { currency: "GBP", minorUnits: "999999", display: "£SERVER-SEGMENT" },
        width: "12.345%"
      }]
    }]
  },
  contributionHistory: {
    status: "available",
    title: "Past contributions",
    description: "SERVER HISTORY DESCRIPTION",
    sourceLabel: "SERVER HISTORY SOURCE",
    firstPeriodLabel: "SERVER HISTORY FIRST",
    lastPeriodLabel: "SERVER HISTORY LAST",
    axisMaximum: { currency: "GBP", minorUnits: "1", display: "£SERVER-MAX" },
    series
  }
};

describe("Goals progress chart rendering authority", () => {
  it("renders server-prepared paths, widths, money and labels verbatim", () => {
    const markup = renderToStaticMarkup(createElement(GoalProgressCharts, { progress }));
    expect(markup).toContain('points="70,321 930,123"');
    expect(markup).toContain('width:12.345%');
    expect(markup).toContain("£SERVER-TOTAL");
    expect(markup).toContain("£SERVER-SEGMENT");
    expect(markup).toContain("£SERVER-MAX");
    expect(markup).toContain("£SERVER-FIRST");
    expect(markup).toContain("SERVER HISTORY SOURCE");
    expect(markup).toContain("fy-chart-point-tooltip");
    expect(markup).toContain('aria-label="SERVER GOAL, Jan 99: £SERVER-FIRST"');
    expect(markup).toContain('aria-label="Jan 99, SERVER GOAL: £SERVER-SEGMENT"');
    expect(markup).toContain('role="tooltip"');
    expect(markup).toContain('aria-pressed="true"');
    expect(markup).toContain("Hide SERVER GOAL");
  });

  it("does not reuse React keys when Now and the first forecast point share a period", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const repeatedPeriodProgress: GoalsProgressDTO = {
      ...progress,
      forecast: {
        ...progress.forecast,
        series: [{
          ...series[0]!,
          points: [
            series[0]!.points[0]!,
            { ...series[0]!.points[1]!, period: series[0]!.points[0]!.period }
          ]
        }]
      }
    };

    try {
      renderToStaticMarkup(createElement(GoalProgressCharts, { progress: repeatedPeriodProgress }));
      expect(error.mock.calls.flat().join(" ")).not.toContain("same key");
    } finally {
      error.mockRestore();
    }
  });
});
