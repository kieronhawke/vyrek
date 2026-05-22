"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

/**
 * Shared chrome for every quiz screen except welcome and interstitials
 * (which run full-bleed). Top bar carries:
 *
 *   ← back  ·  slim 2px progress  ·  X / N counter  ·  ✕ close (confirms)
 *
 * `currentScreen` is 1-indexed for display, 0-indexed in state.
 */
export function QuizShell({
  currentScreen,
  totalScreens,
  onBack,
  hasAnswers,
  children,
  footer,
  hideBack,
}: {
  currentScreen: number;
  totalScreens: number;
  onBack?: () => void;
  hasAnswers?: boolean;
  children: ReactNode;
  footer?: ReactNode;
  hideBack?: boolean;
}) {
  const router = useRouter();
  const pct = Math.max(0, Math.min(1, currentScreen / totalScreens));

  const onClose = () => {
    if (
      hasAnswers &&
      !window.confirm("Leave quiz? Your progress is saved.")
    ) {
      return;
    }
    router.push("/");
  };

  return (
    <div className="flex min-h-svh flex-col bg-vyrek-base pt-[var(--safe-top)]">
      <header className="grid h-14 shrink-0 grid-cols-[auto_1fr_auto] items-center gap-3 px-5">
        {hideBack || !onBack ? (
          <span className="h-10 w-10" />
        ) : (
          <button
            type="button"
            onClick={onBack}
            aria-label="Back"
            className="-ml-3 inline-flex h-10 items-center px-3 text-vyrek-text-secondary transition-colors hover:text-vyrek-text"
          >
            ←
          </button>
        )}
        <div className="flex items-center gap-3">
          <div
            aria-hidden
            className="relative h-0.5 flex-1 overflow-hidden rounded-pill bg-vyrek-border-subtle"
          >
            <span
              className="absolute left-0 top-0 block h-full rounded-pill bg-vyrek-accent will-change-transform"
              style={{
                width: `${pct * 100}%`,
                transition: "width 320ms var(--ease-out)",
              }}
            />
          </div>
          <span className="font-mono text-[11px] font-medium uppercase tabular-nums tracking-[0.18em] text-vyrek-text-tertiary">
            {currentScreen} / {totalScreens}
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close quiz, back to home"
          className="-mr-3 inline-flex h-10 items-center px-3 text-vyrek-text-secondary transition-colors hover:text-vyrek-text"
        >
          ✕
        </button>
      </header>

      <div className="flex-1 overflow-y-auto px-5 pb-32">
        <div className="mx-auto max-w-md pt-4">{children}</div>
      </div>

      {footer && (
        <footer className="sticky bottom-0 border-t border-vyrek-border-subtle bg-vyrek-base/90 pb-[max(1rem,var(--safe-bottom))] pt-4 backdrop-blur-md">
          <div className="mx-auto flex max-w-md items-center justify-end gap-3 px-5">
            {footer}
          </div>
        </footer>
      )}
    </div>
  );
}

/**
 * Helper: invoke a state change inside `document.startViewTransition` when
 * available, falling back to the synchronous version on browsers that
 * don't support it. Used by the orchestrator on every screen advance.
 */
export function withViewTransition(update: () => void) {
  if (typeof document === "undefined") return update();
  type DocWithVT = Document & {
    startViewTransition?: (cb: () => void) => unknown;
  };
  const d = document as DocWithVT;
  if (typeof d.startViewTransition === "function") {
    d.startViewTransition(update);
  } else {
    update();
  }
}
