import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SurfaceLoading } from "../src/ui/product-shell/surface-state";

describe("shared product loading state", () => {
  it("uses one concise status and immediate placeholder content", () => {
    const markup = renderToStaticMarkup(createElement(SurfaceLoading, { label: "Goals" }));
    expect(markup).toContain('role="status"');
    expect(markup).toContain('aria-busy="true"');
    expect(markup).toContain("Loading Goals…");
    expect(markup).toContain("fy-loading-placeholder");
    expect(markup).toContain("fy-loading-block");
    expect(markup).not.toContain("Bringing your");
    expect(markup).not.toContain("Financial details will appear");
  });
});
