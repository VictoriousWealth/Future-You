import { inputIdentity } from "../../domain/shared/identity";
import { err, ok, type Result } from "../../domain/shared/result";
import { simulateOneOffPurchase } from "../../domain/simulator/engine";
import type {
  OneOffPurchaseRequestDTO,
  OneOffPurchaseResponseDTO
} from "../dto/contracts";
import type { ApplicationError } from "../errors/application-error";
import { toOneOffPurchaseResponse } from "../mappers/domain-to-dto";
import { oneOffPurchaseRequestToDomain } from "../mappers/request-to-domain";
import type { SimulatorApplicationDependencies } from "./dependencies";
import { correlationIdFor, resolveCurrentBaseline } from "./resolve-current-baseline";
import {
  findIdempotentSimulationRun,
  saveIdempotentSimulationRun
} from "./idempotent-simulation-run";

export function scenarioIdFor(request: OneOffPurchaseRequestDTO, baselineId: string): string {
  return `scenario-${inputIdentity({
    requestId: request.requestId,
    baselineId,
    change: request.change
  }).slice("fnv1a64:".length)}`;
}

export class SimulateOneOffPurchaseUseCase {
  constructor(private readonly dependencies: SimulatorApplicationDependencies) {}

  async execute(
    request: OneOffPurchaseRequestDTO
  ): Promise<Result<OneOffPurchaseResponseDTO, ApplicationError>> {
    const existing = await findIdempotentSimulationRun(this.dependencies.runStore, request);
    if (!existing.ok) return err(existing.error);
    if (existing.value) return ok(existing.value.result);
    const resolved = await resolveCurrentBaseline(
      this.dependencies,
      request.expectedContextVersionId
    );
    if (!resolved.ok) return err(resolved.error);
    const definition = oneOffPurchaseRequestToDomain(
      request,
      resolved.value.baseline.baselineId,
      scenarioIdFor(request, resolved.value.baseline.baselineId)
    );
    if (!definition.ok) {
      return err({
        code:
          definition.error.code === "INVALID_MONEY"
            ? "INVALID_MONEY"
            : definition.error.code === "UNSUPPORTED_SCENARIO_TYPE"
              ? "UNSUPPORTED_SCENARIO_TYPE"
              : "SIMULATION_REJECTED",
        message: definition.error.message,
        missingFields: definition.error.missingFields
      });
    }
    const simulated = simulateOneOffPurchase({
      baselineId: resolved.value.baseline.baselineId,
      baseline: resolved.value.baseline,
      context: resolved.value.context,
      rules: this.dependencies.rules,
      calendar: this.dependencies.calendar,
      scenario: definition.value
    });
    if (!simulated.ok) {
      return err({
        code:
          simulated.error.code === "INSUFFICIENT_INFORMATION"
            ? "MATERIAL_INFORMATION_MISSING"
            : simulated.error.code === "UNSUPPORTED_SCENARIO_TYPE"
              ? "UNSUPPORTED_SCENARIO_TYPE"
              : "SIMULATION_REJECTED",
        message: simulated.error.message,
        missingFields: simulated.error.missingFields
      });
    }
    const response = toOneOffPurchaseResponse(
      request,
      correlationIdFor("simulate-one-off-purchase", request.requestId),
      resolved.value.context,
      definition.value,
      simulated.value,
      this.dependencies.calendarMetadata
    );
    return saveIdempotentSimulationRun(this.dependencies.runStore, request, response);
  }
}
