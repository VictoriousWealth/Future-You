import { expect, test, type Page } from "@playwright/test";
import type {
  ApiErrorResponseDTO,
  OneOffPurchaseResponseDTO
} from "../../src/application/dto/contracts";
import { signIn, signOut } from "./helpers/auth";

const CONTEXT_VERSION = "sarah-v1@2026-09-01";

function oneOffCommand(requestId: string, amount = "65000") {
  return {
    requestId,
    expectedContextVersionId: CONTEXT_VERSION,
    change: {
      type: "one_off_purchase",
      amount: { currency: "GBP", minorUnits: amount },
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

interface BrowserJsonResponse {
  readonly status: number;
  readonly headers: Record<string, string>;
  readonly body: unknown;
}

async function browserJson(
  page: Page,
  url: string,
  options: Readonly<{
    method?: "GET" | "POST";
    body?: unknown;
  }> = {}
): Promise<BrowserJsonResponse> {
  return page.evaluate(async ({ target, request }) => {
    const response = await fetch(target, {
      method: request.method ?? "GET",
      credentials: "same-origin",
      ...(request.body === undefined
        ? {}
        : {
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(request.body)
          })
    });
    return {
      status: response.status,
      headers: Object.fromEntries(response.headers.entries()),
      body: await response.json()
    };
  }, { target: url, request: options });
}

async function createRun(page: Page, requestId: string) {
  const response = await browserJson(page, "/api/v1/scenarios/one-off-purchases", {
    method: "POST",
    body: oneOffCommand(requestId)
  });
  expect(response.status).toBe(200);
  expect(response.headers["cache-control"]).toBe("private, no-store, max-age=0");
  return response.body as OneOffPurchaseResponseDTO;
}

test("redirects private pages and returns typed 401 for every unauthenticated financial API", async ({
  page,
  request
}) => {
  await page.goto("/ask");
  await expect(page).toHaveURL(/\/login\?next=%2Fask$/);

  const operations: readonly Readonly<{
    method: "get" | "post";
    url: string;
  }>[] = [
    { method: "get", url: "/api/v1/financial-context/current" },
    { method: "get", url: `/api/v1/contexts/${CONTEXT_VERSION}/current-path` },
    { method: "post", url: "/api/v1/baselines" },
    { method: "post", url: "/api/v1/scenarios/one-off-purchases" },
    { method: "post", url: "/api/v1/scenarios/amount-alternatives" },
    { method: "post", url: "/api/v1/scenarios/timing-alternative" },
    { method: "post", url: "/api/v1/scenarios/options" },
    { method: "get", url: "/api/v1/simulations/run-0000000000000000" },
    { method: "get", url: "/api/v1/comparisons?runId=run-0000000000000000" }
  ];
  for (const operation of operations) {
    const response = operation.method === "get"
      ? await request.get(operation.url)
      : await request.post(operation.url, { data: {} });
    expect(response.status(), operation.url).toBe(401);
    expect(await response.json()).toMatchObject({
      error: { code: "AUTHENTICATION_REQUIRED" }
    });
    expect(response.headers()["cache-control"]).toBe("private, no-store, max-age=0");
  }
});

test("continues Sarah's session, persists exact retries and rejects conflicts and cross-origin writes", async ({
  page
}) => {
  await signIn(page, "sarah");
  const current = await browserJson(page, "/api/v1/financial-context/current");
  expect(current.status).toBe(200);
  expect(current.body).toMatchObject({
    context: {
      version: CONTEXT_VERSION,
      currentAccount: { clearedBalance: { minorUnits: "275000" } }
    }
  });

  const requestId = "req_slice3_browser_idempotency";
  const first = await createRun(page, requestId);
  const retry = await createRun(page, requestId);
  expect(retry).toEqual(first);

  const conflict = await browserJson(page, "/api/v1/scenarios/one-off-purchases", {
    method: "POST",
    body: oneOffCommand(requestId, "50000")
  });
  expect(conflict.status).toBe(409);
  expect(conflict.body).toMatchObject({ error: { code: "IDEMPOTENCY_KEY_REUSED" } });

  const crossOriginRequestId = "req_slice3_cross_origin_rejected";
  const rejected = await page.request.post("/api/v1/scenarios/one-off-purchases", {
    headers: {
      Origin: "https://attacker.invalid",
      "Sec-Fetch-Site": "cross-site"
    },
    data: oneOffCommand(crossOriginRequestId)
  });
  expect(rejected.status()).toBe(403);
  expect(await rejected.json()).toMatchObject({ error: { code: "INVALID_REQUEST" } });
  const acceptedAfterRejection = await createRun(page, crossOriginRequestId);
  expect(acceptedAfterRejection.calculation.runId).toMatch(/^run-[a-f0-9]{16}$/);

  await page.goto("/");
  await expect(page).toHaveURL(/\/ask$/);
  await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();
});

test("keeps Sarah's context and run non-enumerable to Alex and unchanged after hostile requests", async ({
  page
}) => {
  await signIn(page, "sarah");
  const created = await createRun(page, "req_slice3_browser_cross_user");
  const runId = created.calculation.runId as string;
  const original = await browserJson(page, `/api/v1/simulations/${runId}`);
  expect(original.status).toBe(200);
  const originalBody = original.body;
  await signOut(page);

  await signIn(page, "alex");
  await expect(page.getByRole("heading", { name: "Your financial context isn’t ready yet." })).toBeVisible();
  const foreignRun = await browserJson(page, `/api/v1/simulations/${runId}`);
  const unknownRun = await browserJson(page, "/api/v1/simulations/run-0000000000000000");
  expect(foreignRun.status).toBe(404);
  expect(unknownRun.status).toBe(404);
  const foreignRunError = foreignRun.body as ApiErrorResponseDTO;
  const unknownRunError = unknownRun.body as ApiErrorResponseDTO;
  expect(foreignRunError.error.code).toBe(unknownRunError.error.code);
  expect(foreignRunError.error.message).toBe(unknownRunError.error.message);

  const foreignContext = await browserJson(
    page,
    `/api/v1/contexts/${CONTEXT_VERSION}/current-path`
  );
  expect(foreignContext.status).toBe(404);
  const comparison = await browserJson(page, `/api/v1/comparisons?runId=${runId}`);
  expect(comparison.status).toBe(404);
  const createAgainstSarah = await browserJson(
    page,
    "/api/v1/scenarios/one-off-purchases",
    { method: "POST", body: oneOffCommand("req_slice3_alex_foreign_context") }
  );
  expect(createAgainstSarah.status).toBe(404);
  for (const body of [
    foreignRunError,
    foreignContext.body,
    comparison.body,
    createAgainstSarah.body
  ]) {
    const serialised = JSON.stringify(body);
    expect(serialised).not.toContain("sarah@example.test");
    expect(serialised).not.toContain("11111111-1111-4111-8111-111111111111");
    expect(serialised).not.toContain("275000");
  }
  await signOut(page);

  await signIn(page, "sarah");
  const unchanged = await browserJson(page, `/api/v1/simulations/${runId}`);
  expect(unchanged.status).toBe(200);
  expect(unchanged.body).toEqual(originalBody);
});
