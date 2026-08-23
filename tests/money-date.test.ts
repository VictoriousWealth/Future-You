import { describe, expect, it } from "vitest";
import {
  formatMoney,
  gbp,
  moneyFromMajorString,
  moneyFromMinor,
  requireSameCurrency,
  signedGbp,
  type Money
} from "../src/domain/shared/money";
import {
  addMonths,
  daysInMonth,
  localDate,
  monthDifference,
  mustYearMonth,
  yearMonth
} from "../src/domain/shared/date";

describe("integer money boundary", () => {
  it("stores GBP in integer minor units", () => {
    expect(gbp(65_000)).toEqual({ currency: "GBP", minor: 65_000n });
  });

  it("rejects fractional pennies", () => {
    expect(moneyFromMinor("GBP", 1.5)).toMatchObject({
      ok: false,
      error: { code: "FRACTIONAL_MINOR_UNIT" }
    });
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])(
    "rejects non-finite minor-unit value %s",
    (value) => {
      expect(moneyFromMinor("GBP", value)).toMatchObject({
        ok: false,
        error: { code: "NON_FINITE_MINOR_UNIT" }
      });
    }
  );

  it("rejects unsafe numeric integers", () => {
    expect(moneyFromMinor("GBP", Number.MAX_SAFE_INTEGER + 1)).toMatchObject({
      ok: false,
      error: { code: "UNSAFE_MINOR_UNIT" }
    });
  });

  it("rejects negative input money", () => {
    expect(moneyFromMinor("GBP", -1n)).toMatchObject({
      ok: false,
      error: { code: "NEGATIVE_MONEY" }
    });
  });

  it("parses decimal strings without floating-point arithmetic", () => {
    expect(moneyFromMajorString("GBP", "650.05")).toEqual({
      ok: true,
      value: { currency: "GBP", minor: 65_005n }
    });
    expect(moneyFromMajorString("GBP", "0.1")).toEqual({
      ok: true,
      value: { currency: "GBP", minor: 10n }
    });
  });

  it("rejects malformed or over-precise major-unit strings", () => {
    expect(moneyFromMajorString("GBP", "1.001")).toMatchObject({ ok: false });
    expect(moneyFromMajorString("GBP", "01.00")).toMatchObject({ ok: false });
    expect(moneyFromMajorString("GBP", "NaN")).toMatchObject({ ok: false });
  });

  it("rejects currency mismatches at the boundary", () => {
    const euros = { currency: "EUR", minor: 100n } as unknown as Money;
    expect(requireSameCurrency(gbp(100), euros)).toMatchObject({
      ok: false,
      error: { code: "CURRENCY_MISMATCH" }
    });
  });

  it("formats positive and signed projection outputs", () => {
    expect(formatMoney(gbp(65_005))).toBe("£650.05");
    expect(formatMoney(gbp(65_000))).toBe("£650");
    expect(formatMoney(signedGbp(-105n))).toBe("-£1.05");
  });
});

describe("local date and month primitives", () => {
  it("rejects invalid dates and months", () => {
    expect(localDate("2026-02-29")).toMatchObject({ ok: false });
    expect(yearMonth("2026-13")).toMatchObject({ ok: false });
  });

  it("handles leap years and month arithmetic in UTC", () => {
    expect(daysInMonth(mustYearMonth("2028-02"))).toBe(29);
    expect(addMonths(mustYearMonth("2026-12"), 2)).toBe("2027-02");
    expect(monthDifference(mustYearMonth("2026-12"), mustYearMonth("2027-02"))).toBe(2);
  });
});
