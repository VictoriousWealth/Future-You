import type {
  BaselineResponseDTO,
  OneOffPurchaseRequestDTO,
  OneOffPurchaseResponseDTO
} from "../dto/contracts";

export interface StoredSimulationRun {
  readonly requestIdentity: string;
  readonly result: OneOffPurchaseResponseDTO;
}

export interface SimulationRunSaveCommand extends StoredSimulationRun {
  readonly request: OneOffPurchaseRequestDTO;
}

export type SimulationRunSaveOutcome =
  | Readonly<{ status: "created" | "existing"; stored: StoredSimulationRun }>
  | Readonly<{ status: "conflict" }>;

export interface SimulationRunStore {
  saveBaseline(result: BaselineResponseDTO): Promise<void>;
  findByRequestId(requestId: string): Promise<StoredSimulationRun | null>;
  save(command: SimulationRunSaveCommand): Promise<SimulationRunSaveOutcome>;
  get(runId: string): Promise<OneOffPurchaseResponseDTO | null>;
}
