export type ApplicationErrorCode =
  | "CONTEXT_NOT_FOUND"
  | "CONTEXT_VERSION_MISMATCH"
  | "MATERIAL_INFORMATION_MISSING"
  | "INVALID_MONEY"
  | "UNSUPPORTED_SCENARIO_TYPE"
  | "HORIZON_EXHAUSTED"
  | "SIMULATION_REJECTED"
  | "SIMULATION_RUN_NOT_FOUND"
  | "INTERNAL_SIMULATOR_FAILURE";

export interface ApplicationError {
  readonly code: ApplicationErrorCode;
  readonly message: string;
  readonly missingFields: readonly string[];
}
