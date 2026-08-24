import { redirect } from "next/navigation";
import { AuthenticationBoundaryError } from "../infrastructure/auth/authentication-error";
import { resolveAuthenticatedProductSurfaceApplication } from "../server/authenticated-product-surface-application";

export const dynamic = "force-dynamic";

export default async function IndexPage() {
  try {
    const context = await resolveAuthenticatedProductSurfaceApplication();
    redirect(context.currentContextVersionId ? "/home" : "/onboarding");
  } catch (error) {
    if (error instanceof AuthenticationBoundaryError) redirect("/login");
    throw error;
  }
}
