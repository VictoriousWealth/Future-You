import { describe, expect, it } from "vitest";
import { SARAH_V1_ONBOARDING_DRAFT } from "../src/fixtures/sarah-v1-onboarding";
import { buildGoalDraft } from "../src/ui/features/product-surfaces/goal-edit-surface";

describe("dedicated goal creation", () => {
  it("adds one goal at the end of the allocation order without changing existing goals", () => {
    const goalId = "goal-driving-lessons";
    const result = buildGoalDraft(SARAH_V1_ONBOARDING_DRAFT, goalId, {
      label: "Driving lessons",
      currentBalance: "250.00",
      targetBalance: "1800.00",
      contribution: "100.00",
      paused: false
    }, "create");

    expect(result.goals).toHaveLength(SARAH_V1_ONBOARDING_DRAFT.goals.length + 1);
    expect(result.goals.slice(0, -1)).toEqual(SARAH_V1_ONBOARDING_DRAFT.goals);
    expect(result.goals.at(-1)).toMatchObject({
      id: goalId,
      label: "Driving lessons",
      currentBalance: { amount: "250.00", evidenceState: "confirmed" },
      targetBalance: { amount: "1800.00", evidenceState: "confirmed" },
      normalContribution: { amount: "100.00" },
      paused: false
    });
    expect(result.goalPolicy.allocationOrder).toEqual([
      ...SARAH_V1_ONBOARDING_DRAFT.goalPolicy.allocationOrder,
      goalId
    ]);
    expect(result.goalPolicy.overflowGoalId).toBe(SARAH_V1_ONBOARDING_DRAFT.goalPolicy.overflowGoalId);
  });
});
