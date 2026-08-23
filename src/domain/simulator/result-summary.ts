import type { AffordabilityClass } from "./types";

/** Presentation-boundary copy. The calculation engine never consumes this text. */
export function canonicalClassificationSummary(classification: AffordabilityClass): string {
  switch (classification) {
    case "NOT_CURRENTLY_AFFORDABLE":
      return "Not currently affordable under the modelled circumstances.";
    case "FINANCIALLY_RISKY":
      return "Affordable only with a financially risky trade-off.";
    case "AFFORDABLE_SIGNIFICANT_TRADE_OFF":
      return "Affordable, but with a meaningful short-term safety-buffer trade-off.";
    case "AFFORDABLE_NOTICEABLE_TRADE_OFF":
      return "Affordable, with a noticeable trade-off.";
    case "AFFORDABLE_MINIMAL_IMPACT":
      return "Affordable, with minimal impact on the current path.";
  }
}
