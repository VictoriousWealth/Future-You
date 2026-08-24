import { err, ok, type Result } from "../../domain/shared/result";
import { resolveFinancialContext } from "../../domain/simulator/context";
import type { CurrentFinancialContextResponseDTO } from "../dto/contracts";
import type { ApplicationError } from "../errors/application-error";
import { toCurrentContextResponse } from "../mappers/domain-to-dto";
import type { SimulatorApplicationDependencies } from "./dependencies";
import { correlationIdFor } from "./resolve-current-baseline";

export class GetCurrentFinancialContextUseCase {
  constructor(private readonly dependencies: SimulatorApplicationDependencies) {}

  async execute(): Promise<Result<CurrentFinancialContextResponseDTO, ApplicationError>> {
    const currentVersionId = await this.dependencies.contextSource.getCurrentContextVersionId();
    const context = currentVersionId
      ? await this.dependencies.contextSource.getContextVersion(currentVersionId)
      : null;
    if (!context) {
      return err({
        code: "FINANCIAL_CONTEXT_NOT_FOUND",
        message: "No current financial context is available.",
        missingFields: ["currentFinancialContext"]
      });
    }
    const resolved = resolveFinancialContext(context);
    if (!resolved.ok) {
      return err({
        code: "SIMULATION_REJECTED",
        message: resolved.error.message,
        missingFields: resolved.error.missingFields
      });
    }
    return ok(
      toCurrentContextResponse(
        correlationIdFor("get-current-financial-context", context.version),
        context,
        resolved.value,
        this.dependencies.rules.version,
        this.dependencies.calendarMetadata
      )
    );
  }
}
