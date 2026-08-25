import type { Metadata } from "next";
import { publicSupabaseConfiguration } from "../../infrastructure/supabase/config";
import { AuthFrame } from "../../ui/auth/auth-frame";
import { SignupForm } from "../../ui/auth/signup-form";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Register | Future You" };

export default function SignupPage() {
  return (
    <AuthFrame title="Register" eyebrow="Start with what is true today" description="Workplace information is optional and comes later, separately from account creation.">
      <SignupForm configuration={publicSupabaseConfiguration()}/>
    </AuthFrame>
  );
}
