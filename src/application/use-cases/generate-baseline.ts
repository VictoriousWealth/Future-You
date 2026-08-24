import { err, ok, type Result } from "../../domain/shared/result";
import type { BaselineRequestDTO, BaselineResponseDTO } from "../dto/contracts";
import type { ApplicationError } from "../errors/application-error";
import { toBaselineResponse } from "../mappers/domain-to-dto";
import type { SimulatorApplicationDependencies } from "./dependencies";
import { correlationIdFor, resolveCurrentBaseline } from "./resolve-current-baseline";

export class GenerateBaselineUseCase {
  constructor(private readonly dependencies: SimulatorApplicationDependencies) {}

  async execute(
    request: BaselineRequestDTO
  ): Promise<Result<BaselineResponseDTO, ApplicationError>> {
    const resolved = await resolveCurrentBaseline(
      this.dependencies,
      request.expectedContextVersionId
    );
    if (!resolved.ok) return err(resolved.error);
    const correlationId = correlationIdFor("generate-baseline", request.requestId);
    return ok(
      toBaselineResponse(
        request.requestId,
        correlationId,
        resolved.value.context,
        resolved.value.baseline,
        this.dependencies.calendarMetadata
      )
    );
  }
}
