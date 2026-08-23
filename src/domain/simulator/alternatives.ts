import { gbp, type Money } from "../shared/money";
import type { OneOffPurchaseChange, ScenarioDefinition } from "./types";

const FIFTY_POUNDS_MINOR = 5_000n;

function roundRationalToNearestUnitHalfUp(
  amountMinor: bigint,
  numerator: bigint,
  denominator: bigint,
  unitMinor: bigint
): bigint {
  const scaled = amountMinor * numerator;
  const unitDenominator = denominator * unitMinor;
  return ((scaled + unitDenominator / 2n) / unitDenominator) * unitMinor;
}

export function generateAmountAlternativeCandidates(original: Money): readonly Money[] {
  if (original.currency !== "GBP" || original.minor <= 0n) {
    throw new RangeError("Amount alternatives require a positive GBP amount.");
  }

  const candidates = [
    original.minor,
    roundRationalToNearestUnitHalfUp(original.minor, 75n, 100n, FIFTY_POUNDS_MINOR),
    roundRationalToNearestUnitHalfUp(original.minor, 60n, 100n, FIFTY_POUNDS_MINOR)
  ];

  return [...new Set(candidates.filter((candidate) => candidate > 0n))].map(gbp);
}

export function withPurchaseAmount(
  source: ScenarioDefinition,
  id: string,
  amount: Money
): ScenarioDefinition {
  if (source.change.type !== "ONE_OFF_PURCHASE") {
    throw new TypeError("Amount alternatives require a one-off purchase scenario.");
  }
  return Object.freeze({
    ...source,
    id,
    parentScenarioId: null,
    derivedFromScenarioId: source.id,
    change: Object.freeze({ ...source.change, amount }) as OneOffPurchaseChange
  });
}

export function withPurchasePeriod(
  source: ScenarioDefinition,
  id: string,
  paymentPeriod: OneOffPurchaseChange["paymentPeriod"]
): ScenarioDefinition {
  if (source.change.type !== "ONE_OFF_PURCHASE") {
    throw new TypeError("Timing alternatives require a one-off purchase scenario.");
  }
  return Object.freeze({
    ...source,
    id,
    parentScenarioId: null,
    derivedFromScenarioId: source.id,
    change: Object.freeze({
      ...source.change,
      paymentPeriod,
      paymentDate: null,
      datePrecision: "MONTH"
    }) as OneOffPurchaseChange
  });
}
