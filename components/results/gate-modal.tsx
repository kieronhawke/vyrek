"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

/**
 * Time-gate scaffold per Brief v2 §3.4.
 *
 * Sprint 1: client-only heartbeat in localStorage. The brief's full
 * implementation puts the timer server-side in Upstash, keyed by IP +
 * cookie hash, so incognito + cookie-clear can't bypass. That lands
 * in Sprint 2 once the Upstash key is provisioned.
 *
 * UX rules per spec:
 *   - First 5 minutes on /results/* = full access
 *   - At 5:00 minutes -> slide-up modal: "Create free account"
 *   - "Maybe later" snoozes 60s, one-time
 *   - After snooze expires / dismissed: BlurWall covers lower half
 *   - Logged-in users skip the gate entirely
 *   - Crawlers (googlebot etc) skip the gate for SEO
 */

const GATE_KEY = "vyrek:results:gate:v1";
const GATE_MS = 5 * 60 * 1000;
const SNOOZE_MS = 60 * 1000;

type GateState =
  | { phase: "fresh"; startedAt: number }
  | { phase: "snoozed"; snoozeUntil: number }
  | { phase: "walled" }
  | { phase: "loggedIn" };

export function GateModal({
  isLoggedIn = false,
}: {
  isLoggedIn?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"modal" | "wall" | null>(null);

  useEffect(() => {
    if (isLoggedIn) return;

    // Crawler bypass: if the UA looks like a bot, skip
    const ua = navigator.userAgent.toLowerCase();
    if (/bot|crawl|spider|googlebot|bingbot|yandex/.test(ua)) return;

    let raw: string | null = null;
    try {
      raw = window.localStorage.getItem(GATE_KEY);
    } catch {
      return;
    }
    const now = Date.now();
    let state: GateState;
    if (!raw) {
      state = { phase: "fresh", startedAt: now };
      try {
        window.localStorage.setItem(GATE_KEY, JSON.stringify(state));
      } catch {
        /* private mode */
      }
    } else {
      try {
        state = JSON.parse(raw) as GateState;
      } catch {
        state = { phase: "fresh", startedAt: now };
      }
    }

    function check() {
      if (state.phase === "fresh") {
        if (now - state.startedAt >= GATE_MS) {
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setMode("modal");
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setOpen(true);
        }
      } else if (state.phase === "snoozed") {
        if (now >= state.snoozeUntil) {
          state = { phase: "walled" };
          try {
            window.localStorage.setItem(GATE_KEY, JSON.stringify(state));
          } catch {}
          setMode("wall");
        }
      } else if (state.phase === "walled") {
        setMode("wall");
      }
    }
    check();

    // poll every 10s to catch the boundary while the tab stays open
    const id = window.setInterval(check, 10_000);
    return () => window.clearInterval(id);
  }, [isLoggedIn]);

  if (isLoggedIn) return null;
  if (mode === null) return null;
  if (mode === "wall") {
    // BlurWall is its own component the page renders separately so the
    // overlay knows where to anchor. GateModal just stays silent in this
    // phase — the page already shows the wall.
    return null;
  }
  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="gate-modal-title"
      className="fixed inset-x-0 bottom-0 z-50 px-4 pb-[max(1.5rem,calc(var(--safe-bottom)+1rem))]"
    >
      <div className="mx-auto max-w-md rounded-2xl border border-vyrek-border bg-vyrek-elevated p-6 shadow-[0_30px_60px_-20px_rgba(0,0,0,0.8)] backdrop-blur-xl">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-vyrek-accent">
          [ FREE TIER ]
        </p>
        <h2
          id="gate-modal-title"
          className="mt-3 text-2xl font-black leading-tight tracking-[-0.02em] text-vyrek-text"
        >
          Keep analysing.
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-vyrek-text-secondary">
          Sign up free to keep using the Results hub. No card. No email
          spam.
        </p>
        <div className="mt-5 flex flex-col gap-2">
          <Link
            href="/quiz"
            className="inline-flex h-12 w-full items-center justify-center rounded-pill bg-vyrek-accent px-5 text-base font-semibold text-[#0A0A0A] hover:bg-vyrek-accent-hover"
          >
            Create free account
          </Link>
          <button
            type="button"
            onClick={() => {
              const next: GateState = {
                phase: "snoozed",
                snoozeUntil: Date.now() + SNOOZE_MS,
              };
              try {
                window.localStorage.setItem(GATE_KEY, JSON.stringify(next));
              } catch {}
              setOpen(false);
            }}
            className="inline-flex h-11 w-full items-center justify-center rounded-pill border border-vyrek-border bg-transparent px-5 text-sm text-vyrek-text-secondary hover:border-vyrek-border-strong hover:text-vyrek-text"
          >
            Maybe later
          </button>
        </div>
        <p className="mt-4 text-center font-mono text-[10px] uppercase tracking-[0.22em] text-vyrek-text-tertiary">
          Paid course members unlock pro analytics
        </p>
      </div>
    </div>
  );
}
