"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect, type ReactNode } from "react";
import { PlanPanel, PlanStrip } from "@/components/quiz-v3/plan-panel";
import type { QuizAnswers } from "@/lib/quiz-flow";

/**
 * Shared chrome for every quiz V3 screen except the welcome carousel,
 * interstitials, and the calculating cinematic (all full-bleed). Top bar:
 *
 *   ← back  ·  slim 2px progress (fills accent)  ·  X / N counter  ·  ✕ close
 *
 * `currentScreen` is 1-indexed for display; the orchestrator passes the index
 * into the visible-screen list.
 *
 * Layout is two-pane from `md` up: question on the left, the live plan panel
 * on the right. Below `md` the panel becomes a collapsible strip under the
 * progress bar. Previously this was `max-w-md` at every breakpoint, which
 * made the whole quiz a phone-width column on desktop.
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
    <div
      className="flex min-h-svh flex-col bg-suth-base pt-[var(--safe-top)]"
      style={{ viewTransitionName: "quiz-shell" }}
    >
      <header className="grid h-14 shrink-0 grid-cols-[auto_1fr_auto] items-center gap-3 px-5">
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

      <div className="flex min-h-0 flex-1">
        <div className="flex min-w-0 flex-1 flex-col">
          {answers ? <PlanStrip answers={answers} /> : null}

          <div className="flex-1 overflow-y-auto px-5 pb-32 md:flex md:flex-col md:px-8 md:pb-10">
            {/* `my-auto` rather than `justify-center`: auto margins centre a
                short question without clipping the top of a tall one. */}
            <div className="mx-auto max-w-md pt-4 md:my-auto md:max-w-lg md:pt-8 lg:max-w-xl">
              {children}
            </div>
          </div>

          {footer && (
            <footer className="sticky bottom-0 border-t border-suth-border-subtle bg-suth-base/90 pb-[max(1rem,var(--safe-bottom))] pt-4 backdrop-blur-md md:pb-6">
              <div className="mx-auto flex max-w-md items-center justify-stretch gap-3 px-5 md:max-w-lg md:px-8 lg:max-w-xl">
                {footer}
              </div>
            </footer>
          )}
        </div>

        {answers ? <PlanPanel answers={answers} /> : null}
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
