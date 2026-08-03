"use client";

import { useEffect, useState } from "react";
import { useRecord } from "@/lib/control/store";

/**
 * THE FIRST-RUN WALKTHROUGH.
 *
 * A new athlete lands in the app the moment they finish onboarding, having
 * paid, and has to work out on their own where the plan is and what Ben
 * expects back. Five cards, once, dismissible, never shown again.
 *
 * Deliberately not a spotlight overlay that highlights elements by position:
 * those break the moment a layout changes and are unusable on a phone, which
 * is where this runs. It is a sheet that names each tab and says what it is
 * for — the thing the athlete actually needs to know.
 *
 * "Seen" persists through the same store as everything else, so it survives a
 * reload rather than reappearing on every visit.
 */

type Step = { title: string; body: string; tab: string };

const STEPS: Step[] = [
  {
    tab: "Today",
    title: "Start here every day",
    body: "Today opens on the session Ben has set, with the week across the top. If you only ever open one tab, this is it.",
  },
  {
    tab: "Plan",
    title: "The whole week, as Ben wrote it",
    body: "Seven days, morning and afternoon. Tick a session off when it is done — Ben sees what you have completed before he writes the next week.",
  },
  {
    tab: "Fuel",
    title: "Eat for the session, not the day",
    body: "Your macros against target, with the workout placed in the day so you know what to eat before and after it.",
  },
  {
    tab: "Coach",
    title: "Ask Ben anything",
    body: "One thread, straight to him. Picked up a niggle, need to move a session, unsure about technique — this is the fastest way to get an answer.",
  },
  {
    tab: "You",
    title: "Film your form",
    body: "On any session you can film a set and send it to Ben. It is the one thing he cannot do from a plan alone, and it is where most of the improvement comes from.",
  },
];

export function Walkthrough() {
  const { value: seen, save } = useRecord<boolean>("walkthrough.seen", false);
  const [step, setStep] = useState(0);
  /**
   * The server renders `seen` as false, so showing immediately would flash the
   * sheet for a returning athlete before hydration corrects it. Waiting a tick
   * costs nothing and avoids that.
   */
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted || seen) return null;

  const s = STEPS[step];
  const last = step === STEPS.length - 1;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="wt-title"
      className="walkthrough"
    >
      <div className="walkthrough__card">
        <p className="eyebrow">
          {s.tab} · {step + 1} of {STEPS.length}
        </p>
        <h2 id="wt-title" className="walkthrough__title">
          {s.title}
        </h2>
        <p className="walkthrough__body">{s.body}</p>

        <ol className="walkthrough__dots" aria-hidden>
          {STEPS.map((_, i) => (
            <li key={i} data-on={i <= step || undefined} />
          ))}
        </ol>

        <div className="walkthrough__actions">
          <button
            type="button"
            className="walkthrough__skip"
            onClick={() => save(true)}
          >
            {last ? "Close" : "Skip"}
          </button>
          {!last ? (
            <button
              type="button"
              className="walkthrough__next"
              onClick={() => setStep((n) => n + 1)}
            >
              Next
            </button>
          ) : (
            <button
              type="button"
              className="walkthrough__next"
              onClick={() => save(true)}
            >
              Start training
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
