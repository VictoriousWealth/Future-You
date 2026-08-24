import type {
  AmountAlternativesRequestDTO,
  AmountAlternativesResponseDTO,
  BaselineRequestDTO,
  BaselineResponseDTO,
  OneOffPurchaseRequestDTO,
  OneOffPurchaseResponseDTO,
  TimingAlternativeRequestDTO,
  TimingAlternativeResponseDTO
} from "../dto/contracts";
import type { ApplicationError } from "../errors/application-error";
import type { Result } from "../../domain/shared/result";

export interface ConversationSimulator {
  readonly getCurrentPath: {
    execute(request: BaselineRequestDTO): Promise<Result<BaselineResponseDTO, ApplicationError>>;
  };
  readonly simulateOneOffPurchase: {
    execute(request: OneOffPurchaseRequestDTO): Promise<Result<OneOffPurchaseResponseDTO, ApplicationError>>;
  };
  readonly generateAmountAlternatives: {
    execute(request: AmountAlternativesRequestDTO): Promise<Result<AmountAlternativesResponseDTO, ApplicationError>>;
  };
  readonly simulateMonthlyTimingAlternative: {
    execute(request: TimingAlternativeRequestDTO): Promise<Result<TimingAlternativeResponseDTO, ApplicationError>>;
  };
  readonly getSimulationRun: {
    execute(runId: string): Promise<Result<OneOffPurchaseResponseDTO, ApplicationError>>;
  };
}
