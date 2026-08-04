"use client";

import { BEN } from "@/lib/ben";
import { isBeginnerRail, type QuizAnswers } from "@/lib/quiz-flow";

/**
 * THE DESKTOP LEFT-HAND SIDE.
 *
 * What replaced "Building as you answer" — a panel that listed eight rows
 * and, on the screen where most people meet the quiz, had seven of them
 * showing a dash. It was the biggest thing on a 1440px screen and its
 * content was an inventory of what the user had not told us yet. The one
 * moment it had something to say (the reveal) is a screen that shows the
 * plan in full anyway.
 *
 * So the space does the job the space is good for: on a wide screen there
 * is room to say why this is worth five minutes, and on a phone there is
 * not. That is the whole argument for a desktop layout that isn't the
 * phone one stretched.
 *
 * RAIL-AWARE, and this is the point rather than a refinement. The athlete
 * gets the record, because a record is what buys credibility with somebody
 * who already races. The beginner gets who he coaches — the same record
 * shown to somebody starting from nothing reads as a measure of the
 * distance between them and it. They also get different photographs: the
 * race set is shirtless, mid-competition, in an arena, and the beginner
 * rail must not open with it.
 *
 * Decorative: it carries no question and no control, so a screen reader
 * gets the question column and nothing to wade through first.
 */

type Panel = {
  src: string;
  /**
   * Empty on purpose — the image sits behind text that already says this,
   * and `aria-hidden` on the container keeps it out of the tree entirely.
   */
  position: string;
  eyebrow: string;
  headline: string;
  body: string;
  proof: string[];
};

const ATHLETE: Panel = {
  src: "/media/images/ben/ben-race-portrait.jpg",
  position: "50% 22%",
  eyebrow: "Who writes your plan",
  headline: "Coached by someone still in the race.",
  body: BEN.athletePromise,
  proof: ["2 world records", "4 British records", "Elite 15"],
};

const BEGINNER: Panel = {
  src: "/media/images/ben/ben-steps.jpg",
  position: "38% 40%",
  eyebrow: "Who writes your plan",
  headline: "You don't need to be fit to start.",
  body: "Most people I coach came to me because nothing had stuck before. That is usually the plan's fault, not theirs.",
  proof: ["Coaching since 2015", "Beginners a speciality", "UK-based"],
};

export function QuizAside({ answers }: { answers?: QuizAnswers }) {
  const panel = answers && isBeginnerRail(answers) ? BEGINNER : ATHLETE;

  return (
    <aside
      aria-hidden
      className="relative isolate hidden shrink-0 overflow-hidden bg-suth-elevated lg:block lg:w-[40%] xl:w-[44%]"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={panel.src}
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
        style={{ objectPosition: panel.position }}
        loading="eager"
        decoding="async"
      />
      {/* Two washes, not one. The vertical keeps the foot of the panel dark
          enough for body copy; the horizontal stops the seam against the
          question column reading as a hard edge. */}
      <div className="absolute inset-0 bg-gradient-to-t from-suth-base via-suth-base/70 to-suth-base/20" />
      <div className="absolute inset-0 bg-gradient-to-r from-transparent to-suth-base/60" />

      <div className="relative z-10 flex h-full flex-col justify-end p-10 xl:p-12">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-suth-accent">
          [ {panel.eyebrow} ]
        </p>
        <h2 className="mt-4 text-balance text-3xl font-black leading-[1.08] tracking-[-0.03em] text-suth-text xl:text-4xl">
          {panel.headline}
        </h2>
        <p className="mt-4 max-w-sm text-pretty text-sm leading-relaxed text-suth-text-secondary xl:text-base">
          {panel.body}
        </p>
        <ul className="mt-6 flex flex-wrap gap-2">
          {panel.proof.map((item) => (
            <li
              key={item}
              className="rounded-pill border border-suth-border-strong bg-suth-base/70 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-suth-text backdrop-blur-sm"
            >
              {item}
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}
