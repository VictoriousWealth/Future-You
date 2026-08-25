import { redirect } from "next/navigation";
import { AuthenticationBoundaryError } from "../infrastructure/auth/authentication-error";
import { AccountActivationRequiredError } from "../infrastructure/auth/account-activation-error";
import { resolveAuthenticatedProductSurfaceApplication } from "../server/authenticated-product-surface-application";

export const dynamic = "force-dynamic";

export default async function IndexPage() {
  try {
    const context = await resolveAuthenticatedProductSurfaceApplication();
    redirect(context.currentContextVersionId ? "/home" : "/onboarding");
  } catch (error) {
    if (error instanceof AccountActivationRequiredError) redirect("/onboarding");
    if (error instanceof AuthenticationBoundaryError) redirect("/login");
    throw error;
  }
}
