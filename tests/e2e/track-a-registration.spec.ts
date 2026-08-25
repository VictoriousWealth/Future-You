import { expect, test, type Page } from "@playwright/test";

const MAILBOX_TOKEN = "future-you-local-mailbox-test";
const PERSONAL_EMAIL = "browser.activation@example.test";
const PERSONAL_PASSWORD = "Browser-Activation-Password-2026!";

async function latestCode(page: Page, registrationId: string, purpose: "WORK_CODE" | "PERSONAL_CONFIRMATION") {
  await expect.poll(async () => {
    const response = await page.request.get(
      `/api/v1/registration/test-mails/latest?registrationId=${registrationId}&purpose=${purpose}`,
      { headers: { "x-registration-test-token": MAILBOX_TOKEN } }
    );
    return response.status();
  }).toBe(200);
  const response = await page.request.get(
    `/api/v1/registration/test-mails/latest?registrationId=${registrationId}&purpose=${purpose}`,
    { headers: { "x-registration-test-token": MAILBOX_TOKEN } }
  );
  return (await response.json()).code as string;
}

async function completeCompactOnboarding(page: Page) {
  await page.getByRole("button", { name: "Build my current path" }).click();
  await page.getByLabel("Balance snapshot date").fill("2026-09-01");
  await page.getByLabel("Actual cleared balance").fill("2750");
  await page.getByLabel("Remaining current-cycle reserve").fill("1850");
  await page.getByLabel("Overdraft limit").fill("500");
  await page.getByRole("button", { name: "Continue" }).click();

  await page.getByLabel("Monthly take-home pay").fill("2450");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel("Future monthly routine spending").fill("1850");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel("Desired safety buffer").fill("900");
  await page.getByRole("button", { name: "Continue" }).click();

  await page.getByLabel("Goal 1 name").fill("Emergency fund");
  await page.getByLabel("Goal 1 current balance").fill("3300");
  await page.getByLabel("Goal 1 target balance").fill("4500");
  await page.getByLabel("Goal 1 contribution").fill("600");
  await page.getByLabel("None").check();
  await page.getByRole("button", { name: "Continue" }).click();

  await expect(page.getByText("OniBank", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Employer or workplace")).toHaveCount(0);
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Preview my current path" }).click();
  await expect(page.getByText("£900.00")).toHaveCount(2);
  await page.getByRole("button", { name: "Confirm this financial context" }).click();
  await expect(page).toHaveURL(/\/ask$/);
}

test("employer invite activates a personal Login while onboarding can proceed alongside confirmation", async ({ page }) => {
  await page.goto("/register");
  await expect(page.getByRole("heading", { name: "Register" })).toBeVisible();
  await page.getByLabel("Company ID").fill("fy-7k3m-9q2d");
  await page.getByLabel("Work email").fill("newstarter@onibank.example.test");
  const beginResponsePromise = page.waitForResponse((response) =>
    response.url().endsWith("/api/v1/registration/attempts")
    && response.request().method() === "POST"
  );
  await page.getByRole("button", { name: "Verify my workplace" }).click();
  const beginResponse = await beginResponsePromise;
  expect(beginResponse.status()).toBe(202);
  const registrationId = (await beginResponse.json()).registrationId as string;
  await expect(page.getByText(/2 of 3/)).toBeVisible();

  await page.getByLabel("Work-email verification code").fill(
    await latestCode(page, registrationId, "WORK_CODE")
  );
  await page.getByRole("button", { name: "Verify code" }).click();
  await expect(page.getByText(/3 of 3/)).toBeVisible();

  await page.getByLabel("Your name").fill("Browser Activation Member");
  await page.getByLabel("Personal email").fill(PERSONAL_EMAIL);
  await page.locator("#signup-password").fill(PERSONAL_PASSWORD);
  await page.locator("#password-confirmation").fill(PERSONAL_PASSWORD);
  await page.getByRole("button", { name: "Create personal Login" }).click();
  await expect(page).toHaveURL(/\/register\/onboarding$/);
  await expect(page.getByRole("heading", { name: "Check your personal email" })).toBeVisible();

  await page.getByRole("button", { name: "Build my current path" }).click();
  await expect(page.getByRole("heading", { name: "Money currently available" })).toBeVisible();
  await page.getByLabel("Personal-email code").fill(
    await latestCode(page, registrationId, "PERSONAL_CONFIRMATION")
  );
  const personalVerificationPromise = page.waitForResponse((response) =>
    response.url().endsWith(`/api/v1/registration/attempts/${registrationId}/personal-email-verifications`)
    && response.request().method() === "POST"
  );
  await page.getByRole("button", { name: "Verify personal email" }).click();
  expect((await personalVerificationPromise).status()).toBe(200);
  await expect(page.getByRole("heading", { name: "Personal email verified" })).toBeVisible();
  expect((await page.context().cookies()).some((cookie) =>
    cookie.name.startsWith("sb-") && cookie.name.includes("auth-token")
  )).toBe(true);
  const gatedHome = await page.evaluate(async () => {
    const response = await fetch("/api/v1/home", { cache: "no-store" });
    return { status: response.status, body: await response.json() };
  });
  expect(gatedHome.status).toBe(403);
  expect(gatedHome.body).toMatchObject({
    error: { code: "ACCOUNT_ACTIVATION_REQUIRED" }
  });
  await page.getByRole("button", { name: "Back" }).click();
  await completeCompactOnboarding(page);

  await page.getByRole("button", { name: "Open conversation history" }).click();
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/login/);
  await page.getByLabel("Email").fill(PERSONAL_EMAIL);
  await page.locator("#password").fill(PERSONAL_PASSWORD);
  await page.getByRole("button", { name: "Login", exact: true }).click();
  await expect(page).toHaveURL(/\/home$/);
  await expect(page.getByText("Browser Activation Member", { exact: false }).first()).toBeVisible();

  await page.goto("/ask");
  await page.getByRole("button", { name: "Open conversation history" }).click();
  await page.getByRole("button", { name: "Sign out" }).click();
  await page.getByLabel("Email").fill("newstarter@onibank.example.test");
  await page.locator("#password").fill(PERSONAL_PASSWORD);
  await page.getByRole("button", { name: "Login", exact: true }).click();
  await expect(page).toHaveURL(/\/login/);
  await expect(page.locator(".auth-message[role='alert']")).toContainText("couldn’t log you in");
});

test("unknown workplace details retain a neutral accepted response and send no code", async ({ page }) => {
  await page.goto("/register");
  await page.getByLabel("Company ID").fill("UNKNOWN-EMPLOYER");
  await page.getByLabel("Work email").fill("unknown.employee@example.test");
  const responsePromise = page.waitForResponse((response) => response.url().endsWith("/api/v1/registration/attempts"));
  await page.getByRole("button", { name: "Verify my workplace" }).click();
  const response = await responsePromise;
  expect(response.status()).toBe(202);
  const registrationId = (await response.json()).registrationId as string;
  await expect(page.getByText(/2 of 3/)).toBeVisible();
  const mail = await page.request.get(
    `/api/v1/registration/test-mails/latest?registrationId=${registrationId}&purpose=WORK_CODE`,
    { headers: { "x-registration-test-token": MAILBOX_TOKEN } }
  );
  expect(mail.status()).toBe(404);
});
