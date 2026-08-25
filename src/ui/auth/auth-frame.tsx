import Link from "next/link";
import type { ReactNode } from "react";
import { FutureYouAngularSymbol, FutureYouWordmark } from "../brand/future-you-wordmark";

export function FutureYouBrand() {
  return (
    <div className="auth-brand" aria-label="Future You">
      <FutureYouAngularSymbol fullSize/>
      <span className="auth-brand-copy">
        <strong><span>Future</span><br className="auth-brand-break"/><span>You</span></strong>
        <small>You can do better</small>
      </span>
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
  title?: string;
  eyebrow?: string;
  description?: string;
  children: ReactNode;
  variant?: "welcome" | "form";
}>) {
  return (
    <main className={`auth-page auth-page--${variant}`}>
      <section className="auth-panel" aria-labelledby={title ? "auth-title" : undefined}>
        {variant === "welcome" ? <FutureYouBrand/> : (
          <Link className="auth-back-brand fy-wordmark" href="/welcome" aria-label="Back to Future You welcome">
            <FutureYouWordmark symbolBackdrop/>
          </Link>
        )}
        {eyebrow || title || description ? (
          <div className="auth-heading">
            {eyebrow ? <p>{eyebrow}</p> : null}
            {title ? <h1 id="auth-title">{title}</h1> : null}
            {description ? <span>{description}</span> : null}
          </div>
        ) : null}
        {children}
      </section>
    </main>
  );
}
