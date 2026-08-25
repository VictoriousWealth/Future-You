import { resolve } from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { signIn, signOut } from "./helpers/auth";

test.use({ viewport: { width: 414, height: 896 }, deviceScaleFactor: 1, isMobile: true });

const evidence = (name: string) => resolve("artifacts", "slice-5-visual", name);

async function freshConversation(page: Page) {
  await page.getByRole("button", { name: "Open conversation history" }).click();
  await page.getByRole("button", { name: "+ New conversation", exact: true }).click();
}

async function ask(page: Page, message: string) {
  await page.getByLabel("Ask Future You").fill(message);
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(page.getByTestId("interpreting-state")).toBeHidden({ timeout: 15_000 });
}

test("completes and persists the mobile golden Ask journey with cross-user isolation", async ({ page }) => {
  await signIn(page, "sarah");
  await freshConversation(page);
  await expect(page.getByTestId("ask-visual-shell")).toBeVisible();
  await expect(page.getByRole("heading", { name: /Welcome back, Sarah/ })).toBeVisible();
  await expect(page.getByText("What are you thinking about?")).toBeVisible();
  await expect(page.getByTestId("context-pill")).toHaveCount(0);
  await expect(page.getByTestId("ask-composer")).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Product navigation" }).getByText("Ask")).toBeVisible();
  const overflow = await page.locator(".fy-prompt-rail").evaluate((element) => element.scrollWidth > element.clientWidth);
  expect(overflow).toBe(true);
  await page.screenshot({ path: evidence("ask-initial-414x896.png") });

  await ask(page, "Can I afford a £650 trip next month?");
  await expect(page.getByTestId("buffer-after")).toHaveText("£250");
  await expect(page.getByTestId("required-payments")).toHaveText("Bills covered");
  await expect(page.getByTestId("overdraft-usage")).toHaveText("£0 overdraft");
  await expect(page.getByTestId("buffer-recovery")).toHaveText("Restored in November 2026");
  await expect(page.getByText("Affordable · Significant trade-off")).toBeVisible();
  const resultBox = await page.getByTestId("scenario-result").boundingBox();
  expect(resultBox?.width).toBeLessThanOrEqual(374);
  await page.screenshot({ path: evidence("ask-650-result-414x896.png") });

  await ask(page, "What about £500?");
  await expect(page.getByTestId("buffer-after").last()).toHaveText("£400");
  await ask(page, "What about £400?");
  await expect(page.getByTestId("buffer-after").last()).toHaveText("£500");
  await ask(page, "What if I wait until October?");
  await expect(page.getByTestId("buffer-after").last()).toHaveText("£250");

  await page.getByRole("button", { name: "5 paths" }).click();
  await expect(page.getByTestId("scenario-selector")).toContainText("£500 option");
  await expect(page.getByTestId("scenario-selector")).toContainText("£400 option");
  await expect(page.getByTestId("scenario-selector")).toContainText("Go in October");
  await page.screenshot({ path: evidence("ask-alternatives-414x896.png") });
  await page.getByTestId("scenario-selector").getByRole("button", { name: "Close" }).click();

  await ask(page, "Why does my emergency fund move back?");
  await expect(page.getByText(/Emergency fund moves from December 2026 to February 2027/)).toBeVisible();
  await ask(page, "Show me my current path.");
  await expect(page.getByText(/viewing your current path again/i)).toBeVisible();

  const conversationId = await page.evaluate(async () => {
    const response = await fetch("/api/v1/conversations", { cache: "no-store" });
    const body = await response.json();
    return body.conversations[0].id as string;
  });
  const messageCount = await page.locator(".fy-message").count();
  expect(messageCount).toBe(12);
  await page.reload();
  await expect(page.locator(".fy-message")).toHaveCount(12);
  await expect(page.getByText(/viewing your current path again/i)).toBeVisible();

  await signOut(page);
  await signIn(page, "alex");
  const foreign = await page.evaluate(async (id) => {
    const response = await fetch(`/api/v1/conversations/${id}`);
    return { status: response.status, body: await response.json() };
  }, conversationId);
  expect(foreign).toMatchObject({ status: 404, body: { error: { code: "CONVERSATION_NOT_FOUND" } } });
});

test("renders clarification and unsupported states inside the same Ask visual system", async ({ page }) => {
  await signIn(page, "sarah");
  await freshConversation(page);
  await ask(page, "Can I afford a trip next month?");
  await expect(page.getByText("How much do you expect the trip to cost?")).toBeVisible();
  await page.screenshot({ path: evidence("ask-clarification-414x896.png") });

  await freshConversation(page);
  await ask(page, "Split a £650 trip into four instalments next month");
  await expect(page.getByText(/I can’t model that in this version/)).toBeVisible();
  await expect(page.getByTestId("scenario-result")).toHaveCount(0);
  await page.screenshot({ path: evidence("ask-unsupported-414x896.png") });

  await freshConversation(page);
  const longMessage = `Can I afford a £650 trip next month? ${"Please keep the explanation clear. ".repeat(12)}`;
  await ask(page, longMessage);
  const userBubble = page.locator(".fy-message.user").last();
  const box = await userBubble.boundingBox();
  expect(box?.x).toBeGreaterThanOrEqual(0);
  expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(414);
});
