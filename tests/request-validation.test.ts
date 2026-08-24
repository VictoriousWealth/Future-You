import { describe, expect, it } from "vitest";
import {
  parseAmountAlternativesRequest,
  parseBaselineRequest,
  parseOneOffPurchaseRequest,
  parseScenarioOptionsRequest,
  parseTimingAlternativeRequest
} from "../src/application/dto/request-validation";
import { oneOffPurchaseRequestToDomain } from "../src/application/mappers/request-to-domain";
import { SARAH_V1_BROWSER_PROOF_COMMAND } from "../src/server/sarah-v1-demo-command";

function commandWith(change: Record<string, unknown>): unknown {
  return {
    ...SARAH_V1_BROWSER_PROOF_COMMAND,
    change: { ...SARAH_V1_BROWSER_PROOF_COMMAND.change, ...change }
  };
}

describe("Slice 2 runtime request validation", () => {
  it("accepts and normalises the canonical one-off request", () => {
    const result = parseOneOffPurchaseRequest({
      ...SARAH_V1_BROWSER_PROOF_COMMAND,
      change: { ...SARAH_V1_BROWSER_PROOF_COMMAND.change, purpose: "  trip  " }
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.change.purpose).toBe("trip");
      expect(result.value.change.paymentDate).toBeNull();
    }
  });

  it.each([
    ["numeric minor units", { amount: { currency: "GBP", minorUnits: 65_000 } }, "INVALID_MONEY"],
    ["fractional pennies", { amount: { currency: "GBP", minorUnits: "65000.5" } }, "INVALID_MONEY"],
    ["negative amount", { amount: { currency: "GBP", minorUnits: "-65000" } }, "INVALID_MONEY"],
    ["zero purchase", { amount: { currency: "GBP", minorUnits: "0" } }, "INVALID_MONEY"],
    ["unbounded amount", { amount: { currency: "GBP", minorUnits: "12345678901234567" } }, "INVALID_MONEY"],
    ["currency mismatch", { amount: { currency: "EUR", minorUnits: "65000" } }, "UNSUPPORTED_CURRENCY"],
    ["unsupported funding", { fundingSource: "overdraft" }, "INVALID_REQUEST"],
    ["unsupported pattern", { paymentPattern: "instalments" }, "INVALID_REQUEST"],
    ["unsupported treatment", { costTreatment: "spending_substitution" }, "INVALID_REQUEST"],
    ["unknown timing", { paymentTiming: "after_payday" }, "INVALID_REQUEST"],
    ["invalid month", { paymentPeriod: "2026-13" }, "INVALID_REQUEST"]
  ])("rejects %s with a typed code", (_label, change, code) => {
    expect(parseOneOffPurchaseRequest(commandWith(change))).toMatchObject({ ok: false, code });
  });

  it("distinguishes unsupported scenario types from a generic invalid request", () => {
    expect(
      parseOneOffPurchaseRequest(commandWith({ type: "recurring_expense" }))
    ).toMatchObject({ ok: false, code: "UNSUPPORTED_SCENARIO_TYPE" });
  });

  it("rejects blank labels and unknown client-supplied calculated fields", () => {
    expect(parseOneOffPurchaseRequest(commandWith({ purpose: "   " }))).toMatchObject({ ok: false });
    expect(
      parseOneOffPurchaseRequest({
        ...SARAH_V1_BROWSER_PROOF_COMMAND,
        userId: "user-attacker",
        scenarioId: "client-scenario",
        classification: "AFFORDABLE_MINIMAL_IMPACT"
      })
    ).toMatchObject({ ok: false, code: "INVALID_REQUEST" });
  });

  it("requires exact dates only for exact date precision and keeps dates in-period", () => {
    expect(
      parseOneOffPurchaseRequest(commandWith({ datePrecision: "exact", paymentDate: null }))
    ).toMatchObject({ ok: false });
    expect(
      parseOneOffPurchaseRequest(
        commandWith({ datePrecision: "exact", paymentDate: "2026-09-12" })
      )
    ).toMatchObject({ ok: true });
    expect(
      parseOneOffPurchaseRequest(
        commandWith({ datePrecision: "month", paymentDate: "2026-09-12" })
      )
    ).toMatchObject({ ok: false });
    expect(
      parseOneOffPurchaseRequest(
        commandWith({ datePrecision: "exact", paymentDate: "2026-10-01" })
      )
    ).toMatchObject({ ok: false });
  });

  it("does not expose assumption editing in Slice 2", () => {
    expect(
      parseOneOffPurchaseRequest({
        ...SARAH_V1_BROWSER_PROOF_COMMAND,
        assumptionConfirmations: ["use-overdraft-as-cash"]
      })
    ).toMatchObject({ ok: false });
  });

  it("maps validated decimal strings explicitly into domain bigint", () => {
    const parsed = parseOneOffPurchaseRequest(SARAH_V1_BROWSER_PROOF_COMMAND);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const domain = oneOffPurchaseRequestToDomain(parsed.value, "baseline-server", "scenario-server");
    expect(domain).toMatchObject({
      ok: true,
      value: {
        id: "scenario-server",
        baselineId: "baseline-server",
        parentScenarioId: null,
        change: {
          type: "ONE_OFF_PURCHASE",
          amount: { currency: "GBP", minor: 65_000n },
          paymentPeriod: "2026-09",
          paymentDate: null,
          datePrecision: "MONTH",
          fundingSource: "CURRENT_ACCOUNT",
          paymentPattern: "SINGLE",
          costTreatment: "ADDITIONAL_TO_ROUTINE_SPENDING"
        }
      }
    });
  });

  it("validates baseline, amount, timing and scenario-set commands strictly", () => {
    expect(
      parseBaselineRequest({
        requestId: "req_baseline",
        expectedContextVersionId: SARAH_V1_BROWSER_PROOF_COMMAND.expectedContextVersionId
      })
    ).toMatchObject({ ok: true });
    expect(
      parseAmountAlternativesRequest({ requestId: "req_amounts", source: SARAH_V1_BROWSER_PROOF_COMMAND })
    ).toMatchObject({ ok: true });
    expect(
      parseTimingAlternativeRequest({
        requestId: "req_timing",
        source: SARAH_V1_BROWSER_PROOF_COMMAND,
        targetPaymentPeriod: "2026-10"
      })
    ).toMatchObject({ ok: true });
    expect(
      parseScenarioOptionsRequest({
        requestId: "req_options",
        source: SARAH_V1_BROWSER_PROOF_COMMAND,
        timingAlternativePeriod: "2026-10"
      })
    ).toMatchObject({ ok: true });
    expect(
      parseTimingAlternativeRequest({
        requestId: "req_timing",
        source: SARAH_V1_BROWSER_PROOF_COMMAND,
        targetPaymentPeriod: "2026-09"
      })
    ).toMatchObject({ ok: false });
  });
});
