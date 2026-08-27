import { resolve } from "node:path";
import { expect, test, type Page } from "@playwright/test";
import type { HomeSurfaceDTO } from "../../src/application/product-surfaces/contracts";
import { SARAH_V1_ONBOARDING_DRAFT } from "../../src/fixtures/sarah-v1-onboarding";
import { signIn, signOut } from "./helpers/auth";

test.use({ viewport: { width: 414, height: 896 }, deviceScaleFactor: 1, isMobile: true });

const evidence = (name: string) => resolve("artifacts", "slice-6-visual", name);
const CONTEXT_VERSION = "sarah-v1@2026-09-01";

function oneOffCommand(requestId: string) {
  return {
    requestId,
    expectedContextVersionId: CONTEXT_VERSION,
    change: {
      type: "one_off_purchase",
      amount: { currency: "GBP", minorUnits: "65000" },
      purpose: "trip",
      paymentPeriod: "2026-09",
      paymentTiming: "assumed_conservative",
      paymentDate: null,
      datePrecision: "month",
      fundingSource: "current_account",
      paymentPattern: "single",
      costTreatment: "additional_to_routine_spending"
    },
    assumptionConfirmations: []
  };
}

async function createRun(page: Page, requestId: string): Promise<string> {
  return page.evaluate(async (payload) => {
    const response = await fetch("/api/v1/scenarios/one-off-purchases", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error?.message ?? "run failed");
    return body.calculation.runId as string;
  }, oneOffCommand(requestId));
}

async function expectActive(page: Page, name: "Home" | "Goals" | "Ask" | "Benefits") {
  const navigation = page.getByRole("navigation", { name: "Product navigation" });
  await expect(navigation.getByRole("link", { name })).toHaveAttribute("aria-current", "page");
}

test("delivers the shared Home, Goals, Ask and Benefits product journey", async ({ page }) => {
  let conversationMessageRequests = 0;
  page.on("request", (request) => {
    if (request.method() === "POST" && /\/api\/v1\/conversations\/[^/]+\/messages$/.test(new URL(request.url()).pathname)) {
      conversationMessageRequests += 1;
    }
  });
  await page.goto("/");
  await expect(page).toHaveURL(/\/login$/);
  await signIn(page, "sarah", "/home");
  await expect(page.getByTestId("home-surface")).toBeVisible();
  await expectActive(page, "Home");
  await expect(page.getByText("Welcome back,")).toBeVisible();
  await expect(page.getByText("Sarah Wonk!")).toBeVisible();
  await expect(page.getByText("What are you thinking about?")).toBeVisible();
  await expect(page.getByText("£900", { exact: true })).toBeVisible();
  await expect(page.getByText("December 2026")).toBeVisible();
  await expect(page.getByText("Season-ticket loan", { exact: true })).toBeVisible();
  await expect(page.getByText("Eligibility unknown", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: /See details/ })).toHaveAttribute("href", "/benefits#opportunity-season-ticket-loan");
  await expect(page.getByText(/match up to 5%/i)).toHaveCount(0);
  expect(conversationMessageRequests).toBe(0);
  await page.screenshot({ path: evidence("home-top-414x896.png") });
  await page.getByText("Your future right now").evaluate((element) => element.scrollIntoView({ block: "start" }));
  await page.waitForTimeout(100);
  await page.screenshot({ path: evidence("home-lower-414x896.png") });

  await page.getByRole("link", { name: "Can I afford a £650 trip?" }).click();
  await expect(page).toHaveURL(/\/ask\?prompt=/);
  await expectActive(page, "Ask");
  await expect(page.getByLabel("Ask Future You")).toHaveValue("Can I afford a £650 trip next month?");

  await page.getByRole("navigation", { name: "Product navigation" }).getByRole("link", { name: "Goals" }).click();
  await expectActive(page, "Goals");
  await expect(page.getByRole("heading", { name: "Your goals" })).toBeVisible();
  await expect(page.getByTestId("goal-goal-emergency-fund")).toContainText("£3,300");
  await expect(page.getByTestId("goal-goal-emergency-fund")).toContainText("£4,500");
  await expect(page.getByTestId("goal-goal-emergency-fund")).toContainText("December 2026");
  await page.screenshot({ path: evidence("goals-current-414x896.png") });

  const runId = await createRun(page, `req_slice6_preview_${Date.now()}`);
  await page.goto(`/goals?runId=${runId}`);
  await expect(page.getByTestId("hypothetical-preview")).toBeVisible();
  await expect(page.getByText("£650 trip", { exact: true })).toBeVisible();
  const emergencyPreview = page.getByTestId("preview-goal-goal-emergency-fund");
  await expect(emergencyPreview).toContainText("£3,300");
  await expect(emergencyPreview).toContainText("December 2026");
  await expect(emergencyPreview).toContainText("February 2027");
  await expect(emergencyPreview).toContainText("2 months later");
  await page.screenshot({ path: evidence("goals-650-preview-414x896.png") });

  await page.getByRole("navigation", { name: "Product navigation" }).getByRole("link", { name: "Benefits" }).click();
  await expectActive(page, "Benefits");
  await expect(page.getByTestId("active-pension-fact")).toContainText("You contribute");
  await expect(page.getByTestId("active-pension-fact")).toContainText("OniBank contributes");
  await expect(page.getByTestId("active-pension-fact")).toContainText("3%");
  await expect(page.getByTestId("active-pension-fact")).toContainText("not spendable cash");
  await expect(page.getByTestId("workplace-state")).toContainText("OniBank");
  await expect(page.getByTestId("workplace-state")).toContainText("Verified workplace");
  await expect(page.getByTestId("workplace-state")).toContainText("Active membership");
  await expect(page.getByTestId("benefit-opportunity-additional_pension_match")).toContainText("up to 5%");
  await expect(page.getByTestId("benefit-opportunity-additional_pension_match")).toContainText("Eligibility has not been confirmed");
  await expect(page.getByTestId("benefit-opportunity-additional_pension_match")).toContainText("No numerical effect has been calculated");
  await expect(page.getByTestId("benefit-opportunity-season_ticket_loan")).toContainText("Eligibility unknown");
  await expect(page.getByTestId("benefit-opportunity-season_ticket_loan")).toContainText("Not included in your current financial plan");
  await expect(page.getByRole("button", { name: /simulate|activate|apply/i })).toHaveCount(0);
  expect(conversationMessageRequests).toBe(0);
  await page.screenshot({ path: evidence("benefits-canonical-414x896.png") });

  await signOut(page);
  await signIn(page, "alex");
  const foreign = await page.evaluate(async (id) => {
    const response = await fetch(`/api/v1/goals/preview?runId=${id}`, { cache: "no-store" });
    return { status: response.status, body: await response.json() };
  }, runId);
  const unknown = await page.evaluate(async () => {
    const response = await fetch("/api/v1/goals/preview?runId=run-0000000000000000", { cache: "no-store" });
    return { status: response.status, body: await response.json() };
  });
  expect(foreign).toMatchObject({ status: 404, body: { error: { code: "RUN_NOT_FOUND" } } });
  expect(unknown).toMatchObject({ status: 404, body: { error: { code: "RUN_NOT_FOUND" } } });
  expect(foreign.body.error.message).toBe(unknown.body.error.message);
});

