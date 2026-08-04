"use client";

import { useHydrated } from "@/hooks/use-hydrated";
import { useRecord } from "@/lib/control/store";
import { BEN } from "@/lib/ben";

/**
 * The thing Ben would say to somebody hesitating over the first message.
 *
 * It used to be a permanent card at the top of the coach screen — the first
 * thing on the page on every visit, pushing the actual conversation below the
 * fold on a phone. Reading "most of the people I coach have never competed at
 * anything" every morning for a year is a strange experience, and it is aimed
 * at exactly one moment: the one before somebody sends their first message.
 *
 * So it is shown until it is dismissed, and then it is gone. Not on a timer,
 * not on a count — dismissing it is the athlete saying they have read it, and
 * a prompt that comes back after being dismissed is a prompt people learn to
 * resent.
 */
export function CoachIntro() {
  const { value: dismissed, save } = useRecord<boolean>("coach.intro.dismissed", false);
  const mounted = useHydrated();

  /* Hidden until hydration rather than shown: flashing it at somebody who
     dismissed it months ago is worse than a beat of nothing. */
  if (!mounted || dismissed) return null;

  return (
    <div className="coachintro">
      <p className="coachintro__body">{BEN.beginnerPromise}</p>
      <button
        type="button"
        className="coachintro__dismiss"
        onClick={() => save(true)}
      >
        Got it
      </button>
    </div>
  );
}
