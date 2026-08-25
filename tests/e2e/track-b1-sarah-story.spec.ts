import { resolve } from "node:path";
import { expect, test, type Locator, type Page } from "@playwright/test";
import { signIn, signOut } from "./helpers/auth";

const evidence = (name: string) => resolve("artifacts", "track-b1-visual", name);

async function nextStep(page: Page, expectedState: string) {
  await page.getByRole("button", { name: "Next step" }).click();
  await expect(page.getByTestId("sarah-story")).toHaveAttribute("data-story-state", expectedState);
}

function overlaps(left: NonNullable<Awaited<ReturnType<Locator["boundingBox"]>>>, right: NonNullable<Awaited<ReturnType<Locator["boundingBox"]>>>) {
  return left.x < right.x + right.width
    && left.x + left.width > right.x
    && left.y < right.y + right.height
    && left.y + left.height > right.y;
}

async function assertNoCriticalOverlap(page: Page) {
  const character = await page.getByTestId("sarah-story-character").boundingBox();
  const controls = await page.getByRole("navigation", { name: "Story playback controls" }).boundingBox();
  const evidenceRegion = await page.getByRole("region", { name: "Trusted story evidence" }).boundingBox();
  if (!character || !controls || !evidenceRegion) throw new Error("Story layout regions were unavailable.");
  expect(overlaps(character, controls)).toBe(false);
  expect(overlaps(character, evidenceRegion)).toBe(false);
  expect(overlaps(controls, evidenceRegion)).toBe(false);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
}

async function assertNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
}

test.use({ viewport: { width: 414, height: 896 }, deviceScaleFactor: 1, isMobile: true });

