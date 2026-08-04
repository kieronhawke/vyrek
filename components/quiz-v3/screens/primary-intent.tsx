"use client";

import { OptionCard } from "@/components/quiz-v3/option-card";
import { QuestionHeader } from "@/components/quiz-v3/question-header";
import type { IntentValue } from "@/lib/quiz-flow";

/**
 * Screen one. The screen that decides which of the two journeys somebody
 * gets, so it is the most important question in the funnel.
 *
 * IT USED TO HAVE NO NON-RACING ANSWER. All four options named HYROX,
 * including the one meant for beginners ("Just getting fitter, Hyrox-
 * style"). Somebody who had come to lose weight had nothing honest to
 * tap, and because the rail could only be set from the URL they were put
 * on the racing rail regardless — then asked their best race time.
 *
 * So the list is now split down the middle, with the two doors that have
 * nothing to do with racing given equal weight rather than tacked on the
 * end. The heading above them does the sorting work before anyone reads
 * an option, which is what stops a beginner scanning three race answers
 * and concluding they are in the wrong place.
 *
 * SINGLE SELECT, deliberately. It allowed two answers before; on a screen
 * that now picks the route, "my first race" plus "just get fit" is a
 * contradiction the quiz would have to resolve by guessing.
 *
 * No emoji. They were the only illustration in the funnel and read as
 * clip-art next to everything around them; the group headings carry the
 * meaning that the icons were failing to.
 */

type Door = {
  value: IntentValue;
  label: string;
  detail: string;
};

const RACING: Door[] = [
  {
    value: "first-hyrox",
    label: "My first HYROX race",
    detail: "You've entered one, or you're about to. You want to finish it well.",
  },
  {
    value: "go-faster",
    label: "A faster HYROX time",
    detail: "You've raced. You know your number and you want it lower.",
  },
  {
    value: "doubles",
    label: "Racing doubles with a partner",
    detail: "Two of you, one time. Built around both of you.",
  },
];

const FITNESS: Door[] = [
  {
    value: "get-fit",
    label: "Getting fit and feeling better",
    detail: "No race, no competing. Just fitter than you are now.",
  },
  {
    value: "lose-weight",
    label: "Losing weight and getting stronger",
    detail: "A plan you can hold down alongside everything else.",
  },
];

function Group({
  title,
  doors,
  selected,
  onChoose,
}: {
  title: string;
  doors: Door[];
  selected: IntentValue | undefined;
  onChoose: (v: IntentValue) => void;
}) {
  return (
    <div>
      <h2 className="mb-3 font-mono text-[10px] uppercase tracking-[0.22em] text-suth-text-tertiary">
        {title}
      </h2>
      <ul role="list" className="space-y-3 lg:space-y-2.5">
        {doors.map((door) => (
          <li key={door.value}>
            <OptionCard
              label={door.label}
              detail={door.detail}
              selected={selected === door.value}
              onClick={() => onChoose(door.value)}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

export function PrimaryIntentScreen({
  selected,
  onChoose,
}: {
  selected: IntentValue[];
  onChoose: (value: IntentValue) => void;
}) {
  const current = selected[0];

  return (
    <div>
      <QuestionHeader
        question="What brings you to Suth Performance?"
        helper="Pick one. It decides what we ask you next."
      />

      {/* Side by side from lg. Two reasons, and the second is the better
          one: it halves the height, which is what keeps the button above
          the fold on a short laptop — and it makes the choice read as two
          routes rather than one list of five with the racing answers at
          the top, which is the impression that sent beginners away. */}
      <div className="space-y-6 lg:grid lg:grid-cols-2 lg:gap-x-5 lg:gap-y-0 lg:space-y-0">
        <Group
          title="I'm here to race"
          doors={RACING}
          selected={current}
          onChoose={onChoose}
        />
        <Group
          title="I'm here to get fit"
          doors={FITNESS}
          selected={current}
          onChoose={onChoose}
        />
      </div>
    </div>
  );
}
