"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useHaptics } from "@/hooks/use-haptics";

/**
 * TICKING A SESSION OFF SHOULD FEEL LIKE SOMETHING.
 *
 * Marking a session done was a silent state change: the label swapped to
 * "✓ Done" and nothing else happened. That is the one moment in the week the
 * app has earned a reaction — somebody has just finished training — and it is
 * the moment that brings them back tomorrow.
 *
 * Three things fire together, and each is independently optional:
 *
 *   • **Haptic**, through the existing hook, which already respects the user's
 *     own on/off setting. Silent on iOS Safari, which has no Vibration API —
 *     nothing here pretends otherwise.
 *   • **A short burst of confetti**, drawn as absolutely-positioned spans. No
 *     library: this is twenty divs and a keyframe, and a canvas dependency for
 *     that would be absurd.
 *   • **A message**, announced politely to screen readers, because the visual
 *     celebration conveys nothing to somebody who cannot see it.
 *
 * ALL OF IT IS OFF under `prefers-reduced-motion` — off, not slowed. Confetti
 * is exactly the kind of motion that setting exists to stop, and for some
 * people it is a genuine trigger rather than a preference.
 */

const REDUCED_QUERY = "(prefers-reduced-motion: reduce)";

function subscribe(onChange: () => void): () => void {
  const query = window.matchMedia(REDUCED_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(REDUCED_QUERY).matches,
    () => false,
  );
}

/** Enough to read as a burst, few enough to stay cheap on an old phone. */
const PIECE_COUNT = 18;
const BURST_MS = 900;

type Piece = {
  id: number;
  /** Horizontal drift in px, signed. */
  dx: number;
  /** How far up it goes before falling. */
  rise: number;
  rotate: number;
  delay: number;
  colour: string;
};

const COLOURS = [
  "var(--accent, #A3E635)",
  "color-mix(in srgb, var(--accent, #A3E635) 60%, white)",
  "color-mix(in srgb, var(--accent, #A3E635) 70%, black)",
  "#F5F5F3",
];

/**
 * Deterministic-ish spread rather than `Math.random()` per piece.
 *
 * A random spread clusters visibly at small counts — you get eight pieces on
 * one side and two on the other often enough to look like a bug. Distributing
 * the angle evenly and only jittering it keeps every burst balanced.
 */
function makePieces(seed: number): Piece[] {
  return Array.from({ length: PIECE_COUNT }, (_, i) => {
    const spread = (i / (PIECE_COUNT - 1)) * 2 - 1; // -1 … 1
    const jitter = (((seed * (i + 7)) % 17) / 17 - 0.5) * 0.35;
    return {
      id: i,
      dx: Math.round((spread + jitter) * 120),
      rise: 40 + ((seed * (i + 3)) % 46),
      rotate: ((seed * (i + 5)) % 360) - 180,
      delay: (i % 5) * 18,
      colour: COLOURS[i % COLOURS.length],
    };
  });
}

export type CelebrateHandle = {
  /** Fire the celebration. Safe to call when reduced motion is on. */
  fire: (message?: string) => void;
};

/**
 * The burst itself, anchored to whatever it is rendered inside.
 *
 * The parent needs `position: relative`; the pieces are absolute and
 * `pointer-events: none`, so this can be dropped over a button without
 * intercepting the next tap.
 */
export function useCelebration() {
  const haptic = useHaptics();
  const reduced = usePrefersReducedMotion();
  const [burst, setBurst] = useState<{ key: number; pieces: Piece[] } | null>(null);
  const [message, setMessage] = useState("");
  const timer = useRef<number | null>(null);

  useEffect(() => () => { if (timer.current) window.clearTimeout(timer.current); }, []);

  const fire = useCallback(
    (text = "Session logged") => {
      // The announcement happens either way. Somebody using a screen reader
      // gets the confirmation whether or not they can see confetti.
      setMessage(text);

      // The haptic is not motion. Reduced-motion is about what moves on the
      // screen, and a phone buzz is the one part of this that still helps
      // somebody who has that setting on.
      haptic("success");

      if (reduced) return;

      const key = Date.now();
      setBurst({ key, pieces: makePieces(key % 1000) });
      if (timer.current) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setBurst(null), BURST_MS);
    },
    [haptic, reduced],
  );

  const node = (
    <>
      <span aria-live="polite" className="sr-only">{message}</span>
      {burst ? (
        <span key={burst.key} className="celebrate" aria-hidden>
          {burst.pieces.map((p) => (
            <span
              key={p.id}
              className="celebrate__piece"
              style={{
                background: p.colour,
                animationDelay: `${p.delay}ms`,
                ["--dx" as string]: `${p.dx}px`,
                ["--rise" as string]: `${p.rise}px`,
                ["--spin" as string]: `${p.rotate}deg`,
              }}
            />
          ))}
        </span>
      ) : null}
    </>
  );

  return { fire, node } as const;
}
