export type ApplicationErrorCode =
  | "FINANCIAL_CONTEXT_NOT_FOUND"
  | "CONTEXT_VERSION_NOT_FOUND"
  | "CONTEXT_VERSION_MISMATCH"
  | "MATERIAL_INFORMATION_MISSING"
  | "INVALID_MONEY"
  | "UNSUPPORTED_SCENARIO_TYPE"
  | "HORIZON_EXHAUSTED"
  | "SIMULATION_REJECTED"
  | "RUN_NOT_FOUND"
  | "IDEMPOTENCY_KEY_REUSED"
  | "PERSISTENCE_FAILURE"
  | "PERSISTED_DATA_INVALID"
  | "PERSISTED_SCHEMA_UNSUPPORTED"
  | "INTERNAL_SIMULATOR_FAILURE";

export interface ApplicationError {
  readonly code: ApplicationErrorCode;
  readonly message: string;
  readonly missingFields: readonly string[];
}
