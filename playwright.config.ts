import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: "**/*.spec.ts",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: "line",
  use: {
    baseURL: "http://127.0.0.1:3105",
    trace: "retain-on-failure"
  },
  projects: [
    {
      name: "mobile-chromium",
      use: { ...devices["iPhone 13"], browserName: "chromium" }
    }
  ],
  webServer: {
    command: "npm run start -- --hostname 127.0.0.1 --port 3105",
    url: "http://127.0.0.1:3105/ask",
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      ...process.env,
      CONVERSATION_PROVIDER: "fake",
      CONVERSATION_FAKE_MODE: "normal",
      CONVERSATION_PROVIDER_RATE_LIMIT_MAX: "200"
    }
  }
});
