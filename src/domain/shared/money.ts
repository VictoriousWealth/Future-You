import { err, ok, type Result } from "./result";

export type Currency = "GBP";

export interface Money {
  readonly currency: Currency;
  readonly minor: bigint;
}

export type MoneyErrorCode =
  | "FRACTIONAL_MINOR_UNIT"
  | "NON_FINITE_MINOR_UNIT"
  | "UNSAFE_MINOR_UNIT"
  | "NEGATIVE_MONEY"
  | "INVALID_MAJOR_UNIT_STRING"
  | "CURRENCY_MISMATCH";

export interface MoneyError {
  readonly code: MoneyErrorCode;
  readonly message: string;
}

export function moneyFromMinor(
  currency: Currency,
  minor: bigint | number
): Result<Money, MoneyError> {
  if (typeof minor === "number") {
    if (!Number.isFinite(minor)) {
      return err({ code: "NON_FINITE_MINOR_UNIT", message: "Minor units must be finite." });
    }
    if (!Number.isInteger(minor)) {
      return err({ code: "FRACTIONAL_MINOR_UNIT", message: "Fractional pennies are not valid." });
    }
    if (!Number.isSafeInteger(minor)) {
      return err({ code: "UNSAFE_MINOR_UNIT", message: "Numeric minor units must be safe integers." });
    }
  }

  const amount = BigInt(minor);
  if (amount < 0n) {
    return err({ code: "NEGATIVE_MONEY", message: "Money amounts cannot be negative." });
  }

  return ok(Object.freeze({ currency, minor: amount }));
}

export function gbp(minor: bigint | number): Money {
  const result = moneyFromMinor("GBP", minor);
  if (!result.ok) {
    throw new TypeError(`${result.error.code}: ${result.error.message}`);
  }
  return result.value;
}

/** Signed balances are valid projection outputs even though input amounts are non-negative. */
export function signedGbp(minor: bigint): Money {
  return Object.freeze({ currency: "GBP", minor });
}

export function moneyFromMajorString(
  currency: Currency,
  major: string
): Result<Money, MoneyError> {
  const match = /^(0|[1-9]\d*)(?:\.(\d{1,2}))?$/.exec(major);
  if (!match) {
    return err({
      code: "INVALID_MAJOR_UNIT_STRING",
      message: "Major units must be a non-negative decimal string with at most two decimal places."
    });
  }

  const whole = BigInt(match[1] ?? "0");
  const fraction = (match[2] ?? "").padEnd(2, "0");
  return moneyFromMinor(currency, whole * 100n + BigInt(fraction || "0"));
}

export function requireSameCurrency(left: Money, right: Money): Result<true, MoneyError> {
  if (left.currency !== right.currency) {
    return err({ code: "CURRENCY_MISMATCH", message: "Money currencies do not match." });
  }
  return ok(true);
}

export function formatMoney(money: Money): string {
  const negative = money.minor < 0n;
  const absolute = negative ? -money.minor : money.minor;
  const pounds = absolute / 100n;
  const pennies = absolute % 100n;
  return `${negative ? "-" : ""}£${pounds.toString()}${
    pennies === 0n ? "" : `.${pennies.toString().padStart(2, "0")}`
  }`;
}
