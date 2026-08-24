export function SurfaceLoading({ label }: Readonly<{ label: string }>) {
  return (
    <section className="fy-surface-state" aria-live="polite" data-testid="surface-loading">
      <span className="fy-state-orbit" aria-hidden="true"/>
      <strong>Bringing your {label} into view…</strong>
      <p>Financial details will appear together when the trusted result is ready.</p>
    </section>
  );
}

export function SurfaceError({ message, retry }: Readonly<{ message: string; retry: () => void }>) {
  return (
    <section className="fy-surface-state error" role="alert" data-testid="surface-error">
      <strong>We couldn’t load this safely</strong>
      <p>{message}</p>
      <button type="button" onClick={retry}>Try again</button>
    </section>
  );
}
