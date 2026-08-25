"use client";

import { useEffect, useRef, type MouseEvent, type ReactNode } from "react";

const FOCUSABLE = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])"
].join(",");

export function ModalSheet({
  labelledBy,
  onClose,
  children,
  testId
}: Readonly<{
  labelledBy: string;
  onClose: () => void;
  children: ReactNode;
  testId?: string;
}>) {
  const dialog = useRef<HTMLElement>(null);
  const close = useRef(onClose);
  close.current = onClose;

  useEffect(() => {
    const previouslyFocused = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusable = () => Array.from(
      dialog.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []
    ).filter((element) => !element.hasAttribute("hidden"));

    const preferred = dialog.current?.querySelector<HTMLElement>("[data-dialog-initial-focus]");
    (preferred ?? focusable()[0] ?? dialog.current)?.focus();

    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close.current();
        return;
      }
      if (event.key !== "Tab") return;
      const items = focusable();
      if (items.length === 0) {
        event.preventDefault();
        dialog.current?.focus();
        return;
      }
      const first = items[0]!;
      const last = items[items.length - 1]!;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", keydown);
    return () => {
      document.removeEventListener("keydown", keydown);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus();
    };
  }, []);

  const closeFromBackdrop = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) close.current();
  };

  return (
    <div className="fy-sheet-backdrop" onMouseDown={closeFromBackdrop}>
      <section
        className="fy-bottom-sheet"
        ref={dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        tabIndex={-1}
        data-testid={testId}
      >
        {children}
      </section>
    </div>
  );
}
