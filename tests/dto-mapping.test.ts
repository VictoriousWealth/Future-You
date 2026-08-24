import { describe, expect, it } from "vitest";
import { applicationErrorToDTO } from "../src/application/mappers/error-to-dto";
import {
  moneyToDTO,
  projectionToDTO,
  ratioToDTO,
  toOneOffPurchaseResponse
} from "../src/application/mappers/domain-to-dto";
import { oneOffPurchaseRequestToDomain } from "../src/application/mappers/request-to-domain";
import type { OneOffPurchaseRequestDTO } from "../src/application/dto/contracts";
import { parseOneOffPurchaseRequest } from "../src/application/dto/request-validation";
import { mustYearMonth } from "../src/domain/shared/date";
import { gbp, signedGbp } from "../src/domain/shared/money";
import {
  withPurchaseAmount,
  withPurchasePeriod
} from "../src/domain/simulator/alternatives";
import { generateBaseline, simulateOneOffPurchase, SLICE_1_RULES } from "../src/domain/simulator/engine";
import type { Projection, ScenarioDefinition } from "../src/domain/simulator/types";
import {
  ENGLAND_WALES_CALENDAR_METADATA,
  ENGLAND_WALES_WORKING_DAY_CALENDAR
} from "../src/fixtures/calendar/england-wales-bank-holidays";
import { SARAH_V1_CONTEXT } from "../src/fixtures/sarah-v1";
import { SARAH_V1_BROWSER_PROOF_COMMAND } from "../src/server/sarah-v1-demo-command";
import { assertPlainJsonTree, containsRuntimeBigInt } from "./helpers/slice-2";

function domainBaseline(): Projection {
  const result = generateBaseline({
    baselineId: "baseline-mapper-proof",
    context: SARAH_V1_CONTEXT,
    rules: SLICE_1_RULES,
    calendar: ENGLAND_WALES_WORKING_DAY_CALENDAR
  });
  if (!result.ok) throw new Error(result.error.message);
  return result.value;
}

function sourceDefinition(baselineId: string): ScenarioDefinition {
  const result = oneOffPurchaseRequestToDomain(
    SARAH_V1_BROWSER_PROOF_COMMAND,
    baselineId,
    "scenario-mapper-650"
  );
  if (!result.ok) throw new Error(result.error.message);
  return result.value;
}

function requestFor(
  requestId: string,
  minorUnits: string,
  paymentPeriod = "2026-09"
): OneOffPurchaseRequestDTO {
  return {
    ...SARAH_V1_BROWSER_PROOF_COMMAND,
    requestId,
    change: {
      ...SARAH_V1_BROWSER_PROOF_COMMAND.change,
      amount: { currency: "GBP", minorUnits },
      paymentPeriod
    }
  };
}

function mapScenario(
  baseline: Projection,
  definition: ScenarioDefinition,
  request: OneOffPurchaseRequestDTO,
  label?: string
) {
  const result = simulateOneOffPurchase({
    baselineId: baseline.baselineId,
    baseline,
    context: SARAH_V1_CONTEXT,
    rules: SLICE_1_RULES,
    calendar: ENGLAND_WALES_WORKING_DAY_CALENDAR,
    scenario: definition
  });
  if (!result.ok) throw new Error(result.error.message);
  return toOneOffPurchaseResponse(
    request,
    `corr-${request.requestId}`,
    SARAH_V1_CONTEXT,
    definition,
    result.value,
    ENGLAND_WALES_CALENDAR_METADATA,
    label
  );
}

