import { canonicalStringify } from "../../domain/shared/identity";
import {
  API_VERSION,
  SCENARIO_RESPONSE_SCHEMA,
  type OneOffPurchaseRequestDTO,
  type OneOffPurchaseResponseDTO
} from "../../application/dto/contracts";
import type { Json } from "../supabase/database.types";
import { PersistenceBoundaryError } from "./persistence-errors";

const SIGNED_INTEGER = /^-?(0|[1-9]\d*)$/;

function exactMoneyDisplay(minorUnits: string): string {
  const minor = BigInt(minorUnits);
  const sign = minor < 0n ? "-" : "";
  const absolute = minor < 0n ? -minor : minor;
  return `${sign}£${absolute / 100n}.${(absolute % 100n).toString().padStart(2, "0")}`;
}

function validateJsonValue(value: unknown, path: string): Json {
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new PersistenceBoundaryError(
        "PERSISTED_DATA_INVALID",
        `Non-finite JSON number at ${path}.`
      );
    }
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item, index) => validateJsonValue(item, `${path}[${index}]`));
  }
  if (typeof value !== "object" || value === undefined) {
    throw new PersistenceBoundaryError(
      "PERSISTED_DATA_INVALID",
      `Non-JSON value at ${path}.`
    );
  }
  const source = value as Record<string, unknown>;
  if ("minorUnits" in source) {
    if (
      source.currency !== "GBP" ||
      typeof source.minorUnits !== "string" ||
      !SIGNED_INTEGER.test(source.minorUnits)
    ) {
      throw new PersistenceBoundaryError(
        "PERSISTED_DATA_INVALID",
        `Invalid exact-money representation at ${path}.`
      );
    }
    if (
      "display" in source &&
      (typeof source.display !== "string" || source.display !== exactMoneyDisplay(source.minorUnits))
    ) {
      throw new PersistenceBoundaryError(
        "PERSISTED_DATA_INVALID",
        `Money display does not match exact minor units at ${path}.`
      );
    }
  }
  if ("numerator" in source || "denominator" in source) {
    if (
      typeof source.numerator !== "string" ||
      !SIGNED_INTEGER.test(source.numerator) ||
      typeof source.denominator !== "string" ||
      !/^[1-9]\d*$/.test(source.denominator)
    ) {
      throw new PersistenceBoundaryError(
        "PERSISTED_DATA_INVALID",
        `Invalid exact-ratio representation at ${path}.`
      );
    }
  }
  return Object.fromEntries(
    Object.entries(source).map(([key, item]) => [key, validateJsonValue(item, `${path}.${key}`)])
  );
}

export function jsonValueToPersistence(value: unknown, path = "value"): Json {
  return validateJsonValue(value, path);
}

function record(value: unknown, path: string): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new PersistenceBoundaryError("PERSISTED_DATA_INVALID", `Expected object at ${path}.`);
  }
  return value as Record<string, unknown>;
}

function stringField(value: Record<string, unknown>, key: string, expected?: string): string {
  const field = value[key];
  if (typeof field !== "string" || field.length === 0 || (expected !== undefined && field !== expected)) {
    throw new PersistenceBoundaryError(
      "PERSISTED_DATA_INVALID",
      `Invalid persisted simulation field: ${key}.`
    );
  }
  return field;
}

export function simulationResponseToJson(response: OneOffPurchaseResponseDTO): Json {
  validateSimulationResponse(response);
  return validateJsonValue(response, "response");
}

export function requestToJson(request: OneOffPurchaseRequestDTO): Json {
  return validateJsonValue(request, "request");
}

export function validateSimulationResponse(value: unknown): asserts value is OneOffPurchaseResponseDTO {
  validateJsonValue(value, "response");
  const root = record(value, "response");
  stringField(root, "apiVersion", API_VERSION);
  stringField(root, "schemaVersion", SCENARIO_RESPONSE_SCHEMA);
  stringField(root, "kind", "one_off_purchase_simulation");
  stringField(root, "requestId");
  const calculation = record(root.calculation, "response.calculation");
  stringField(calculation, "runId");
  stringField(calculation, "rulesVersion");
  stringField(calculation, "calendarVersion");
  stringField(calculation, "contextVersion");
  stringField(calculation, "baselineId");
  stringField(calculation, "scenarioId");
  const context = record(root.context, "response.context");
  stringField(context, "id");
  stringField(context, "version", stringField(calculation, "contextVersion"));
  const scenario = record(root.scenario, "response.scenario");
  stringField(scenario, "id", stringField(calculation, "scenarioId"));
  stringField(scenario, "baselineId", stringField(calculation, "baselineId"));
  const result = record(root.result, "response.result");
  const comparison = record(result.comparison, "response.result.comparison");
  const classification = record(comparison.classification, "response.result.comparison.classification");
  stringField(classification, "code");
  const reproducibility = record(root.reproducibility, "response.reproducibility");
  stringField(reproducibility, "inputIdentity");
  stringField(reproducibility, "outputIdentity");
}

export function simulationResponseFromJson(value: unknown): OneOffPurchaseResponseDTO {
  validateSimulationResponse(value);
  return structuredClone(value);
}

export function jsonValuesEqual(left: unknown, right: unknown): boolean {
  return canonicalStringify(left) === canonicalStringify(right);
}
