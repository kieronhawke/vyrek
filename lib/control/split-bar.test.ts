import { describe, expect, it } from "vitest";
import { SPLIT_FILL_VAR, splitBar } from "@/lib/control/split-bar";

/**
 * The split bar is used everywhere in the product, so its arithmetic is
 * worth testing exhaustively rather than eyeballing once. spec/16 §6 asks
 * for boundary coverage on shared logic; these are the boundaries.
 */

describe("splitBar geometry", () => {
  it("fills to the proportion of the track the value occupies", () => {
    expect(splitBar({ value: 5, target: 10 }).fillPct).toBe(50);
    expect(splitBar({ value: 10, target: 10 }).fillPct).toBe(100);
    expect(splitBar({ value: 0, target: 10 }).fillPct).toBe(0);
  });

  it("puts the marker where the target sits on the track", () => {
    // Track is wider than the target, so the marker sits partway along.
    const bar = splitBar({ value: 4, target: 8, max: 16 });
    expect(bar.markerPct).toBe(50);
    expect(bar.fillPct).toBe(25);
  });

  it("defaults the track width to the target", () => {
    expect(splitBar({ value: 3, target: 4 }).markerPct).toBe(100);
  });

  it("clamps beyond the track rather than overflowing it", () => {
    // An overflowing fill would paint outside the bar and, worse, could push
    // layout wide enough to trip the zero-horizontal-scroll gate.
    expect(splitBar({ value: 40, target: 10 }).fillPct).toBe(100);
    expect(splitBar({ value: -5, target: 10 }).fillPct).toBe(0);
  });
});

describe("splitBar states, accumulating upward", () => {
  const up = (value: number, target: number) =>
    splitBar({ value, target, direction: "up" }).state;

  it("is ahead once the target is met or beaten", () => {
    expect(up(10, 10)).toBe("ahead");
    expect(up(12, 10)).toBe("ahead");
  });

  it("is close when within the threshold but short", () => {
    expect(up(9, 10)).toBe("close"); // 10% short, inside the 15% default
  });

  it("is on track when comfortably short", () => {
    expect(up(4, 10)).toBe("on-track");
  });

  it("never reports past: you cannot overshoot an accumulating goal", () => {
    for (const v of [10, 50, 1000]) expect(up(v, 10)).not.toBe("past");
  });

  it("respects a custom threshold", () => {
    expect(splitBar({ value: 7, target: 10, closeThreshold: 0.4 }).state).toBe(
      "close",
    );
    expect(splitBar({ value: 7, target: 10, closeThreshold: 0.1 }).state).toBe(
      "on-track",
    );
  });
});

describe("splitBar states, counting down", () => {
  // The `programmed_until` case: days remaining against a billing date.
  const down = (value: number, target: number) =>
    splitBar({ value, target, direction: "down" }).state;

  it("is past once the value drops below the target", () => {
    expect(down(9, 10)).toBe("past");
    expect(down(0, 10)).toBe("past");
  });

  it("is close when nearly there", () => {
    expect(down(11, 10)).toBe("close"); // 10% over, inside the threshold
  });

  it("is ahead with plenty of room", () => {
    expect(down(30, 10)).toBe("ahead");
  });

  it("treats exactly on target as close, not past", () => {
    // The day programming runs out is a warning, not yet a failure.
    expect(down(10, 10)).toBe("close");
  });
});

describe("splitBar degenerate input", () => {
  it("renders an empty track rather than dividing by zero", () => {
    expect(splitBar({ value: 5, target: 0 })).toEqual({
      fillPct: 0,
      markerPct: 0,
      state: "on-track",
    });
    expect(splitBar({ value: 5, target: -3 }).fillPct).toBe(0);
  });

  it("survives NaN and Infinity without painting NaN into the DOM", () => {
    expect(splitBar({ value: NaN, target: 10 }).fillPct).toBe(0);
    expect(splitBar({ value: 5, target: NaN }).fillPct).toBe(0);
    expect(Number.isFinite(splitBar({ value: Infinity, target: 10 }).fillPct)).toBe(
      true,
    );
  });

  it("ignores a max that is smaller than nothing", () => {
    expect(splitBar({ value: 5, target: 10, max: 0 }).markerPct).toBe(100);
    expect(splitBar({ value: 5, target: 10, max: -4 }).markerPct).toBe(100);
  });
});

