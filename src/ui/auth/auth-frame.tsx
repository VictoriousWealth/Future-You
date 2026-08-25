import Link from "next/link";
import type { ReactNode } from "react";
import { FutureYouWordmark } from "../brand/future-you-wordmark";

export function FutureYouBrand() {
  return (
    <div className="auth-brand" aria-label="Future You">
      <span className="auth-brand-symbol" aria-hidden="true"><i/><i/><i/></span>
      <span className="auth-brand-copy"><strong>Future<br/>You</strong><small>You can do better</small></span>
    </div>
  );
}

export function AuthFrame({
  title,
  eyebrow,
  description,
  children,
  variant = "form"
}: Readonly<{
  title: string;
  eyebrow?: string;
  description?: string;
  children: ReactNode;
  variant?: "welcome" | "form";
}>) {
  return (
    <main className={`auth-page auth-page--${variant}`}>
      <section className="auth-panel" aria-labelledby="auth-title">
        {variant === "welcome" ? <FutureYouBrand/> : (
          <Link className="auth-back-brand fy-wordmark" href="/welcome" aria-label="Back to Future You welcome">
            <FutureYouWordmark/>
          </Link>
        )}
        <div className="auth-heading">
          {eyebrow ? <p>{eyebrow}</p> : null}
          <h1 id="auth-title">{title}</h1>
          {description ? <span>{description}</span> : null}
        </div>
        {children}
      </section>
    </main>
  );
}
