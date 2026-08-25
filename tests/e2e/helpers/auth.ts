import { expect, type Page } from "@playwright/test";

export const LOCAL_USERS = {
  sarah: {
    email: "sarah@example.test",
    password: "Sarah-Local-Only-2026!"
  },
  alex: {
    email: "alex@example.test",
    password: "Alex-Local-Only-2026!"
  },
  onboarding: {
    email: "onboarding@example.test",
    password: "Onboarding-Local-Only-2026!"
  }
} as const;

export async function signIn(
  page: Page,
  user: keyof typeof LOCAL_USERS,
  destination?: "/ask" | "/home" | "/goals" | "/benefits"
): Promise<void> {
  const requested = destination ?? (user === "sarah" ? "/ask" : undefined);
  await page.goto(requested ? `/login?next=${encodeURIComponent(requested)}` : "/login");
  await page.getByLabel("Email").fill(LOCAL_USERS[user].email);
  await page.locator("#password").fill(LOCAL_USERS[user].password);
  await page.getByRole("button", { name: "Login", exact: true }).click();
  if (user === "sarah") {
    await expect(page).toHaveURL(new RegExp(`${requested ?? "/home"}$`), { timeout: 15_000 });
  } else {
    await expect(page).toHaveURL(/\/(?:onboarding|home)$/, { timeout: 15_000 });
  }
}

export async function signOut(page: Page): Promise<void> {
  if (await page.getByRole("button", { name: "Sign out" }).count() === 0) {
    if (await page.getByRole("button", { name: "Open conversation history" }).count() === 0) {
      await page.goto("/ask");
    }
    await page.getByRole("button", { name: "Open conversation history" }).click();
  }
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/login/);
}
