import { expect, test } from "@playwright/test";

const API_ROUTE = "**/api/v1/scenarios/options";

function sentinelResponse() {
  return {
    apiVersion: "future-you.api/v1",
    schemaVersion: "scenario-options-result/1.0.0",
    kind: "scenario_options",
    requestId: "req_browser_sentinel",
    correlationId: "corr_browser_sentinel",
    baselineId: "baseline-server-sentinel",
    contextVersion: "context-sentinel-v1",
    selectedScenarioId: "scenario-server-sentinel",
    selectionAffectsFinancialState: false,
    options: [
      {
        id: "scenario-server-sentinel",
        label: "SERVER_SCENARIO_LABEL",
        status: "evaluated",
        baselineId: "baseline-server-sentinel",
        parentScenarioId: null,
        derivedFromScenarioId: null,
        contextVersion: "context-sentinel-v1",
        isCurrent: false,
        isHypothetical: true,
        initiallySelected: true,
        selectionAffectsFinancialState: false,
        runId: "run-server-sentinel",
        rulesVersion: "SERVER_RULES_VERSION",
        calendarVersion: "SERVER_CALENDAR_VERSION",
        presentation: {
          scenarioLabel: "SERVER_SCENARIO_LABEL",
          classificationLabel: "Noticeable trade-off — SERVER SENTINEL",
          summary: "SERVER_SUMMARY_SENTINEL",
          headlineKey: "server_headline",
          immediateImpact: {
            cashBefore: "£901 SERVER",
            cashAfter: "£237 SERVER",
            safetyBufferBefore: "£901 SERVER",
            safetyBufferAfter: "£237 SERVER",
            requiredPayments: "SERVER_REQUIRED_PAYMENTS",
            borrowing: "SERVER_BORROWING",
            recovery: "January 2031 SERVER"
          },
          goalImpacts: [
            {
              goalId: "goal-server",
              label: "SERVER_GOAL",
              baselineCompletion: "SERVER_BASELINE_DATE",
              scenarioCompletion: "March 2032 SERVER",
              delay: "SERVER_DELAY"
            }
          ],
          monthlyPath: [
            {
              period: "SERVER_PERIOD",
              closingCash: "SERVER_MONTH_CASH",
              closingSafetyBuffer: "SERVER_MONTH_BUFFER",
              bufferRestoration: "SERVER_MONTH_RESTORATION",
              goalContribution: "SERVER_MONTH_GOALS"
            }
          ],
          assumptionGroups: [
            {
              key: "systemAssumptions",
              label: "SERVER_ASSUMPTIONS",
              items: ["SERVER_ASSUMPTION_ITEM"]
            }
          ],
          confidence: "SERVER_CONFIDENCE",
          availableActions: []
        },
        simulation: {
          scenario: {
            change: { amount: { currency: "GBP", minorUnits: "999999" } }
          }
        }
      }
    ]
  };
}

test("renders and selects all five options returned by the real simulator API", async ({ page }) => {
  const apiResponse = page.waitForResponse((response) =>
    response.url().includes("/api/v1/scenarios/options")
  );
  await page.goto("/ask");
  const response = await apiResponse;
  expect(response.status()).toBe(200);
  const dto = await response.json();
  expect(dto.options.map((option: { label: string }) => option.label)).toEqual([
    "Your current path", "£650 trip", "£500 option", "£400 option", "Go in October"
  ]);
  expect(dto.options[1].simulation.result.comparison.classification.minimumSafetyBuffer).toEqual({
    currency: "GBP",
    minorUnits: "25000",
    display: "£250.00"
  });

  await expect(page.getByTestId("scenario-result")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Affordable · Significant trade-off" })).toBeVisible();
  await expect(page.getByTestId("buffer-after")).toHaveText("£250");
  await expect(page.getByTestId("required-payments")).toHaveText("Bills covered");
  await expect(page.getByTestId("overdraft-usage")).toHaveText("£0 overdraft");
  await expect(page.getByTestId("buffer-recovery")).toHaveText("Restored in November 2026");
  await expect(page.getByTestId("scenario-selector").getByRole("button")).toHaveCount(5);

  await page.getByRole("button", { name: /£500 option/ }).click();
  await expect(page.getByTestId("buffer-after")).toHaveText("£400");
  await expect(page.getByTestId("buffer-recovery")).toHaveText("Restored in October 2026");
  await expect(page.getByText("January 2027").first()).toBeVisible();

  await page.getByRole("button", { name: /£400 option/ }).click();
  await expect(page.getByRole("heading", { name: "Affordable · Noticeable trade-off" })).toBeVisible();
  await expect(page.getByTestId("buffer-after")).toHaveText("£500");

  await page.getByRole("button", { name: /Go in October/ }).click();
  await expect(page.getByTestId("buffer-after")).toHaveText("£250");
  const goals = page.getByRole("region", { name: "What changes for your goals" });
  await expect(goals.getByText("February 2027")).toBeVisible();
  await expect(goals.getByText("July 2029")).toBeVisible();

  await page.getByText("Six-month path").click();
  await expect(page.getByTestId("monthly-path").locator(".month-row")).toHaveCount(6);
  await page.getByText("How we calculated this").click();
  await expect(page.getByTestId("assumption-manifest")).toContainText("System assumptions");
  await page.getByText("Calculation versions").click();
  await expect(page.getByTestId("run-id")).toHaveText(/^run-[a-f0-9]{16}$/);
});

test("shows calculating state while the server result is pending", async ({ page }) => {
  let releaseResponse: (() => void) | undefined;
  const release = new Promise<void>((resolve) => {
    releaseResponse = resolve;
  });
  await page.route(API_ROUTE, async (route) => {
    await release;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(sentinelResponse())
    });
  });
  await page.goto("/ask");
  await expect(page.getByTestId("calculating-state")).toBeVisible();
  releaseResponse?.();
  await expect(page.getByTestId("scenario-result")).toBeVisible();
});

test("renders sentinel presentation exactly and ignores non-derivable raw financial data", async ({
  page
}) => {
  await page.route(API_ROUTE, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(sentinelResponse())
    });
  });
  await page.goto("/ask");
  await expect(page.getByRole("heading", { name: "Noticeable trade-off — SERVER SENTINEL" })).toBeVisible();
  await expect(page.getByTestId("cash-after")).toHaveText("£237 SERVER");
  await expect(page.getByTestId("buffer-after")).toHaveText("£237 SERVER");
  await expect(page.getByTestId("buffer-recovery")).toHaveText("January 2031 SERVER");
  await expect(page.getByText("March 2032 SERVER")).toBeVisible();
  await expect(page.getByTestId("confidence")).toHaveText("SERVER_CONFIDENCE");
  await expect(page.getByText("£9999.99")).toHaveCount(0);
  await expect(page.getByText("£250")).toHaveCount(0);
});
