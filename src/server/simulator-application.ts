import { GetCurrentFinancialContextUseCase } from "../application/use-cases/get-current-financial-context";
import { GetCurrentPathUseCase } from "../application/use-cases/get-current-path";
import { GenerateBaselineUseCase } from "../application/use-cases/generate-baseline";
import { GenerateAmountAlternativesUseCase } from "../application/use-cases/generate-amount-alternatives";
import { GetScenarioComparisonUseCase } from "../application/use-cases/get-scenario-comparison";
import { GetSimulationRunUseCase } from "../application/use-cases/get-simulation-run";
import { ListScenarioOptionsUseCase } from "../application/use-cases/list-scenario-options";
import { SimulateMonthlyTimingAlternativeUseCase } from "../application/use-cases/simulate-monthly-timing-alternative";
import { SimulateOneOffPurchaseUseCase } from "../application/use-cases/simulate-one-off-purchase";
import type { SimulatorApplicationDependencies } from "../application/use-cases/dependencies";

export function createSimulatorApplication(dependencies: SimulatorApplicationDependencies) {
  return Object.freeze({
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
}

export type SimulatorApplication = ReturnType<typeof createSimulatorApplication>;
