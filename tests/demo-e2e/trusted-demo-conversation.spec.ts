import { expect, test, type Page } from "@playwright/test";
import { signIn } from "../e2e/helpers/auth";

test.use({ viewport: { width: 414, height: 896 }, deviceScaleFactor: 1, isMobile: true });

async function freshConversation(page: Page) {
  await page.getByRole("button", { name: "Open conversation history" }).click();
  await page.getByRole("button", { name: "+ New conversation", exact: true }).click();
}

async function ask(page: Page, message: string) {
  await page.getByLabel("Ask Future You").fill(message);
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(page.getByTestId("interpreting-state")).toBeHidden({ timeout: 15_000 });
}

test("renders and persists the continuous trusted-data demo journey", async ({ page }) => {
  await signIn(page, "sarah");
  await freshConversation(page);

  await ask(page, "Can I afford a £650 trip next month?");
  await expect(page.getByText("Here’s what your trusted Future You data shows:", { exact: false }).last()).toBeVisible();
  await expect(page.getByTestId("buffer-after").last()).toHaveText("£250");

  await ask(page, "What about £500?");
  await expect(page.getByTestId("buffer-after").last()).toHaveText("£400");
  await ask(page, "What about £400?");
  await expect(page.getByTestId("buffer-after").last()).toHaveText("£500");
  await ask(page, "What if I wait until October?");
  await expect(page.getByTestId("buffer-after").last()).toHaveText("£250");

  await ask(page, "Why does it delay my emergency fund?");
  await expect(page.getByText(/Emergency fund moves from December 2026 to February 2027/).last()).toBeVisible();

  await ask(page, "What are my goals?");
  await expect(page.getByText(/Emergency fund: £3,300 saved toward £4,500/).last()).toBeVisible();
  await expect(page.getByText(/House deposit: £7,200 saved toward £25,000/).last()).toBeVisible();

  await ask(page, "What benefits do I have from work?");
  await expect(page.getByText(/verified workplace is OniBank/).last()).toBeVisible();
  await expect(page.getByText(/season-ticket loan/).last()).toBeVisible();
  await expect(page.getByText(/no numerical effect has been calculated/).last()).toBeVisible();

  await expect(page.locator(".fy-message")).toHaveCount(14);
  await page.reload();
  await expect(page.locator(".fy-message")).toHaveCount(14);
  await expect(page.getByText(/verified workplace is OniBank/).last()).toBeVisible();
});

