import type { ScenarioOptionsRequestDTO } from "../application/dto/contracts";

export function slice3DemoOptionsCommand(contextVersion: string): ScenarioOptionsRequestDTO {
  return {
    requestId: "req_slice3_trip_options",
    source: {
      requestId: "req_slice3_trip_650",
      expectedContextVersionId: contextVersion,
      change: {
        type: "one_off_purchase",
        amount: { currency: "GBP", minorUnits: "65000" },
        purpose: "trip",
        paymentPeriod: "2026-09",
        paymentTiming: "assumed_conservative",
        paymentDate: null,
        datePrecision: "month",
        fundingSource: "current_account",
        paymentPattern: "single",
        costTreatment: "additional_to_routine_spending"
      },
      assumptionConfirmations: []
    },
    timingAlternativePeriod: "2026-10"
  };
}
