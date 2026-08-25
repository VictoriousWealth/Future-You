import { defineConfig, devices } from "@playwright/test";
import { execFileSync } from "node:child_process";

function localSupabaseEnvironment(): Record<string, string> {
  const output = execFileSync("supabase", ["status", "-o", "env"], { encoding: "utf8" });
  return Object.fromEntries(output.split("\n").flatMap((line) => {
    const separator = line.indexOf("=");
    if (separator < 1) return [];
    return [[line.slice(0, separator), line.slice(separator + 1).replace(/^"|"$/g, "")]];
  }));
}

const localSupabase = localSupabaseEnvironment();
const localRegistrationKey = localSupabase.SERVICE_ROLE_KEY;
if (!localRegistrationKey) throw new Error("Local Supabase registration key is unavailable.");

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
      APP_ENV: "test",
      CONVERSATION_PROVIDER: "fake",
      CONVERSATION_FAKE_MODE: "normal",
      CONVERSATION_PROVIDER_RATE_LIMIT_MAX: "200",
      SUPABASE_REGISTRATION_SECRET_KEY: localRegistrationKey,
      REGISTRATION_CODE_PEPPER: "local-test-code-pepper-2026-32-characters-minimum",
      REGISTRATION_FINGERPRINT_PEPPER: "local-test-fingerprint-pepper-2026-32-characters-minimum",
      REGISTRATION_MAIL_MODE: "memory",
      REGISTRATION_TEST_MAILBOX_TOKEN: "future-you-local-mailbox-test"
    }
  }
});
