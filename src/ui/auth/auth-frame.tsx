import Link from "next/link";
import type { ReactNode } from "react";
import { FutureYouWordmark } from "../brand/future-you-wordmark";

export function FutureYouBrand() {
  return (
    <div className="auth-brand fy-wordmark" aria-label="Future You">
      <FutureYouWordmark/>
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
            <FutureYouWordmark/>
          </Link>
        )}
        {eyebrow || title || description ? (
          <div className="auth-copy">
            {eyebrow || title ? (
              <div className="auth-heading">
                {eyebrow ? <p>{eyebrow}</p> : null}
                {title ? <h1 id="auth-title">{title}</h1> : null}
              </div>
            ) : null}
            {description ? <p className="auth-description">{description}</p> : null}
          </div>
        ) : null}
        {children}
      </section>
    </main>
  );
}
