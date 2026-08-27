import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SurfaceLoading } from "../src/ui/product-shell/surface-state";

describe("shared product loading state", () => {
  it("uses an accessible hidden status and page-shaped skeleton content", () => {
    const markup = renderToStaticMarkup(createElement(SurfaceLoading, { label: "Goals" }));
    expect(markup).toContain('role="status"');
    expect(markup).toContain('aria-busy="true"');
    expect(markup).toContain("Loading Goals…");
    expect(markup).toContain("fy-loading-placeholder is-goals");
    expect(markup).toContain("fy-skeleton-row");
    expect(markup).toContain('aria-hidden="true"');
    expect(markup).not.toContain("fy-state-orbit");
    expect(markup).not.toContain("fy-loading-status");
  });

  it.each([
    ["Home", "fy-skeleton-hero"],
    ["Ask", "fy-skeleton-prompt"],
    ["Benefits", "fy-skeleton-benefit-card"]
  ])("gives %s a matching skeleton structure", (label, expectedClass) => {
    const markup = renderToStaticMarkup(createElement(SurfaceLoading, { label }));
    expect(markup).toContain(expectedClass);
    expect(markup).toContain("fy-skeleton-shape");
  });
});
