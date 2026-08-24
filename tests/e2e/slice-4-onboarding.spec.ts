import { expect, test, type Page } from "@playwright/test";
import { signIn, signOut } from "./helpers/auth";

interface MutableDraftShape {
  currentAccount: { actualClearedBalance: { amount: string } };
}

interface PreviewResponseShape {
  candidate: { canonicalRequestHash: string };
}

interface CurrentContextResponseShape {
  context: { version: string };
}

async function advanceToReview(page: Page): Promise<void> {
  await page.getByRole("button", { name: "Build my current path" }).click();
  for (let step = 0; step < 6; step += 1) {
    if (step === 4) {
      await page.getByLabel("None").check();
    }
    await page.getByRole("button", { name: "Continue" }).click();
  }
  await expect(page.getByRole("heading", { name: "Review your current path" })).toBeVisible();
}

async function browserJson(page: Page, url: string, body?: unknown) {
  return page.evaluate(async ({ target, payload }) => {
    const response = await fetch(target, {
      method: payload === undefined ? "GET" : "POST",
      credentials: "same-origin",
      ...(payload === undefined
        ? {}
        : {
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
          })
    });
    return { status: response.status, body: await response.json() };
  }, { target: url, payload: body });
}

function sentinelPreview() {
  const money = (display: string, minorUnits: string) => ({ currency: "GBP", display, minorUnits });
  return {
    apiVersion: "future-you.api/v1",
    schemaVersion: "financial-context-preview/1.0.0",
    kind: "financial_context_preview",
    candidate: {
      previewId: "preview-server-sentinel",
      canonicalRequestHash: "fnv1a64:1234567890abcdef"
    },
    contextSummary: {
      actualCash: money("£SERVER-ACTUAL", "999999"),
      remainingReserve: money("£SERVER-RESERVE", "888888"),
      currentSafetyBuffer: money("£SERVER-BUFFER", "777777"),
      desiredSafetyBuffer: money("£SERVER-DESIRED", "666666"),
      monthlyNetIncome: money("£SERVER-INCOME", "555555"),
      monthlyRoutineSpending: money("£SERVER-SPENDING", "444444"),
      monthlyContributionCapacity: money("£SERVER-CAPACITY", "333333")
    },
    goals: [{
      goalId: "goal-server",
      label: "SERVER GOAL",
      currentBalance: money("£SERVER-CURRENT", "1"),
      targetBalance: money("£SERVER-TARGET", "2"),
      normalContribution: money("£SERVER-CONTRIBUTION", "3"),
      completion: { status: "COMPLETED", month: "2099-12 SERVER" }
    }],
    baseline: {
      requiredPaymentsCovered: true,
      lowestCash: money("£SERVER-LOW", "4"),
      existingPressure: false,
      warnings: [],
      projection: {}
    },
    assumptions: [{
      id: "server-assumption",
      category: "system_assumption",
      description: "SERVER ASSUMPTION",
      source: "server",
      material: true,
      editable: false,
      likelyEffect: "SERVER EFFECT",
      scope: "current_path",
      affectedPeriods: ["2099-12"]
    }],
    confidence: "high",
    versions: {
      contextSchemaVersion: "SERVER CONTEXT VERSION",
      rulesVersion: "SERVER RULES VERSION",
      calendarVersion: "SERVER CALENDAR VERSION"
    }
  };
}

test("renders the onboarding preview returned by the server without browser recalculation", async ({ page }) => {
  await signIn(page, "alex");
  await page.route("**/api/v1/financial-context/previews", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(sentinelPreview())
    });
  });
  await advanceToReview(page);
  await page.getByRole("button", { name: "Preview my current path" }).click();
  await expect(page.getByText("£SERVER-ACTUAL")).toBeVisible();
  await expect(page.getByText("£SERVER-BUFFER")).toBeVisible();
  await expect(page.getByText("£SERVER-CAPACITY")).toBeVisible();
  await expect(page.getByText("2099-12 SERVER")).toBeVisible();
  await expect(page.getByText("£2750.00")).toHaveCount(0);
  await signOut(page);
});