test("plays the complete deterministic Sarah story with explicit accessible controls", async ({ page }) => {
  let conversationRequests = 0;
  page.on("request", (request) => {
    if (request.url().includes("/api/v1/conversations")) conversationRequests += 1;
  });
  await signIn(page, "sarah", "/home");
  await expect(page.getByRole("link", { name: "Play Sarah’s story" })).toBeVisible();
  await expect(page.getByTestId("sarah-story-character")).toHaveCount(0);

  const navigation = await page.getByRole("link", { name: "Play Sarah’s story" }).click();
  void navigation;
  await expect(page).toHaveURL(/\/story\/sarah$/);
  const storyResponse = await page.reload();
  expect(storyResponse?.status()).toBe(200);
  expect(storyResponse?.headers()["cache-control"]).toContain("private");
  expect(storyResponse?.headers()["cache-control"]).toContain("no-store");
  expect(storyResponse?.headers()["x-robots-tag"]).toBe("noindex, nofollow");
  await expect(page.getByTestId("story-ready")).toBeVisible();
  await expect(page.getByText("Sarah is a demonstration character")).toBeVisible();
  await page.screenshot({ path: evidence("01-story-entry-414x896.png"), fullPage: true });

  await page.getByRole("button", { name: "Play Sarah’s story" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("sarah-story")).toHaveAttribute("data-story-state", "INTRODUCTION");
  await expect(page.getByRole("heading", { name: "A decision, followed into the future" })).toBeFocused();

  await nextStep(page, "MEET_SARAH");
  await expect(page.getByTestId("story-profile")).toContainText("Sarah Wonk");
  await expect(page.getByTestId("story-profile")).toContainText("Customer Insights Analyst at OniBank");
  await expect(page.getByText(/student loan|flatmate|degree|personality/i)).toHaveCount(0);
  await page.screenshot({ path: evidence("02-meet-sarah-414x896.png"), fullPage: true });

  await nextStep(page, "DECISION_SETUP");
  await expect(page.getByTestId("story-current-path")).toContainText("£900");
  await expect(page.getByTestId("story-current-path")).toContainText("December 2026");
  await page.screenshot({ path: evidence("03-decision-setup-414x896.png"), fullPage: true });

  await nextStep(page, "QUESTION");
  await expect(page.getByText("“Can I afford a £650 trip next month?”")).toBeVisible();
  await nextStep(page, "CALCULATING");
  await expect(page.getByText("Reading stored deterministic results")).toBeVisible();

  await page.getByRole("button", { name: "Pause" }).click();
  await expect(page.getByTestId("sarah-story")).toHaveAttribute("data-story-state", "PAUSED");
  await expect(page.getByRole("button", { name: "Resume" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Next step" })).toBeDisabled();
  await page.screenshot({ path: evidence("04-paused-414x896.png"), fullPage: true });
  await page.getByRole("button", { name: "Resume" }).click();
  await expect(page.getByTestId("sarah-story")).toHaveAttribute("data-story-state", "CALCULATING");

  await nextStep(page, "TRIP_RESULT");
  const trip = page.getByTestId("story-result-trip_650_september");
  await expect(trip).toContainText("£900");
  await expect(trip).toContainText("£250");
  await expect(trip).toContainText("Bills covered");
  await expect(trip).toContainText("£0 overdraft");
  await expect(trip).toContainText("Restored in November 2026");
  await expect(trip).toContainText("February 2027");
  await expect(trip).toContainText("June 2027");
  await expect(trip).toContainText("July 2029");
  await page.screenshot({ path: evidence("05-trip-650-result-414x896.png"), fullPage: true });

  await page.getByRole("button", { name: "Skip animation" }).click();
  await expect(page.getByTestId("sarah-story")).toHaveAttribute("data-story-state", "TRIP_RESULT");
  await expect(trip).toContainText("£250");
  await nextStep(page, "ALTERNATIVES");
  await expect(page.getByTestId("story-result-trip_500_september")).toContainText("£400");
  await expect(page.getByTestId("story-result-trip_400_september")).toContainText("£500");
  await expect(page.getByTestId("story-result-trip_400_september")).toContainText("Noticeable trade-off");
  await page.screenshot({ path: evidence("06-amount-alternatives-414x896.png"), fullPage: true });

  await nextStep(page, "TIMING_ALTERNATIVE");
  const october = page.getByTestId("story-result-trip_650_october");
  await expect(october).toContainText("£250");
  await expect(october).toContainText("February 2027");
  await expect(page.getByText(/goal-completion dates do not improve/i)).toBeVisible();
  await page.screenshot({ path: evidence("07-october-alternative-414x896.png"), fullPage: true });

  await nextStep(page, "OPPORTUNITY_INFORMATION");
  await expect(page.getByTestId("story-opportunity-boundary")).toContainText("Not included in calculation");
  await expect(page.getByTestId("story-opportunity-boundary")).not.toContainText(/eligible|saves £|season.ticket loan/i);
  await page.screenshot({ path: evidence("08-opportunity-information-414x896.png"), fullPage: true });

  await page.getByRole("button", { name: "Skip to summary" }).click();
  await expect(page.getByTestId("sarah-story")).toHaveAttribute("data-story-state", "SUMMARY");
  await expect(page.getByRole("heading", { name: "The choice stays with Sarah" })).toBeFocused();
  await expect(page.getByTestId("story-summary")).toContainText("£250");
  await expect(page.getByTestId("story-summary")).toContainText("£400");
  await expect(page.getByTestId("story-summary")).toContainText("£500");
  await page.screenshot({ path: evidence("09-final-summary-414x896.png"), fullPage: true });

  await nextStep(page, "COMPLETE");
  await expect(page.getByRole("button", { name: "Next step" })).toHaveCount(0);
  await page.getByRole("button", { name: "Restart" }).click();
  await expect(page.getByTestId("story-ready")).toBeVisible();
  await expect(page.getByRole("heading", { name: "See a money choice become a future path" })).toBeFocused();

  await page.reload();
  await expect(page.getByTestId("story-ready")).toBeVisible();
  expect(conversationRequests).toBe(0);
});

test("provides complete reduced-motion and animation-disabled equivalents", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await signIn(page, "sarah", "/home");
  await page.getByRole("link", { name: "Play Sarah’s story" }).click();
  await page.getByRole("button", { name: "Play Sarah’s story" }).click();
  await expect(page.getByTestId("sarah-story")).toHaveAttribute("data-reduced-motion", "true");
  await page.getByRole("button", { name: "Skip to summary" }).click();
  await expect(page.getByTestId("story-summary")).toContainText("February 2027");
  await page.screenshot({ path: evidence("10-reduced-motion-summary-414x896.png"), fullPage: true });

  await page.getByRole("button", { name: "Disable animation" }).click();
  await expect(page.getByRole("button", { name: "Enable animation" })).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "Play Sarah’s story" }).click();
  await expect(page.getByRole("button", { name: "Enable animation" })).toBeVisible();
  await expect(page.getByTestId("sarah-story")).toHaveClass(/motion-disabled/);
});

test("keeps Sarah, results and controls unobstructed across the approved viewport matrix", async ({ page }) => {
  await signIn(page, "sarah", "/home");
  const viewports = [
    { width: 360, height: 800, name: "11-small-phone-360x800.png" },
    { width: 414, height: 896, name: "12-phone-414x896.png" },
    { width: 768, height: 1024, name: "13-tablet-768x1024.png" },
    { width: 1440, height: 900, name: "14-desktop-1440x900.png" }
  ];
  for (const viewport of viewports) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto("/story/sarah");
    await page.getByRole("button", { name: "Play Sarah’s story" }).click();
    await page.getByRole("button", { name: "Skip to summary" }).click();
    await assertNoCriticalOverlap(page);
    await page.screenshot({ path: evidence(viewport.name), fullPage: true });
  }

  await page.setViewportSize({ width: 414, height: 896 });
  await page.goto("/story/sarah");
  await page.getByRole("button", { name: "Play Sarah’s story" }).click();
  await page.getByRole("button", { name: "Skip to summary" }).click();
  await page.addStyleTag({ content: "html { font-size: 200% !important; }" });
  await expect(page.getByRole("navigation", { name: "Story playback controls" })).toBeVisible();
  await assertNoHorizontalOverflow(page);
  await page.screenshot({ path: evidence("15-text-200-percent-414x896.png"), fullPage: true });

  // A 1440px-wide display at 400% browser zoom exposes about 360 CSS pixels.
  // Testing that reflow width is more representative than quadrupling rem units.
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto("/story/sarah");
  await page.getByRole("button", { name: "Play Sarah’s story" }).click();
  await page.getByRole("button", { name: "Skip to summary" }).click();
  await expect(page.getByRole("navigation", { name: "Story playback controls" })).toBeVisible();
  await assertNoCriticalOverlap(page);
  await page.screenshot({ path: evidence("16-text-400-percent-1440x900.png"), fullPage: true });

  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto("/story/sarah");
  await page.getByRole("button", { name: "Play Sarah’s story" }).click();
  await page.getByRole("button", { name: "Skip to summary" }).click();
  await page.locator(".fy-story-speech").evaluate((element) => {
    element.textContent = "Sarah can compare each stored consequence in full, including the safety-buffer recovery and every goal date, without any sentence being clipped merely to preserve the illustration layout. ".repeat(3);
  });
  await assertNoCriticalOverlap(page);
  await page.screenshot({ path: evidence("17-long-caption-360x800.png"), fullPage: true });

  await page.getByTestId("sarah-story-character").evaluate((element) => element.remove());
  await expect(page.getByTestId("story-summary")).toContainText("February 2027");
  await expect(page.getByRole("navigation", { name: "Story playback controls" })).toBeVisible();
});

test("returns the same non-enumerating unavailable boundary for anonymous and non-Sarah users", async ({ page }) => {
  const anonymous = await page.goto("/story/sarah");
  expect(anonymous?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "That page could not be found" })).toBeVisible();

  await signIn(page, "alex");
  const foreignStory = await page.goto("/story/sarah");
  expect(foreignStory?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "That page could not be found" })).toBeVisible();
  const foreignRun = await page.evaluate(async () => {
    const response = await fetch("/api/v1/simulations/run-19b9e20a1ed382dc", { cache: "no-store" });
    return { status: response.status, body: await response.json() };
  });
  expect(foreignRun).toMatchObject({ status: 404, body: { error: { code: "RUN_NOT_FOUND" } } });

  await page.goto("/home");
  await expect(page.getByRole("link", { name: "Play Sarah’s story" })).toHaveCount(0);
  await expect(page.getByTestId("sarah-story-character")).toHaveCount(0);
  await signOut(page);
});
