import { resolve } from "node:path";
import { expect, test, type Page } from "@playwright/test";
import type { BenefitsSurfaceDTO, HomeSurfaceDTO } from "../../src/application/product-surfaces/contracts";
import { LOCAL_USERS, signIn, signOut } from "./helpers/auth";

test.use({ viewport: { width: 414, height: 896 }, deviceScaleFactor: 1, isMobile: true });
test.describe.configure({ mode: "serial", timeout: 90_000 });

const evidence = (name: string) => resolve("artifacts", "slice-7-visual", name);
const releaseEmail = LOCAL_USERS.alex.email;
const releasePassword = LOCAL_USERS.alex.password;

async function signInWithCredentials(page: Page, email: string, password: string, destination = "/home") {
  await page.goto(`/login?next=${encodeURIComponent(destination)}`);
  await page.getByLabel("Email").fill(email);
  await page.locator("#password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(new RegExp(`${destination.replace("/", "\\/")}$`));
}

async function freshConversation(page: Page) {
  await page.getByRole("button", { name: "Open conversation history" }).click();
  await page.getByRole("button", { name: "+ New conversation", exact: true }).click();
  await expect(page.getByText("What are you thinking about?")).toBeVisible();
}

async function ask(page: Page, message: string, expectSuccess = true) {
  const response = page.waitForResponse((candidate) =>
    candidate.request().method() === "POST" && candidate.url().includes("/api/v1/conversations/") && candidate.url().endsWith("/messages")
  );
  await page.getByLabel("Ask Future You").fill(message);
  await page.getByRole("button", { name: "Send message" }).click();
  const completed = await response;
  if (expectSuccess) expect(completed.ok(), await completed.text()).toBe(true);
  await expect(page.getByTestId("interpreting-state")).toBeHidden({ timeout: 15_000 });
}

async function fillCanonicalOnboarding(page: Page) {
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
  const payments = [
    ["Rent", "825"],
    ["Council tax", "90"],
    ["Utilities and internet", "95"],
    ["Phone", "22"],
    ["Insurance", "18"]
  ] as const;
  for (const [index, [label, amount]] of payments.entries()) {
    if (index > 0) await page.getByRole("button", { name: "Add required payment" }).click();
    await page.getByLabel(`Required payment ${index + 1} name`).fill(label);
    await page.getByLabel(`Required payment ${index + 1} amount`).fill(amount);
  }
  await page.getByRole("button", { name: "Continue" }).click();

  await page.getByLabel("Desired safety buffer").fill("900");
  await page.getByRole("button", { name: "Continue" }).click();

  const goals = [
    ["House deposit", "7200", "25000", "200"],
    ["Holiday", "350", "1200", "100"],
    ["Emergency fund", "3300", "4500", "300"]
  ] as const;
  for (const [index, [label, current, target, contribution]] of goals.entries()) {
    if (index > 0) await page.getByRole("button", { name: "Add another goal" }).click();
    await page.getByLabel(`Goal ${index + 1} name`).fill(label);
    await page.getByLabel(`Goal ${index + 1} current balance`).fill(current);
    await page.getByLabel(`Goal ${index + 1} target balance`).fill(target);
    await page.getByLabel(`Goal ${index + 1} contribution`).fill(contribution);
  }
  await page.getByLabel("I have confirmed transfers").check();
  await page.getByLabel("Goal 1 committed transfer").fill("200");
  await page.getByLabel("Goal 2 committed transfer").fill("100");
  await page.getByLabel("Goal 3 committed transfer").fill("300");
  await page.getByLabel("Overflow destination").selectOption({ label: "House deposit" });
  await page.getByRole("button", { name: "Continue" }).click();

  await page.getByLabel("Employer or workplace").fill("OniBank");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Review your current path" })).toBeVisible();
}

async function expectNoHorizontalOverflow(page: Page) {
  const layout = await page.evaluate(() => ({
    document: document.documentElement.scrollWidth,
    viewport: document.documentElement.clientWidth,
    offenders: Array.from(document.querySelectorAll<HTMLElement>("body *"))
      .map((element) => {
        const box = element.getBoundingClientRect();
        return { tag: element.tagName, className: element.className, left: box.left, right: box.right, width: box.width };
      })
      .filter((item) => item.left < -1 || item.right > document.documentElement.clientWidth + 1)
      .slice(0, 8)
  }));
  expect(layout.document, JSON.stringify(layout.offenders)).toBeLessThanOrEqual(layout.viewport + 1);
}

async function expectAppleHandheldTypeFloor(page: Page) {
  const audit = await page.evaluate(() => {
    const minimum = 11;
    const violations: Array<{ selector: string; size: number; text: string }> = [];
    for (const element of Array.from(document.querySelectorAll<HTMLElement>("body *"))) {
      const style = getComputedStyle(element);
      const box = element.getBoundingClientRect();
      if (style.display === "none" || style.visibility === "hidden" || box.width === 0 || box.height === 0) continue;
      const hasOwnText = Array.from(element.childNodes).some(
        (node) => node.nodeType === Node.TEXT_NODE && Boolean(node.textContent?.trim())
      );
      const hasControlText = element instanceof HTMLInputElement
        || element instanceof HTMLTextAreaElement
        || element instanceof HTMLSelectElement;
      const candidates = hasOwnText || hasControlText
        ? [{ pseudo: "", computed: style }]
        : [];
      for (const pseudo of ["::before", "::after"] as const) {
        const computed = getComputedStyle(element, pseudo);
        if (computed.content !== "none" && computed.content !== "normal" && computed.content !== '""') {
          candidates.push({ pseudo, computed });
        }
      }
      for (const { pseudo, computed } of candidates) {
        const size = Number.parseFloat(computed.fontSize);
        if (size + 0.01 >= minimum) continue;
        violations.push({
          selector: `${element.tagName.toLowerCase()}${element.id ? `#${element.id}` : ""}${pseudo}`,
          size,
          text: (element.textContent ?? element.getAttribute("placeholder") ?? "").trim().slice(0, 60)
        });
      }
    }
    return {
      bodySize: Number.parseFloat(getComputedStyle(document.body).fontSize),
      violations: violations.slice(0, 12)
    };
  });
  expect(audit.bodySize).toBeGreaterThanOrEqual(17);
  expect(audit.violations).toEqual([]);
}

async function expectAppleMeaningfulIconScale(page: Page) {
  const violations = await page.locator('svg[aria-hidden="true"]').evaluateAll((icons) => icons.flatMap((icon) => {
    const style = getComputedStyle(icon);
    const box = icon.getBoundingClientRect();
    if (style.display === "none" || style.visibility === "hidden" || box.width === 0 || box.height === 0) return [];
    if (box.width + 0.01 >= 17 && box.height + 0.01 >= 17) return [];
    return [{
      className: icon.getAttribute("class") ?? "",
      width: box.width,
      height: box.height
    }];
  }));
  expect(violations).toEqual([]);
}

async function expectHeaderWordmarkInsideViewport(page: Page) {
  const geometry = await page.getByRole("link", { name: "Future You home" }).evaluate((wordmark) => {
    const symbol = wordmark.querySelector<HTMLElement>(".fy-angular-symbol");
    if (!symbol) throw new Error("The shared angular symbol is missing.");
    const wordmarkBox = wordmark.getBoundingClientRect();
    const symbolBox = symbol.getBoundingClientRect();
    return {
      viewportWidth: document.documentElement.clientWidth,
      wordmarkLeft: wordmarkBox.left,
      wordmarkRight: wordmarkBox.right,
      symbolLeft: symbolBox.left,
      symbolRight: symbolBox.right
    };
  });
  expect(geometry.wordmarkLeft, JSON.stringify(geometry)).toBeGreaterThanOrEqual(0);
  expect(geometry.symbolLeft, JSON.stringify(geometry)).toBeGreaterThanOrEqual(0);
  expect(geometry.wordmarkRight, JSON.stringify(geometry)).toBeLessThanOrEqual(geometry.viewportWidth);
  expect(geometry.symbolRight, JSON.stringify(geometry)).toBeLessThanOrEqual(geometry.viewportWidth);
}

async function settleRoute(page: Page, path: "/home" | "/goals" | "/ask" | "/benefits") {
  await page.goto(path);
  if (path === "/home") await expect(page.getByText("What are you thinking about?")).toBeVisible({ timeout: 20_000 });
  if (path === "/goals") await expect(page.getByRole("heading", { name: "Your goals", exact: true })).toBeVisible();
  if (path === "/ask") await expect(page.getByTestId("ask-visual-shell")).toBeVisible();
  if (path === "/benefits") await expect(page.getByRole("heading", { name: "Your benefits", exact: true })).toBeVisible();
}

test("completes the new-user auth and canonical onboarding release journey", async ({ page }) => {
  await page.goto("/welcome");
  await expect(page.getByRole("heading", { name: "Your decisions. Your future." })).toBeVisible();
  await expect(page.locator(".auth-brand-symbol img")).toHaveAttribute("src", /future-you-logo\.png/);
  await page.screenshot({ path: evidence("01-welcome-414x896.png") });

  await page.getByRole("link", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
  await expectAppleHandheldTypeFloor(page);
  await expectAppleMeaningfulIconScale(page);
  const loginWordmark = page.getByRole("link", { name: "Back to Future You welcome" });
  await expect(loginWordmark).toContainText("FUTUREYOU");
  await expect(loginWordmark).not.toContainText("AI");
  await expect(loginWordmark.locator(".auth-brand-symbol")).toHaveCount(0);
  await expect(loginWordmark.locator(".fy-angular-symbol")).toBeVisible();
  await expect(loginWordmark.locator(".fy-angular-symbol img")).toHaveAttribute("src", /future-you-logo\.png/);
  expect(Number.parseFloat(await loginWordmark.evaluate((element) => getComputedStyle(element).fontSize))).toBeGreaterThanOrEqual(17);
  const loginWordmarkSizes = await loginWordmark.locator(".fy-wordmark-copy > *").evaluateAll(
    (segments) => segments.map((segment) => Number.parseFloat(getComputedStyle(segment).fontSize))
  );
  expect(loginWordmarkSizes.every((size) => size >= 17)).toBe(true);
  const loginPassword = page.locator("#password");
  await expect(page.getByRole("button", { name: "Show password" })).toBeVisible();
  await page.getByRole("button", { name: "Show password" }).click();
  await expect(loginPassword).toHaveAttribute("type", "text");
  await page.getByRole("button", { name: "Hide password" }).click();
  await expect(loginPassword).toHaveAttribute("type", "password");
  await expect(page).toHaveScreenshot("login.png", { animations: "disabled" });
  await page.screenshot({ path: evidence("02-login-414x896.png") });

  await page.getByRole("link", { name: "Create an account" }).click();
  await expect(page.getByRole("heading", { name: "Create account" })).toBeVisible();
  await expectAppleHandheldTypeFloor(page);
  await expectAppleMeaningfulIconScale(page);
  await expect(page.getByRole("link", { name: "Back to Future You welcome" })).toContainText("FUTUREYOU");
  await expect(page.getByRole("link", { name: "Back to Future You welcome" })).not.toContainText("AI");
  await expect(page.locator(".auth-back-brand .fy-angular-symbol")).toBeVisible();
  await expect(page.getByText(/Company ID/i)).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Show passwords" })).toBeVisible();
  await page.getByRole("button", { name: "Show passwords" }).click();
  await expect(page.locator("#signup-password")).toHaveAttribute("type", "text");
  await expect(page.getByLabel("Confirm password")).toHaveAttribute("type", "text");
  await page.getByRole("button", { name: "Hide passwords" }).click();
  await page.screenshot({ path: evidence("03-signup-414x896.png") });
  await page.getByLabel("Personal email").fill("new-user@example.test");
  await page.locator("#signup-password").fill("Release-Local-Only-2026!");
  await page.getByLabel("Confirm password").fill("Different-Local-Password-2026!");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.locator(".auth-message[role='alert']")).toHaveText("The passwords do not match.");

  await signIn(page, "alex");
  await expect(page).toHaveURL(/\/onboarding$/);
  await expect(page.getByRole("heading", { name: "A picture of today" })).toBeVisible();
  await expect(page.locator(".onboarding-header .fy-wordmark")).toContainText("FUTUREYOU");
  await expect(page.locator(".onboarding-header .fy-wordmark")).not.toContainText("AI");
  await expect(page.locator(".onboarding-header .fy-angular-symbol")).toBeVisible();
  await expect(page.locator(".onboarding-header .fy-angular-symbol img")).toHaveAttribute("src", /future-you-logo\.png/);
  await page.screenshot({ path: evidence("04-onboarding-intro-414x896.png") });

  await fillCanonicalOnboarding(page);
  await expectAppleHandheldTypeFloor(page);
  await page.getByRole("button", { name: "Preview my current path" }).click();
  await expect(page.getByTestId("onboarding-preview")).toBeVisible();
  await expect(page.getByText("£2750.00")).toBeVisible();
  await expect(page).toHaveScreenshot("onboarding-review.png", { animations: "disabled" });
  await page.screenshot({ path: evidence("05-onboarding-review-414x896.png") });

  await page.getByRole("button", { name: "Confirm this financial context" }).click();
  await expect(page).toHaveURL(/\/ask$/);
  await settleRoute(page, "/home");
  await expect(page.getByText("£900", { exact: true })).toBeVisible();

  await settleRoute(page, "/goals");
  await expect(page.locator("[data-testid^='goal-']").filter({ hasText: "Emergency fund" })).toContainText("December 2026");

  await settleRoute(page, "/ask");
  await freshConversation(page);
  await ask(page, "Can I afford a £650 trip next month?");
  await expect(page.getByTestId("buffer-after").last()).toHaveText("£250");
  const releaseRunId = (await page.getByTestId("run-id").last().textContent())?.trim();
  expect(releaseRunId).toBeTruthy();

  await page.goto(`/goals?runId=${encodeURIComponent(releaseRunId!)}`);
  await expect(page.getByTestId("hypothetical-preview")).toBeVisible();
  await expect(page.locator("[data-testid^='preview-goal-']").filter({ hasText: "Emergency fund" })).toContainText("February 2027");
  await page.getByRole("link", { name: "Return to current path" }).click();
  await expect(page.getByTestId("hypothetical-preview")).toHaveCount(0);

  await settleRoute(page, "/benefits");
  await expect(page.getByTestId("workplace-state")).toContainText("OniBank");
  await expect(page.getByTestId("benefits-empty-state")).toBeVisible();

  await signOut(page);
  await signInWithCredentials(page, releaseEmail, releasePassword, "/home");
  await expect(page.getByText("£900", { exact: true })).toBeVisible();
});

test("captures the returning Sarah journey and every canonical visual state", async ({ page }) => {
  await signIn(page, "sarah", "/home");
  await expect(page.getByText("What are you thinking about?")).toBeVisible({ timeout: 20_000 });
  const homeWordmark = page.getByRole("link", { name: "Future You home" });
  await expect(homeWordmark).toContainText("FUTUREYOU");
  await expect(homeWordmark).not.toContainText("AI");
  await expect(homeWordmark.locator(".fy-angular-symbol")).toBeVisible();
  await expect(homeWordmark.locator(".fy-angular-symbol img")).toHaveAttribute("src", /future-you-logo\.png/);
  await expectHeaderWordmarkInsideViewport(page);
  const homeHero = page.locator(".fy-home-hero");
  await expect(homeHero.locator(".fy-home-hero-action .fy-action-triangle.is-right")).toBeVisible();
  await expect(homeHero).not.toContainText("→");
  await expect(page.locator(".fy-home-decision > .fy-action-triangle.is-right")).toHaveCount(3);
  await expect(page).toHaveScreenshot("home-current.png", { animations: "disabled" });
  await page.screenshot({ path: evidence("06-home-upper-414x896.png") });
  await page.getByText("Your future right now").evaluate((element) => element.scrollIntoView({ block: "start" }));
  await page.screenshot({ path: evidence("07-home-lower-414x896.png") });

  await settleRoute(page, "/goals");
  const emergencyGoal = page.getByTestId("goal-goal-emergency-fund");
  await expect(emergencyGoal).toContainText("December 2026");
  const ringGeometry = await emergencyGoal.locator(".fy-goal-ratio").evaluate((ring) => {
    const track = ring.querySelector<SVGCircleElement>(".fy-goal-ratio-track");
    const arc = ring.querySelector<SVGCircleElement>(".fy-goal-ratio-arc");
    if (!track || !arc) throw new Error("Goal progress ring geometry is incomplete.");
    const ringWidth = ring.getBoundingClientRect().width;
    const innerWidth = Number.parseFloat(getComputedStyle(ring, "::before").width);
    return {
      arcStroke: Number.parseFloat(getComputedStyle(arc).strokeWidth),
      trackStroke: Number.parseFloat(getComputedStyle(track).strokeWidth),
      ringWidth,
      innerRatio: innerWidth / ringWidth
    };
  });
  expect(ringGeometry.arcStroke).toBeGreaterThan(ringGeometry.trackStroke);
  expect(ringGeometry.ringWidth).toBeGreaterThan(56);
  expect(ringGeometry.innerRatio).toBeLessThanOrEqual(0.61);
  const progressFillBackground = await emergencyGoal.locator(".fy-progress-track > span").evaluate(
    (fill) => getComputedStyle(fill).backgroundImage
  );
  expect(progressFillBackground).toContain("repeating-linear-gradient");
  expect(progressFillBackground.match(/linear-gradient/g)?.length).toBeGreaterThanOrEqual(2);
  const progressBarGeometry = await emergencyGoal.locator(".fy-progress-track").evaluate((track) => {
    const fill = track.querySelector<HTMLElement>(":scope > span");
    if (!fill) throw new Error("Goal progress fill is missing.");
    const trackStyle = getComputedStyle(track);
    const fillStyle = getComputedStyle(fill);
    return {
      trackHeight: Number.parseFloat(trackStyle.height),
      isPartial: fill.classList.contains("is-partial"),
      leftRadius: Number.parseFloat(fillStyle.borderTopLeftRadius),
      rightRadius: Number.parseFloat(fillStyle.borderTopRightRadius)
    };
  });
  expect(progressBarGeometry.trackHeight).toBeGreaterThanOrEqual(12);
  expect(progressBarGeometry.isPartial).toBe(true);
  expect(progressBarGeometry.leftRadius).toBeGreaterThan(0);
  expect(progressBarGeometry.rightRadius).toBe(0);
  await expect(page).toHaveScreenshot("goals-current.png", { animations: "disabled" });
  await page.screenshot({ path: evidence("08-goals-current-414x896.png") });

  await settleRoute(page, "/ask");
  await freshConversation(page);
  await expect(page.getByRole("link", { name: "Future You home" })).toContainText("FUTUREYOUAI");
  await expectHeaderWordmarkInsideViewport(page);
  await expect(page.locator(".fy-prompt-card > .fy-action-triangle.is-right")).toHaveCount(4);
  const sendButton = page.getByRole("button", { name: "Send message" });
  await expect(sendButton.locator(".fy-action-triangle.is-up")).toBeVisible();
  await expect(sendButton).not.toContainText("↑");
  await expect(page).toHaveScreenshot("ask-initial.png", { animations: "disabled" });
  await page.screenshot({ path: evidence("09-ask-initial-414x896.png") });

  await ask(page, "Can I afford a £650 trip next month?");
  await expect(page.getByTestId("buffer-after")).toHaveText("£250");
  await expect(page.getByTestId("required-payments")).toHaveText("Bills covered");
  await expect(page.getByTestId("overdraft-usage")).toHaveText("£0 overdraft");
  await expect(page.getByTestId("buffer-recovery")).toHaveText("Restored in November 2026");
  await expect(page.getByText("Affordable · Significant trade-off")).toBeVisible();
  await expect(page).toHaveScreenshot("ask-650-result.png", { animations: "disabled" });
  await page.screenshot({ path: evidence("10-ask-650-result-414x896.png") });
  const runId = (await page.getByTestId("run-id").last().textContent())?.trim();
  expect(runId).toBeTruthy();

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
  await page.screenshot({ path: evidence("11-ask-alternatives-414x896.png") });
  await page.getByTestId("scenario-selector").getByRole("button", { name: "Close" }).click();

  await page.goto(`/goals?runId=${encodeURIComponent(runId!)}`);
  await expect(page.getByTestId("hypothetical-preview")).toBeVisible();
  await expect(page.getByText("£650 trip", { exact: true })).toBeVisible();
  await page.screenshot({ path: evidence("12-goals-hypothetical-414x896.png") });

  await settleRoute(page, "/ask");
  await freshConversation(page);
  await ask(page, "Can I afford a trip next month?");
  await expect(page.getByText("How much do you expect the trip to cost?")).toBeVisible();
  await page.screenshot({ path: evidence("13-ask-clarification-414x896.png") });

  await freshConversation(page);
  await ask(page, "Split a £650 trip into four instalments next month");
  await expect(page.getByText(/I can’t model that in this version/)).toBeVisible();
  await expect(page.getByTestId("scenario-result")).toHaveCount(0);
  await page.screenshot({ path: evidence("14-ask-unsupported-414x896.png") });

  await freshConversation(page);
  await page.route("**/api/v1/conversations/*/messages", async (route) => {
    await route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ error: { code: "PROVIDER_UNAVAILABLE", message: "Future You is temporarily unavailable. Your financial plan was not changed.", retryable: true } })
    });
  });
  await ask(page, "Can I afford a £650 trip next month?", false);
  await expect(page.getByTestId("provider-error-state")).toContainText("Your financial plan was not changed");
  await expect(page.getByTestId("scenario-result")).toHaveCount(0);
  await page.screenshot({ path: evidence("15-ask-provider-error-414x896.png") });
  await page.unroute("**/api/v1/conversations/*/messages");

  await settleRoute(page, "/benefits");
  await expect(page.getByTestId("active-pension-fact")).toContainText("not spendable cash");
  await expect(page).toHaveScreenshot("benefits-canonical.png", { animations: "disabled" });
  await page.screenshot({ path: evidence("16-benefits-canonical-414x896.png") });

  const actualBenefits = await page.evaluate(async () => await (await fetch("/api/v1/benefits")).json()) as BenefitsSurfaceDTO;
  await page.route("**/api/v1/benefits", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ...actualBenefits,
        workplace: { status: "not_supplied", name: null, statusLabel: "No workplace added" },
        activeFacts: [],
        opportunities: [],
        emptyState: { kind: "no_workplace", title: "No workplace information yet", description: "You can use Future You without adding a workplace." }
      })
    });
  });
  await page.reload();
  await expect(page.getByTestId("benefits-empty-state")).toBeVisible();
  await page.screenshot({ path: evidence("17-benefits-no-data-414x896.png") });
});

