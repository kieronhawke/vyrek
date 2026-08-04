"use client";

import { Interstitial } from "@/components/quiz-v3/interstitial";

/**
 * Reassurance interstitial #1, shown on both rails.
 *
 * Rail-aware copy. The athlete version leans on training history, because
 * that is the honesty an athlete tends to shade. The beginner version has
 * to do something harder: the reason people round their answers up here is
 * embarrassment, so the screen has to say plainly that the least fit
 * answer is the useful one.
 *
 * Layout now comes from components/quiz-v3/interstitial.tsx — this used to
 * be a full-bleed photo with a window-width button, which was the single
 * worst desktop screen in the funnel.
 */
export function ReassuranceScreen1({
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
      label="Reassurance"
      image="/media/images/track/palms-sunflare-pair-bw.jpg"
      imagePosition="55% 50%"
      eyebrow="Next few questions"
      title="Half the work is honest answers."
      body={
        beginner
          ? "There is no answer here that puts you at the back. The plan is built from where you actually are, so rounding up only gets you a week that is too hard to finish. Tell us the truth and it will fit."
          : "What you train at home is not what you train at the gym. What you did at 25 is not what you do now. Tell us where you are, not where you wish you were. We adapt every Sunday."
      }
      onContinue={onContinue}
      onBack={onBack}
    />
  );
}
