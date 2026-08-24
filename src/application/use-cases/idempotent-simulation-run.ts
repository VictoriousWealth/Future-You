import { inputIdentity } from "../../domain/shared/identity";
import { err, ok, type Result } from "../../domain/shared/result";
import type {
  OneOffPurchaseRequestDTO,
  OneOffPurchaseResponseDTO
} from "../dto/contracts";
import type { ApplicationError } from "../errors/application-error";
import type {
  SimulationRunStore,
  StoredSimulationRun
} from "../ports/simulation-run-store";

function reusedKeyError(): ApplicationError {
  return {
    code: "IDEMPOTENCY_KEY_REUSED",
    message: "This request ID has already been used for a different calculation request.",
    missingFields: []
  };
}

export function requestIdentityFor(request: OneOffPurchaseRequestDTO): string {
  return inputIdentity(request);
}

export async function findIdempotentSimulationRun(
  store: SimulationRunStore,
  request: OneOffPurchaseRequestDTO
): Promise<Result<StoredSimulationRun | null, ApplicationError>> {
  const existing = await store.findByRequestId(request.requestId);
  if (!existing) return ok(null);
  return existing.requestIdentity === requestIdentityFor(request)
    ? ok(existing)
    : err(reusedKeyError());
}

export async function saveIdempotentSimulationRun(
  store: SimulationRunStore,
  request: OneOffPurchaseRequestDTO,
  result: OneOffPurchaseResponseDTO
): Promise<Result<OneOffPurchaseResponseDTO, ApplicationError>> {
  const outcome = await store.save({
    request,
    requestIdentity: requestIdentityFor(request),
    result
  });
  return outcome.status === "conflict"
    ? err(reusedKeyError())
    : ok(outcome.stored.result);
}
