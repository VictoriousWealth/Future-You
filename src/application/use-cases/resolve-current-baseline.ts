import { inputIdentity } from "../../domain/shared/identity";
import { err, ok, type Result } from "../../domain/shared/result";
import { generateBaseline } from "../../domain/simulator/engine";
import type { FinancialContextSnapshot, Projection } from "../../domain/simulator/types";
import type { ApplicationError } from "../errors/application-error";
import type { SimulatorApplicationDependencies } from "./dependencies";

export interface ResolvedCurrentBaseline {
  readonly context: FinancialContextSnapshot;
  readonly baseline: Projection;
}

export function baselineIdFor(
  context: FinancialContextSnapshot,
  dependencies: Pick<SimulatorApplicationDependencies, "rules" | "calendar">
): string {
  return `baseline-${inputIdentity({
    contextId: context.id,
    contextVersion: context.version,
    rulesVersion: dependencies.rules.version,
    calendarVersion: dependencies.calendar.version,
    horizon: dependencies.rules
  }).slice("fnv1a64:".length)}`;
}

export function correlationIdFor(operation: string, requestId: string): string {
  return `corr-${inputIdentity({ operation, requestId }).slice("fnv1a64:".length)}`;
}

export async function resolveCurrentBaseline(
  dependencies: SimulatorApplicationDependencies,
  expectedContextVersionId: string
): Promise<Result<ResolvedCurrentBaseline, ApplicationError>> {
  const currentVersionId = await dependencies.contextSource.getCurrentContextVersionId();
  if (!currentVersionId) {
    return err({
      code: "FINANCIAL_CONTEXT_NOT_FOUND",
      message: "No current financial context is available.",
      missingFields: ["currentFinancialContext"]
    });
  }
  if (currentVersionId !== expectedContextVersionId) {
    return err({
      code: "CONTEXT_VERSION_MISMATCH",
      message: "The requested context version is no longer current.",
      missingFields: []
    });
  }
  const context = await dependencies.contextSource.getContextVersion(expectedContextVersionId);
  if (!context) {
    return err({
      code: "CONTEXT_VERSION_NOT_FOUND",
      message: "The requested financial context version was not found.",
      missingFields: ["contextVersionId"]
    });
  }
  const baseline = generateBaseline({
    baselineId: baselineIdFor(context, dependencies),
    context,
    rules: dependencies.rules,
    calendar: dependencies.calendar
  });
  if (!baseline.ok) {
    return err({
      code:
        baseline.error.code === "INSUFFICIENT_INFORMATION"
          ? "MATERIAL_INFORMATION_MISSING"
          : "SIMULATION_REJECTED",
      message: baseline.error.message,
      missingFields: baseline.error.missingFields
    });
  }
  return ok({ context, baseline: baseline.value });
}
