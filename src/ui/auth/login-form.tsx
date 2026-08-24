"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import {
  createBrowserSupabaseClient,
  type BrowserSupabaseConfiguration
} from "./browser-supabase-client";

export function LoginForm({ configuration }: Readonly<{
  configuration: BrowserSupabaseConfiguration;
}>) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [ready, setReady] = useState(false);

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
      setMessage("We couldn’t sign you in with those details.");
      setPending(false);
      return;
    }
    const requested = searchParams.get("next");
    const destination = requested?.startsWith("/") && !requested.startsWith("//")
      ? requested
      : "/ask";
    router.replace(destination);
    router.refresh();
  }

  return (
    <form className="login-form" onSubmit={submit}>
      <label htmlFor="email">Email</label>
      <input id="email" name="email" type="email" autoComplete="email" required />
      <label htmlFor="password">Password</label>
      <input id="password" name="password" type="password" autoComplete="current-password" required />
      {message ? <p role="alert">{message}</p> : null}
      <button type="submit" disabled={pending || !ready}>{pending ? "Signing in…" : "Sign in"}</button>
    </form>
  );
}
