import "server-only";
import type { AuthenticatedPrincipal } from "../../application/auth/authenticated-principal";
import type {
  BaselineResponseDTO,
  OneOffPurchaseResponseDTO,
  ProjectionDTO
} from "../../application/dto/contracts";
import type {
  SimulationRunSaveCommand,
  SimulationRunSaveOutcome,
  SimulationRunStore,
  StoredSimulationRun
} from "../../application/ports/simulation-run-store";
import type { Json } from "../supabase/database.types";
import type { RequestSupabaseClient } from "../supabase/server-client";
import { PersistenceBoundaryError } from "../persistence/persistence-errors";
import {
  jsonValuesEqual,
  jsonValueToPersistence,
  requestToJson,
  simulationResponseFromJson,
  simulationResponseToJson
} from "../persistence/simulation-run-persistence";

const OPERATION = "simulate_one_off_purchase";

export class SupabaseSimulationRunStore implements SimulationRunStore {
  constructor(
    private readonly client: RequestSupabaseClient,
    private readonly principal: AuthenticatedPrincipal
  ) {}

  async saveBaseline(response: BaselineResponseDTO): Promise<void> {
    await this.insertOrVerifyBaseline(
      response.calculation.baselineId,
      response.context.version,
      response.calculation.rulesVersion,
      response.calculation.calendarVersion,
      response.baseline
    );
  }

  async findByRequestId(requestId: string): Promise<StoredSimulationRun | null> {
    const { data, error } = await this.client
      .from("simulation_runs")
      .select("run_id, request_identity, response_payload")
      .eq("user_id", this.principal.userId)
      .eq("request_id", requestId)
      .maybeSingle();
    if (error) throw this.failure("A stored simulation request could not be read.");
    if (!data) return null;
    await this.ensureRequestKey(requestId, data.request_identity, data.run_id);
    return {
      requestIdentity: data.request_identity,
      result: simulationResponseFromJson(data.response_payload)
    };
  }

  async save(command: SimulationRunSaveCommand): Promise<SimulationRunSaveOutcome> {
    const response = command.result;
    const responseJson = simulationResponseToJson(response);
    const requestJson = requestToJson(command.request);
    await this.insertOrVerifyBaseline(
      response.calculation.baselineId,
      response.context.version,
      response.calculation.rulesVersion,
      response.calculation.calendarVersion,
      response.baseline
    );
    await this.insertOrVerifyScenario(response, responseJson);
    const { error } = await this.client.from("simulation_runs").insert({
      user_id: this.principal.userId,
      run_id: response.calculation.runId,
      request_id: command.request.requestId,
      request_identity: command.requestIdentity,
      context_version_id: response.context.version,
      baseline_id: response.calculation.baselineId,
      scenario_id: response.scenario.id,
      parent_scenario_id: response.scenario.parentScenarioId,
      scenario_kind: "one_off_purchase",
      canonical_request: requestJson,
      material_assumptions: response.result.projection.assumptions as unknown as Json,
      rules_version: response.calculation.rulesVersion,
      calendar_version: response.calculation.calendarVersion,
      calendar_fallback_metadata: response.calculation.calendar as unknown as Json,
      projection_horizons: response.calculation.projectionHorizon as unknown as Json,
      deterministic_classification: response.result.comparison.classification.code,
      input_identity: response.reproducibility.inputIdentity,
      output_identity: response.reproducibility.outputIdentity,
      response_schema_version: response.schemaVersion,
      response_payload: responseJson
    });
    if (error && error.code !== "23505") {
      throw this.failure("The simulation run could not be persisted.");
    }
    const authoritative = await this.findByRequestId(command.request.requestId);
    if (!authoritative) {
      throw this.failure("The persisted simulation run could not be read back.");
    }
    if (authoritative.requestIdentity !== command.requestIdentity) return { status: "conflict" };
    if (!jsonValuesEqual(authoritative.result, response)) {
      throw new PersistenceBoundaryError(
        "PERSISTED_DATA_INVALID",
        "The authoritative simulation response did not match the deterministic result."
      );
    }
    return {
      status: error ? "existing" : "created",
      stored: authoritative
    };
  }

