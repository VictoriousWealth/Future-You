export const QUICK_CHAT_OPTIONS = [
  { label: "Can I afford something?", prompt: "Can I afford something next month?" },
  { label: "How am I doing?", prompt: "How am I doing?" },
  { label: "What should I prioritise?", prompt: "What should I prioritise?" },
  { label: "Future You Wrapped", prompt: "Future You Wrapped" },
  { label: "Let’s amend my goals", prompt: "Let’s amend my goals" }
] as const;

export type QuickChatOption = (typeof QUICK_CHAT_OPTIONS)[number];

export function QuickChatIcon() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" data-icon="four-point-star">
      <path d="M16 4 18.6 13.4 28 16l-9.4 2.6L16 28l-2.6-9.4L4 16l9.4-2.6Z"/>
    </svg>
  );
}
