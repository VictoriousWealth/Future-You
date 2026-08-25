"use client";

import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useId, useState, type FormEvent } from "react";
import { FiEye, FiEyeOff } from "react-icons/fi";
import {
  createBrowserSupabaseClient,
  type BrowserSupabaseConfiguration
} from "./browser-supabase-client";

export function LoginForm({ configuration }: Readonly<{
  configuration: BrowserSupabaseConfiguration;
}>) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const messageId = useId();
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [ready, setReady] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => setReady(true), []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage(null);
    const form = new FormData(event.currentTarget);
    const email = form.get("email");
    const password = form.get("password");
    if (typeof email !== "string" || typeof password !== "string") {
      setMessage("Enter your email and password.");
      setPending(false);
      return;
    }
    const client = createBrowserSupabaseClient(configuration);
    const { error } = await client.auth.signInWithPassword({ email, password });
    if (error) {
      setMessage("We couldn’t log you in with those details.");
      setPending(false);
      return;
    }
    const requested = searchParams.get("next");
    const destination = requested?.startsWith("/") && !requested.startsWith("//")
      ? requested
      : "/home";
    router.replace(destination);
    router.refresh();
  }

  return (
    <form className="auth-form login-form" onSubmit={submit} aria-describedby={message ? messageId : undefined}>
      <div className="auth-field">
        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" autoComplete="email" required />
      </div>
      <div className="auth-field">
        <label htmlFor="password">Password</label>
        <div className="auth-password-control">
          <input id="password" name="password" type={showPassword ? "text" : "password"} autoComplete="current-password" required />
          <button
            type="button"
            aria-label={showPassword ? "Hide password" : "Show password"}
            aria-controls="password"
            aria-pressed={showPassword}
            onClick={() => setShowPassword((value) => !value)}
            style={{margin: "0"}}
          >
            {showPassword ? <FiEyeOff aria-hidden="true"/> : <FiEye aria-hidden="true"/>}
          </button>
        </div>
      </div>
      {message ? <p id={messageId} className="auth-message error" role="alert">{message}</p> : null}
      <button className="auth-primary" type="submit" disabled={pending || !ready}>{pending ? "Logging in…" : "Login"}</button>
      <p className="auth-switch">New to Future You? <Link href="/signup">Register</Link></p>
    </form>
  );
}
