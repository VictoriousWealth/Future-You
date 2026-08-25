import type { Metadata } from "next";
import { AuthFrame } from "../../ui/auth/auth-frame";
import { SignupForm } from "../../ui/auth/signup-form";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Register | Future You" };

export default function RegisterPage() {
  return (
    <AuthFrame title="Register" eyebrow="Your employer has invited you" description="Verify your workplace, then create the personal Login that belongs to you.">
      <SignupForm />
    </AuthFrame>
  );
}
