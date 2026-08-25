export type ProductIconName = "home" | "goals" | "ask" | "benefits" | "profile" | "history" | "buffer";

export function ActionTriangleIcon({ direction = "right" }: Readonly<{ direction?: "right" | "up" }>) {
  return (
    <svg className={`fy-action-triangle is-${direction}`} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 4 21 20H3Z"/>
    </svg>
  );
}

export function ProductIcon({ name }: Readonly<{ name: ProductIconName }>) {
  if (name === "home") {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3.5 11 8.5-7 8.5 7v9h-6v-6h-5v6h-5z"/></svg>;
  }
  if (name === "goals") {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><path d="m15.5 8.5 5-5m-4 0h4v4"/></svg>;
  }
  if (name === "ask") {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 17.5 3.8 21l4-1.4A8.5 8.5 0 1 0 5 17.5Z"/><path d="M8 12h.01M12 12h.01M16 12h.01"/></svg>;
  }
  if (name === "benefits") {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h16v11H4zM3 6.5h18V9H3zM12 6.5V20M12 6.5c-2.2 0-4.5-.7-4.5-2.2 0-1.2 1-1.8 2-1.8 1.8 0 2.5 2.2 2.5 4Zm0 0c2.2 0 4.5-.7 4.5-2.2 0-1.2-1-1.8-2-1.8-1.8 0-2.5 2.2-2.5 4Z"/></svg>;
  }
  if (name === "history") {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16M4 12h16M4 19h16"/></svg>;
  }
  if (name === "buffer") {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7.5h16v11H4zM7 7.5V5h10v2.5M8 12h8"/></svg>;
  }
  return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3.5"/><path d="M5.5 20c.8-4 3-6 6.5-6s5.7 2 6.5 6"/></svg>;
}
