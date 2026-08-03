"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect, type ReactNode } from "react";
import { QuizAside } from "@/components/quiz-v3/quiz-aside";
import type { QuizAnswers } from "@/lib/quiz-flow";

/**
 * Shared chrome for every quiz V3 screen except the welcome carousel,
 * interstitials, and the calculating cinematic (all full-bleed).
 *
 * THE DESKTOP LAYOUT, rebuilt 3 August 2026.
 *
 * What it was: the phone layout stretched. The question sat in the top-left
 * of an otherwise empty half-screen, the options were a narrow column with
 * a thousand pixels of nothing beside them, the Continue button was a
 * full-width pill trapped in a bar spanning only the left pane, and the
 * right-hand third was a list of eight mostly-empty rows. It read as a
 * mobile page somebody had forgotten to finish.
 *
 * What it is now:
 *
 *   ≥lg   a real split. Left is photography and the reason to carry on
 *         (components/quiz-aside.tsx); right is the question column,
 *         optically centred, capped at 34rem so the lines stay readable,
 *         with the button directly under the options where the eye
 *         already is. Nothing is pinned to the bottom of the viewport,
 *         because on a desktop there is no keyboard covering it.
 *
 *   <lg   unchanged and still correct: full-width question, button in a
 *         sticky footer above the home indicator, because on a phone the
 *         thumb is at the bottom and the content can be taller than the
 *         screen.
 *
 * The button is the clearest tell of the two modes. A 56px full-bleed pill
 * is right under a thumb and absurd under a mouse, so on desktop it sizes
 * to its content and sits inline.
 */
