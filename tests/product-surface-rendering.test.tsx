import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { SurfaceGoalDTO } from "../src/application/product-surfaces/contracts";
import { GoalCard } from "../src/ui/features/product-surfaces/goal-card";
import { ProductHeader } from "../src/ui/product-shell/product-shell";

const sentinelGoal: SurfaceGoalDTO = {
  id: "goal-sentinel",
  label: "SERVER GOAL",
  currentBalance: { currency: "GBP", minorUnits: "999999", display: "£SERVER-CURRENT" },
  targetBalance: { currency: "GBP", minorUnits: "1", display: "£SERVER-TARGET" },
  progress: {
    numerator: "999999",
    denominator: "1",
    basisPoints: 4321,
    display: "43% SERVER",
    fill: "12.345%",
    ringDasharray: "1234.5 8765.5",
    accessibleLabel: "SERVER ACCESSIBLE RATIO"
  },
  completion: {
    status: "on_track",
    month: "2099-12",
    display: "December 2099 SERVER",
    statusLabel: "SERVER STATUS"
  }
};

describe("Slice 6 renderer authority", () => {
  it("renders server sentinel money, ratio, linear fill, circular fill and date verbatim", () => {
    const markup = renderToStaticMarkup(createElement(GoalCard, { goal: sentinelGoal }));
    expect(markup).toContain("£SERVER-CURRENT");
    expect(markup).toContain("£SERVER-TARGET");
    expect(markup).toContain("43% SERVER");
    expect(markup).toContain("width:12.345%");
    expect(markup).toContain('class="is-partial"');
    expect(markup).toContain('stroke-dasharray="1234.5 8765.5"');
    expect(markup).toContain("December 2099 SERVER");
    expect(markup).toContain("SERVER ACCESSIBLE RATIO");
    expect(markup).not.toContain("9999%");
  });

  it("rounds the progress fill end only when the server supplies a complete width", () => {
    const completedGoal = {
      ...sentinelGoal,
      progress: { ...sentinelGoal.progress, fill: "100%" }
    };
    const markup = renderToStaticMarkup(createElement(GoalCard, { goal: completedGoal }));
    expect(markup).toContain('class="is-complete"');
    expect(markup).not.toContain('class="is-partial"');
    expect(markup).toContain("width:100%");
  });

  it("renders the generated profile portrait without replacing the settings link semantics", () => {
    const markup = renderToStaticMarkup(createElement(ProductHeader, {}));
    expect(markup).toContain("%2Fimages%2Fsarah-profile.png");
    expect(markup).toContain('aria-label="Open financial context settings"');
    expect(markup).toContain('aria-label="Future You home"');
    expect(markup).toContain("FUTURE");
    expect(markup).toContain("YOU");
    expect(markup).toContain("fy-angular-symbol");
    expect(markup).toContain("/images/future-you-logo.svg");
    expect(markup).not.toContain("<i>AI</i>");
    expect(markup).toContain('alt=""');
    expect(markup).not.toContain('<svg viewBox="0 0 24 24"><circle cx="12" cy="8"');
  });

  it("shows the AI wordmark suffix only for the Ask header", () => {
    const markup = renderToStaticMarkup(createElement(ProductHeader, { showAI: true }));
    expect(markup).toContain("fy-angular-symbol");
    expect(markup).toContain("/images/future-you-logo.svg");
    expect(markup).toContain("<i>AI</i>");
  });
});
