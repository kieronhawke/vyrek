"use client";

import { OptionCard } from "@/components/quiz-v3/option-card";
import { QuestionHeader } from "@/components/quiz-v3/question-header";
import type { QuizRail, SupportPreference } from "@/lib/quiz-flow";

/**
 * The sift. One screen, placed late, that decides which of the three funnel
 * outcomes someone gets: coached by Ben (beginner or HYROX door, both
 * closing on a free call) or Suth Club, the self-serve tier.
 *
 * Deliberately not a budget question. Asking a consumer what they can afford
 * is crass and it depresses completion; support preference is a better proxy
 * and it is a question people are pleased to be asked.
 *
 * "Not sure" is a first-class answer, not a cop-out: those answers get
 * scored in lib/quiz-sift.ts and come back as a recommendation on the
 * reveal, with the reasoning shown.
 *
 * Spec: docs/onboarding-funnel-proposal.md section 5.4.
 */

type Option = {
  value: SupportPreference;
  label: string;
  detail: string;
};

const BEGINNER_OPTIONS: Option[] = [
  {
    value: "coached",
    label: "I want Ben in my corner",
    detail:
      "A programme written for you, weekly check-ins, and someone who notices if you go quiet.",
  },
  {
    value: "self",
    label: "I want a plan I follow myself",
    detail:
      "Everything you need to train properly, at your own pace, in your own time.",
  },
  {
    value: "unsure",
    label: "I'm not sure yet",
    detail: "Show me both and tell me which one fits what I've told you.",
  },
];

const ATHLETE_OPTIONS: Option[] = [
  {
    value: "coached",
    label: "Coached by Ben",
    detail:
      "He writes it, he adjusts it weekly, and he's on the end of a message.",
  },
  {
    value: "self",
    label: "Give me the programme",
    detail:
      "You'll execute it. Full block, station work, and the race-week protocol.",
  },
  {
    value: "unsure",
    label: "Show me both",
    detail: "We'll recommend one based on what you've told us.",
  },
];

export function SupportPreferenceScreen({
  rail,
  value,
  onChange,
}: {
  rail: QuizRail;
  value: SupportPreference | undefined;
  onChange: (v: SupportPreference) => void;
}) {
  const isAthlete = rail === "athlete";
  const options = isAthlete ? ATHLETE_OPTIONS : BEGINNER_OPTIONS;

  return (
    <div>
      <QuestionHeader
        question={
          isAthlete ? "How do you want to work?" : "How do you want to train?"
        }
        helper="There's no wrong answer. It only changes what happens next."
      />
      <ul role="list" className="space-y-3 lg:space-y-2.5">
        {options.map((opt) => (
          <li key={opt.value}>
            <OptionCard
              label={opt.label}
              detail={opt.detail}
              selected={value === opt.value}
              onClick={() => onChange(opt.value)}
            />
          </li>
        ))}
      </ul>

      <p className="mt-6 text-sm leading-relaxed text-suth-text-tertiary">
        Either way you get your plan. Nobody is put on a list they didn&apos;t
        ask for.
      </p>
    </div>
  );
}
