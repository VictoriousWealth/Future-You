import { redirect } from "next/navigation";
import { AuthenticationBoundaryError } from "../../infrastructure/auth/authentication-error";
import { publicSupabaseConfiguration } from "../../infrastructure/supabase/config";
import { resolveAuthenticatedApplication } from "../../server/authenticated-application";
import { slice3DemoOptionsCommand } from "../../server/slice-3-demo-command";
import { SignOutButton } from "../../ui/auth/sign-out-button";
import { SarahResultShell } from "../../ui/features/ask/sarah-result-shell";

export const dynamic = "force-dynamic";

export default async function AskBoundaryProofPage() {
  let context;
  try {
    context = await resolveAuthenticatedApplication();
  } catch (error) {
    if (error instanceof AuthenticationBoundaryError) redirect("/login");
    throw error;
  }
  const current = await context.application.getCurrentFinancialContext.execute();
  const configuration = publicSupabaseConfiguration();
  if (!current.ok) {
    return (
      <main className="app-frame">
        <header className="product-header">
          <div className="brand-mark" aria-hidden="true">FY</div>
          <div>
            <p className="eyebrow">Future You</p>
            <h1>Your financial context isn’t ready yet.</h1>
            <p>Financial onboarding is deliberately deferred beyond Slice 3.</p>
            <SignOutButton configuration={configuration} />
          </div>
        </header>
      </main>
    );
  }
  return (
    <main className="app-frame">
      <header className="product-header">
        <div className="brand-mark" aria-hidden="true">
          FY
        </div>
        <div>
          <p className="eyebrow">Future You</p>
          <h1>If I do this today, what happens to my future?</h1>
          <p>
            Authenticated persistence proof: the browser renders server-produced facts and never
            recalculates financial outcomes.
          </p>
          <SignOutButton configuration={configuration} />
        </div>
      </header>
      <SarahResultShell command={slice3DemoOptionsCommand(current.value.context.version)} />
    </main>
  );
}
