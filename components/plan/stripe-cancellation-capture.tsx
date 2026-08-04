"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { capture } from "@/lib/posthog";
import { useHydrated, readStored } from "@/hooks/use-hydrated";

/**
 * Stripe checkout cancellation feedback prompt.
 *
 * Rendered on /plan; checks for ?cancelled=true (Stripe's cancel_url).
 * Shows an optional, dismissable inline card asking what made the user
 * pull back. Captured to analytics + (best-effort) to admin event log.
 *
 * Privacy: free-text up to 280 chars, never tied to PII in the payload.
 *
 * State: open / submitted / dismissed — kept in component state only
 * so the card disappears immediately on action.
 */

const REASONS = [
  "Want to think it over",
  "Pricing concern",
  "Worried about commitment",
  "Comparing alternatives",
  "Trial too short",
  "Other",
] as const;

const STORAGE_KEY = "suth:plan:cancel-prompt:dismissed";

export function StripeCancellationCapture() {
  const params = useSearchParams();
  const cancelled = params.get("cancelled") === "true";
  /*
   * The dismissal flag is read straight out of sessionStorage as the initial
   * value rather than via an effect that then calls `setStep`.
   *
   * The effect version re-rendered the prompt on mount for everybody, and for
   * somebody who had already dismissed it there was a frame where the whole
   * cancellation sheet was in the DOM before being torn out again. Reading it
   * up front is both cheaper and correct: `readStored` returns the fallback on
   * the server, and rendering is gated on `hydrated` below so the first client
   * render still matches the server HTML.
   */
  const hydrated = useHydrated();
  const [step, setStep] = useState<"choose" | "thanks" | "dismissed">(() =>
    readStored<string | null>(STORAGE_KEY, null, "session") === null ? "choose" : "dismissed",
  );
  const [reason, setReason] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const fired = useRef(false);

  // Fire a single analytics event on first render with the cancel flag.
  useEffect(() => {
    if (!cancelled || fired.current) return;
    fired.current = true;
    capture("stripe_checkout_cancelled_returned", {
      page: "/plan",
    });
  }, [cancelled]);

  // Nothing renders until hydration, so the initial client render matches
  // the server HTML even though `step` was seeded from storage.
  if (!hydrated || !cancelled || step === "dismissed") return null;

  function dismiss() {
    try {
      sessionStorage.setItem(STORAGE_KEY, "1");
    } catch {
      /* fine */
    }
    setStep("dismissed");
  }

  async function submit() {
    capture("stripe_checkout_cancel_reason_submitted", {
      reason: reason ?? "skipped",
      has_note: note.trim().length > 0,
      note_length: note.trim().length,
    });
    // Server endpoint is optional; if it fails, the analytics capture above
    // is still the source of truth for product feedback.
    try {
      await fetch("/api/feedback/cancellation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason: reason ?? null,
          note: note.trim() || null,
          page: "/plan",
        }),
      }).catch(() => {});
    } catch {
      /* swallow — the analytics event already captured intent */
    }
    setStep("thanks");
    setTimeout(() => dismiss(), 2400);
  }

  return (
    <aside
      aria-label="Cancellation feedback"
      className="fixed inset-x-4 bottom-[max(1rem,var(--safe-bottom))] z-30 mx-auto max-w-md rounded-2xl border border-suth-border bg-suth-elevated/95 p-5 shadow-2xl backdrop-blur md:left-auto md:right-6 md:mx-0 md:bottom-6"
    >
      {step === "thanks" ? (
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-suth-accent">
            [ THANKS ]
          </p>
          <p className="mt-2 text-base font-bold text-suth-text">
            Got it. We&apos;ll use that to make the offer clearer.
          </p>
        </div>
      ) : (
        <>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-suth-accent">
                [ NO PROBLEM ]
              </p>
              <p className="mt-2 text-base font-bold leading-tight text-suth-text">
                What changed your mind?
              </p>
              <p className="mt-1 text-xs leading-relaxed text-suth-text-secondary">
                Optional. One tap helps us shape what we offer next.
              </p>
            </div>
            <button
              type="button"
              onClick={dismiss}
              aria-label="Dismiss feedback prompt"
              className="-mr-1 -mt-1 inline-flex size-8 items-center justify-center rounded-full text-suth-text-tertiary transition-colors hover:bg-suth-overlay hover:text-suth-text"
            >
              <span aria-hidden>×</span>
            </button>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {REASONS.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setReason(r)}
                className={`inline-flex h-9 items-center rounded-pill border px-3 text-xs transition-colors ${
                  reason === r
                    ? "border-suth-accent bg-suth-accent/10 text-suth-text"
                    : "border-suth-border-subtle bg-suth-base/40 text-suth-text-secondary hover:border-suth-border-strong"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
          <label className="mt-3 block">
            <span className="sr-only">Anything else?</span>
            <textarea
              value={note}
              onChange={(e) => setNote(e.currentTarget.value.slice(0, 280))}
              placeholder="Anything else? (optional)"
              rows={2}
              className="block w-full resize-y rounded-md border border-suth-border bg-suth-base px-3 py-2 text-sm text-suth-text outline-none placeholder:text-suth-text-tertiary focus:border-suth-accent"
            />
            <span className="mt-1 block text-right font-mono text-[10px] text-suth-text-tertiary">
              {note.length}/280
            </span>
          </label>
          <div className="mt-3 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={dismiss}
              className="inline-flex h-9 items-center px-3 text-xs text-suth-text-secondary hover:text-suth-text"
            >
              No thanks
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={!reason && note.trim().length === 0}
              className="inline-flex h-9 items-center rounded-pill bg-suth-accent px-4 text-xs font-semibold text-[#0A0A0A] transition-colors hover:bg-suth-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              Send →
            </button>
          </div>
        </>
      )}
    </aside>
  );
}
