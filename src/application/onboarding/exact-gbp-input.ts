import { signedGbp, type Money } from "../../domain/shared/money";

export type MoneySignRule = "NON_NEGATIVE" | "POSITIVE" | "SIGNED";

export interface ExactMoneyInputError {
  readonly code: "MONEY_INPUT_INVALID";
  readonly field: string;
  readonly message: string;
}

export type ExactMoneyInputResult =
  | Readonly<{ ok: true; value: Money; canonicalAmount: string }>
  | Readonly<{ ok: false; error: ExactMoneyInputError }>;

function invalid(field: string, message: string): ExactMoneyInputResult {
  return { ok: false, error: { code: "MONEY_INPUT_INVALID", field, message } };
}

/** Parses plain GBP decimal text directly into pence without floating-point arithmetic. */
export function parseExactGbpInput(
  input: Readonly<{ currency: string; amount: string }>,
  field: string,
  signRule: MoneySignRule
): ExactMoneyInputResult {
  if (input.currency !== "GBP") return invalid(field, "Currency must be GBP.");
  const value = input.amount.trim();
  if (value.length === 0) return invalid(field, "Enter an amount.");
  const match = /^(-?)(0|[1-9]\d*)(?:\.(\d{1,2}))?$/.exec(value);
  if (!match) {
    return invalid(
      field,
      "Use plain pounds and pence with no symbols, separators, or more than two decimal places."
    );
  }

  const negative = match[1] === "-";
  const pounds = BigInt(match[2]!);
  const pennies = BigInt((match[3] ?? "").padEnd(2, "0") || "0");
  let minor = pounds * 100n + pennies;
  if (negative) minor = -minor;

  if (signRule === "POSITIVE" && minor <= 0n) {
    return invalid(field, "Amount must be greater than zero.");
  }
  if (signRule === "NON_NEGATIVE" && minor < 0n) {
    return invalid(field, "Amount cannot be negative.");
  }

  const absolute = minor < 0n ? -minor : minor;
  const canonicalAmount = `${minor < 0n ? "-" : ""}${absolute / 100n}.${String(
    absolute % 100n
  ).padStart(2, "0")}`;
  return { ok: true, value: signedGbp(minor), canonicalAmount };
}
