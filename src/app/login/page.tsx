import { Suspense } from "react";
import { publicSupabaseConfiguration } from "../../infrastructure/supabase/config";
import { LoginForm } from "../../ui/auth/login-form";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  const configuration = publicSupabaseConfiguration();
  return (
    <main className="login-page">
      <section className="login-card">
        <div className="brand-mark" aria-hidden="true">FY</div>
        <p className="eyebrow">Future You</p>
        <h1>See where today’s choices could take you.</h1>
        <p>Sign in to your private financial context and saved simulations.</p>
        <Suspense fallback={<p>Loading sign in…</p>}>
          <LoginForm configuration={configuration} />
        </Suspense>
      </section>
    </main>
  );
}
