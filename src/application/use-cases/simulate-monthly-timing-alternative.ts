import { inputIdentity } from "../../domain/shared/identity";
import { err, ok, type Result } from "../../domain/shared/result";
import { withPurchasePeriod } from "../../domain/simulator/alternatives";
import { simulateOneOffPurchase } from "../../domain/simulator/engine";
import {
  API_VERSION,
  TIMING_ALTERNATIVE_RESPONSE_SCHEMA,
  type OneOffPurchaseRequestDTO,
  type TimingAlternativeRequestDTO,
  type TimingAlternativeResponseDTO
} from "../dto/contracts";
import type { ApplicationError } from "../errors/application-error";
import { toOneOffPurchaseResponse } from "../mappers/domain-to-dto";
import { oneOffPurchaseRequestToDomain } from "../mappers/request-to-domain";
import type { SimulatorApplicationDependencies } from "./dependencies";
import { correlationIdFor, resolveCurrentBaseline } from "./resolve-current-baseline";
import { scenarioIdFor, SimulateOneOffPurchaseUseCase } from "./simulate-one-off-purchase";
import {
  findIdempotentSimulationRun,
  saveIdempotentSimulationRun
} from "./idempotent-simulation-run";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
] as const;

function timingRequest(request: TimingAlternativeRequestDTO): OneOffPurchaseRequestDTO {
  return {
    ...request.source,
    requestId: `${request.requestId}_${request.targetPaymentPeriod}`
  };
}

function timingLabel(period: string): string {
  const month = Number(period.slice(5, 7));
  return `Go in ${MONTHS[month - 1] ?? period}`;
}

export class SimulateMonthlyTimingAlternativeUseCase {
  constructor(private readonly dependencies: SimulatorApplicationDependencies) {}

  async execute(
    request: TimingAlternativeRequestDTO
  ): Promise<Result<TimingAlternativeResponseDTO, ApplicationError>> {
    const alternativeRequest = timingRequest(request);
    const existing = await findIdempotentSimulationRun(
      this.dependencies.runStore,
      alternativeRequest
    );
    if (!existing.ok) return err(existing.error);
    if (existing.value) {
      const option = existing.value.result;
      return ok({
        apiVersion: API_VERSION,
        schemaVersion: TIMING_ALTERNATIVE_RESPONSE_SCHEMA,
        kind: "timing_alternative",
        requestId: request.requestId,
        correlationId: correlationIdFor("simulate-monthly-timing-alternative", request.requestId),
        sourceScenarioId: option.scenario.derivedFromScenarioId ?? option.scenario.id,
        baselineId: option.scenario.baselineId,
        contextVersion: option.context.version,
        option
      });
    }
    const persistedSource = await new SimulateOneOffPurchaseUseCase(this.dependencies).execute(
      request.source
    );
    if (!persistedSource.ok) return err(persistedSource.error);
    const resolved = await resolveCurrentBaseline(
      this.dependencies,
      request.source.expectedContextVersionId
    );
    if (!resolved.ok) return err(resolved.error);

    const sourceId = scenarioIdFor(request.source, resolved.value.baseline.baselineId);
    const sourceDefinition = oneOffPurchaseRequestToDomain(
      request.source,
      resolved.value.baseline.baselineId,
      sourceId
    );
    if (!sourceDefinition.ok || sourceDefinition.value.change.type !== "ONE_OFF_PURCHASE") {
      return err({
        code: "SIMULATION_REJECTED",
        message: sourceDefinition.ok
          ? "Timing alternatives require a one-off purchase."
          : sourceDefinition.error.message,
        missingFields: sourceDefinition.ok ? [] : sourceDefinition.error.missingFields
      });
    }

    const definition = withPurchasePeriod(
      sourceDefinition.value,
      `scenario-${inputIdentity({
        derivedFromScenarioId: sourceId,
        paymentPeriod: request.targetPaymentPeriod
      }).slice("fnv1a64:".length)}`,
      request.targetPaymentPeriod as typeof sourceDefinition.value.change.paymentPeriod
    );
    const simulated = simulateOneOffPurchase({
      baselineId: resolved.value.baseline.baselineId,
      baseline: resolved.value.baseline,
      context: resolved.value.context,
      rules: this.dependencies.rules,
      calendar: this.dependencies.calendar,
      scenario: definition
    });
    if (!simulated.ok) {
      return err({
        code:
          simulated.error.code === "INSUFFICIENT_INFORMATION"
            ? "MATERIAL_INFORMATION_MISSING"
            : "SIMULATION_REJECTED",
        message: simulated.error.message,
        missingFields: simulated.error.missingFields
      });
    }

    const option = toOneOffPurchaseResponse(
      alternativeRequest,
      correlationIdFor("simulate-monthly-timing-alternative", request.requestId),
      resolved.value.context,
      definition,
      simulated.value,
      this.dependencies.calendarMetadata,
      timingLabel(request.targetPaymentPeriod)
    );
    const persisted = await saveIdempotentSimulationRun(
      this.dependencies.runStore,
      alternativeRequest,
      option
    );
    if (!persisted.ok) return err(persisted.error);
    return ok({
      apiVersion: API_VERSION,
      schemaVersion: TIMING_ALTERNATIVE_RESPONSE_SCHEMA,
      kind: "timing_alternative",
      requestId: request.requestId,
      correlationId: correlationIdFor("simulate-monthly-timing-alternative", request.requestId),
      sourceScenarioId: sourceId,
      baselineId: resolved.value.baseline.baselineId,
      contextVersion: resolved.value.context.version,
      option: persisted.value
    });
  }
}
