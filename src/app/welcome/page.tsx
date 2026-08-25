import type { Metadata } from "next";
import Link from "next/link";
import { AuthFrame } from "../../ui/auth/auth-frame";

export const metadata: Metadata = { title: "Welcome | Future You" };

export default function WelcomePage() {
  return (
    <AuthFrame variant="welcome">
      <div className="auth-choice-actions">
        <Link className="auth-primary" href="/login">Login</Link>
        <Link className="auth-secondary" href="/signup">Register</Link>
      </div>
    </AuthFrame>
  );
}
