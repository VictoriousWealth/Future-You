import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { publicSupabaseConfiguration } from "../../../infrastructure/supabase/config";
import { readRegistrationActivationCookie } from "../../../server/http/registration-activation-cookie";
import { resolveRegistrationApplication } from "../../../server/registration-application";
import { RegistrationOnboardingExperience } from "../../../ui/auth/registration-onboarding-experience";

export const dynamic = "force-dynamic";
export const metadata = { title: "Activate your account | Future You" };

function londonDate(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
}

export default async function RegistrationOnboardingPage() {
  const activation = await readRegistrationActivationCookie();
  if (!activation) redirect("/register");
  let status;
  try {
    status = await (await resolveRegistrationApplication()).status(activation.registrationId, activation.token);
  } catch {
    redirect("/register");
  }
  if (status.onboardingComplete && status.personalEmailConfirmed) redirect("/ask");
  return (
    <RegistrationOnboardingExperience
      configuration={publicSupabaseConfiguration()}
      registrationId={activation.registrationId}
      employerName={status.employerName}
      personalEmailConfirmed={status.personalEmailConfirmed}
      snapshotDate={londonDate()}
      draftKey={randomUUID()}
    />
  );
}
