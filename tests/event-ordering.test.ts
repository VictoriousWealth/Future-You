import { describe, expect, it } from "vitest";
import { orderEvents, type PendingLedgerEvent } from "../src/domain/simulator/event-ordering";
import { mustLocalDate, mustYearMonth } from "../src/domain/shared/date";
import type { LedgerEventType } from "../src/domain/simulator/types";

function event(
  id: string,
  type: LedgerEventType,
  sourceOrder: number,
  dependsOn: readonly string[] = [],
  date = "2026-09-30"
): PendingLedgerEvent {
  return {
    id,
    period: mustYearMonth("2026-09"),
    date: mustLocalDate(date),
    datePrecision: "EXACT",
    time: null,
    type,
    signedCashMinor: 0n,
    reserveDeltaMinor: 0n,
    required: type === "REQUIRED_OBLIGATION",
    evidenceState: "CONFIRMED",
    scope: "CURRENT_PATH",
    dependsOn,
    sourceOrder,
    goalId: null,
    description: id
  };
}

describe("deterministic event ordering", () => {
  it("orders chronologically before considering same-day phase", () => {
    const result = orderEvents([
      event("later-required", "REQUIRED_OBLIGATION", 0, [], "2026-09-02"),
      event("earlier-income", "INCOME", 0, [], "2026-09-01")
    ]);
    expect(result.ok && result.value.map((item) => item.id)).toEqual([
      "earlier-income",
      "later-required"
    ]);
  });

  it("uses conservative same-day debit-before-income ordering", () => {
    const result = orderEvents([
      event("income", "INCOME", 4),
      event("ordinary", "ROUTINE_SPENDING", 3),
      event("required", "REQUIRED_OBLIGATION", 2)
    ]);
    expect(result.ok && result.value.map((item) => item.id)).toEqual([
      "required",
      "ordinary",
      "income"
    ]);
  });

  it("honours an explicit dependency for goal transfer after income", () => {
    const result = orderEvents([
      event("goal", "GOAL_TRANSFER", 0, ["income"]),
      event("income", "INCOME", 1)
    ]);
    expect(result.ok && result.value.map((item) => item.id)).toEqual(["income", "goal"]);
  });

  it("rejects duplicate IDs", () => {
    const result = orderEvents([event("same", "INCOME", 0), event("same", "ROUTINE_SPENDING", 1)]);
    expect(result).toMatchObject({ ok: false, error: { code: "DUPLICATE_EVENT_ID" } });
  });

  it("rejects unknown dependencies", () => {
    expect(orderEvents([event("goal", "GOAL_TRANSFER", 0, ["missing"])])).toMatchObject({
      ok: false,
      error: { code: "UNKNOWN_EVENT_DEPENDENCY" }
    });
  });

  it("rejects dependency cycles", () => {
    expect(
      orderEvents([
        event("one", "GOAL_TRANSFER", 0, ["two"]),
        event("two", "GOAL_TRANSFER", 1, ["one"])
      ])
    ).toMatchObject({ ok: false, error: { code: "EVENT_DEPENDENCY_CYCLE" } });
  });
});
