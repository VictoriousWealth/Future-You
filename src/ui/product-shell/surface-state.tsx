export function SurfaceLoading({ label }: Readonly<{ label: string }>) {
  return (
    <section className="fy-surface-state" aria-live="polite" data-testid="surface-loading">
      <span className="fy-state-orbit" aria-hidden="true"/>
      <h1>Bringing your {label} into view…</h1>
      <p>Financial details will appear together when the trusted result is ready.</p>
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
