export function ContextPill({ label, earlier = false }: Readonly<{ label: string; earlier?: boolean }>) {
  return (
    <div className={`fy-context-pill ${earlier ? "earlier" : ""}`} data-testid="context-pill">
      <span aria-hidden="true"/> {label}
    </div>
  );
}
