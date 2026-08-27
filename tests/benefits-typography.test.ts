import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync(new URL("../src/app/globals.css", import.meta.url), "utf8");

describe("Benefits Apple-platform typography contract", () => {
  it("uses the iOS and iPadOS default hierarchy with no Benefits text below 12px", () => {
    expect(css).toContain("--fy-benefits-large-title: 2.125rem;");
    expect(css).toContain("--fy-benefits-title-2: 1.375rem;");
    expect(css).toContain("--fy-benefits-headline: 1.0625rem;");
    expect(css).toContain("--fy-benefits-body: 1.0625rem;");
    expect(css).toContain("--fy-benefits-subheadline: .9375rem;");
    expect(css).toContain("--fy-benefits-footnote: .8125rem;");
    expect(css).toContain("--fy-benefits-caption: .75rem;");

    const benefitsRules = css.slice(
      css.indexOf(".fy-benefits-intro"),
      css.indexOf(".fy-surface-state")
    );
    expect(benefitsRules).not.toMatch(/font-size:\s*(?:0?\.[0-6]|0\.7(?:[01])?)rem/);
  });

  it("raises TV-sized Benefits text to Apple's 23px minimum and 29px reading default", () => {
    expect(css).toContain("@media (min-width: 100rem) and (min-height: 50rem)");
    expect(css).toContain("--fy-benefits-body: 1.8125rem;");
    expect(css).toContain("--fy-benefits-subheadline: 1.8125rem;");
    expect(css).toContain("--fy-benefits-caption: 1.4375rem;");
  });
});
