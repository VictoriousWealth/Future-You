import { formatMoney } from "../../domain/shared/money";
import { err, ok, type Result } from "../../domain/shared/result";
import {
  generateAmountAlternativeCandidates,
  withPurchaseAmount
} from "../../domain/simulator/alternatives";
import { simulateOneOffPurchase } from "../../domain/simulator/engine";
import {
  AMOUNT_ALTERNATIVES_RESPONSE_SCHEMA,
  API_VERSION,
  type AmountAlternativesRequestDTO,
  type AmountAlternativesResponseDTO,
  type OneOffPurchaseResponseDTO
} from "../dto/contracts";
import type { ApplicationError } from "../errors/application-error";
import { toOneOffPurchaseResponse } from "../mappers/domain-to-dto";
import { oneOffPurchaseRequestToDomain } from "../mappers/request-to-domain";
import type { SimulatorApplicationDependencies } from "./dependencies";
import { correlationIdFor, resolveCurrentBaseline } from "./resolve-current-baseline";
import { scenarioIdFor } from "./simulate-one-off-purchase";
import { inputIdentity } from "../../domain/shared/identity";
import {
  findIdempotentSimulationRun,
  saveIdempotentSimulationRun
} from "./idempotent-simulation-run";

export class GenerateAmountAlternativesUseCase {
  constructor(private readonly dependencies: SimulatorApplicationDependencies) {}

  async execute(
    request: AmountAlternativesRequestDTO
  ): Promise<Result<AmountAlternativesResponseDTO, ApplicationError>> {
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
        code:
          !sourceDefinition.ok && sourceDefinition.error.code === "INVALID_MONEY"
            ? "INVALID_MONEY"
            : "SIMULATION_REJECTED",
        message: sourceDefinition.ok
          ? "Amount alternatives require a one-off purchase."
          : sourceDefinition.error.message,
        missingFields: sourceDefinition.ok ? [] : sourceDefinition.error.missingFields
      });
    }

    const candidates = generateAmountAlternativeCandidates(sourceDefinition.value.change.amount);
    const options: OneOffPurchaseResponseDTO[] = [];

    for (const candidate of candidates) {
      const isSource = candidate.minor === sourceDefinition.value.change.amount.minor;
      const definition = isSource
        ? sourceDefinition.value
        : withPurchaseAmount(
            sourceDefinition.value,
            `scenario-${inputIdentity({
              derivedFromScenarioId: sourceId,
              amountMinor: candidate.minor.toString()
            }).slice("fnv1a64:".length)}`,
            candidate
          );
      const candidateRequest = isSource
        ? request.source
        : { ...request.source, requestId: `${request.requestId}_${options.length}` };
      const existing = await findIdempotentSimulationRun(
        this.dependencies.runStore,
        candidateRequest
      );
      if (!existing.ok) return err(existing.error);
      if (existing.value) {
        options.push(existing.value.result);
        continue;
      }
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
      const response = toOneOffPurchaseResponse(
        candidateRequest,
        correlationIdFor("generate-amount-alternative", candidateRequest.requestId),
        resolved.value.context,
        definition,
        simulated.value,
        this.dependencies.calendarMetadata,
        isSource ? undefined : `${formatMoney(candidate)} option`
      );
      const persisted = await saveIdempotentSimulationRun(
        this.dependencies.runStore,
        candidateRequest,
        response
      );
      if (!persisted.ok) return err(persisted.error);
      options.push(persisted.value);
    }

    return ok({
      apiVersion: API_VERSION,
      schemaVersion: AMOUNT_ALTERNATIVES_RESPONSE_SCHEMA,
      kind: "amount_alternatives",
      requestId: request.requestId,
      correlationId: correlationIdFor("generate-amount-alternatives", request.requestId),
      sourceScenarioId: sourceId,
      baselineId: resolved.value.baseline.baselineId,
      contextVersion: resolved.value.context.version,
      options
    });
  }
}
