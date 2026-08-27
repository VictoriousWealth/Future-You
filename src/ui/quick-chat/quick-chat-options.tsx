export const QUICK_CHAT_OPTIONS = [
  { label: "Can I afford something?", prompt: "Can I afford something next month?", icon: "circle" as const },
  { label: "How am I doing?", prompt: "How am I doing?", icon: "spark" as const },
  { label: "What should I prioritise?", prompt: "What should I prioritise?", icon: "square" as const },
  { label: "Future You Wrapped", prompt: "Future You Wrapped", icon: "triangle" as const },
  { label: "Let’s amend my goals", prompt: "Let’s amend my goals", icon: "star" as const }
] as const;

export type QuickChatOption = (typeof QUICK_CHAT_OPTIONS)[number];
export type QuickChatIconName = QuickChatOption["icon"];

export function QuickChatIcon({ name }: Readonly<{ name: QuickChatIconName }>) {
  if (name === "circle") return <svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="10"/></svg>;
  if (name === "spark") return <svg viewBox="0 0 32 32" aria-hidden="true"><path d="M16 4 18.6 13.4 28 16l-9.4 2.6L16 28l-2.6-9.4L4 16l9.4-2.6Z"/></svg>;
  if (name === "square") return <svg viewBox="0 0 32 32" aria-hidden="true"><path d="M6 6h20v20H6Z"/></svg>;
  if (name === "triangle") return <svg viewBox="0 0 32 32" aria-hidden="true"><path d="M5 7h22L16 27Z"/></svg>;
  return <svg viewBox="0 0 32 32" aria-hidden="true"><path d="m16 4 3.5 8.2 8.9.8-6.8 5.8 2.1 8.7-7.7-4.6-7.7 4.6 2.1-8.7L3.6 13l8.9-.8Z"/></svg>;
}
