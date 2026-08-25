"use client";

import { useState, type FormEvent } from "react";
import type { BrowserSupabaseConfiguration } from "./browser-supabase-client";
import { ManualOnboardingFlow } from "../features/onboarding/manual-onboarding-flow";

function requestId(): string {
  return `personal-email-${crypto.randomUUID()}`;
}

export function RegistrationOnboardingExperience({
  configuration,
  registrationId,
  employerName,
  personalEmailConfirmed,
  snapshotDate,
  draftKey
}: Readonly<{
  configuration: BrowserSupabaseConfiguration;
  registrationId: string;
  employerName: string;
  personalEmailConfirmed: boolean;
  snapshotDate: string;
  draftKey: string;
}>) {
  const [confirmed, setConfirmed] = useState(personalEmailConfirmed);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function verify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage(null);
    const form = new FormData(event.currentTarget);
    const response = await fetch(`/api/v1/registration/attempts/${registrationId}/personal-email-verifications`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: form.get("personal-code"), requestId: requestId() })
    });
    if (!response.ok) {
      const body = await response.json();
      setMessage(body.error?.message ?? "We could not verify that personal email code.");
      setPending(false);
      return;
    }
    setConfirmed(true);
    setMessage("Personal email verified. You can confirm onboarding when your preview is ready.");
    setPending(false);
  }

  async function resend() {
    setPending(true);
    setMessage(null);
    const response = await fetch(`/api/v1/registration/attempts/${registrationId}/personal-email-resends`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestId: `resend-personal-${crypto.randomUUID()}` })
    });
    if (!response.ok) {
      const body = await response.json();
      setMessage(body.error?.message ?? "We could not resend the personal-email code.");
    } else {
      setMessage("A new personal-email code has been sent.");
    }
    setPending(false);
  }

  return (
    <>
      <aside className={`registration-confirmation-panel ${confirmed ? "is-confirmed" : ""}`}>
        <p className="eyebrow">Personal Login</p>
        <h1>{confirmed ? "Personal email verified" : "Check your personal email"}</h1>
        {confirmed ? (
          <p>Your personal Login is ready. Complete onboarding below to activate the full app.</p>
        ) : (
          <>
            <p>Enter the six-digit code we sent. You can start onboarding while you check your inbox.</p>
            <form onSubmit={verify}>
              <label htmlFor="personal-code">Personal-email code</label>
              <input id="personal-code" name="personal-code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required />
              <button className="primary-button" type="submit" disabled={pending}>{pending ? "Verifying…" : "Verify personal email"}</button>
            </form>
            <button className="registration-link-button" type="button" disabled={pending} onClick={resend}>Send a new personal-email code</button>
          </>
        )}
        {message ? <p className={confirmed ? "success" : "error"} role="status">{message}</p> : null}
      </aside>
      <ManualOnboardingFlow
        configuration={configuration}
        snapshotDate={snapshotDate}
        draftKey={draftKey}
        provisionedEmployerName={employerName}
        confirmationReady={confirmed}
        registrationActivation
      />
    </>
  );
}
