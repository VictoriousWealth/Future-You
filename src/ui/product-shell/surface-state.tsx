type LoadingSurface = "home" | "goals" | "ask" | "benefits";

function loadingSurface(label: string): LoadingSurface {
  const value = label.toLowerCase();
  if (value === "goals" || value === "ask" || value === "benefits") return value;
  return "home";
}

function SkeletonHeading() {
  return (
    <div className="fy-skeleton-heading">
      <span className="fy-skeleton-shape fy-skeleton-title"/>
      <span className="fy-skeleton-shape fy-skeleton-subtitle"/>
    </div>
  );
}

function SkeletonContent({ surface }: Readonly<{ surface: LoadingSurface }>) {
  if (surface === "home") {
    return (
      <>
        <span className="fy-skeleton-shape fy-skeleton-hero"/>
        <span className="fy-skeleton-shape fy-skeleton-section-title"/>
        <div className="fy-skeleton-card-grid">
          <span className="fy-skeleton-shape fy-skeleton-square"/>
          <span className="fy-skeleton-shape fy-skeleton-square"/>
          <span className="fy-skeleton-shape fy-skeleton-square"/>
        </div>
      </>
    );
  }

  if (surface === "goals") {
    return (
      <div className="fy-skeleton-list">
        <span className="fy-skeleton-shape fy-skeleton-row"/>
        <span className="fy-skeleton-shape fy-skeleton-row"/>
        <span className="fy-skeleton-shape fy-skeleton-row"/>
      </div>
    );
  }

  if (surface === "ask") {
    return (
      <>
        <div className="fy-skeleton-prompt-grid">
          <span className="fy-skeleton-shape fy-skeleton-prompt"/>
          <span className="fy-skeleton-shape fy-skeleton-prompt"/>
          <span className="fy-skeleton-shape fy-skeleton-prompt"/>
        </div>
        <span className="fy-skeleton-shape fy-skeleton-composer"/>
      </>
    );
  }

  return (
    <div className="fy-skeleton-benefit-stack">
      <span className="fy-skeleton-shape fy-skeleton-section-title"/>
      <span className="fy-skeleton-shape fy-skeleton-benefit-card"/>
      <span className="fy-skeleton-shape fy-skeleton-section-title is-short"/>
      <span className="fy-skeleton-shape fy-skeleton-benefit-card is-tall"/>
    </div>
  );
}

export function SurfaceLoading({ label }: Readonly<{ label: string }>) {
  const surface = loadingSurface(label);
  return (
    <section className="fy-surface-state is-loading" role="status" aria-live="polite" aria-busy="true" data-testid="surface-loading">
      <span className="sr-only">Loading {label}…</span>
      <div className={`fy-loading-placeholder is-${surface}`} aria-hidden="true">
        <SkeletonHeading/>
        <SkeletonContent surface={surface}/>
      </div>
    </section>
  );
}

export function SurfaceError({ message, retry }: Readonly<{ message: string; retry: () => void }>) {
  return (
    <section className="fy-surface-state error" role="alert" data-testid="surface-error">
      <h1>We couldn’t load this safely</h1>
      <p>{message}</p>
      <button type="button" onClick={retry}>Try again</button>
    </section>
  );
}
