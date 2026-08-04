"use client";

import { Interstitial } from "@/components/quiz-v3/interstitial";

/**
 * Reassurance interstitial #2: what you actually get for the time you put
 * in. The screen Kieron singled out as reading well but being built for a
 * phone — the copy was right, the layout was a mobile page on a monitor.
 *
 * The photo grid stays, because it is doing real work: it is the only
 * place in the funnel before the reveal that shows training rather than
 * describing it. On desktop it sits beside the picture column rather than
 * under a full-width headline.
 *
 * Rail-aware headline and copy. "12-week programme" and a race-shaped
 * promise mean nothing to somebody who came to lose weight, and the whole
 * point of the beginner rail is that it never asks them to translate.
 */
export function ReassuranceScreen2({
  beginner,
  onContinue,
  onBack,
}: {
  beginner?: boolean;
  onContinue: () => void;
  onBack?: () => void;
}) {
  return (
    <Interstitial
      label="Programme overview"
      image="/media/images/track/straight-elevated-bw.jpg"
      imagePosition="50% 45%"
      eyebrow={beginner ? "Your programme" : "12-week programme"}
      title="Give us a few sessions a week. We'll dial in the rest."
      body={
        beginner
          ? "You do not need to live in a gym. You need a week that fits around your actual life, where every session has a reason to exist and the next one builds on it."
          : "You don't need more hours in the gym. You need better programming, where every block has a purpose, and every session builds on the last."
      }
      onContinue={onContinue}
      onBack={onBack}
    >
      {/* Three photographs is right on a phone, where they scroll past. On a
          laptop they have to share the height with a headline, a paragraph
          and a button, and at 16/9 the button ended up under the fold. The
          wide frame gets shorter and the pair get squarer from lg. */}
      <div className="mt-7 grid grid-cols-2 gap-3 lg:mt-5 lg:gap-2.5">
        <div className="col-span-2 aspect-[16/9] overflow-hidden rounded-lg bg-suth-elevated lg:aspect-[21/8]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/media/images/track/bend-lanes-bw.jpg"
            alt=""
            className="h-full w-full object-cover"
            loading="lazy"
            decoding="async"
          />
        </div>
        <div className="aspect-[4/3] overflow-hidden rounded-lg bg-suth-elevated lg:aspect-[3/2]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={
              beginner
                ? "/media/images/ben/ben-steps.jpg"
                : "/media/images/ben/ben-running.jpg"
            }
            alt=""
            className="h-full w-full object-cover"
            style={{ objectPosition: beginner ? "40% 35%" : "50% 30%" }}
            loading="lazy"
            decoding="async"
          />
        </div>
        <div className="aspect-[4/3] overflow-hidden rounded-lg bg-suth-elevated lg:aspect-[3/2]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/media/images/track/programme-doubles.jpg"
            alt=""
            className="h-full w-full object-cover"
            loading="lazy"
            decoding="async"
          />
        </div>
      </div>
    </Interstitial>
  );
}
