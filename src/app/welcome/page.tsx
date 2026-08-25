import type { Metadata } from "next";
import Link from "next/link";
import { AuthFrame } from "../../ui/auth/auth-frame";

export const metadata: Metadata = { title: "Welcome | Future You" };

export default function WelcomePage() {
  return (
    <AuthFrame title="Your decisions. Your future." description="See how a money choice today could change the goals that matter tomorrow." variant="welcome">
      <div className="auth-choice-actions">
        <Link className="auth-primary" href="/login">Sign in</Link>
        <Link className="auth-secondary" href="/signup">Create account</Link>
      </div>
      <p className="auth-trust-note">Private financial context. Deterministic what-if results. You stay in control.</p>
    </AuthFrame>
  );
}
