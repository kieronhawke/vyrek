/**
 * Split bar logic, kept out of the component so it can be unit-tested
 * exhaustively without rendering anything.
 *
 * The split bar is the signature element of the whole product
 * (docs/build-pack/spec/14 §4): a horizontal track with a filled portion, a
 * target marker, and the value in mono above it. Borrowed from race split
 * displays, and used for one thing only — values measured against a target.
 *
 * Colour rules, spec/14 §4:
 *   fill is --text-muted by default
 *   --accent when ahead of target
 *   --warn when close
 *   --danger when past
 */

export type SplitState = "ahead" | "on-track" | "close" | "past";

export type SplitBar = {
  /** 0–100, clamped. Where the fill ends. */
  fillPct: number;
  /** 0–100, clamped. Where the 1px target marker sits. */
  markerPct: number;
  state: SplitState;
};

export type SplitBarInput = {
  /** Where we are now. */
  value: number;
  /** What we are measured against. */
  target: number;
  /** The full width of the track. Defaults to the target. */
  max?: number;
  /**
   * Which direction is good. "up" for things you accumulate (sessions
   * completed, revenue). "down" for things that run out (days remaining) or
   * that you want to be lower (a finish time).
   */
  direction?: "up" | "down";
  /**
   * How near the target counts as "close", as a fraction of the target.
   * 0.15 means within 15%.
   */
  closeThreshold?: number;
};

function clampPct(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, n));
}

/**
 * Resolve a value/target pair into a fill percentage, a marker position and
 * a state. Pure: no dates, no randomness, no I/O.
 */
export function splitBar({
  value,
  target,
  max,
  direction = "up",
  closeThreshold = 0.15,
}: SplitBarInput): SplitBar {
  // A zero or negative target has no meaningful geometry. Render an empty
  // track rather than dividing by zero and painting NaN.
  if (!Number.isFinite(target) || target <= 0) {
    return { fillPct: 0, markerPct: 0, state: "on-track" };
  }

  const width = Number.isFinite(max) && (max as number) > 0 ? (max as number) : target;
  const safeValue = Number.isFinite(value) ? value : 0;

  const fillPct = clampPct((safeValue / width) * 100);
  const markerPct = clampPct((target / width) * 100);

  const delta = safeValue - target;
  const nearness = Math.abs(delta) / target;

  let state: SplitState;
  if (direction === "up") {
    // Accumulating: at or beyond target is ahead, short of it is on track,
    // and there is no "past" — you cannot overshoot a goal badly.
    if (delta >= 0) state = "ahead";
    else if (nearness <= closeThreshold) state = "close";
    else state = "on-track";
  } else {
    // Counting down: past the target is the failure state. This is the
    // "programmed until" case — days remaining against a billing date.
    if (delta < 0) state = "past";
    else if (nearness <= closeThreshold) state = "close";
    else state = "ahead";
  }

  return { fillPct, markerPct, state };
}

/** The CSS custom property each state paints its fill with. spec/14 §4. */
export const SPLIT_FILL_VAR: Record<SplitState, string> = {
  ahead: "var(--accent)",
  "on-track": "var(--text-muted)",
  close: "var(--warn)",
  past: "var(--danger)",
};
