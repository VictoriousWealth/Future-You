"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState, type FormEvent } from "react";
import { FiEye, FiEyeOff } from "react-icons/fi";
import {
  createBrowserSupabaseClient,
  type BrowserSupabaseConfiguration
} from "./browser-supabase-client";

export function SignupForm({ configuration }: Readonly<{
  configuration: BrowserSupabaseConfiguration;
}>) {
  const router = useRouter();
  const messageId = useId();
  const passwordHelpId = useId();
  const [message, setMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pending, setPending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setSuccess(false);
    const form = new FormData(event.currentTarget);
    const email = form.get("email");
    const password = form.get("password");
    const confirmation = form.get("password-confirmation");
    if (typeof email !== "string" || typeof password !== "string" || typeof confirmation !== "string") {
      setMessage("Enter an email address and matching passwords.");
      return;
    }
    if (password.length < 8) {
      setMessage("Use at least eight characters for your password.");
      return;
    }
    if (password !== confirmation) {
      setMessage("The passwords do not match.");
      return;
    }

    setPending(true);
    const client = createBrowserSupabaseClient(configuration);
    const { data, error } = await client.auth.signUp({ email, password });
    if (error) {
      setMessage("We couldn’t create that account. Check the details or try again later.");
      setPending(false);
      return;
    }
    if (data.session) {
      router.replace("/onboarding");
      router.refresh();
      return;
    }
    setSuccess(true);
    setMessage("Check your email to finish creating your account, then return to sign in.");
    setPending(false);
  }

  return (
    <form className="auth-form" onSubmit={submit} aria-describedby={message ? messageId : undefined}>
      <div className="auth-field">
        <label htmlFor="signup-email">Personal email</label>
        <input id="signup-email" name="email" type="email" autoComplete="email" required/>
      </div>
      <div className="auth-field">
        <label htmlFor="signup-password">Password</label>
        <div className="auth-password-control">
          <input id="signup-password" name="password" type={showPassword ? "text" : "password"} autoComplete="new-password" minLength={8} aria-describedby={passwordHelpId} required/>
          <button
            type="button"
            aria-label={showPassword ? "Hide passwords" : "Show passwords"}
            aria-controls="signup-password password-confirmation"
            aria-pressed={showPassword}
            onClick={() => setShowPassword((value) => !value)}
          >
            {showPassword ? <FiEyeOff aria-hidden="true"/> : <FiEye aria-hidden="true"/>}
          </button>
        </div>
        <small id={passwordHelpId}>At least eight characters.</small>
      </div>
      <div className="auth-field">
        <label htmlFor="password-confirmation">Confirm password</label>
        <input id="password-confirmation" name="password-confirmation" type={showPassword ? "text" : "password"} autoComplete="new-password" minLength={8} required/>
      </div>
      {message ? <p id={messageId} className={`auth-message ${success ? "success" : "error"}`} role={success ? "status" : "alert"}>{message}</p> : null}
      <button className="auth-primary" type="submit" disabled={pending}>{pending ? "Creating account…" : "Create account"}</button>
      <p className="auth-switch">Already registered? <Link href="/login">Sign in</Link></p>
    </form>
  );
}
