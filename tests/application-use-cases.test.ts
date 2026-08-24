import { describe, expect, it } from "vitest";
import { GenerateAmountAlternativesUseCase } from "../src/application/use-cases/generate-amount-alternatives";
import { GenerateBaselineUseCase } from "../src/application/use-cases/generate-baseline";
import { GetCurrentFinancialContextUseCase } from "../src/application/use-cases/get-current-financial-context";
import { GetScenarioComparisonUseCase } from "../src/application/use-cases/get-scenario-comparison";
import { GetSimulationRunUseCase } from "../src/application/use-cases/get-simulation-run";
import { ListScenarioOptionsUseCase } from "../src/application/use-cases/list-scenario-options";
import { SimulateMonthlyTimingAlternativeUseCase } from "../src/application/use-cases/simulate-monthly-timing-alternative";
import { SimulateOneOffPurchaseUseCase } from "../src/application/use-cases/simulate-one-off-purchase";
import { SARAH_V1_BROWSER_PROOF_COMMAND } from "../src/server/sarah-v1-demo-command";
import {
  containsRuntimeBigInt,
  slice2TestDependencies
} from "./helpers/slice-2";

describe("Slice 2 application use cases", () => {
  it("returns a JSON-safe current context from the replaceable Sarah source", async () => {
    const result = await new GetCurrentFinancialContextUseCase(slice2TestDependencies()).execute();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.context.currentAccount).toMatchObject({
      clearedBalance: { currency: "GBP", minorUnits: "275000", display: "£2750.00" },
      reservedSpending: { currency: "GBP", minorUnits: "185000", display: "£1850.00" },
      overdraftLimit: { currency: "GBP", minorUnits: "50000", display: "£500.00" },
      overdraftIncludedAsCash: false
    });
    expect(result.value.calendar.coverage).toMatchObject({
      start: "2026-01-01",
      end: "2028-12-31"
    });
    expect(() => JSON.stringify(result.value)).not.toThrow();
    expect(containsRuntimeBigInt(result.value)).toBe(false);
  });

  it("generates the current path with explicit calculation and fallback metadata", async () => {
    const result = await new GenerateBaselineUseCase(slice2TestDependencies()).execute({
      requestId: "req_baseline_slice_2",
      expectedContextVersionId: SARAH_V1_BROWSER_PROOF_COMMAND.expectedContextVersionId
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.calculation).toMatchObject({
      runId: expect.stringMatching(/^run-[a-f0-9]{16}$/),
      rulesVersion: "fy-sim/1.0.0",
      contextVersion: SARAH_V1_BROWSER_PROOF_COMMAND.expectedContextVersionId,
      projectionHorizon: {
        detailedPeriods: 6,
        classificationAllocationEvents: 6,
        maximumGoalAllocationEvents: 120
      },
      calendar: {
        committedFixtureUsed: true,
        fallbackUsed: true,
        firstFallbackPeriod: "2029-01"
      }
    });
    expect(result.value.baseline.periods).toHaveLength(6);
  });

  it("simulates £650 with exact money, ratio, goals, confidence and exclusions", async () => {
    const result = await new SimulateOneOffPurchaseUseCase(slice2TestDependencies()).execute(
      SARAH_V1_BROWSER_PROOF_COMMAND
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.scenario.id).toMatch(/^scenario-[a-f0-9]{16}$/);
    expect(result.value.result.comparison.classification).toMatchObject({
      code: "AFFORDABLE_SIGNIFICANT_TRADE_OFF",
      minimumSafetyBuffer: { currency: "GBP", minorUnits: "25000", display: "£250.00" },
      minimumBufferRatio: {
        numerator: "25000",
        denominator: "90000",
        basisPoints: 2778,
        display: "27.78%"
      },
      recoveryCycles: 2,
      goalShortfall: { currency: "GBP", minorUnits: "65000", display: "£650.00" }
    });
    expect(result.value.presentation.immediateImpact).toEqual({
      cashBefore: "£2750",
      cashAfter: "£2100",
      safetyBufferBefore: "£900",
      safetyBufferAfter: "£250",
      requiredPayments: "Bills covered",
      borrowing: "£0 overdraft",
      recovery: "Restored in November 2026"
    });
    expect(result.value.presentation.confidence).toBe("Medium confidence");
    expect(result.value.excludedOpportunities).toEqual([]);
    expect(result.value.calculation.calendar).toMatchObject({
      fallbackUsed: true,
      firstFallbackPeriod: "2029-01"
    });
  });

  it("generates £650, £500 and £400 as independent amount branches", async () => {
    const dependencies = slice2TestDependencies();
    const result = await new GenerateAmountAlternativesUseCase(dependencies).execute({
      requestId: "req_amount_options",
      source: SARAH_V1_BROWSER_PROOF_COMMAND
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.options.map((option) => option.scenario.label)).toEqual([
      "£650 trip",
      "£500 option",
      "£400 option"
    ]);
    expect(
      result.value.options.map((option) => ({
        amount: option.scenario.change.amount.minorUnits,
        buffer: option.result.comparison.classification.minimumSafetyBuffer.minorUnits,
        classification: option.result.comparison.classification.code,
        emergency: option.presentation.goalImpacts[0]?.scenarioCompletion
      }))
    ).toEqual([
      {
        amount: "65000",
        buffer: "25000",
        classification: "AFFORDABLE_SIGNIFICANT_TRADE_OFF",
        emergency: "February 2027"
      },
      {
        amount: "50000",
        buffer: "40000",
        classification: "AFFORDABLE_SIGNIFICANT_TRADE_OFF",
        emergency: "January 2027"
      },
      {
        amount: "40000",
        buffer: "50000",
        classification: "AFFORDABLE_NOTICEABLE_TRADE_OFF",
        emergency: "January 2027"
      }
    ]);
    const ids = result.value.options.map((option) => option.scenario.id);
    expect(new Set(ids).size).toBe(3);
    expect(result.value.options.slice(1).every((option) => option.scenario.derivedFromScenarioId === ids[0])).toBe(true);
  });

  it("moves the £650 pressure to October without changing the frozen goal dates", async () => {
    const result = await new SimulateMonthlyTimingAlternativeUseCase(
      slice2TestDependencies()
    ).execute({
      requestId: "req_october_option",
      source: SARAH_V1_BROWSER_PROOF_COMMAND,
      targetPaymentPeriod: "2026-10"
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.option.scenario).toMatchObject({
      label: "Go in October",
      parentScenarioId: null,
      derivedFromScenarioId: result.value.sourceScenarioId,
      change: { paymentPeriod: "2026-10" }
    });
    expect(result.value.option.result.comparison.classification.minimumSafetyBuffer.minorUnits).toBe("25000");
    expect(result.value.option.presentation.goalImpacts.map((goal) => goal.scenarioCompletion)).toEqual([
      "February 2027",
      "July 2029",
      "June 2027"
    ]);
    expect(result.value.option.result.projection.minimumBalanceDate?.slice(0, 7)).toBe("2026-10");
  });

  it("lists Current, £650, £500, £400 and October without making selection financial state", async () => {
    const result = await new ListScenarioOptionsUseCase(slice2TestDependencies()).execute({
      requestId: "req_scenario_set",
      source: SARAH_V1_BROWSER_PROOF_COMMAND,
      timingAlternativePeriod: "2026-10"
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.options.map((option) => option.label)).toEqual([
      "Your current path",
      "£650 trip",
      "£500 option",
      "£400 option",
      "Go in October"
    ]);
    expect(result.value.selectionAffectsFinancialState).toBe(false);
    expect(result.value.options.filter((option) => option.initiallySelected).map((option) => option.id)).toEqual([
      result.value.selectedScenarioId
    ]);
  });

  it("stores a JSON DTO run and retrieves its comparison without re-simulation", async () => {
    const dependencies = slice2TestDependencies();
    const simulated = await new SimulateOneOffPurchaseUseCase(dependencies).execute(
      SARAH_V1_BROWSER_PROOF_COMMAND
    );
    expect(simulated.ok).toBe(true);
    if (!simulated.ok) return;
    const retrieved = await new GetSimulationRunUseCase(dependencies).execute(
      simulated.value.calculation.runId
    );
    expect(retrieved).toEqual(simulated);
    const comparison = await new GetScenarioComparisonUseCase(dependencies).execute({
      requestId: "req_comparison",
      runId: simulated.value.calculation.runId
    });
    expect(comparison).toMatchObject({
      ok: true,
      value: {
        comparison: { classification: { code: "AFFORDABLE_SIGNIFICANT_TRADE_OFF" } }
      }
    });
  });

  it("is idempotent and leaves the baseline unchanged across repeated scenarios", async () => {
    const dependencies = slice2TestDependencies();
    const useCase = new SimulateOneOffPurchaseUseCase(dependencies);
    const baselineBefore = await new GenerateBaselineUseCase(dependencies).execute({
      requestId: "req_baseline_before",
      expectedContextVersionId: SARAH_V1_BROWSER_PROOF_COMMAND.expectedContextVersionId
    });
    const first = await useCase.execute(SARAH_V1_BROWSER_PROOF_COMMAND);
    const second = await useCase.execute(SARAH_V1_BROWSER_PROOF_COMMAND);
    const baselineAfter = await new GenerateBaselineUseCase(dependencies).execute({
      requestId: "req_baseline_after",
      expectedContextVersionId: SARAH_V1_BROWSER_PROOF_COMMAND.expectedContextVersionId
    });
    expect(first).toEqual(second);
    expect(baselineBefore.ok && baselineAfter.ok).toBe(true);
    if (baselineBefore.ok && baselineAfter.ok) {
      expect(baselineBefore.value.baseline).toEqual(baselineAfter.value.baseline);
    }
  });

  it("returns typed stale and absent-context errors without a partial result", async () => {
    const stale = await new SimulateOneOffPurchaseUseCase(slice2TestDependencies()).execute({
      ...SARAH_V1_BROWSER_PROOF_COMMAND,
      expectedContextVersionId: "stale-context-version"
    });
    expect(stale).toMatchObject({ ok: false, error: { code: "CONTEXT_VERSION_MISMATCH" } });

    const dependencies = slice2TestDependencies();
    const absent = await new GenerateBaselineUseCase({
      ...dependencies,
      contextSource: {
        getCurrentContextVersionId: async () => null,
        getContextVersion: async () => null
      }
    }).execute({ requestId: "req_no_context", expectedContextVersionId: "missing" });
    expect(absent).toMatchObject({ ok: false, error: { code: "CONTEXT_NOT_FOUND" } });
  });
});