describe("split fill colours match spec/14 §4", () => {
  it("maps every state to the right token, and only to tokens", () => {
    expect(SPLIT_FILL_VAR.ahead).toBe("var(--accent)");
    expect(SPLIT_FILL_VAR["on-track"]).toBe("var(--text-muted)");
    expect(SPLIT_FILL_VAR.close).toBe("var(--warn)");
    expect(SPLIT_FILL_VAR.past).toBe("var(--danger)");
  });

  it("never uses a raw hex value", () => {
    // spec/14 §2: "Use the tokens, never raw hex."
    for (const v of Object.values(SPLIT_FILL_VAR)) {
      expect(v).toMatch(/^var\(--[a-z-]+\)$/);
      expect(v).not.toMatch(/#[0-9a-f]{3,8}/i);
    }
  });
});

describe("criticalAtOrBelow — runway rather than progress", () => {
  // Regression: a client with 2 days of programming left painted the same
  // danger red as one who had already run out, because "short of target"
  // was being treated as "past". The floor is what separates them.
  it("is past at or below the floor, whatever the target says", () => {
    expect(
      splitBar({ value: 0, target: 9, max: 30, criticalAtOrBelow: 0 }).state,
    ).toBe("past");
    expect(
      splitBar({ value: -3, target: 9, max: 30, criticalAtOrBelow: 0 }).state,
    ).toBe("past");
  });

  it("leaves a client with days left short of the floor alone", () => {
    const bar = splitBar({
      value: 2,
      target: 9,
      max: 30,
      criticalAtOrBelow: 0,
    });
    expect(bar.state).not.toBe("past");
  });

  it("still reports ahead when runway clears the target", () => {
    expect(
      splitBar({ value: 26, target: 9, max: 30, criticalAtOrBelow: 0 }).state,
    ).toBe("ahead");
  });

  it("ignores a non-finite floor", () => {
    expect(
      splitBar({ value: 5, target: 10, criticalAtOrBelow: NaN }).state,
    ).not.toBe("past");
  });

  it("keeps the geometry correct at the floor", () => {
    const bar = splitBar({ value: 0, target: 9, max: 30, criticalAtOrBelow: 0 });
    expect(bar.fillPct).toBe(0);
    expect(bar.markerPct).toBe(30);
  });
});

describe("warnAtOrBelow — absolute urgency, not ratio", () => {
  // Regression: with ratio-only states, 26 days of runway against a 28-day
  // billing date rendered amber ("within 15% of target") while 2 days
  // against a 9-day date rendered calm. Exactly backwards for a coach.
  const runway = (days: number, billing: number) =>
    splitBar({
      value: days,
      target: billing,
      max: 30,
      criticalAtOrBelow: 0,
      warnAtOrBelow: 7,
    }).state;

  it("warns on genuinely short runway", () => {
    expect(runway(2, 9)).toBe("close");
    expect(runway(7, 21)).toBe("close");
  });

  it("stays calm on healthy runway, whatever the billing date", () => {
    expect(runway(26, 28)).toBe("ahead");
    expect(runway(11, 12)).toBe("ahead");
    expect(runway(18, 21)).toBe("ahead");
  });

  it("still fails below the floor", () => {
    expect(runway(0, 9)).toBe("past");
    expect(runway(-3, 4)).toBe("past");
  });

  it("orders the thresholds: floor beats warning", () => {
    expect(
      splitBar({
        value: 0,
        target: 10,
        criticalAtOrBelow: 0,
        warnAtOrBelow: 7,
      }).state,
    ).toBe("past");
  });

  it("leaves the ratio behaviour untouched when no thresholds are given", () => {
    expect(splitBar({ value: 9, target: 10 }).state).toBe("close");
    expect(splitBar({ value: 4, target: 10 }).state).toBe("on-track");
  });
});

