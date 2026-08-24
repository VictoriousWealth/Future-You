import { err, ok, type Result } from "../../domain/shared/result";
import { generateBaseline } from "../../domain/simulator/engine";
import type { BaselineRequestDTO, BaselineResponseDTO } from "../dto/contracts";
import type { ApplicationError } from "../errors/application-error";
import { toBaselineResponse } from "../mappers/domain-to-dto";
import type { SimulatorApplicationDependencies } from "./dependencies";
import { baselineIdFor, correlationIdFor } from "./resolve-current-baseline";

export class GetCurrentPathUseCase {
  constructor(private readonly dependencies: SimulatorApplicationDependencies) {}

  async execute(
    request: BaselineRequestDTO
  ): Promise<Result<BaselineResponseDTO, ApplicationError>> {
    const context = await this.dependencies.contextSource.getContextVersion(
      request.expectedContextVersionId
    );
    if (!context) {
      return err({
        code: "CONTEXT_NOT_FOUND",
        message: "The requested financial context version was not found.",
        missingFields: ["contextVersionId"]
      });
    }
    const baseline = generateBaseline({
      baselineId: baselineIdFor(context, this.dependencies),
      context,
      rules: this.dependencies.rules,
      calendar: this.dependencies.calendar
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
    return ok(
      toBaselineResponse(
        request.requestId,
        correlationIdFor("get-current-path", request.requestId),
        context,
        baseline.value,
        this.dependencies.calendarMetadata
      )
    );
  }
}
