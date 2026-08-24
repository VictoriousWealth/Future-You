import type {
  OneOffPurchaseRequestDTO,
  ScenarioOptionsRequestDTO
} from "../application/dto/contracts";
import { SARAH_V1_CONTEXT } from "../fixtures/sarah-v1";

export const SARAH_V1_BROWSER_PROOF_COMMAND: OneOffPurchaseRequestDTO = Object.freeze({
  requestId: "req_sarah_trip_650_slice_2",
  expectedContextVersionId: SARAH_V1_CONTEXT.version,
  change: Object.freeze({
    type: "one_off_purchase",
    amount: Object.freeze({ currency: "GBP", minorUnits: "65000" }),
    purpose: "trip",
    paymentPeriod: "2026-09",
    paymentTiming: "assumed_conservative",
    paymentDate: null,
    datePrecision: "month",
    fundingSource: "current_account",
    paymentPattern: "single",
    costTreatment: "additional_to_routine_spending"
  }),
  assumptionConfirmations: Object.freeze([])
});

export const SARAH_V1_BROWSER_PROOF_OPTIONS_COMMAND: ScenarioOptionsRequestDTO = Object.freeze({
  requestId: "req_sarah_options_slice_2",
  source: SARAH_V1_BROWSER_PROOF_COMMAND,
  timingAlternativePeriod: "2026-10"
});
