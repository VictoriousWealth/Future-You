import { describe, expect, it } from "vitest";
import { parseExactGbpInput } from "../src/application/onboarding/exact-gbp-input";

describe("exact GBP onboarding parser", () => {
  it.each([
    ["2450", "245000", "2450.00"],
    ["2450.00", "245000", "2450.00"],
    ["12.3", "1230", "12.30"],
    ["0", "0", "0.00"],
    ["  42.05  ", "4205", "42.05"],
    ["900719925474099312345.67", "90071992547409931234567", "900719925474099312345.67"]
  ])("parses %s exactly", (amount, minor, canonical) => {
    const result = parseExactGbpInput({ currency: "GBP", amount }, "amount", "NON_NEGATIVE");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.minor.toString()).toBe(minor);
      expect(result.canonicalAmount).toBe(canonical);
    }
  });

  it("allows a negative current reality only under the signed rule", () => {
    const signed = parseExactGbpInput({ currency: "GBP", amount: "-50.25" }, "balance", "SIGNED");
    expect(signed.ok && signed.value.minor).toBe(-5025n);
    expect(parseExactGbpInput({ currency: "GBP", amount: "-50.25" }, "income", "POSITIVE")).toMatchObject({ ok: false });
  });

  it.each(["", "1.234", "1e3", "0x10", "NaN", "Infinity", "£12", "1,200", "+2", "01"])(
    "rejects malformed input %j",
    (amount) => {
      const result = parseExactGbpInput({ currency: "GBP", amount }, "income", "POSITIVE");
      expect(result).toMatchObject({ ok: false, error: { code: "MONEY_INPUT_INVALID", field: "income" } });
    }
  );

  it("rejects currency mismatch", () => {
    expect(parseExactGbpInput({ currency: "USD", amount: "1" }, "income", "POSITIVE")).toMatchObject({
      ok: false,
      error: { code: "MONEY_INPUT_INVALID", field: "income" }
    });
  });
});
