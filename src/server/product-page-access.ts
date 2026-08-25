import "server-only";
import { redirect } from "next/navigation";
import { AuthenticationBoundaryError } from "../infrastructure/auth/authentication-error";
import { AccountActivationRequiredError } from "../infrastructure/auth/account-activation-error";
import { resolveAuthenticatedProductSurfaceApplication } from "./authenticated-product-surface-application";

export async function requireProductPage(path: string): Promise<void> {
  try {
    const context = await resolveAuthenticatedProductSurfaceApplication();
    if (!context.currentContextVersionId) redirect("/onboarding");
  } catch (error) {
    if (error instanceof AccountActivationRequiredError) redirect("/onboarding");
    if (error instanceof AuthenticationBoundaryError) {
      redirect(`/login?next=${encodeURIComponent(path)}`);
    }
    throw error;
  }
}
