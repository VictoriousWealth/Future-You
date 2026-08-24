import { describe, expect, it } from "vitest";
import type {
  AmountAlternativesResponseDTO,
  ApiErrorResponseDTO,
  BaselineResponseDTO,
  CurrentFinancialContextResponseDTO,
  OneOffPurchaseResponseDTO,
  ScenarioComparisonResponseDTO,
  ScenarioOptionsResponseDTO,
  TimingAlternativeResponseDTO
} from "../src/application/dto/contracts";
import { handlePOST as handleGenerateBaseline } from "../src/app/api/v1/baselines/route";
import { handleGET as handleGetComparison } from "../src/app/api/v1/comparisons/route";
import { handleGET as handleGetCurrentPath } from "../src/app/api/v1/contexts/[contextVersionId]/current-path/route";
import { handleGET as handleGetCurrentContext } from "../src/app/api/v1/financial-context/current/route";
import { handlePOST as handleGenerateAmounts } from "../src/app/api/v1/scenarios/amount-alternatives/route";
import { handlePOST as handleSimulateOneOff } from "../src/app/api/v1/scenarios/one-off-purchases/route";
import { handlePOST as handleListOptions } from "../src/app/api/v1/scenarios/options/route";
import { handlePOST as handleGenerateTiming } from "../src/app/api/v1/scenarios/timing-alternative/route";
import { handleGET as handleGetSimulationRun } from "../src/app/api/v1/simulations/[runId]/route";
import { SARAH_V1_CONTEXT } from "../src/fixtures/sarah-v1";
import {
  SARAH_V1_BROWSER_PROOF_COMMAND,
  SARAH_V1_BROWSER_PROOF_OPTIONS_COMMAND
} from "../src/server/sarah-v1-demo-command";
import { assertPlainJsonTree, authenticatedSlice2Resolver } from "./helpers/slice-2";

const generateBaseline = (request: Request) =>
  handleGenerateBaseline(request, authenticatedSlice2Resolver);
const getComparison = (request: Request) =>
  handleGetComparison(request, authenticatedSlice2Resolver);
const getCurrentPath = (
  request: Request,
  context: { params: Promise<{ contextVersionId: string }> }
) => handleGetCurrentPath(request, context, authenticatedSlice2Resolver);
const getCurrentContext = () => handleGetCurrentContext(authenticatedSlice2Resolver);
const generateAmounts = (request: Request) =>
  handleGenerateAmounts(request, authenticatedSlice2Resolver);
const simulateOneOff = (request: Request) =>
  handleSimulateOneOff(request, authenticatedSlice2Resolver);
const listOptions = (request: Request) => handleListOptions(request, authenticatedSlice2Resolver);
const generateTiming = (request: Request) =>
  handleGenerateTiming(request, authenticatedSlice2Resolver);
const getSimulationRun = (
  request: Request,
  context: { params: Promise<{ runId: string }> }
) => handleGetSimulationRun(request, context, authenticatedSlice2Resolver);

