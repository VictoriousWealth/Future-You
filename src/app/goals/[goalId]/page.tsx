import { randomUUID } from "node:crypto";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { AccountActivationRequiredError } from "../../../infrastructure/auth/account-activation-error";
import { AuthenticationBoundaryError } from "../../../infrastructure/auth/authentication-error";
import { resolveAuthenticatedOnboardingApplication } from "../../../server/authenticated-onboarding-application";
import { GoalEditSurface } from "../../../ui/features/product-surfaces/goal-edit-surface";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Edit goal | Future You" };

export default async function GoalEditPage({
  params
}: Readonly<{ params: Promise<{ goalId: string }> }>) {
  const { goalId } = await params;
  let resolved;
  try {
    resolved = await resolveAuthenticatedOnboardingApplication();
  } catch (error) {
    if (error instanceof AccountActivationRequiredError) redirect("/onboarding");
    if (error instanceof AuthenticationBoundaryError) redirect("/login?next=/goals");
    throw error;
  }

  const correction = await resolved.application.getCorrectionDraft.execute();
  if (!correction.ok) redirect("/onboarding");
  if (!correction.value.draft.goals.some((goal) => goal.id === goalId)) notFound();

  return (
    <GoalEditSurface
      draft={correction.value.draft}
      goalId={goalId}
      expectedCurrentContextVersionId={correction.value.currentContextVersionId}
      requestKey={randomUUID()}
    />
  );
}
