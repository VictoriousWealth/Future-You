import type { OneOffPurchaseResponseDTO } from "../../application/dto/contracts";
import type { SimulationRunStore } from "../../application/ports/simulation-run-store";

export class InMemorySimulationRunStore implements SimulationRunStore {
  readonly #runs = new Map<string, OneOffPurchaseResponseDTO>();

  async save(result: OneOffPurchaseResponseDTO): Promise<void> {
    this.#runs.set(result.calculation.runId, structuredClone(result));
  }

  async get(runId: string): Promise<OneOffPurchaseResponseDTO | null> {
    const result = this.#runs.get(runId);
    return Promise.resolve(result ? structuredClone(result) : null);
  }
}
