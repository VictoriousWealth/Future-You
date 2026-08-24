import { err, ok, type Result } from "../../domain/shared/result";
import {
  API_VERSION,
  COMPARISON_RESPONSE_SCHEMA,
  type ScenarioComparisonResponseDTO
} from "../dto/contracts";
import type { ApplicationError } from "../errors/application-error";
import type { SimulatorApplicationDependencies } from "./dependencies";
import { correlationIdFor } from "./resolve-current-baseline";

export class GetScenarioComparisonUseCase {
  constructor(private readonly dependencies: SimulatorApplicationDependencies) {}

  async execute(input: Readonly<{ requestId: string; runId: string }>): Promise<
    Result<ScenarioComparisonResponseDTO, ApplicationError>
  > {
    const simulation = await this.dependencies.runStore.get(input.runId);
    if (!simulation) {
      return err({
        code: "SIMULATION_RUN_NOT_FOUND",
        message: "The requested scenario comparison was not found.",
        missingFields: []
      });
    }
    return ok({
      apiVersion: API_VERSION,
      schemaVersion: COMPARISON_RESPONSE_SCHEMA,
      kind: "scenario_comparison",
      requestId: input.requestId,
      correlationId: correlationIdFor("get-scenario-comparison", input.requestId),
      calculation: simulation.calculation,
      scenario: simulation.scenario,
      comparison: simulation.result.comparison,
      presentation: simulation.presentation
    });
  }
}
