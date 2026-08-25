import { Suspense } from "react";
import { publicSupabaseConfiguration } from "../../infrastructure/supabase/config";
import { AuthFrame } from "../../ui/auth/auth-frame";
import { LoginForm } from "../../ui/auth/login-form";

export const dynamic = "force-dynamic";
export const metadata = { title: "Login | Future You" };

export default function LoginPage() {
  const configuration = publicSupabaseConfiguration();
  return (
    <AuthFrame title="Login" eyebrow="Welcome back" description="Open your private financial plan, goals and saved what-if conversations.">
      <Suspense fallback={<p className="auth-message" role="status">Preparing secure login…</p>}>
        <LoginForm configuration={configuration} />
      </Suspense>
    </AuthFrame>
  );
}
