"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState, type FormEvent } from "react";
import { FiEye, FiEyeOff } from "react-icons/fi";

type Stage = "WORK_DETAILS" | "WORK_CODE" | "PERSONAL_ACCOUNT";

function requestId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

async function responseMessage(response: Response, fallback: string): Promise<string> {
  try {
    const body = await response.json();
    return typeof body.error?.message === "string" ? body.error.message : fallback;
  } catch {
    return fallback;
  }
}

export function SignupForm() {
  const router = useRouter();
  const messageId = useId();
  const [stage, setStage] = useState<Stage>("WORK_DETAILS");
  const [registrationId, setRegistrationId] = useState<string | null>(null);
  const [maskedWorkEmail, setMaskedWorkEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function submitWorkDetails(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage(null);
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/v1/registration/attempts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        companyId: form.get("company-id"),
        workEmail: form.get("work-email"),
        requestId: requestId("registration")
      })
    });
    if (!response.ok) {
      setMessage(await responseMessage(response, "We couldn’t start registration. Try again shortly."));
      setPending(false);
      return;
    }
    const body = await response.json();
    setRegistrationId(body.registrationId);
    setMaskedWorkEmail(body.maskedWorkEmail);
    setStage("WORK_CODE");
    setPending(false);
  }

  async function submitWorkCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!registrationId) return;
    setPending(true);
    setMessage(null);
    const form = new FormData(event.currentTarget);
    const response = await fetch(`/api/v1/registration/attempts/${registrationId}/work-code-verifications`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: form.get("work-code"), requestId: requestId("verify-work") })
    });
    if (!response.ok) {
      setMessage(await responseMessage(response, "We could not verify that code. Check it or request a new one."));
      setPending(false);
      return;
    }
    setStage("PERSONAL_ACCOUNT");
    setPending(false);
  }

  async function resendWorkCode() {
    if (!registrationId) return;
    setPending(true);
    setMessage(null);
    const response = await fetch(`/api/v1/registration/attempts/${registrationId}/work-code-resends`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestId: requestId("resend-work") })
    });
    setMessage(response.ok
      ? "A new code has been sent. Earlier codes no longer work."
      : await responseMessage(response, "Please wait before requesting another code."));
    setPending(false);
  }

  async function submitPersonalAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!registrationId) return;
    setPending(true);
    setMessage(null);
    const form = new FormData(event.currentTarget);
    const response = await fetch(`/api/v1/registration/attempts/${registrationId}/personal-account`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        personalEmail: form.get("personal-email"),
        password: form.get("password"),
        passwordConfirmation: form.get("password-confirmation"),
        displayName: form.get("display-name"),
        requestId: requestId("personal-account")
      })
    });
    if (!response.ok) {
      setMessage(await responseMessage(response, "We couldn’t create the personal account. Check the details or use Login if you are already registered."));
      setPending(false);
      return;
    }
    router.push("/register/onboarding");
    router.refresh();
  }

  return (
    <form
      className="auth-form registration-form"
      onSubmit={stage === "WORK_DETAILS" ? submitWorkDetails : stage === "WORK_CODE" ? submitWorkCode : submitPersonalAccount}
      aria-describedby={message ? messageId : undefined}
    >
      <p className="registration-stage" aria-live="polite">
        {stage === "WORK_DETAILS" ? "1 of 3 · Verify your workplace" : stage === "WORK_CODE" ? "2 of 3 · Check your work email" : "3 of 3 · Create your personal Login"}
      </p>

      {stage === "WORK_DETAILS" ? (
        <>
          <div className="auth-field">
            <label htmlFor="company-id">Company ID</label>
            <input id="company-id" name="company-id" autoComplete="organization" inputMode="text" required />
            <small>Use the ID supplied by your employer.</small>
          </div>
          <div className="auth-field">
            <label htmlFor="work-email">Work email</label>
            <input id="work-email" name="work-email" type="email" autoComplete="email" required />
          </div>
        </>
      ) : null}

      {stage === "WORK_CODE" ? (
        <>
          <p className="registration-guidance">Enter the six-digit code sent to {maskedWorkEmail}. The code expires after 10 minutes.</p>
          <div className="auth-field">
            <label htmlFor="work-code">Work-email verification code</label>
            <input id="work-code" name="work-code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required />
          </div>
          <button className="registration-link-button" type="button" disabled={pending} onClick={resendWorkCode}>Send a new code</button>
        </>
      ) : null}

      {stage === "PERSONAL_ACCOUNT" ? (
        <>
          <p className="registration-guidance">Your work email is verified. Your personal email becomes the Login you use after activation.</p>
          <div className="auth-field">
            <label htmlFor="display-name">Your name</label>
            <input id="display-name" name="display-name" autoComplete="name" required />
          </div>
          <div className="auth-field">
            <label htmlFor="personal-email">Personal email</label>
            <input id="personal-email" name="personal-email" type="email" autoComplete="email" required />
            <small>It must be different from your verified work email.</small>
          </div>
          <div className="auth-field">
            <label htmlFor="signup-password">Password</label>
            <div className="auth-password-control">
              <input id="signup-password" name="password" type={showPassword ? "text" : "password"} autoComplete="new-password" minLength={12} required />
              <button type="button" aria-label={showPassword ? "Hide passwords" : "Show passwords"} aria-controls="signup-password password-confirmation" aria-pressed={showPassword} onClick={() => setShowPassword((value) => !value)}>
                {showPassword ? <FiEyeOff aria-hidden="true" /> : <FiEye aria-hidden="true" />}
              </button>
            </div>
            <small>At least 12 characters.</small>
          </div>
          <div className="auth-field">
            <label htmlFor="password-confirmation">Confirm password</label>
            <input id="password-confirmation" name="password-confirmation" type={showPassword ? "text" : "password"} autoComplete="new-password" minLength={12} required />
          </div>
        </>
      ) : null}

      {message ? <p id={messageId} className={`auth-message ${message.startsWith("A new code") ? "success" : "error"}`} role="status">{message}</p> : null}
      <button className="auth-primary" type="submit" disabled={pending}>
        {pending ? "Working securely…" : stage === "WORK_DETAILS" ? "Verify my workplace" : stage === "WORK_CODE" ? "Verify code" : "Create personal Login"}
      </button>
      <p className="auth-switch">Already activated? <Link href="/login">Login with your personal email</Link></p>
    </form>
  );
}
