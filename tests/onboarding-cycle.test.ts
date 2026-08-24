import { describe, expect, it } from "vitest";
import { confirmed, createFinancialContext } from "../src/domain/simulator/context";
import { generateBaseline, SLICE_1_RULES } from "../src/domain/simulator/engine";
import { mustLocalDate } from "../src/domain/shared/date";
import { gbp } from "../src/domain/shared/money";
import { unwrap } from "../src/domain/shared/result";
import { ENGLAND_WALES_WORKING_DAY_CALENDAR } from "../src/fixtures/calendar/england-wales-bank-holidays";
import { SARAH_V1_CONTEXT } from "../src/fixtures/sarah-v1";

describe("opening financial cycle", () => {
  it("spends only the declared remaining reserve from a mid-cycle snapshot", () => {
    const snapshotDate = mustLocalDate("2026-09-15");
    const context = unwrap(createFinancialContext({
      ...SARAH_V1_CONTEXT,
      id: "context-mid-cycle",
      version: "mid-cycle@2026-09-15",
      snapshotDate,
      currentAccount: {
        ...SARAH_V1_CONTEXT.currentAccount,
        clearedBalance: confirmed(gbp(170_000), "mid-cycle cleared balance", snapshotDate),
        reservedSpending: confirmed(gbp(80_000), "declared remaining reserve", snapshotDate)
      }
    }));
    const baseline = unwrap(generateBaseline({
      baselineId: "baseline-mid-cycle",
      context,
      rules: SLICE_1_RULES,
      calendar: ENGLAND_WALES_WORKING_DAY_CALENDAR
    }));
    expect(baseline.periods[0]?.routineSpending.minor).toBe(80_000n);
    expect(baseline.periods[1]?.routineSpending.minor).toBe(185_000n);
    expect(
      baseline.ledger
        .filter((event) => event.period === "2026-09" && event.type !== "GOAL_TRANSFER")
        .every((event) => event.date >= snapshotDate)
    ).toBe(true);
    expect(
      baseline.ledger.some(
        (event) => event.period === "2026-09" && event.type === "REQUIRED_OBLIGATION"
      )
    ).toBe(false);
    expect(baseline.periods[0]?.closingSafetyBuffer.minor).toBe(90_000n);
  });

  it("rejects a separately edited contribution budget", () => {
    const result = createFinancialContext({
      ...SARAH_V1_CONTEXT,
      goalAllocationPolicy: {
        ...SARAH_V1_CONTEXT.goalAllocationPolicy,
        normalContributionBudget: confirmed(
          gbp(59_999),
          "invalid independent budget",
          SARAH_V1_CONTEXT.snapshotDate
        )
      }
    });
    expect(result).toMatchObject({
      ok: false,
      error: {
        code: "INVALID_CONTEXT",
        message: expect.stringContaining("must equal the sum")
      }
    });
  });
});
