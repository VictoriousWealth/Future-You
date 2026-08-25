import "server-only";
import { publicSupabaseConfiguration } from "../supabase/config";

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required registration configuration: ${name}.`);
  return value;
}

export interface RegistrationConfiguration {
  readonly supabaseUrl: string;
  readonly supabasePublishableKey: string;
  readonly supabaseRegistrationSecretKey: string;
  readonly codePepper: string;
  readonly fingerprintPepper: string;
  readonly mailMode: "memory" | "http";
  readonly mailEndpoint: string | null;
  readonly mailToken: string | null;
  readonly testMailboxToken: string | null;
}

export function registrationConfiguration(): RegistrationConfiguration {
  const publicConfiguration = publicSupabaseConfiguration();
  const mailMode = process.env.REGISTRATION_MAIL_MODE === "memory" ? "memory" : "http";
  const loopbackTest = process.env.APP_ENV === "test"
    && new URL(publicConfiguration.url).hostname === "127.0.0.1";
  if (mailMode === "memory" && !loopbackTest) {
    throw new Error("The in-memory registration mailer is allowed only for loopback test environments.");
  }
  return {
    supabaseUrl: publicConfiguration.url,
    supabasePublishableKey: publicConfiguration.publishableKey,
    supabaseRegistrationSecretKey: required("SUPABASE_REGISTRATION_SECRET_KEY"),
    codePepper: required("REGISTRATION_CODE_PEPPER"),
    fingerprintPepper: required("REGISTRATION_FINGERPRINT_PEPPER"),
    mailMode,
    mailEndpoint: process.env.REGISTRATION_MAIL_ENDPOINT?.trim() || null,
    mailToken: process.env.REGISTRATION_MAIL_TOKEN?.trim() || null,
    testMailboxToken: process.env.REGISTRATION_TEST_MAILBOX_TOKEN?.trim() || null
  };
}
