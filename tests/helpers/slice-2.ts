import type { SimulatorApplicationDependencies } from "../../src/application/use-cases/dependencies";
import { SLICE_1_RULES } from "../../src/domain/simulator/engine";
import {
  ENGLAND_WALES_CALENDAR_METADATA,
  ENGLAND_WALES_WORKING_DAY_CALENDAR
} from "../../src/fixtures/calendar/england-wales-bank-holidays";
import { SARAH_V1_CONTEXT } from "../../src/fixtures/sarah-v1";
import { SarahV1ContextSource } from "../../src/infrastructure/context/sarah-v1-context-source";
import { InMemorySimulationRunStore } from "../../src/infrastructure/runs/in-memory-simulation-run-store";

export function slice2TestDependencies(): SimulatorApplicationDependencies {
  return {
    contextSource: new SarahV1ContextSource(),
    rules: SLICE_1_RULES,
    calendar: ENGLAND_WALES_WORKING_DAY_CALENDAR,
    calendarMetadata: ENGLAND_WALES_CALENDAR_METADATA,
    runStore: new InMemorySimulationRunStore()
  };
}

export const SARAH_CONTEXT_VERSION = SARAH_V1_CONTEXT.version;

export function containsRuntimeBigInt(value: unknown): boolean {
  if (typeof value === "bigint") return true;
  if (Array.isArray(value)) return value.some(containsRuntimeBigInt);
  if (value !== null && typeof value === "object") {
    return Object.values(value as Record<string, unknown>).some(containsRuntimeBigInt);
  }
  return false;
}

export function assertPlainJsonTree(value: unknown, path = "$"): void {
  if (
    typeof value === "bigint" ||
    typeof value === "function" ||
    typeof value === "undefined" ||
    value instanceof Date ||
    value instanceof Map ||
    value instanceof Set
  ) {
    throw new TypeError(`Non-JSON value at ${path}: ${Object.prototype.toString.call(value)}`);
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertPlainJsonTree(item, `${path}[${index}]`));
    return;
  }
  if (value !== null && typeof value === "object") {
    for (const [key, item] of Object.entries(value)) {
      assertPlainJsonTree(item, `${path}.${key}`);
    }
  }
}