test("renders loading, safe error, empty-benefits and historical-preview states", async ({ page }) => {
  await signIn(page, "sarah", "/home");
  const actualHome = await page.evaluate(async () => await (await fetch("/api/v1/home")).json()) as HomeSurfaceDTO;

  await page.route("**/api/v1/home", async (route) => {
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 1_500));
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(actualHome) });
  });
  await page.reload();
  await expect(page.getByTestId("home-surface")).toBeVisible();
  await expect(page.getByTestId("surface-loading")).toHaveCount(1);
  await expect(page.getByTestId("home-surface").getByTestId("surface-loading")).toBeVisible();
  await page.screenshot({ path: evidence("home-loading-414x896.png") });
  await expect(page.getByText("What are you thinking about?")).toBeVisible();
  await page.unroute("**/api/v1/home");

  await page.route("**/api/v1/goals", async (route) => {
    await route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ error: { message: "SERVER SAFE ERROR", retryable: true } })
    });
  });
  await page.goto("/goals");
  await expect(page.getByTestId("surface-error")).toContainText("SERVER SAFE ERROR");
  await page.screenshot({ path: evidence("goals-error-414x896.png") });
  await page.unroute("**/api/v1/goals");

  await page.route("**/api/v1/benefits", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        apiVersion: "future-you.product-surfaces/v1",
        schemaVersion: "benefits-surface/1.3.0",
        kind: "benefits_surface",
        context: actualHome.context,
        workplace: { status: "not_supplied", name: null, statusLabel: "No workplace added" },
        activeFacts: [],
        opportunities: [],
        taxAndAllowances: [],
        loyaltySchemes: {
          status: "not_connected",
          statusLabel: "Not connected",
          title: "No loyalty schemes connected",
          description: "No trusted loyalty data is connected."
        },
        emptyState: {
          kind: "no_workplace",
          title: "No workplace information yet",
          description: "You can use Future You without adding a workplace."
        }
      })
    });
  });
  await page.goto("/benefits");
  await expect(page.getByTestId("benefits-empty-state")).toBeVisible();
  await page.screenshot({ path: evidence("benefits-empty-414x896.png") });
  await page.unroute("**/api/v1/benefits");

});

