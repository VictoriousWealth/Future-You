import { GetCurrentFinancialContextUseCase } from "../application/use-cases/get-current-financial-context";
import { GetCurrentPathUseCase } from "../application/use-cases/get-current-path";
import { GenerateBaselineUseCase } from "../application/use-cases/generate-baseline";
import { GenerateAmountAlternativesUseCase } from "../application/use-cases/generate-amount-alternatives";
import { GetScenarioComparisonUseCase } from "../application/use-cases/get-scenario-comparison";
import { GetSimulationRunUseCase } from "../application/use-cases/get-simulation-run";
import { ListScenarioOptionsUseCase } from "../application/use-cases/list-scenario-options";
import { SimulateMonthlyTimingAlternativeUseCase } from "../application/use-cases/simulate-monthly-timing-alternative";
import { SimulateOneOffPurchaseUseCase } from "../application/use-cases/simulate-one-off-purchase";
import { SLICE_1_RULES } from "../domain/simulator/engine";
import {
  ENGLAND_WALES_CALENDAR_METADATA,
  ENGLAND_WALES_WORKING_DAY_CALENDAR
} from "../fixtures/calendar/england-wales-bank-holidays";
import { SarahV1ContextSource } from "../infrastructure/context/sarah-v1-context-source";
import { InMemorySimulationRunStore } from "../infrastructure/runs/in-memory-simulation-run-store";

const runStore = new InMemorySimulationRunStore();

const dependencies = Object.freeze({
  contextSource: new SarahV1ContextSource(),
  rules: SLICE_1_RULES,
  calendar: ENGLAND_WALES_WORKING_DAY_CALENDAR,
  calendarMetadata: ENGLAND_WALES_CALENDAR_METADATA,
  runStore
});

export const slice2Application = Object.freeze({
  getCurrentFinancialContext: new GetCurrentFinancialContextUseCase(dependencies),
  getCurrentPath: new GetCurrentPathUseCase(dependencies),
  generateBaseline: new GenerateBaselineUseCase(dependencies),
  simulateOneOffPurchase: new SimulateOneOffPurchaseUseCase(dependencies),
  generateAmountAlternatives: new GenerateAmountAlternativesUseCase(dependencies),
  simulateMonthlyTimingAlternative: new SimulateMonthlyTimingAlternativeUseCase(dependencies),
  getScenarioComparison: new GetScenarioComparisonUseCase(dependencies),
  listScenarioOptions: new ListScenarioOptionsUseCase(dependencies),
  getSimulationRun: new GetSimulationRunUseCase(dependencies)
});
