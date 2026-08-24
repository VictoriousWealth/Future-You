import { localDate, yearMonth } from "../../domain/shared/date";
import { moneyFromMinor } from "../../domain/shared/money";
import { err } from "../../domain/shared/result";
import { createOneOffPurchaseScenario } from "../../domain/simulator/engine";
import type {
  ScenarioDefinition,
  SimulationOutcome
} from "../../domain/simulator/types";
import type { OneOffPurchaseRequestDTO } from "../dto/contracts";

export function oneOffPurchaseRequestToDomain(
  request: OneOffPurchaseRequestDTO,
  baselineId: string,
  scenarioId: string
): SimulationOutcome<ScenarioDefinition> {
  const amount = moneyFromMinor("GBP", BigInt(request.change.amount.minorUnits));
  if (!amount.ok) {
    return err({
      code: "INVALID_MONEY",
      message: amount.error.message,
      missingFields: []
    });
  }
  const period = yearMonth(request.change.paymentPeriod);
  if (!period.ok) {
    return err({ code: "INVALID_CONTEXT", message: "Invalid payment period.", missingFields: [] });
  }
  const parsedDate =
    request.change.paymentDate === undefined || request.change.paymentDate === null
      ? null
      : localDate(request.change.paymentDate);
  if (parsedDate !== null && !parsedDate.ok) {
    return err({ code: "INVALID_CONTEXT", message: "Invalid payment date.", missingFields: [] });
  }

  return createOneOffPurchaseScenario({
    id: scenarioId,
    baselineId,
    amount: amount.value,
    purpose: request.change.purpose,
    paymentPeriod: period.value,
    paymentDate: parsedDate?.value ?? null,
    datePrecision: request.change.datePrecision === "exact" ? "EXACT" : "MONTH"
  });
}