function post(url: string, body: unknown): Request {
  return new Request(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
}

async function json<T>(response: Response): Promise<T> {
  const body: unknown = await response.json();
  assertPlainJsonTree(body);
  expect(() => JSON.stringify(body)).not.toThrow();
  return body as T;
}

describe("versioned Route Handler contracts", () => {
  it("retrieves Sarah's current context and explicit calendar coverage", async () => {
    const response = await getCurrentContext();
    const body = await json<CurrentFinancialContextResponseDTO>(response);
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store, max-age=0");
    expect(body).toMatchObject({
      apiVersion: "future-you.api/v1",
      schemaVersion: "financial-context-current/1.0.0",
      context: {
        version: SARAH_V1_CONTEXT.version,
        desiredSafetyBuffer: { currency: "GBP", minorUnits: "90000", display: "£900.00" }
      },
      calendar: {
        coverage: { start: "2026-01-01", end: "2028-12-31" }
      }
    });
  });

  it("retrieves the six-period current path through the context-version route", async () => {
    const response = await getCurrentPath(
      new Request(`http://localhost/api/v1/contexts/${SARAH_V1_CONTEXT.version}/current-path`),
      { params: Promise.resolve({ contextVersionId: SARAH_V1_CONTEXT.version }) }
    );
    const body = await json<BaselineResponseDTO>(response);
    expect(response.status).toBe(200);
    expect(body.baseline.periods).toHaveLength(6);
    expect(body.calculation).toMatchObject({
      baselineId: body.baseline.identity.baselineId,
      scenarioId: null,
      calendar: {
        committedFixtureUsed: true,
        fallbackUsed: true,
        firstFallbackPeriod: "2029-01"
      }
    });
  });

  it("simulates £650 with exact JSON money and all version identities", async () => {
    const response = await simulateOneOff(
      post("http://localhost/api/v1/scenarios/one-off-purchases", SARAH_V1_BROWSER_PROOF_COMMAND)
    );
    const body = await json<OneOffPurchaseResponseDTO>(response);
    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      apiVersion: "future-you.api/v1",
      schemaVersion: "one-off-purchase-result/1.0.0",
      scenario: {
        status: "evaluated",
        parentScenarioId: null,
        isHypothetical: true,
        selectionAffectsFinancialState: false,
        change: { amount: { currency: "GBP", minorUnits: "65000" }, paymentPeriod: "2026-09" }
      },
      calculation: {
        rulesVersion: "fy-sim/1.0.0",
        contextVersion: SARAH_V1_CONTEXT.version,
        calendar: { fallbackUsed: true, firstFallbackPeriod: "2029-01" }
      },
      result: {
        comparison: {
          classification: {
            code: "AFFORDABLE_SIGNIFICANT_TRADE_OFF",
            minimumSafetyBuffer: { minorUnits: "25000", display: "£250.00" }
          }
        }
      },
      presentation: {
        classificationLabel: "Affordable · Significant trade-off",
        immediateImpact: {
          cashAfter: "£2100",
          safetyBufferAfter: "£250",
          requiredPayments: "Bills covered",
          borrowing: "£0 overdraft",
          recovery: "Restored in November 2026"
        }
      },
      excludedOpportunities: []
    });
    expect(body.calculation.runId).toMatch(/^run-[a-f0-9]{16}$/);
    expect(body.scenario.baselineId).toBe(body.baseline.identity.baselineId);
    expect(body.result.projection.identity.scenarioId).toBe(body.scenario.id);
  });

  it("rejects a disallowed origin before it can create a simulation run", async () => {
    const command = {
      ...SARAH_V1_BROWSER_PROOF_COMMAND,
      requestId: "req_api_cross_origin_guard"
    };
    const rejected = await simulateOneOff(
      new Request("http://localhost/api/v1/scenarios/one-off-purchases", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: "https://attacker.invalid",
          "Sec-Fetch-Site": "cross-site"
        },
        body: JSON.stringify(command)
      })
    );
    expect(rejected.status).toBe(403);
    expect(await json<ApiErrorResponseDTO>(rejected)).toMatchObject({
      error: { code: "INVALID_REQUEST" }
    });

    const accepted = await simulateOneOff(
      post("http://localhost/api/v1/scenarios/one-off-purchases", command)
    );
    expect(accepted.status).toBe(200);
  });

  it("generates £500 and £400 siblings and the October timing sibling", async () => {
    const amountResponse = await generateAmounts(
      post("http://localhost/api/v1/scenarios/amount-alternatives", {
        requestId: "req_api_amounts",
        source: SARAH_V1_BROWSER_PROOF_COMMAND
      })
    );
    const amounts = await json<AmountAlternativesResponseDTO>(amountResponse);
    expect(amountResponse.status).toBe(200);
    expect(amounts.options.map((option) => option.scenario.label)).toEqual([
      "£650 trip",
      "£500 option",
      "£400 option"
    ]);
    expect(amounts.options.map((option) => option.result.comparison.classification.minimumSafetyBuffer.minorUnits)).toEqual([
      "25000", "40000", "50000"
    ]);
    expect(amounts.options[1]?.scenario.derivedFromScenarioId).toBe(amounts.sourceScenarioId);
    expect(amounts.options[2]?.scenario.derivedFromScenarioId).toBe(amounts.sourceScenarioId);

    const timingResponse = await generateTiming(
      post("http://localhost/api/v1/scenarios/timing-alternative", {
        requestId: "req_api_timing",
        source: SARAH_V1_BROWSER_PROOF_COMMAND,
        targetPaymentPeriod: "2026-10"
      })
    );
    const timing = await json<TimingAlternativeResponseDTO>(timingResponse);
    expect(timingResponse.status).toBe(200);
    expect(timing.option).toMatchObject({
      scenario: {
        label: "Go in October",
        parentScenarioId: null,
        derivedFromScenarioId: timing.sourceScenarioId,
        change: { paymentPeriod: "2026-10" }
      },
      result: {
        comparison: {
          classification: { minimumSafetyBuffer: { minorUnits: "25000" } }
        }
      }
    });
    expect(timing.option.result.projection.minimumBalanceDate?.slice(0, 7)).toBe("2026-10");
  });

  it("returns all five immutable scenario options with server presentation models", async () => {
    const response = await listOptions(
      post("http://localhost/api/v1/scenarios/options", SARAH_V1_BROWSER_PROOF_OPTIONS_COMMAND)
    );
    const body = await json<ScenarioOptionsResponseDTO>(response);
    expect(response.status).toBe(200);
    expect(body.options.map((option) => option.label)).toEqual([
      "Your current path", "£650 trip", "£500 option", "£400 option", "Go in October"
    ]);
    expect(body.selectionAffectsFinancialState).toBe(false);
    expect(body.options.every((option) => option.selectionAffectsFinancialState === false)).toBe(true);
  });

  it("retrieves a stored run and its comparison by server run identity", async () => {
    const createdResponse = await simulateOneOff(
      post("http://localhost/api/v1/scenarios/one-off-purchases", SARAH_V1_BROWSER_PROOF_COMMAND)
    );
    const created = await json<OneOffPurchaseResponseDTO>(createdResponse);
    const runResponse = await getSimulationRun(
      new Request(`http://localhost/api/v1/simulations/${created.calculation.runId}`),
      { params: Promise.resolve({ runId: created.calculation.runId }) }
    );
    expect(await json<OneOffPurchaseResponseDTO>(runResponse)).toEqual(created);

    const comparisonResponse = await getComparison(
      new Request(`http://localhost/api/v1/comparisons?runId=${created.calculation.runId}`)
    );
    const comparison = await json<ScenarioComparisonResponseDTO>(comparisonResponse);
    expect(comparison).toMatchObject({
      kind: "scenario_comparison",
      calculation: { runId: created.calculation.runId },
      comparison: { classification: { code: "AFFORDABLE_SIGNIFICANT_TRADE_OFF" } }
    });
  });

  it("is deterministic across repeated requests and leaves the baseline immutable", async () => {
    const baselineRequest = {
      requestId: "req_api_baseline",
      expectedContextVersionId: SARAH_V1_CONTEXT.version
    };
    const baselineBefore = await json<BaselineResponseDTO>(
      await generateBaseline(post("http://localhost/api/v1/baselines", baselineRequest))
    );
    const first = await json<OneOffPurchaseResponseDTO>(
      await simulateOneOff(post("http://localhost/api/v1/scenarios/one-off-purchases", SARAH_V1_BROWSER_PROOF_COMMAND))
    );
    const second = await json<OneOffPurchaseResponseDTO>(
      await simulateOneOff(post("http://localhost/api/v1/scenarios/one-off-purchases", SARAH_V1_BROWSER_PROOF_COMMAND))
    );
    const baselineAfter = await json<BaselineResponseDTO>(
      await generateBaseline(post("http://localhost/api/v1/baselines", baselineRequest))
    );
    expect(first).toEqual(second);
    expect(baselineBefore.baseline).toEqual(baselineAfter.baseline);
  });

  it("returns stable typed errors for invalid JSON, money, currency, scenario and context", async () => {
    const malformed = await simulateOneOff(
      new Request("http://localhost/api/v1/scenarios/one-off-purchases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{not-json"
      })
    );
    expect(await json<ApiErrorResponseDTO>(malformed)).toMatchObject({ error: { code: "INVALID_JSON" } });

    for (const [change, code, status] of [
      [{ amount: { currency: "GBP", minorUnits: 65_000 } }, "INVALID_MONEY", 400],
      [{ amount: { currency: "EUR", minorUnits: "65000" } }, "UNSUPPORTED_CURRENCY", 400],
      [{ type: "recurring_expense" }, "UNSUPPORTED_SCENARIO_TYPE", 422]
    ] as const) {
      const response = await simulateOneOff(
        post("http://localhost/api/v1/scenarios/one-off-purchases", {
          ...SARAH_V1_BROWSER_PROOF_COMMAND,
          change: { ...SARAH_V1_BROWSER_PROOF_COMMAND.change, ...change }
        })
      );
      expect(response.status).toBe(status);
      expect(await json<ApiErrorResponseDTO>(response)).toMatchObject({ error: { code } });
    }

    const stale = await simulateOneOff(
      post("http://localhost/api/v1/scenarios/one-off-purchases", {
        ...SARAH_V1_BROWSER_PROOF_COMMAND,
        requestId: "req_sarah_trip_stale_context",
        expectedContextVersionId: "sarah-v0-stale"
      })
    );
    expect(stale.status).toBe(409);
    expect(await json<ApiErrorResponseDTO>(stale)).toMatchObject({ error: { code: "CONTEXT_VERSION_MISMATCH" } });

    const missingContext = await getCurrentPath(
      new Request("http://localhost/api/v1/contexts/missing-context/current-path"),
      { params: Promise.resolve({ contextVersionId: "missing-context" }) }
    );
    expect(missingContext.status).toBe(404);
    expect(await json<ApiErrorResponseDTO>(missingContext)).toMatchObject({
      error: { code: "CONTEXT_VERSION_NOT_FOUND", field: "contextVersionId" }
    });

    const missingRun = await getSimulationRun(
      new Request("http://localhost/api/v1/simulations/run-0000000000000000"),
      { params: Promise.resolve({ runId: "run-0000000000000000" }) }
    );
    expect(missingRun.status).toBe(404);
    expect(await json<ApiErrorResponseDTO>(missingRun)).toMatchObject({
      error: { code: "RUN_NOT_FOUND" }
    });
  });
});
