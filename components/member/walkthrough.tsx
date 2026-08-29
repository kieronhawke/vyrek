"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useHydrated } from "@/hooks/use-hydrated";
import { useRecord } from "@/lib/control/store";

/**
 * THE FIRST-RUN WALKTHROUGH.
 *
 * A new athlete lands in the app the moment they finish onboarding, having
 * paid, and has to work out on their own where the plan is and what Ben
 * expects back. Five cards, once, then never again unless they ask for it.
 *
 * ONCE MEANS ONCE
 * ---------------
 * Two pieces of state, and they are not the same thing:
 *
 *   `seen`    persisted. Has this browser ever been shown the tour.
 *   `replay`  persisted. Somebody pressed "Replay the tour" on Account.
 *
 * Whether the sheet is open is decided **once**, from `seen` as it was at
 * mount — captured in a ref rather than read live. That matters: the sheet
 * marks itself seen as soon as it opens, so that abandoning it halfway does
 * not bring it back tomorrow, and reading `seen` live would mean that write
 * instantly closed the thing that had just opened.
 *
 * Deliberately not a spotlight overlay that highlights elements by position:
 * those break the moment a layout changes and are unusable on a phone, which
 * is where this runs. It is a sheet that names each tab and says what it is
 * for — the thing the athlete actually needs to know.
 */

export const WALKTHROUGH_KEY = "walkthrough.seen";
export const WALKTHROUGH_REPLAY_KEY = "walkthrough.replay";

type Step = {
  /** The tab this card is about. Must be a tab that exists. */
  tab: string;
  title: string;
  body: string;
};

/*
 * One card per tab, in the order they appear in the navigation.
 *
 * Every claim here is checked against what the tab actually does. The previous
 * version's last card was headed "You" — the Account tab — and then described
 * filming a set for Ben, which happens inside a session and is nowhere near
 * Account. An athlete who followed it would have gone looking in the wrong
 * place on their first day. A test pins each card to a real tab.
 *
 * No em-dashes in the bodies. The copy pass retired every one a client could
 * see, and this sheet is the first thing they read after paying, so it follows
 * the same rule as the lifecycle emails. Comments are not client copy and keep
 * theirs.
 */
export const STEPS: Step[] = [
  {
    tab: "Today",
    title: "Start here every day",
    body: "Today opens on the session Ben has set for you, with your week across the top and his note on it. If you only ever open one tab, this is it.",
  },
  {
    tab: "Plan",
    title: "The whole week, as Ben wrote it",
    body: "Every session in the week, in order. Tick one off when it is done. Ben sees what you completed before he writes your next week.",
  },
  {
    tab: "Fuel",
    title: "Eat for the session, not the day",
    body: "Your food and macros against target, with today's session placed in the day so you know what to eat before and after it.",
  },
  {
    tab: "Coach",
    title: "Ask Ben anything",
    body: "One thread, straight to him. Picked up a niggle, need to move a session, want your technique checked: send a photo or a video of a set and he will look at it.",
  },
  {
    tab: "You",
    title: "Everything else lives here",
    body: "Your subscription, your personal records, the apps you have connected, and your data. You can replay this tour from here any time.",
  },
];

export function Walkthrough() {
  const { value: seen, save: saveSeen } = useRecord<boolean>(WALKTHROUGH_KEY, false);
  const { value: replay, save: saveReplay } = useRecord<boolean>(
    WALKTHROUGH_REPLAY_KEY,
    false,
  );
  const mounted = useHydrated();

  const [step, setStep] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  /** `seen` as it was when this mounted. Null until hydration decides. */
  const seenAtMount = useRef<boolean | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (mounted && seenAtMount.current === null) seenAtMount.current = seen;
  }, [mounted, seen]);

  const open =
    mounted && !dismissed && (seenAtMount.current === false || replay);

  /* Marked seen the moment it opens, not when it is closed. Somebody who
     reads two cards and shuts the tab has still been shown it; meeting the
     same five cards again tomorrow reads as broken rather than helpful. */
  useEffect(() => {
    if (open && !seen) saveSeen(true);
  }, [open, seen, saveSeen]);

  /* A replay request re-opens it even though it has been dismissed on this
     page already, which is the whole point of the button on Account. */
  useEffect(() => {
    if (replay) {
      setDismissed(false);
      setStep(0);
    }
  }, [replay]);

  const close = useCallback(() => {
    setDismissed(true);
    saveSeen(true);
    if (replay) saveReplay(false);
  }, [saveSeen, saveReplay, replay]);

  /* A dialog you cannot dismiss with the keyboard traps anybody not using a
     mouse. Arrows move between cards for the same reason. */
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") setStep((n) => Math.min(n + 1, STEPS.length - 1));
      if (e.key === "ArrowLeft") setStep((n) => Math.max(n - 1, 0));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  /* Move focus into the sheet so a screen reader announces it rather than
     leaving the reader wherever it was on the page behind it. */
  useEffect(() => {
    if (open) cardRef.current?.focus();
  }, [open]);

  if (!open) return null;

  const s = STEPS[step];
  const last = step === STEPS.length - 1;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="wt-title"
      aria-describedby="wt-body"
      className="walkthrough"
    >
      <div className="walkthrough__card" ref={cardRef} tabIndex={-1}>
        <p className="eyebrow">
          {s.tab} · {step + 1} of {STEPS.length}
        </p>
        <h2 id="wt-title" className="walkthrough__title">
          {s.title}
        </h2>
        <p id="wt-body" className="walkthrough__body">
          {s.body}
        </p>

        <ol className="walkthrough__dots" aria-hidden>
          {STEPS.map((_, i) => (
            <li key={i} data-on={i <= step || undefined} />
          ))}
        </ol>

        <div className="walkthrough__actions">
          {/* Back, because a tour you can only go forwards through punishes
              anybody who taps Next a beat too early. */}
          {step > 0 ? (
            <button
              type="button"
              className="walkthrough__skip"
              onClick={() => setStep((n) => n - 1)}
            >
              Back
            </button>
          ) : (
            <button type="button" className="walkthrough__skip" onClick={close}>
              Skip
            </button>
          )}
          {!last ? (
            <button
              type="button"
              className="walkthrough__next"
              onClick={() => setStep((n) => n + 1)}
            >
              Next
            </button>
          ) : (
            <button type="button" className="walkthrough__next" onClick={close}>
              Start training
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
