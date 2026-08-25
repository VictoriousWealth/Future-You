import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AuthenticationBoundaryError } from "../../../infrastructure/auth/authentication-error";
import { AccountActivationRequiredError } from "../../../infrastructure/auth/account-activation-error";
import {
  resolveSarahStory,
  SarahStoryAccessUnavailableError
} from "../../../server/sarah-story-application";
import { SarahStoryExperience } from "../../../ui/features/story/sarah-story-experience";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata: Metadata = {
  title: "Sarah’s story | Future You",
  robots: { index: false, follow: false }
};

export default async function SarahStoryPage() {
  try {
    const resolved = await resolveSarahStory();
    return <SarahStoryExperience result={resolved.result}/>;
  } catch (error) {
    if (
      error instanceof SarahStoryAccessUnavailableError
      || error instanceof AuthenticationBoundaryError
      || error instanceof AccountActivationRequiredError
    ) notFound();
    throw error;
  }
}
