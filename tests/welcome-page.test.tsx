import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import WelcomePage from "../src/app/welcome/page";
import { AuthFrame } from "../src/ui/auth/auth-frame";

describe("Welcome page", () => {
  it("keeps the brand and authentication actions without the removed promotional copy", () => {
    const markup = renderToStaticMarkup(createElement(WelcomePage));

    expect(markup).toContain("/images/future-you-logo.svg");
    expect(markup).not.toContain("future-you-auth-backdrop.svg");
    expect(markup).toContain('href="/login"');
    expect(markup).toContain('href="/register"');
    expect(markup).toContain(">Login</a>");
    expect(markup).toContain(">Register</a>");
    expect(markup).not.toContain(">Sign in</a>");
    expect(markup).not.toContain(">Create account</a>");
    expect(markup).not.toContain("Your decisions. Your future.");
    expect(markup).not.toContain("See how a money choice today could change the goals that matter tomorrow.");
    expect(markup).not.toContain("Private financial context. Deterministic what-if results. You stay in control.");
    expect(markup).not.toContain("auth-heading");
    expect(markup).not.toContain("auth-trust-note");
    expect(markup).toContain('class="auth-brand-break"');
  });

  it("layers the supplied white SVG behind the compact auth logo only", () => {
    const markup = renderToStaticMarkup(createElement(AuthFrame, {
      title: "Login",
      description: "Responsive auth description",
      children: "Form content"
    }));
    const backdrop = readFileSync(resolve("public/images/future-you-auth-backdrop.svg"), "utf8");

    expect(markup).toContain("/images/future-you-auth-backdrop.svg");
    expect(markup).toContain('class="fy-angular-backdrop"');
    expect(markup).toContain('class="fy-angular-artwork"');
    expect(markup).toContain('class="auth-copy"');
    expect(markup).toContain('class="auth-description"');
    expect(markup).toContain("Responsive auth description");
    expect(backdrop).toContain('fill="#ffffff"');
    expect(backdrop).not.toContain('fill="#000000"');
    expect(backdrop).not.toContain("<!DOCTYPE");
    expect(backdrop).not.toContain("<script");
  });
});
