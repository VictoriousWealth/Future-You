import { err, ok, type Result } from "../../domain/shared/result";
import {
  API_VERSION,
  SCENARIO_OPTIONS_RESPONSE_SCHEMA,
  type ScenarioOptionDTO,
  type ScenarioOptionsRequestDTO,
  type ScenarioOptionsResponseDTO
} from "../dto/contracts";
import type { ApplicationError } from "../errors/application-error";
import { baselinePresentation, toBaselineResponse } from "../mappers/domain-to-dto";
import type { SimulatorApplicationDependencies } from "./dependencies";
import { GenerateAmountAlternativesUseCase } from "./generate-amount-alternatives";
import { correlationIdFor, resolveCurrentBaseline } from "./resolve-current-baseline";
import { SimulateMonthlyTimingAlternativeUseCase } from "./simulate-monthly-timing-alternative";

export class ListScenarioOptionsUseCase {
  constructor(private readonly dependencies: SimulatorApplicationDependencies) {}

  async execute(
    request: ScenarioOptionsRequestDTO
  ): Promise<Result<ScenarioOptionsResponseDTO, ApplicationError>> {
    const amounts = await new GenerateAmountAlternativesUseCase(this.dependencies).execute({
      requestId: `${request.requestId}_amounts`,
      source: request.source
    });
    if (!amounts.ok) return err(amounts.error);

    const timing = await new SimulateMonthlyTimingAlternativeUseCase(this.dependencies).execute({
      requestId: `${request.requestId}_timing`,
      source: request.source,
      targetPaymentPeriod: request.timingAlternativePeriod
    });
    if (!timing.ok) return err(timing.error);

    const resolved = await resolveCurrentBaseline(
      this.dependencies,
      request.source.expectedContextVersionId
    );
    if (!resolved.ok) return err(resolved.error);
    const baselineResponse = toBaselineResponse(
      `${request.requestId}_baseline`,
      correlationIdFor("list-scenario-options-baseline", request.requestId),
      resolved.value.context,
      resolved.value.baseline,
      this.dependencies.calendarMetadata
    );

    const source = amounts.value.options[0];
    if (!source) {
      return err({
        code: "INTERNAL_SIMULATOR_FAILURE",
        message: "The scenario option set did not contain its source scenario.",
        missingFields: []
      });
    }

    const current: ScenarioOptionDTO = {
      id: baselineResponse.baseline.identity.baselineId,
      label: "Your current path",
      status: "current",
      baselineId: baselineResponse.baseline.identity.baselineId,
      parentScenarioId: null,
      derivedFromScenarioId: null,
      contextVersion: baselineResponse.context.version,
      isCurrent: true,
      isHypothetical: false,
      initiallySelected: false,
      selectionAffectsFinancialState: false,
      runId: baselineResponse.calculation.runId,
      rulesVersion: baselineResponse.calculation.rulesVersion,
      calendarVersion: baselineResponse.calculation.calendarVersion,
      presentation: baselinePresentation(resolved.value.context, resolved.value.baseline),
      simulation: null
    };
    const hypothetical: ScenarioOptionDTO[] = [
      ...amounts.value.options,
      timing.value.option
    ].map((simulation) => ({
      id: simulation.scenario.id,
      label: simulation.scenario.label,
      status: simulation.scenario.status,
      baselineId: simulation.scenario.baselineId,
      parentScenarioId: simulation.scenario.parentScenarioId,
      derivedFromScenarioId: simulation.scenario.derivedFromScenarioId,
      contextVersion: simulation.scenario.contextVersion,
      isCurrent: false,
      isHypothetical: true,
      initiallySelected: simulation.scenario.id === source.scenario.id,
      selectionAffectsFinancialState: false,
      runId: simulation.calculation.runId,
      rulesVersion: simulation.calculation.rulesVersion,
      calendarVersion: simulation.calculation.calendarVersion,
      presentation: simulation.presentation,
      simulation
    }));

    return ok({
      apiVersion: API_VERSION,
      schemaVersion: SCENARIO_OPTIONS_RESPONSE_SCHEMA,
      kind: "scenario_options",
      requestId: request.requestId,
      correlationId: correlationIdFor("list-scenario-options", request.requestId),
      baselineId: baselineResponse.baseline.identity.baselineId,
      contextVersion: baselineResponse.context.version,
      selectedScenarioId: source.scenario.id,
      selectionAffectsFinancialState: false,
      options: [current, ...hypothetical]
    });
  }
}
