import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { GOAL_PROGRESS_ANIMATION_MS } from "../src/ui/features/product-surfaces/goal-card";

const css = readFileSync(new URL("../src/app/globals.css", import.meta.url), "utf8");
const goalsSurface = readFileSync(new URL("../src/ui/features/product-surfaces/goals-surface.tsx", import.meta.url), "utf8");

describe("goal progress animation timing", () => {
  it("keeps the label, ring and segmented bar on a comfortably visible duration", () => {
    expect(GOAL_PROGRESS_ANIMATION_MS).toBe(2200);
    expect(css).toContain("--fy-goal-progress-duration: 2200ms;");
    expect(css).toContain("stroke-dasharray var(--fy-goal-progress-duration)");
    expect(css).toContain("width var(--fy-goal-progress-duration)");
    expect(goalsSurface).toContain("animateProgress");
    expect(goalsSurface).toContain("progressRevealed={goalProgressRevealed}");
  });
});
