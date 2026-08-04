"use client";

import { useHydrated } from "@/hooks/use-hydrated";
import { useRecord } from "@/lib/control/store";
import { WALKTHROUGH_REPLAY_KEY } from "@/components/member/walkthrough";

/**
 * Put the first-run tour back.
 *
 * A one-time sheet is right — nobody wants the same five cards every morning —
 * but "one time" and "gone forever" are different promises, and the tour was
 * making the second one. Somebody who skipped it on their first day, on a
 * phone, in a hurry, had no way back to it.
 *
 * It lives on Account because that is where the tour's own last card says it
 * lives. It sets a request flag rather than clearing "seen", so that "have
 * they been shown this" stays true and the tour still never reappears on its
 * own — the only thing that reopens it is somebody asking.
 */
export function ReplayTour({ className }: { className?: string }) {
  const { save } = useRecord<boolean>(WALKTHROUGH_REPLAY_KEY, false);
  const mounted = useHydrated();

  return (
    <button
      type="button"
      className={className}
      onClick={() => save(true)}
      /* Inert until hydrated: a button that silently does nothing is worse
         than one that is visibly not ready yet. */
      disabled={!mounted}
    >
      Replay the tour
    </button>
  );
}