  async get(runId: string): Promise<OneOffPurchaseResponseDTO | null> {
    const { data, error } = await this.client
      .from("simulation_runs")
      .select("response_payload")
      .eq("user_id", this.principal.userId)
      .eq("run_id", runId)
      .maybeSingle();
    if (error) throw this.failure("The stored simulation run could not be read.");
    return data ? simulationResponseFromJson(data.response_payload) : null;
  }

  private async insertOrVerifyBaseline(
    baselineId: string,
    contextVersion: string,
    rulesVersion: string,
    calendarVersion: string,
    baseline: ProjectionDTO
  ) {
    const projectionPayload = jsonValueToPersistence(baseline, "baseline");
    const { error } = await this.client.from("simulation_baselines").insert({
      user_id: this.principal.userId,
      baseline_id: baselineId,
      context_version_id: contextVersion,
      rules_version: rulesVersion,
      calendar_version: calendarVersion,
      input_identity: baseline.identity.inputIdentity,
      projection_payload: projectionPayload
    });
    if (error && error.code !== "23505") throw this.failure("The simulation baseline could not be persisted.");
    const { data, error: readError } = await this.client
      .from("simulation_baselines")
      .select("projection_payload")
      .eq("user_id", this.principal.userId)
      .eq("baseline_id", baselineId)
      .maybeSingle();
    if (readError || !data || !jsonValuesEqual(data.projection_payload, baseline)) {
      throw new PersistenceBoundaryError(
        "PERSISTED_DATA_INVALID",
        "The immutable baseline identity collided with different content."
      );
    }
  }

  private async insertOrVerifyScenario(response: OneOffPurchaseResponseDTO, responseJson: Json) {
    const scenarioPayload = {
      ...(responseJson as Record<string, Json | undefined>).scenario as Record<string, Json | undefined>,
      scenarioKind: "one_off_purchase"
    } satisfies Json;
    const { error } = await this.client.from("scenarios").insert({
      user_id: this.principal.userId,
      scenario_id: response.scenario.id,
      baseline_id: response.scenario.baselineId,
      context_version_id: response.scenario.contextVersion,
      parent_scenario_id: response.scenario.parentScenarioId,
      derived_from_scenario_id: response.scenario.derivedFromScenarioId,
      scenario_kind: "one_off_purchase",
      definition_payload: scenarioPayload
    });
    if (error && error.code !== "23505") throw this.failure("The scenario definition could not be persisted.");
    const { data, error: readError } = await this.client
      .from("scenarios")
      .select("definition_payload")
      .eq("user_id", this.principal.userId)
      .eq("scenario_id", response.scenario.id)
      .maybeSingle();
    if (readError || !data || !jsonValuesEqual(data.definition_payload, scenarioPayload)) {
      throw new PersistenceBoundaryError(
        "PERSISTED_DATA_INVALID",
        "The immutable scenario identity collided with different content."
      );
    }
  }

  private async ensureRequestKey(requestId: string, requestIdentity: string, runId: string) {
    const { error } = await this.client.from("api_request_keys").insert({
      user_id: this.principal.userId,
      request_id: requestId,
      operation: OPERATION,
      request_identity: requestIdentity,
      run_id: runId
    });
    if (error && error.code !== "23505") throw this.failure("The request idempotency key could not be persisted.");
    const { data, error: readError } = await this.client
      .from("api_request_keys")
      .select("request_identity, run_id")
      .eq("user_id", this.principal.userId)
      .eq("operation", OPERATION)
      .eq("request_id", requestId)
      .maybeSingle();
    if (
      readError ||
      !data ||
      data.request_identity !== requestIdentity ||
      data.run_id !== runId
    ) {
      throw new PersistenceBoundaryError(
        "PERSISTED_DATA_INVALID",
        "The request idempotency key did not match its authoritative run."
      );
    }
  }

  private failure(message: string): PersistenceBoundaryError {
    return new PersistenceBoundaryError("PERSISTENCE_FAILURE", message);
  }
}