test("renders field-specific server validation without persisting a draft", async ({ page }) => {
  await signIn(page, "alex");
  await advanceToReview(page);
  const confirmationRequests: string[] = [];
  page.on("request", (request) => {
    if (
      request.method() === "POST" &&
      (request.url().endsWith("/api/v1/financial-context/versions") ||
        request.url().endsWith("/api/v1/financial-context/current/revisions"))
    ) {
      confirmationRequests.push(request.url());
    }
  });
  await page.getByRole("button", { name: "Preview my current path" }).click();
  const alert = page.locator(".form-errors");
  await expect(alert).toContainText("Check these fields");
  await expect(alert).toContainText("draft.goals.0.label");
  await expect(alert).toContainText("expected string to have >=1 characters");
  expect(confirmationRequests).toEqual([]);
  await signOut(page);
});

test("completes manual onboarding, runs £650, retries safely, and creates immutable V2", async ({ page }) => {
  await signIn(page, "onboarding");
  const statusBefore = await browserJson(page, "/api/v1/onboarding/status");
  expect(statusBefore).toMatchObject({ status: 200, body: { status: "NOT_STARTED" } });

  await page.getByRole("button", { name: "Build my current path" }).click();
  await page.getByLabel("Balance snapshot date").fill("2026-09-01");
  await page.getByLabel("Actual cleared balance").fill("2750");
  await page.getByLabel("Remaining current-cycle reserve").fill("1850");
  await page.getByLabel("Overdraft limit").fill("500");
  await page.getByRole("button", { name: "Continue" }).click();

  await page.getByLabel("Monthly take-home pay").fill("2450");
  await page.getByLabel("Payday rule").selectOption("last_working_day");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel("Future monthly routine spending").fill("1850");
  await page.getByLabel("I have required payments to list").check();
  const requiredPayments = [
    ["Rent", "825"],
    ["Council tax", "90"],
    ["Utilities and internet", "95"],
    ["Phone", "22"],
    ["Insurance", "18"]
  ] as const;
  for (const [index, [label, amount]] of requiredPayments.entries()) {
    if (index > 0) {
      await page.getByRole("button", { name: "Add required payment" }).click();
    }
    await page.getByLabel(`Required payment ${index + 1} name`).fill(label);
    await page.getByLabel(`Required payment ${index + 1} amount`).fill(amount);
  }
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel("Desired safety buffer").fill("900");
  await page.getByRole("button", { name: "Continue" }).click();

  await page.getByLabel("Goal 1 name").fill("House deposit");
  await page.getByLabel("Goal 1 current balance").fill("7200");
  await page.getByLabel("Goal 1 target balance").fill("25000");
  await page.getByLabel("Goal 1 contribution").fill("200");
  await page.getByRole("button", { name: "Add another goal" }).click();
  await page.getByLabel("Goal 2 name").fill("Holiday");
  await page.getByLabel("Goal 2 current balance").fill("350");
  await page.getByLabel("Goal 2 target balance").fill("1200");
  await page.getByLabel("Goal 2 contribution").fill("100");
  await page.getByRole("button", { name: "Add another goal" }).click();
  await page.getByLabel("Goal 3 name").fill("Emergency fund");
  await page.getByLabel("Goal 3 current balance").fill("3300");
  await page.getByLabel("Goal 3 target balance").fill("4500");
  await page.getByLabel("Goal 3 contribution").fill("300");
  await page.getByLabel("I have confirmed transfers").check();
  await page.getByLabel("Goal 1 committed transfer").fill("200");
  await page.getByLabel("Goal 2 committed transfer").fill("100");
  await page.getByLabel("Goal 3 committed transfer").fill("300");
  await page.getByLabel("Overflow destination").selectOption({ label: "House deposit" });
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel("Employer or workplace").fill("OniBank");
  await page.getByRole("button", { name: "Continue" }).click();

  await page.getByRole("button", { name: "Preview my current path" }).click();
  await expect(page.getByText("£2750.00")).toBeVisible();
  await expect(page.getByText("£1850.00")).toBeVisible();
  await expect(page.getByText("£900.00")).toHaveCount(2);
  await expect(page.getByText("£2450.00")).toBeVisible();
  await expect(page.getByText("£600.00")).toBeVisible();
  await expect(page.getByText("2026-12")).toBeVisible();
  await expect(page.getByText("2027-05")).toBeVisible();
  await expect(page.getByText("2029-06", { exact: true })).toBeVisible();

  let confirmedPayload: Record<string, unknown> | undefined;
  page.on("request", (request) => {
    if (request.url().endsWith("/api/v1/financial-context/versions") && request.method() === "POST") {
      confirmedPayload = request.postDataJSON() as Record<string, unknown>;
    }
  });
  await page.getByRole("button", { name: "Confirm this financial context" }).click();
  await expect(page).toHaveURL(/\/ask$/);
  const turnAfterConfirmation = page.waitForResponse((response) =>
    response.url().includes("/api/v1/conversations/") &&
    response.url().endsWith("/messages") &&
    response.request().method() === "POST"
  );
  await page.getByLabel("Ask Future You").fill("Can I afford a £650 trip next month?");
  await page.getByRole("button", { name: "Send message" }).click();
  const turn = await (await turnAfterConfirmation).json();
  await expect(page.getByTestId("buffer-after")).toHaveText("£250");
  const selected = turn.conversation.selectedResult;
  expect(selected.context.version).toMatch(/^manual-/);
  const oldRunId = selected.calculation.runId as string;

  await page.reload();
  await expect(page).toHaveURL(/\/ask$/);
  await expect(page.getByTestId("buffer-after")).toHaveText("£250");
  expect(confirmedPayload).toBeDefined();
  const exactRetry = await browserJson(
    page,
    "/api/v1/financial-context/versions",
    confirmedPayload
  );
  expect(exactRetry).toMatchObject({ status: 200, body: { created: false } });

  const changedPayload = structuredClone(confirmedPayload!);
  const changedDraft = changedPayload.draft as unknown as MutableDraftShape;
  changedDraft.currentAccount.actualClearedBalance.amount = "2800";
  const changedPreview = await browserJson(page, "/api/v1/financial-context/previews", {
    draft: changedDraft,
    mode: "initial",
    expectedCurrentContextVersionId: null
  });
  const conflicting = await browserJson(page, "/api/v1/financial-context/versions", {
    ...changedPayload,
    reviewedCanonicalRequestHash:
      (changedPreview.body as PreviewResponseShape).candidate.canonicalRequestHash
  });
  expect(conflicting).toMatchObject({ status: 409, body: { error: { code: "IDEMPOTENCY_KEY_REUSED" } } });

  await page.goto("/settings/financial-context");
  await page.getByRole("button", { name: "Build my current path" }).click();
  await expect(page.getByLabel("Actual cleared balance")).toHaveValue("2750.00");
  await page.getByLabel("Actual cleared balance").fill("2800");
  for (let step = 0; step < 6; step += 1) {
    await page.getByRole("button", { name: "Continue" }).click();
  }
  await page.getByRole("button", { name: "Preview my current path" }).click();
  await expect(page.getByText("£2800.00")).toBeVisible();
  const revisionResponse = page.waitForResponse((response) =>
    response.url().endsWith("/api/v1/financial-context/current/revisions") &&
    response.request().method() === "POST"
  );
  await page.getByRole("button", { name: "Confirm this financial context" }).click();
  expect((await revisionResponse).status()).toBe(201);
  await expect(page).toHaveURL(/\/ask$/);
  await expect(page.getByTestId("stale-context-state")).toBeVisible();
  await expect(page.getByTestId("stale-context-state")).toContainText(
    "Start a new conversation"
  );
  const staleTurnResponse = page.waitForResponse((response) =>
    response.url().includes("/api/v1/conversations/") &&
    response.url().endsWith("/messages") &&
    response.request().method() === "POST"
  );
  await page.getByLabel("Ask Future You").fill("What about £500?");
  await page.getByRole("button", { name: "Send message" }).click();
  expect((await staleTurnResponse).status()).toBe(409);
  await expect(page.getByTestId("provider-error-state")).toContainText(
    "Start a new conversation"
  );

  const historical = await browserJson(page, `/api/v1/simulations/${oldRunId}`);
  expect(historical).toMatchObject({
    status: 200,
    body: {
      context: { version: selected.context.version },
      presentation: { immediateImpact: { safetyBufferAfter: "£250" } }
    }
  });
  const current = await browserJson(page, "/api/v1/financial-context/current");
  expect((current.body as CurrentContextResponseShape).context.version).not.toBe(
    selected.context.version
  );
  await signOut(page);
});