test("keeps the default current-plan banner absent from every primary surface", async ({ page }) => {
  await signIn(page, "sarah", "/home");
  const routes = ["/home", "/goals", "/ask", "/benefits"] as const;

  for (const viewport of [{ width: 414, height: 896 }, { width: 1440, height: 900 }]) {
    await page.setViewportSize(viewport);
    for (const route of routes) {
      await settleRoute(page, route);
      await expect(page.getByTestId("context-pill")).toHaveCount(0);
      await expect(page.locator(".fy-context-pill")).toHaveCount(0);
      await expect(page.getByText("Current plan active", { exact: true })).toHaveCount(0);
    }
  }
});

test("uses the generated profile portrait for the financial-context settings link", async ({ page }) => {
  await signIn(page, "sarah", "/home");
  const profileLink = page.getByRole("link", { name: "Open financial context settings" });
  const portrait = profileLink.locator("img");

  await expect(profileLink).toBeVisible();
  await expect(portrait).toBeVisible();
  await expect(portrait).toHaveAttribute("src", /sarah-profile\.png/);
  await expect(portrait).toHaveAttribute("alt", "");
  await expect(profileLink.locator("svg")).toHaveCount(0);
  const size = await portrait.boundingBox();
  expect(size?.width).toBeGreaterThanOrEqual(40);
  expect(size?.height).toBeGreaterThanOrEqual(40);
});

