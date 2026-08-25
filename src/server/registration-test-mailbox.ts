import "server-only";
import { latestRegistrationMail } from "../infrastructure/registration/registration-mailer";
import { registrationConfiguration } from "../infrastructure/registration/registration-configuration";

export function readRegistrationTestMail(input: Readonly<{
  suppliedToken: string | null;
  registrationId: string;
  purpose: "WORK_CODE" | "PERSONAL_CONFIRMATION";
}>) {
  const configuration = registrationConfiguration();
  if (
    process.env.APP_ENV !== "test"
    || new URL(configuration.supabaseUrl).hostname !== "127.0.0.1"
    || configuration.mailMode !== "memory"
    || !configuration.testMailboxToken
    || input.suppliedToken !== configuration.testMailboxToken
  ) return null;
  return latestRegistrationMail(input);
}
