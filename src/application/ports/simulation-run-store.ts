import type { OneOffPurchaseResponseDTO } from "../dto/contracts";

export interface SimulationRunStore {
  save(result: OneOffPurchaseResponseDTO): Promise<void>;
  get(runId: string): Promise<OneOffPurchaseResponseDTO | null>;
}