describe("explicit domain-to-DTO mapping", () => {
  it("keeps bigint in raw domain results and rejects implicit JSON serialization", () => {
    const baseline = domainBaseline();
    expect(typeof baseline.periods[0]?.closingCash.minor).toBe("bigint");
    expect(containsRuntimeBigInt(baseline)).toBe(true);
    expect(() => JSON.stringify(baseline)).toThrow(/BigInt/i);
  });

  it("maps zero, negative and large minor-unit values without number conversion", () => {
    expect(moneyToDTO(gbp(0))).toEqual({ currency: "GBP", minorUnits: "0", display: "£0.00" });
    expect(moneyToDTO(signedGbp(-12_345n))).toEqual({
      currency: "GBP",
      minorUnits: "-12345",
      display: "-£123.45"
    });
    expect(moneyToDTO(signedGbp(9_007_199_254_740_993n))).toEqual({
      currency: "GBP",
      minorUnits: "9007199254740993",
      display: "£90071992547409.93"
    });
  });

  it("maps rational values with deterministic integer half-up basis points", () => {
    expect(ratioToDTO({ numerator: 25_000n, denominator: 90_000n })).toEqual({
      numerator: "25000",
      denominator: "90000",
      basisPoints: 2778,
      display: "27.78%"
    });
    expect(ratioToDTO({ numerator: -1n, denominator: 3n })).toEqual({
      numerator: "-1",
      denominator: "3",
      basisPoints: -3333,
      display: "-33.33%"
    });
  });

  it("maps Sarah current path and preserves typed horizon exhaustion", () => {
    const baseline = domainBaseline();
    const exhausted: Projection = {
      ...baseline,
      goalCompletions: [
        {
          status: "NOT_REACHED_WITHIN_HORIZON",
          goalId: "goal-unreachable",
          projectedThrough: baseline.projectedThrough,
          allocationEventsEvaluated: 120
        }
      ]
    };
    const dto = projectionToDTO(exhausted, ENGLAND_WALES_CALENDAR_METADATA);
    expect(dto.periods[0]).toMatchObject({
      closingCash: { minorUnits: "275000", display: "£2750.00" },
      closingSafetyBuffer: { minorUnits: "90000", display: "£900.00" }
    });
    expect(dto.goalCompletions).toEqual([
      {
        status: "NOT_REACHED_WITHIN_HORIZON",
        goalId: "goal-unreachable",
        projectedThrough: baseline.projectedThrough,
        horizonAllocationEvents: 120
      }
    ]);
  });

  it("maps the £650, £500, £400 and October branches independently", () => {
    const baseline = domainBaseline();
    const source = sourceDefinition(baseline.baselineId);
    const option500 = withPurchaseAmount(source, "scenario-mapper-500", gbp(50_000));
    const option400 = withPurchaseAmount(source, "scenario-mapper-400", gbp(40_000));
    const october = withPurchasePeriod(source, "scenario-mapper-oct", mustYearMonth("2026-10"));
    const mapped = [
      mapScenario(baseline, source, requestFor("req-map-650", "65000")),
      mapScenario(baseline, option500, requestFor("req-map-500", "50000"), "£500 option"),
      mapScenario(baseline, option400, requestFor("req-map-400", "40000"), "£400 option"),
      mapScenario(baseline, october, requestFor("req-map-oct", "65000", "2026-10"), "Go in October")
    ];
    expect(
      mapped.map((dto) => ({
        label: dto.scenario.label,
        buffer: dto.result.comparison.classification.minimumSafetyBuffer.minorUnits,
        class: dto.result.comparison.classification.code,
        recovery: dto.presentation.immediateImpact.recovery,
        goals: dto.presentation.goalImpacts.map((goal) => goal.scenarioCompletion)
      }))
    ).toEqual([
      {
        label: "£650 trip",
        buffer: "25000",
        class: "AFFORDABLE_SIGNIFICANT_TRADE_OFF",
        recovery: "Restored in November 2026",
        goals: ["February 2027", "July 2029", "June 2027"]
      },
      {
        label: "£500 option",
        buffer: "40000",
        class: "AFFORDABLE_SIGNIFICANT_TRADE_OFF",
        recovery: "Restored in October 2026",
        goals: ["January 2027", "June 2029", "June 2027"]
      },
      {
        label: "£400 option",
        buffer: "50000",
        class: "AFFORDABLE_NOTICEABLE_TRADE_OFF",
        recovery: "Restored in October 2026",
        goals: ["January 2027", "June 2029", "June 2027"]
      },
      {
        label: "Go in October",
        buffer: "25000",
        class: "AFFORDABLE_SIGNIFICANT_TRADE_OFF",
        recovery: "Restored in November 2026",
        goals: ["February 2027", "July 2029", "June 2027"]
      }
    ]);
    for (const dto of mapped) {
      assertPlainJsonTree(dto);
      const serialised = JSON.stringify(dto);
      expect(JSON.stringify(JSON.parse(serialised))).toBe(serialised);
      expect(dto.calculation).toMatchObject({
        rulesVersion: "fy-sim/1.0.0",
        contextVersion: SARAH_V1_CONTEXT.version,
        calendar: {
          committedFixtureUsed: true,
          fallbackUsed: true,
          firstFallbackPeriod: "2029-01"
        }
      });
      expect(dto.result.projection.periods.every((period) => /^\d{4}-\d{2}$/.test(period.period))).toBe(true);
      expect(dto.result.projection.trace.every((event) => /^\d{4}-\d{2}-\d{2}$/.test(event.date))).toBe(true);
    }
  });

  it("maps insufficient-information errors and rejects unsupported requests explicitly", () => {
    expect(
      applicationErrorToDTO(
        {
          code: "MATERIAL_INFORMATION_MISSING",
          message: "Required material context is missing.",
          missingFields: ["income.amount"]
        },
        "corr-insufficient"
      )
    ).toMatchObject({
      error: {
        code: "MATERIAL_INFORMATION_MISSING",
        field: "income.amount",
        details: { missingFields: ["income.amount"] }
      }
    });
    expect(
      applicationErrorToDTO(
        {
          code: "FINANCIAL_CONTEXT_NOT_FOUND",
          message: "No current financial context exists.",
          missingFields: []
        },
        "corr-onboarding-required"
      )
    ).toMatchObject({
      error: {
        code: "FINANCIAL_CONTEXT_REQUIRED",
        message: "Complete financial onboarding before using this operation."
      }
    });
    expect(
      parseOneOffPurchaseRequest({
        ...SARAH_V1_BROWSER_PROOF_COMMAND,
        change: { ...SARAH_V1_BROWSER_PROOF_COMMAND.change, type: "recurring_expense" }
      })
    ).toMatchObject({ ok: false, code: "UNSUPPORTED_SCENARIO_TYPE" });
  });
});
