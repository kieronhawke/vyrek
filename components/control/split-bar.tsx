"use client";

import { useEffect, useState } from "react";
import { Num } from "@/components/control/num";
import {
  SPLIT_FILL_VAR,
  splitBar,
  type SplitBarInput,
} from "@/lib/control/split-bar";

/**
 * THE SPLIT BAR — the signature element of the product.
 *
 * docs/build-pack/spec/14 §4. One visual device, used consistently
 * everywhere, borrowed from race split displays:
 *
 *   PROGRAMMED UNTIL                         12 DAYS
 *   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┃━━━━━━━━━
 *                                      ▲ renewal
 *
 * Used for, and only for, things measured against a target: programming
 * horizon vs billing date, payment collected vs due, sessions completed vs
 * planned, benchmark vs percentile, predicted finish vs target time.
 *
 * The spec is explicit that this is where the boldness is spent and
 * everything else stays quiet: no gradients, no glass, no glow. It also
 * animates its fill on mount, once, 300ms — and nowhere else in the product
 * animates at all.
 */
export function SplitBar({
  label,
  value,
  display,
  targetLabel,
  ...input
}: SplitBarInput & {
  /** The eyebrow, e.g. "PROGRAMMED UNTIL". */
  label: string;
  /** What to print above the bar, e.g. "12 DAYS". Falls back to the value. */
  display?: string;
  /** What the marker means, e.g. "renewal". */
  targetLabel?: string;
  value: number;
}) {
  const { fillPct, markerPct, state } = splitBar({ value, ...input });

  // Animate the fill on mount, once. Starting at zero and moving to the real
  // width on the next frame gives the 300ms fill without a keyframe, and
  // keeps the server and first client render identical.
  //
  // Reduced motion is deliberately NOT handled here. control-tokens.css
  // already collapses every transition under
  // `prefers-reduced-motion: reduce`, so duplicating that in JS would mean
  // two places to keep in step and one of them silently drifting.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const width = mounted ? `${fillPct}%` : "0%";

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: "var(--space-2)",
          marginBottom: "var(--space-1)",
        }}
      >
        <span className="eyebrow">{label}</span>
        <Num tone={state === "on-track" ? "muted" : undefined}>
          {display ?? value}
        </Num>
      </div>

      <div
        role="meter"
        aria-label={label}
        aria-valuenow={Math.round(fillPct)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuetext={display ?? String(value)}
        style={{
          position: "relative",
          height: 6,
          background: "var(--surface-raised)",
          borderRadius: 0,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width,
            height: "100%",
            background: SPLIT_FILL_VAR[state],
            transition: `width var(--dur-slow) var(--ease)`,
          }}
        />

        {/* The target marker is always a 1px --text line. spec/14 §4. */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: `${markerPct}%`,
            width: 1,
            background: "var(--text)",
          }}
        />
      </div>

      {targetLabel ? (
        <div
          aria-hidden
          style={{
            position: "relative",
            height: "var(--text-2xs)",
            marginTop: 2,
          }}
        >
          <span
            className="eyebrow"
            style={{
              position: "absolute",
              // Nudge left so the label reads as hanging off the marker.
              // The right clamp reserves enough room for the longest label
              // we use; at 60px "PLANNED" was clipping against the edge.
              // Clamping rather than overflowing matters because an
              // overflowing label would trip the zero-horizontal-scroll gate.
              left: `clamp(0px, calc(${markerPct}% - 12px), calc(100% - 88px))`,
              whiteSpace: "nowrap",
            }}
          >
            ▲ {targetLabel}
          </span>
        </div>
      ) : null}
    </div>
  );
}
