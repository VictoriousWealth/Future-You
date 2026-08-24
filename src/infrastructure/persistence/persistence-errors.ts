export type PersistenceFailureCategory =
  | "PERSISTENCE_FAILURE"
  | "PERSISTED_DATA_INVALID"
  | "PERSISTED_SCHEMA_UNSUPPORTED";

export class PersistenceBoundaryError extends Error {
  constructor(
    readonly category: PersistenceFailureCategory,
    message: string
  ) {
    super(message);
    this.name = "PersistenceBoundaryError";
  }
}
