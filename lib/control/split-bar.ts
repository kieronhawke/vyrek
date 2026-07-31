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
  /**
   * A hard floor that means failure regardless of the target.
   *
   * Needed because some values are runway rather than progress: programming
   * days remaining is measured against the next billing date, but what makes
   * it critical is hitting zero, not falling short of the date. Without this
   * a client with two days left painted the same danger red as one who had
   * already run out, which is exactly the distinction Ben needs.
   */
  criticalAtOrBelow?: number;
  /**
   * An absolute warning threshold, checked before the ratio rules.
   *
   * Same reason as the floor: for runway, urgency is a number of days, not a
   * percentage of the target. Ratio alone gave nonsense — 26 days of
   * programming against a 28-day billing date read as a warning because it
   * was "within 15% of target", while 2 days against a 9-day date read as
   * calm because it was not. Ben needs the opposite of both.
   */
  warnAtOrBelow?: number;
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
  criticalAtOrBelow,
  warnAtOrBelow,
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

  // The floor wins over everything: run out is run out.
  if (
    criticalAtOrBelow !== undefined &&
    Number.isFinite(criticalAtOrBelow) &&
    safeValue <= criticalAtOrBelow
  ) {
    return { fillPct, markerPct, state: "past" };
  }
  if (
    warnAtOrBelow !== undefined &&
    Number.isFinite(warnAtOrBelow) &&
    safeValue <= warnAtOrBelow
  ) {
    return { fillPct, markerPct, state: "close" };
  }
  // Absolute thresholds given but not tripped: the value is healthy, and the
  // ratio rules below would only reintroduce the noise they replaced.
  if (criticalAtOrBelow !== undefined || warnAtOrBelow !== undefined) {
    return { fillPct, markerPct, state: "ahead" };
  }
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