export function QuizShell({
  currentScreen,
  totalScreens,
  onBack,
  hasAnswers,
  children,
  footer,
  hideBack,
  answers,
}: {
  currentScreen: number;
  totalScreens: number;
  onBack?: () => void;
  hasAnswers?: boolean;
  children: ReactNode;
  footer?: ReactNode;
  hideBack?: boolean;
  /** Omit to render the shell without the live plan panel. */
  answers?: QuizAnswers;
}) {
  const router = useRouter();
  const pct = Math.max(0, Math.min(1, currentScreen / totalScreens));
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Close the confirm sheet on Escape.
  useEffect(() => {
    if (!confirmOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setConfirmOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [confirmOpen]);

  // Lock body scroll while the sheet is open.
  useEffect(() => {
    if (!confirmOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [confirmOpen]);

  const onClose = () => {
    if (hasAnswers) {
      setConfirmOpen(true);
      return;
    }
    router.push("/");
  };

  return (
    /* h-svh + overflow-hidden, not min-h-svh. With a minimum the whole page
       grew when a screen ran tall and the document scrolled, so the question
       column never took its own scrollbar and the Continue button sat just
       under the fold with no obvious way down. Pinning the height moves the
       overflow inside the column, where it belongs. */
    <div
      className="quiz-viewport flex overflow-hidden bg-suth-base"
      style={{ viewTransitionName: "quiz-shell" }}
    >
      <QuizAside answers={answers} />

      <div className="flex h-full min-w-0 flex-1 flex-col pt-[var(--safe-top)]">
      <header className="grid h-14 shrink-0 grid-cols-[auto_1fr_auto] items-center gap-3 px-5 lg:px-10">
        {hideBack || !onBack ? (
          <span className="h-10 w-10" />
        ) : (
          <button
            type="button"
            onClick={onBack}
            aria-label="Back"
            className="-ml-3 inline-flex h-10 items-center px-3 text-suth-text-secondary transition-colors hover:text-suth-text"
          >
            ←
          </button>
        )}
        <div className="flex items-center gap-3">
          <div
            aria-hidden
            className="relative h-0.5 flex-1 overflow-hidden rounded-pill bg-suth-border-subtle"
          >
            <span
              className="absolute left-0 top-0 block h-full rounded-pill bg-suth-accent will-change-transform"
              style={{
                width: `${pct * 100}%`,
                transition: "width 320ms var(--ease-out)",
              }}
            />
          </div>
          <span className="font-mono text-[11px] font-medium uppercase tabular-nums tracking-[0.18em] text-suth-text-tertiary">
            {currentScreen} / {totalScreens}
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close quiz, back to home"
          className="-mr-3 inline-flex h-10 items-center px-3 text-suth-text-secondary transition-colors hover:text-suth-text"
        >
          ✕
        </button>
      </header>

      {/* `my-auto` rather than `justify-center`: auto margins centre a short
          question without clipping the top of a tall one. The bottom padding
          below `lg` clears the sticky footer; from `lg` the button is inline
          so there is nothing to clear. */}
      <div className="flex flex-1 flex-col overflow-y-auto px-5 pb-32 md:px-8 lg:px-10 lg:pb-10">
        <div className="mx-auto w-full max-w-md py-4 md:max-w-lg lg:my-auto lg:max-w-[34rem] lg:py-6 xl:py-8">
          {children}

          {/* Desktop: the button belongs with the options it confirms, not
              in a bar at the foot of the window. */}
          {footer && (
            <div className="mt-6 hidden items-center gap-3 lg:flex xl:mt-7 [&>button]:h-12 [&>button]:w-auto [&>button]:min-w-[13rem]">
              {footer}
            </div>
          )}
        </div>
      </div>

      {/* Phone and tablet: sticky, full-bleed, thumb-height. */}
      {footer && (
        <footer className="sticky bottom-0 border-t border-suth-border-subtle bg-suth-base/90 pb-[max(1rem,var(--safe-bottom))] pt-4 backdrop-blur-md lg:hidden">
          <div className="mx-auto flex max-w-md items-center justify-stretch gap-3 px-5 md:max-w-lg md:px-8">
            {footer}
          </div>
        </footer>
      )}
      </div>

      {/* Brand-themed leave-quiz confirm. Previously a native
          window.confirm which looked like a phishing prompt on iOS
          Safari. */}
      {confirmOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="quiz-leave-title"
          className="fixed inset-0 z-[70] flex items-end justify-center bg-black/60 px-5 pb-[max(1rem,var(--safe-bottom))] pt-[max(1rem,var(--safe-top))] backdrop-blur-sm md:items-center"
          onClick={(e) => {
            if (e.target === e.currentTarget) setConfirmOpen(false);
          }}
        >
          <div className="w-full max-w-sm rounded-2xl border border-suth-border bg-suth-elevated p-6 shadow-2xl">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-suth-accent">
              [ Leave quiz? ]
            </p>
            <h2
              id="quiz-leave-title"
              className="mt-3 text-xl font-black tracking-[-0.02em] text-suth-text md:text-2xl"
            >
              Your answers are saved.
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-suth-text-secondary">
              You can pick this up right where you left off when you come
              back.
            </p>
            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                className="inline-flex h-11 flex-1 items-center justify-center rounded-pill bg-suth-accent px-4 text-sm font-semibold text-[#0A0A0A] transition-colors hover:bg-suth-accent-hover active:scale-[0.98]"
              >
                Stay
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfirmOpen(false);
                  router.push("/");
                }}
                className="inline-flex h-11 flex-1 items-center justify-center rounded-pill border border-suth-border bg-suth-base px-4 text-sm font-medium text-suth-text transition-colors hover:border-suth-border-strong active:scale-[0.98]"
              >
                Leave
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/**
 * Helper: invoke a state change inside `document.startViewTransition` when
 * available. Used on every screen advance for the slide-in transition.
 */
export function withViewTransition(update: () => void) {
  if (typeof document === "undefined") return update();
  type DocWithVT = Document & {
    startViewTransition?: (cb: () => void) => unknown;
  };
  const d = document as DocWithVT;
  if (typeof d.startViewTransition === "function") {
    // The API rejects `finished` with InvalidStateError whenever a transition
    // is skipped, which happens routinely if the user advances twice quickly
    // or the tab is hidden mid-advance. Unhandled, that surfaces as an
    // uncaught rejection (and takes the Next dev server down with it).
    // Swallowing it is correct: a skipped animation is not an error.
    const transition = d.startViewTransition(update) as {
      finished?: Promise<unknown>;
      ready?: Promise<unknown>;
    } | null;
    transition?.finished?.catch(() => {});
    transition?.ready?.catch(() => {});
  } else {
    update();
  }
}