test("keeps an actual stored run paired with its original plan after a revision", async ({ page }) => {
  await signIn(page, "onboarding");
  const stamp = Date.now().toString(36);
  const status = await page.evaluate(async () => await (await fetch("/api/v1/onboarding/status")).json());
  if (status.status === "NOT_STARTED") {
    const draft = {
      ...structuredClone(SARAH_V1_ONBOARDING_DRAFT),
      identity: {
        contextId: `context-s6-${stamp}`,
        contextVersion: `slice6-${stamp}@2026-09-01`,
        currentAccountId: `account-s6-${stamp}`,
        incomeId: `income-s6-${stamp}`
      }
    };
    const preview = await page.evaluate(async (candidate) => {
      const response = await fetch("/api/v1/financial-context/previews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draft: candidate, mode: "initial", expectedCurrentContextVersionId: null })
      });
      return await response.json();
    }, draft);
    const confirmation = await page.evaluate(async ({ candidate, hash, requestId }) => {
      const response = await fetch("/api/v1/financial-context/versions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          draft: candidate,
          mode: "initial",
          expectedCurrentContextVersionId: null,
          requestId,
          reviewedCanonicalRequestHash: hash
        })
      });
      return { status: response.status, body: await response.json() };
    }, { candidate: draft, hash: preview.candidate.canonicalRequestHash as string, requestId: `s6_init_${stamp}` });
    expect(confirmation.status).toBeLessThan(300);
  }

  const current = await page.evaluate(async () => await (await fetch("/api/v1/financial-context/current")).json());
  const originalVersion = current.context.version as string;
  const runRequest = {
    ...oneOffCommand(`s6_historical_run_${stamp}`),
    expectedContextVersionId: originalVersion,
    change: {
      ...oneOffCommand(`s6_historical_run_${stamp}`).change,
      paymentPeriod: current.context.projectionStartPeriod as string
    }
  };
  const runId = await page.evaluate(async (payload) => {
    const response = await fetch("/api/v1/scenarios/one-off-purchases", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error?.message ?? "run failed");
    return body.calculation.runId as string;
  }, runRequest);

  const correction = await page.evaluate(async () => await (await fetch("/api/v1/financial-context/current/revisions")).json());
  correction.draft.identity.contextVersion = `slice6-revision-${stamp}`;
  const revisionPreview = await page.evaluate(async ({ draft, currentVersion }) => {
    const response = await fetch("/api/v1/financial-context/previews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ draft, mode: "revision", expectedCurrentContextVersionId: currentVersion })
    });
    return await response.json();
  }, { draft: correction.draft, currentVersion: originalVersion });
  const revision = await page.evaluate(async ({ draft, currentVersion, hash, requestId }) => {
    const response = await fetch("/api/v1/financial-context/current/revisions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        draft,
        mode: "revision",
        expectedCurrentContextVersionId: currentVersion,
        requestId,
        reviewedCanonicalRequestHash: hash
      })
    });
    return { status: response.status, body: await response.json() };
  }, {
    draft: correction.draft,
    currentVersion: originalVersion,
    hash: revisionPreview.candidate.canonicalRequestHash as string,
    requestId: `s6_revision_${stamp}`
  });
  expect(revision.status).toBeLessThan(300);

  await page.goto(`/goals?runId=${runId}`);
  await expect(page.getByTestId("historical-preview-warning")).toContainText("original baseline and result");
  await expect(page.getByTestId("context-pill")).toHaveCount(0);
  const preview = await page.evaluate(async (id) => await (await fetch(`/api/v1/goals/preview?runId=${id}`)).json(), runId);
  expect(preview.context.version).toBe(originalVersion);
  expect(preview.context.isCurrent).toBe(false);
  await page.screenshot({ path: evidence("goals-historical-preview-414x896.png") });
  await signOut(page);
});

test("renders server sentinel goal fields verbatim without browser recalculation", async ({ page }) => {
  await signIn(page, "sarah", "/home");
  const home = await page.evaluate(async () => await (await fetch("/api/v1/home")).json()) as HomeSurfaceDTO;
  const serverGoal = home.goals[0];
  if (!serverGoal) throw new Error("Home returned no goal for the sentinel test.");
  await page.route("**/api/v1/goals", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        apiVersion: "future-you.product-surfaces/v1",
        schemaVersion: "goals-surface/1.0.0",
        kind: "goals_surface",
        mode: "current_path",
        context: home.context,
        title: "Your goals",
        summary: "SERVER SUMMARY",
        goals: [{
          ...serverGoal,
          label: "SERVER GOAL",
          currentBalance: { currency: "GBP", minorUnits: "999999", display: "£SERVER-CURRENT" },
          targetBalance: { currency: "GBP", minorUnits: "1", display: "£SERVER-TARGET" },
          progress: { ...serverGoal.progress, display: "43% SERVER", fill: "12.345%", ringDasharray: "1234.5 8765.5", accessibleLabel: "SERVER RATIO" },
          completion: { status: "on_track", month: "2099-12", display: "December 2099 SERVER", statusLabel: "SERVER STATUS" }
        }]
      })
    });
  });
  await page.goto("/goals");
  await expect(page.getByText("£SERVER-CURRENT")).toBeVisible();
  await expect(page.getByText("£SERVER-TARGET")).toBeVisible();
  await expect(page.getByText("43% SERVER")).toBeVisible();
  await expect(page.getByText("December 2099 SERVER")).toBeVisible();
  await expect(page.locator(".fy-progress-track > span")).toHaveAttribute("style", "width: 12.345%;");
  await expect(page.locator(".fy-goal-ratio-arc")).toHaveAttribute("stroke-dasharray", "1234.5 8765.5");
});
