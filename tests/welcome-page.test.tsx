import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import WelcomePage from "../src/app/welcome/page";

describe("Welcome page", () => {
  it("keeps the brand and authentication actions without the removed promotional copy", () => {
    const markup = renderToStaticMarkup(createElement(WelcomePage));

    expect(markup).toContain("/images/future-you-logo.svg");
    expect(markup).toContain('href="/login"');
    expect(markup).toContain('href="/signup"');
    expect(markup).toContain(">Login</a>");
    expect(markup).toContain(">Register</a>");
    expect(markup).not.toContain(">Sign in</a>");
    expect(markup).not.toContain(">Create account</a>");
    expect(markup).not.toContain("Your decisions. Your future.");
    expect(markup).not.toContain("See how a money choice today could change the goals that matter tomorrow.");
    expect(markup).not.toContain("Private financial context. Deterministic what-if results. You stay in control.");
    expect(markup).not.toContain("auth-heading");
    expect(markup).not.toContain("auth-trust-note");
  });
});
