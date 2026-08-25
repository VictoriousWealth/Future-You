import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { AuthenticationBoundaryError } from "../../infrastructure/auth/authentication-error";
import { publicSupabaseConfiguration } from "../../infrastructure/supabase/config";
import { resolveAuthenticatedOnboardingApplication } from "../../server/authenticated-onboarding-application";
import { ManualOnboardingFlow } from "../../ui/features/onboarding/manual-onboarding-flow";

export const dynamic = "force-dynamic";

function londonDate(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
}

export default async function OnboardingPage() {
  let resolved;
  try {
    resolved = await resolveAuthenticatedOnboardingApplication();
  } catch (error) {
    if (error instanceof AuthenticationBoundaryError) redirect("/login?next=/onboarding");
    throw error;
  }
  const status = await resolved.application.getStatus.execute();
  if (status.status === "COMPLETE") redirect("/ask");
  return (
    <ManualOnboardingFlow
      configuration={publicSupabaseConfiguration()}
      snapshotDate={londonDate()}
      draftKey={randomUUID()}
      provisionedEmployerName={resolved.provisionedEmployerName ?? null}
    />
  );
}