test("scales meaningful interface icons with the Apple-aligned body type", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
  await expectAppleMeaningfulIconScale(page);
  await expect(page).toHaveScreenshot("login.png", { animations: "disabled" });
  await page.screenshot({ path: evidence("02-login-414x896.png") });

  await page.goto("/signup");
  await expect(page.getByRole("heading", { name: "Create account" })).toBeVisible();
  await expectAppleMeaningfulIconScale(page);
  await page.screenshot({ path: evidence("03-signup-414x896.png") });

  await signIn(page, "sarah", "/home");
  await expect(page.getByText("What are you thinking about?")).toBeVisible({ timeout: 20_000 });
  await expectAppleMeaningfulIconScale(page);
  const triangle = page.locator(".fy-home-decision > .fy-action-triangle").first();
  const standardSize = await triangle.boundingBox();
  expect(standardSize?.width).toBeGreaterThanOrEqual(17);
  expect(standardSize?.height).toBeGreaterThanOrEqual(17);

  await page.evaluate(() => { document.documentElement.style.fontSize = "200%"; });
  const enlargedSize = await triangle.boundingBox();
  expect(enlargedSize?.width).toBeGreaterThanOrEqual(34);
  expect(enlargedSize?.height).toBeGreaterThanOrEqual(34);
  await page.evaluate(() => { document.documentElement.style.fontSize = ""; });
});

