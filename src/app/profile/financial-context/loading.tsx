import { ProductShell } from "../../../ui/product-shell/product-shell";

export default function FinancialContextSummaryLoading() {
  return (
    <ProductShell active={null} className="fy-profile-shell fy-context-summary-shell">
      <section className="fy-context-summary-loading" role="status" aria-live="polite" aria-busy="true">
        <span className="sr-only">Loading your financial context…</span>
        <div className="fy-skeleton-heading" aria-hidden="true">
          <span className="fy-skeleton-shape fy-skeleton-title"/>
          <span className="fy-skeleton-shape fy-skeleton-subtitle"/>
        </div>
        <span className="fy-skeleton-shape fy-skeleton-context-hero" aria-hidden="true"/>
        <span className="fy-skeleton-shape fy-skeleton-context-block is-short" aria-hidden="true"/>
        <span className="fy-skeleton-shape fy-skeleton-context-block" aria-hidden="true"/>
        <span className="fy-skeleton-shape fy-skeleton-context-block" aria-hidden="true"/>
      </section>
    </ProductShell>
  );
}
