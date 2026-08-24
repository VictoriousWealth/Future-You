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

export async function signIn(page: Page, user: keyof typeof LOCAL_USERS): Promise<void> {
  await page.goto("/login");
  await page.getByLabel("Email").fill(LOCAL_USERS[user].email);
  await page.getByLabel("Password").fill(LOCAL_USERS[user].password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(user === "sarah" ? /\/ask$/ : /\/onboarding$/);
}

export async function signOut(page: Page): Promise<void> {
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/login/);
}