test("captures the shared onboarding lockup without confirming financial context", async ({ page }) => {
  await signIn(page, "onboarding");
  await expect(page).toHaveURL(/\/onboarding$/);
  await expect(page.getByRole("heading", { name: "A picture of today" })).toBeVisible();
  const onboardingWordmark = page.locator(".onboarding-header .fy-wordmark");
  await expect(onboardingWordmark.locator(".fy-angular-symbol")).toBeVisible();
  await expect(onboardingWordmark.locator(".fy-angular-symbol img")).toHaveAttribute("src", /future-you-logo\.png/);
  await expect(onboardingWordmark).toContainText("FUTUREYOU");
  await expect(onboardingWordmark).not.toContainText("AI");
  await page.screenshot({ path: evidence("04-onboarding-intro-414x896.png") });

  await fillCanonicalOnboarding(page);
  await page.getByRole("button", { name: "Preview my current path" }).click();
  await expect(page.getByTestId("onboarding-preview")).toBeVisible();
  await expect(page).toHaveScreenshot("onboarding-review.png", { animations: "disabled" });
  await page.screenshot({ path: evidence("05-onboarding-review-414x896.png") });

  await page.reload();
  await expect(page).toHaveURL(/\/onboarding$/);
  await expect(page.getByRole("heading", { name: "A picture of today" })).toBeVisible();
});

