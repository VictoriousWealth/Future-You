import { err, ok, type Result } from "../../domain/shared/result";
import type { OneOffPurchaseResponseDTO } from "../dto/contracts";
import type { ApplicationError } from "../errors/application-error";
import type { SimulatorApplicationDependencies } from "./dependencies";

export class GetSimulationRunUseCase {
  constructor(private readonly dependencies: SimulatorApplicationDependencies) {}

  async execute(runId: string): Promise<Result<OneOffPurchaseResponseDTO, ApplicationError>> {
    const result = await this.dependencies.runStore.get(runId);
    return result
      ? ok(result)
      : err({
          code: "RUN_NOT_FOUND",
          message: "The requested simulation run was not found.",
          missingFields: []
        });
  }
}
