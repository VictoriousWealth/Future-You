import type {
  BaselineResponseDTO,
  OneOffPurchaseResponseDTO
} from "../../application/dto/contracts";
import type {
  SimulationRunSaveCommand,
  SimulationRunSaveOutcome,
  SimulationRunStore,
  StoredSimulationRun
} from "../../application/ports/simulation-run-store";

export class InMemorySimulationRunStore implements SimulationRunStore {
  readonly #baselines = new Map<string, BaselineResponseDTO["baseline"]>();
  readonly #runs = new Map<string, OneOffPurchaseResponseDTO>();
  readonly #requests = new Map<string, StoredSimulationRun>();

  async saveBaseline(result: BaselineResponseDTO): Promise<void> {
    const existing = this.#baselines.get(result.calculation.baselineId);
    if (existing && JSON.stringify(existing) !== JSON.stringify(result.baseline)) {
      throw new Error("The immutable baseline identity collided with different content.");
    }
    this.#baselines.set(result.calculation.baselineId, structuredClone(result.baseline));
  }

  async findByRequestId(requestId: string): Promise<StoredSimulationRun | null> {
    const stored = this.#requests.get(requestId);
    return Promise.resolve(stored ? structuredClone(stored) : null);
  }

  async save(command: SimulationRunSaveCommand): Promise<SimulationRunSaveOutcome> {
    const existing = this.#requests.get(command.request.requestId);
    if (existing) {
      return Promise.resolve(
        existing.requestIdentity === command.requestIdentity
          ? { status: "existing", stored: structuredClone(existing) }
          : { status: "conflict" }
      );
    }
    const stored = {
      requestIdentity: command.requestIdentity,
      result: structuredClone(command.result)
    };
    this.#runs.set(command.result.calculation.runId, structuredClone(command.result));
    this.#requests.set(command.request.requestId, stored);
    return Promise.resolve({ status: "created", stored: structuredClone(stored) });
  }

  async get(runId: string): Promise<OneOffPurchaseResponseDTO | null> {
    const result = this.#runs.get(runId);
    return Promise.resolve(result ? structuredClone(result) : null);
  }
}