test("uses intentional phone, tablet and desktop layouts without changing route authority", async ({ page }) => {
  await signIn(page, "sarah", "/home");
  const viewports = [
    { width: 360, height: 800, label: "360x800" },
    { width: 414, height: 896, label: "414x896" },
    { width: 768, height: 1024, label: "768x1024" },
    { width: 1440, height: 900, label: "1440x900" }
  ] as const;
  const routes = ["/home", "/goals", "/ask", "/benefits"] as const;

  for (const viewport of viewports) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    for (const route of routes) {
      await settleRoute(page, route);
      if (route === "/ask") await freshConversation(page);
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(200);
      await expectNoHorizontalOverflow(page);
      await expectAppleHandheldTypeFloor(page);
      await expectAppleMeaningfulIconScale(page);
      const headerWordmark = page.getByRole("link", { name: "Future You home" });
      await expect(headerWordmark).toContainText(route === "/ask" ? "FUTUREYOUAI" : "FUTUREYOU");
      if (route !== "/ask") await expect(headerWordmark).not.toContainText("AI");
      await expectHeaderWordmarkInsideViewport(page);
      const h1Count = await page.getByRole("heading", { level: 1 }).count();
      expect(h1Count).toBe(1);
      if (viewport.width >= 768) {
        await page.screenshot({ path: evidence(`${route.slice(1)}-${viewport.label}.png`), animations: "disabled" });
      }
    }

    const navigation = await page.getByRole("navigation", { name: "Product navigation" }).boundingBox();
    expect(navigation).not.toBeNull();
    if (viewport.width >= 768) {
      const contentHeading = await page.getByRole("heading", { name: "Your benefits" }).boundingBox();
      expect(contentHeading).not.toBeNull();
      expect(navigation!.x).toBeLessThan(contentHeading!.x);
      expect(navigation!.y).toBeLessThan(contentHeading!.y + contentHeading!.height);
    } else {
      expect(navigation!.y).toBeGreaterThan(viewport.height / 2);
    }
  }
});

