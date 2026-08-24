import { expect, test, type Page } from "@playwright/test";
import { signIn } from "./helpers/auth";

const MESSAGE_ROUTE = "**/api/v1/conversations/*/messages";

test.beforeEach(async ({ page }) => {
  await signIn(page, "sarah");
  await startFresh(page);
});

async function startFresh(page: Page) {
  await page.getByRole("button", { name: "Open conversation history" }).click();
  await page.getByRole("button", { name: "+ New conversation", exact: true }).click();
}

async function ask(page: Page, message: string) {
  await page.getByLabel("Ask Future You").fill(message);
  await page.getByRole("button", { name: "Send message" }).click();
}

function sentinelTurn() {
  const presentation = {
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
    goalImpacts: [{
      goalId: "goal-server",
      label: "SERVER_GOAL",
      baselineCompletion: "SERVER_BASELINE_DATE",
      scenarioCompletion: "March 2032 SERVER",
      delay: "SERVER_DELAY"
    }],
    monthlyPath: [{
      period: "SERVER_PERIOD",
      closingCash: "SERVER_MONTH_CASH",
      closingSafetyBuffer: "SERVER_MONTH_BUFFER",
      bufferRestoration: "SERVER_MONTH_RESTORATION",
      goalContribution: "SERVER_MONTH_GOALS"
    }],
    assumptionGroups: [{
      key: "systemAssumptions",
      label: "SERVER_ASSUMPTIONS",
      items: ["SERVER_ASSUMPTION_ITEM"]
    }],
    confidence: "SERVER_CONFIDENCE",
    availableActions: []
  };
  const result = {
    calculation: { runId: "run-server-sentinel" },
    presentation,
    scenario: { id: "scenario-server-sentinel", change: { amount: { minorUnits: "999999" }, paymentPeriod: "2099-12" } }
  };
  const conversation = {
    apiVersion: "future-you.api/v1",
    schemaVersion: "conversation/1.0.0",
    kind: "conversation",
    conversation: {
      id: "conversation-server-sentinel",
      title: "Sentinel",
      contextVersionId: "context-sentinel-v1",
      contextIsCurrent: true,
      selectedRunId: "run-server-sentinel",
      hasPendingClarification: false,
      createdAt: "2026-08-24T12:00:00Z",
      latestActivityAt: "2026-08-24T12:00:01Z"
    },
    currentPath: {},
    messages: [
      { id: "user-sentinel", sequence: "1", kind: "USER_TEXT", text: "sentinel", templateId: null, explanationFallbackUsed: false, runId: null, result: null, createdAt: "2026-08-24T12:00:00Z" },
      { id: "assistant-sentinel", sequence: "2", kind: "ASSISTANT_RESULT", text: "trusted", templateId: "PURCHASE_RESULT_NOTICEABLE", explanationFallbackUsed: false, runId: "run-server-sentinel", result, createdAt: "2026-08-24T12:00:01Z" }
    ],
    scenarios: [{ runId: "run-server-sentinel", scenarioId: "scenario-server-sentinel", label: "SERVER_SCENARIO_LABEL", paymentPeriod: "2099-12", amount: "£9999.99", presentation }],
    selectedResult: result,
    supportedScope: []
  };
  return {
    apiVersion: "future-you.api/v1",
    schemaVersion: "conversation-turn/1.0.0",
    kind: "conversation_turn",
    requestId: "sentinel-request",
    turnId: "sentinel-turn",
    intent: "CREATE_ONE_OFF_PURCHASE",
    providerAttempts: 1,
    explanationFallbackUsed: false,
    conversation
  };
}

test("renders server-produced conversational scenarios and changes viewing state only", async ({ page }) => {
  await ask(page, "Can I afford a £650 trip next month?");
  await expect(page.getByTestId("buffer-after")).toHaveText("£250");
  await expect(page.getByTestId("required-payments")).toHaveText("Bills covered");
  await expect(page.getByTestId("overdraft-usage")).toHaveText("£0 overdraft");
  await expect(page.getByTestId("buffer-recovery")).toHaveText("Restored in November 2026");

  await ask(page, "What about £500?");
  await expect(page.getByTestId("buffer-after").last()).toHaveText("£400");
  await ask(page, "What about £400?");
  await expect(page.getByTestId("buffer-after").last()).toHaveText("£500");
  await ask(page, "What if I wait until October?");
  await expect(page.getByTestId("buffer-after").last()).toHaveText("£250");

  await page.getByRole("button", { name: "5 paths" }).click();
  await expect(page.getByTestId("scenario-selector").locator(".fy-scenario-list").getByRole("button")).toHaveCount(5);
  await page.getByTestId("scenario-selector").getByRole("button", { name: /Current path/ }).click();
  await expect(page.getByRole("button", { name: "5 paths" })).toBeVisible();
});

test("shows a neutral interpreting state while the server is pending", async ({ page }) => {
  let releaseResponse: (() => void) | undefined;
  const release = new Promise<void>((resolve) => { releaseResponse = resolve; });
  await page.route(MESSAGE_ROUTE, async (route) => {
    await release;
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(sentinelTurn()) });
  });
  await ask(page, "Can I afford a £650 trip next month?");
  await expect(page.getByTestId("interpreting-state")).toBeVisible();
  releaseResponse?.();
  await expect(page.getByTestId("scenario-result")).toBeVisible();
});

test("renders sentinel presentation verbatim and ignores non-presented raw money", async ({ page }) => {
  await page.route(MESSAGE_ROUTE, async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(sentinelTurn()) });
  });
  await ask(page, "Can I afford a £650 trip next month?");
  await expect(page.getByText("SERVER_SUMMARY_SENTINEL")).toBeVisible();
  await expect(page.getByTestId("cash-after")).toHaveText("£237 SERVER");
  await expect(page.getByTestId("buffer-after")).toHaveText("£237 SERVER");
  await expect(page.getByTestId("buffer-recovery")).toHaveText("January 2031 SERVER");
  await expect(page.getByText("March 2032 SERVER")).toBeVisible();
  await expect(page.getByTestId("confidence")).toHaveText("SERVER_CONFIDENCE");
  await expect(page.getByText("£9999.99")).toHaveCount(0);
  await expect(page.getByText("£250")).toHaveCount(0);
});
