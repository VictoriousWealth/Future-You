import Link from "next/link";
import type { ReactNode } from "react";

export function FutureYouBrand({ compact = false }: Readonly<{ compact?: boolean }>) {
  return (
    <div className={`auth-brand ${compact ? "compact" : ""}`} aria-label="Future You">
      <span className="auth-brand-symbol" aria-hidden="true"><i/><i/><i/></span>
      <span className="auth-brand-copy"><strong>Future<br/>You</strong>{compact ? null : <small>You can do better</small>}</span>
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
          <Link className="auth-back-brand" href="/welcome" aria-label="Back to Future You welcome">
            <FutureYouBrand compact/>
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
