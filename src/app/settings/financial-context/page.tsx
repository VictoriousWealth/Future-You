import { randomUUID } from "node:crypto";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthenticationBoundaryError } from "../../../infrastructure/auth/authentication-error";
import { publicSupabaseConfiguration } from "../../../infrastructure/supabase/config";
import { resolveAuthenticatedOnboardingApplication } from "../../../server/authenticated-onboarding-application";
import { ManualOnboardingFlow } from "../../../ui/features/onboarding/manual-onboarding-flow";

export const dynamic = "force-dynamic";

export default async function CorrectFinancialContextPage() {
  let resolved;
  try {
    resolved = await resolveAuthenticatedOnboardingApplication();
  } catch (error) {
    if (error instanceof AuthenticationBoundaryError) {
      redirect("/login?next=/settings/financial-context");
    }
    throw error;
  }
  const correction = await resolved.application.getCorrectionDraft.execute();
  if (!correction.ok) redirect("/onboarding");
  return (
    <>
      <nav className="settings-return" aria-label="Financial context settings"><Link href="/home">← Back to current path</Link></nav>
      <ManualOnboardingFlow
        configuration={publicSupabaseConfiguration()}
        snapshotDate={correction.value.draft.snapshotDate}
        draftKey={randomUUID()}
        mode="revision"
        expectedCurrentContextVersionId={correction.value.currentContextVersionId}
        initialDraft={correction.value.draft}
      />
    </>
  );
}