test("preserves the historical run through a visible immutable context correction", async ({ page }) => {
  await signInWithCredentials(page, releaseEmail, releasePassword, "/ask");
  await freshConversation(page);
  await ask(page, "Can I afford a £650 trip next month?");
  const oldRunId = (await page.getByTestId("run-id").last().textContent())?.trim();
  expect(oldRunId).toBeTruthy();

  await page.goto("/settings/financial-context");
  await page.getByRole("button", { name: "Build my current path" }).click();
  await page.getByLabel("Actual cleared balance").fill("2800");
  for (let step = 0; step < 6; step += 1) await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Preview my current path" }).click();
  await expect(page.getByTestId("onboarding-preview")).toContainText("£2800.00");
  await expect(page.getByText("You’re creating a new version of your financial plan.")).toBeVisible();
  await page.screenshot({ path: evidence("18-context-correction-preview-414x896.png") });
  await page.getByRole("button", { name: "Confirm this financial context" }).click();
  await expect(page).toHaveURL(/\/ask$/);
  await expect(page.getByTestId("stale-context-state")).toBeVisible();

  await page.goto(`/goals?runId=${encodeURIComponent(oldRunId!)}`);
  await expect(page.getByTestId("historical-preview-warning")).toBeVisible();
  await expect(page.locator("[data-testid^='preview-goal-']").filter({ hasText: "Emergency fund" })).toContainText("February 2027");

  await page.goto("/ask");
  await expect(page.getByTestId("stale-context-state")).toBeVisible();
  await page.getByRole("button", { name: "Start with current plan" }).click();
  await expect(page.getByText("What are you thinking about?")).toBeVisible({ timeout: 20_000 });
  await ask(page, "Can I afford a £650 trip next month?");
  await expect(page.getByTestId("context-pill")).toHaveCount(0);
  await expect(page.getByTestId("stale-context-state")).toHaveCount(0);
});

