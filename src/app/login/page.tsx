import { Suspense } from "react";
import { publicSupabaseConfiguration } from "../../infrastructure/supabase/config";
import { AuthFrame } from "../../ui/auth/auth-frame";
import { LoginForm } from "../../ui/auth/login-form";

export const dynamic = "force-dynamic";
export const metadata = { title: "Sign in | Future You" };

export default function LoginPage() {
  const configuration = publicSupabaseConfiguration();
  return (
    <AuthFrame title="Sign in" eyebrow="Welcome back" description="Open your private financial plan, goals and saved what-if conversations.">
      <Suspense fallback={<p className="auth-message" role="status">Preparing secure sign in…</p>}>
        <LoginForm configuration={configuration} />
      </Suspense>
    </AuthFrame>
  );
}
