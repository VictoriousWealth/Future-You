export function SurfaceLoading({ label }: Readonly<{ label: string }>) {
  return (
    <section className="fy-surface-state is-loading" role="status" aria-live="polite" aria-busy="true" data-testid="surface-loading">
      <div className="fy-loading-status">
        <span className="fy-state-orbit" aria-hidden="true"/>
        <h1>Loading {label}…</h1>
      </div>
      <div className="fy-loading-placeholder" aria-hidden="true">
        <span className="fy-loading-line is-title"/>
        <span className="fy-loading-line is-subtitle"/>
        <span className="fy-loading-block"/>
        <span className="fy-loading-block is-short"/>
        <span className="fy-loading-block"/>
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