test("meets keyboard, reduced-motion, long-content and zoom resilience gates", async ({ page }) => {
  await signIn(page, "sarah", "/home");
  await expect(page.getByText("What are you thinking about?")).toBeVisible({ timeout: 20_000 });
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Skip to page content" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("home-surface")).toBeFocused();

  await settleRoute(page, "/ask");
  const historyTrigger = page.getByRole("button", { name: "Open conversation history" });
  await historyTrigger.click();
  const dialog = page.getByRole("dialog", { name: "Your conversations" });
  await expect(dialog.getByRole("button", { name: "Close" })).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(dialog.getByRole("button", { name: "Sign out" })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(dialog.getByRole("button", { name: "Close" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(historyTrigger).toBeFocused();

  await page.emulateMedia({ reducedMotion: "reduce" });
  await settleRoute(page, "/home");
  const actualHome = await page.evaluate(async () => await (await fetch("/api/v1/home")).json()) as HomeSurfaceDTO;
  await page.route("**/api/v1/home", async (route) => {
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 800));
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(actualHome) });
  });
  await page.reload();
  const clientLoading = page.getByTestId("home-surface").getByTestId("surface-loading");
  await expect(clientLoading).toBeVisible();
  const motion = await clientLoading.locator(".fy-state-orbit").evaluate((element) => {
    const style = getComputedStyle(element);
    return { name: style.animationName, duration: style.animationDuration };
  });
  expect(motion.name === "none" || motion.duration === "0.01ms" || motion.duration === "0s").toBe(true);
  await expect(page.getByText("What are you thinking about?")).toBeVisible({ timeout: 20_000 });
  await page.unroute("**/api/v1/home");

  await page.setViewportSize({ width: 360, height: 800 });
  const stressedHome = structuredClone(actualHome) as HomeSurfaceDTO;
  (stressedHome as { displayName: string }).displayName = "Sarah-With-An-Exceptionally-Long-Unbroken-Financial-Profile-Name";
  const stressedGoal = stressedHome.goals[0] as unknown as { label: string; currentBalance: { display: string }; targetBalance: { display: string } };
  stressedGoal.label = "Emergency-fund-with-an-exceptionally-long-unbroken-label";
  stressedGoal.currentBalance.display = "−£12,345,678.90";
  stressedGoal.targetBalance.display = "£123,456,789.00";
  await page.route("**/api/v1/home", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(stressedHome) });
  });
  await page.reload();
  await expect(page.getByText(/Sarah-With-An-Exceptionally/)).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await page.evaluate(() => { document.documentElement.style.fontSize = "200%"; });
  await expectNoHorizontalOverflow(page);
  await expect(page.getByText("What are you thinking about?")).toBeVisible({ timeout: 20_000 });
  await page.evaluate(() => { document.documentElement.style.fontSize = ""; });
  await page.unroute("**/api/v1/home");

  await settleRoute(page, "/ask");
  for (const locator of [
    page.getByRole("button", { name: "Open conversation history" }),
    page.getByRole("button", { name: "Send message" }),
    page.getByRole("navigation", { name: "Product navigation" }).getByRole("link", { name: "Home" })
  ]) {
    const box = await locator.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThanOrEqual(44);
    expect(box!.height).toBeGreaterThanOrEqual(44);
  }
});
