"use client";

import { ContinueButton } from "@/components/quiz-v3/continue-button";
import { InterstitialBack } from "@/components/quiz-v3/interstitial-back";
import { BEN, BEN_ATHLETE_PROOF, BEN_BEGINNER_PROOF } from "@/lib/ben";

/**
 * Meet Ben. The last screen before the reveal, and the one that answers the
 * question every funnel eventually has to: why you and not the app I
 * already pay for?
 *
 * RAIL-AWARE, and the two versions are close to opposites. An athlete wants
 * the record — world records, British records, Elite 15 — because that is
 * what makes a coach worth listening to when you already race. A beginner
 * reading that same list measures the distance between themselves and it,
 * so they get who he coaches instead, and the record sits underneath as
 * reassurance rather than as the headline.
 *
 * THE PHOTOGRAPH CHANGES TOO, which matters more than the words. Every
 * picture in the July 2026 set is race day: shirtless, mid-competition, in
 * an arena. That is exactly right for the athlete rail and exactly wrong
 * for somebody who has just said they have not trained in years. They get
 * the one frame in the set where he is sitting on some steps in a t-shirt.
 *
 * Desktop is a split rather than a full-bleed photo with the copy in a
 * corner, matching every other screen in the funnel.
 */

const PORTRAIT = {
  athlete: {
    src: "/media/images/ben/ben-race-portrait.jpg",
    position: "50% 20%",
  },
  beginner: {
    src: "/media/images/ben/ben-steps.jpg",
    position: "40% 38%",
  },
};

export function MeetBenScreen({
  beginner,
  onContinue,
  onBack,
}: {
  beginner: boolean;
  onContinue: () => void;
  onBack?: () => void;
}) {
  const proof = beginner ? BEN_BEGINNER_PROOF : BEN_ATHLETE_PROOF;
  const portrait = beginner ? PORTRAIT.beginner : PORTRAIT.athlete;

  return (
    <section
      aria-label="Meet Ben Sutherland"
      className="quiz-viewport relative isolate flex flex-col overflow-hidden bg-suth-base lg:flex-row"
    >
      <InterstitialBack onBack={onBack} />

      <div
        aria-hidden
        className="absolute inset-0 z-0 lg:relative lg:inset-auto lg:z-auto lg:h-full lg:w-[42%] lg:shrink-0 xl:w-[46%]"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={portrait.src}
          alt=""
          className="h-full w-full object-cover"
          style={{ objectPosition: portrait.position }}
          loading="eager"
          decoding="async"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-suth-base via-suth-base/85 to-suth-base/10 lg:from-suth-base/60 lg:via-transparent lg:to-transparent" />
        <div className="absolute inset-0 hidden bg-gradient-to-r from-transparent to-suth-base/60 lg:block" />
      </div>

      <div className="relative z-10 flex h-full flex-1 flex-col justify-end overflow-y-auto px-6 pb-[max(1.5rem,var(--safe-bottom))] pt-[var(--safe-top)] lg:h-full lg:justify-center lg:px-10 lg:py-10">
        <div className="mb-8 max-w-md lg:mx-auto lg:mb-0 lg:w-full lg:max-w-[34rem]">
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-suth-accent">
            [ Who you&apos;ll be speaking to ]
          </p>

          <h1 className="mt-4 text-balance text-3xl font-black leading-[1.05] tracking-[-0.03em] text-suth-text md:text-5xl lg:text-4xl xl:text-5xl">
            {BEN.name}
          </h1>

          <p className="mt-4 text-pretty text-base leading-relaxed text-suth-text-secondary md:text-lg lg:text-base">
            {beginner ? BEN.beginnerPromise : BEN.intro}
          </p>

          {/* THE RECORDS ARE THE POINT, SO THEY ARE THE SIZE OF THE POINT.
              They were 10px mono pills, the same weight as a field label,
              which is a strange way to mention two world records. The number
              now leads and the words follow it — a record reads as a fact at
              a glance, and a pill reads as a tag. */}
          <ul
            role="list"
            className="mt-7 grid grid-cols-3 gap-3"
            aria-label={
              beginner ? "About Ben" : "Ben Sutherland's racing record"
            }
          >
            {proof.map((item) => {
              // Ordinals too: "6th Elite 15 Worlds" deserves the same treatment
              // as "2 world records", and matching only bare digits left it as
              // the one small card in a row of large ones.
              const m = /^(\d+(?:st|nd|rd|th)?)\s+(.*)$/.exec(item);
              return (
                <li
                  key={item}
                  className="rounded-xl border border-suth-border-strong bg-suth-base/70 px-3 py-3 backdrop-blur-sm"
                >
                  {m ? (
                    <>
                      <span className="block font-display text-3xl font-black leading-none tracking-[-0.03em] text-suth-accent xl:text-4xl">
                        {m[1]}
                      </span>
                      <span className="mt-1.5 block text-[13px] leading-snug text-suth-text-secondary">
                        {m[2]}
                      </span>
                    </>
                  ) : (
                    <span className="block text-[13px] font-medium leading-snug text-suth-text">
                      {item}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>

          {/* The warm bit, and the one Kieron asked for by name: whatever
              they are here for, he is on their side. */}
          <p className="mt-6 text-pretty text-base leading-relaxed text-suth-text-secondary">
            {beginner
              ? "He races at the top of the sport. That is not what you are buying. You are buying somebody who knows how to start a person from nothing without breaking them — and who will be there for every step of it."
              : "Whether you are chasing the Elite 15 or your first honest month of training, he takes it just as seriously. Everyone needs a push sometimes. That is what he is for."}
          </p>

          <div className="mt-8 hidden lg:flex [&>button]:h-12 [&>button]:w-auto [&>button]:min-w-[13rem]">
            <ContinueButton label="Pick a time →" onClick={onContinue} />
          </div>
        </div>

        <div className="lg:hidden">
          <ContinueButton label="Pick a time →" onClick={onContinue} />
        </div>
      </div>
    </section>
  );
}
