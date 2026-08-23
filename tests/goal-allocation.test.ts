import { describe, expect, it } from "vitest";
import { allocateGoalPool } from "../src/domain/simulator/goal-allocation";
import { gbp } from "../src/domain/shared/money";

describe("general goal allocation", () => {
  it("visits slots in explicit order and routes remainder to overflow", () => {
    const result = allocateGoalPool({
      goalPool: gbp(60_000),
      goals: [
        { goalId: "house", balanceMinor: 0n, targetMinor: 100_000n, paused: false },
        { goalId: "holiday", balanceMinor: 0n, targetMinor: 10_000n, paused: false },
        { goalId: "emergency", balanceMinor: 0n, targetMinor: 30_000n, paused: false }
      ],
      slots: [
        { goalId: "house", normalCap: gbp(20_000) },
        { goalId: "holiday", normalCap: gbp(10_000) },
        { goalId: "emergency", normalCap: gbp(30_000) }
      ],
      overflowGoalId: "house"
    });
    expect(result.allocations.map((item) => [item.goalId, item.amount.minor])).toEqual([
      ["house", 20_000n],
      ["holiday", 10_000n],
      ["emergency", 30_000n]
    ]);
    expect(result.retainedAsCash.minor).toBe(0n);
  });

  it("caps a partial final contribution and rolls unused money in the same event", () => {
    const result = allocateGoalPool({
      goalPool: gbp(20_000),
      goals: [
        { goalId: "finishing", balanceMinor: 9_000n, targetMinor: 10_000n, paused: false },
        { goalId: "overflow", balanceMinor: 0n, targetMinor: 100_000n, paused: false }
      ],
      slots: [{ goalId: "finishing", normalCap: gbp(10_000) }],
      overflowGoalId: "overflow"
    });
    expect(result.allocations.map((item) => item.amount.minor)).toEqual([1_000n, 19_000n]);
  });

  it("never contributes beyond a target", () => {
    const result = allocateGoalPool({
      goalPool: gbp(50_000),
      goals: [{ goalId: "done", balanceMinor: 10_000n, targetMinor: 10_000n, paused: false }],
      slots: [{ goalId: "done", normalCap: gbp(50_000) }],
      overflowGoalId: "done"
    });
    expect(result.allocations[0]?.amount.minor).toBe(0n);
    expect(result.retainedAsCash.minor).toBe(50_000n);
  });

  it("supports paused and temporarily reduced contribution caps", () => {
    const result = allocateGoalPool({
      goalPool: gbp(30_000),
      goals: [
        { goalId: "paused", balanceMinor: 0n, targetMinor: 100_000n, paused: false },
        { goalId: "reduced", balanceMinor: 0n, targetMinor: 100_000n, paused: false }
      ],
      slots: [
        { goalId: "paused", normalCap: gbp(10_000) },
        { goalId: "reduced", normalCap: gbp(20_000) }
      ],
      overflowGoalId: null,
      overrides: [{ goalId: "paused", paused: true }, { goalId: "reduced", cap: gbp(5_000) }]
    });
    expect(result.allocations.map((item) => item.amount.minor)).toEqual([0n, 5_000n]);
    expect(result.retainedAsCash.minor).toBe(25_000n);
  });
});
