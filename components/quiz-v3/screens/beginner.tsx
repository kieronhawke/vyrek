"use client";

import { OptionCard } from "@/components/quiz-v3/option-card";
import { QuestionHeader } from "@/components/quiz-v3/question-header";
import { cn } from "@/lib/utils";
import type {
  BarrierValue,
  GoalValue,
  ReadinessValue,
  StartingPointValue,
  TriedBeforeValue,
} from "@/lib/quiz-flow";

/**
 * Beginner-rail question screens (Flow A).
 *
 * Kept in one module because they share a single job: get someone who has
 * never heard of HYROX from "I want to get fit" to a plan, without ever
 * making them feel behind. Tone rules from the spec, and they are load
 * bearing rather than decorative:
 *
 *  - no jargon, no body-shaming, no HYROX at all on this rail
 *  - every option is a respectable answer, including the least active one
 *  - the copy assumes past attempts failed because of programming, not
 *    because of the person
 *
 * The athlete rail (Flow B) keeps the existing race/experience screens.
 *
 * Spec: docs/onboarding-funnel-proposal.md section 5.1.
 */

/* ─── Goal ──────────────────────────────────────────────────────────── */

const GOALS: Array<{ value: GoalValue; label: string; detail: string }> = [
  {
    value: "lose-weight",
    label: "Lose weight",
    detail: "Steadily, in a way that holds once you stop thinking about it.",
  },
  {
    value: "get-stronger",
    label: "Feel stronger",
    detail: "Lift what you want to lift. Carry the shopping without thinking.",
  },
  {
    value: "more-energy",
    label: "Have more energy",
    detail: "Get through the day without hitting a wall at four o'clock.",
  },
  {
    value: "confidence",
    label: "Feel like myself again",
    detail: "Confidence in your own body, back where it used to be.",
  },
  {
    value: "family-health",
    label: "Be healthy for my family",
    detail: "Keep up with them now, and still be here later.",
  },
];

export function GoalScreen({
  value,
  onChange,
}: {
  value: GoalValue | undefined;
  onChange: (v: GoalValue) => void;
}) {
  return (
    <div>
      <QuestionHeader
        question="What matters most right now?"
        helper="Pick the one that would mean the most to you."
      />
      <ul role="list" className="space-y-3 lg:space-y-2.5">
        {GOALS.map((opt) => (
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
    </div>
  );
}

/* ─── Starting point ────────────────────────────────────────────────── */

const STARTING_POINTS: Array<{
  value: StartingPointValue;
  label: string;
  detail: string;
}> = [
  {
    value: "years-off",
    label: "I haven't trained in years",
    detail: "Completely fine. This is who the beginner plan is built for.",
  },
  {
    value: "bit-active",
    label: "I'm a bit active",
    detail: "Walks, the odd class, nothing regular.",
  },
  {
    value: "no-structure",
    label: "I train, but with no structure",
    detail: "You turn up. You just aren't sure it's adding up to anything.",
  },
  {
    value: "was-fit-once",
    label: "I was fit once and want it back",
    detail: "You know what good felt like. We'll work back towards it.",
  },
];

export function StartingPointScreen({
  value,
  onChange,
}: {
  value: StartingPointValue | undefined;
  onChange: (v: StartingPointValue) => void;
}) {
  return (
    <div>
      <QuestionHeader
        question="Where are you starting from?"
        helper="Be honest. It only changes where week one begins."
      />
      <ul role="list" className="space-y-3 lg:space-y-2.5">
        {STARTING_POINTS.map((opt) => (
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
    </div>
  );
}

/* ─── Tried before ──────────────────────────────────────────────────── */

const TRIED_BEFORE: Array<{
  value: TriedBeforeValue;
  label: string;
  detail: string;
}> = [
  {
    value: "several",
    label: "Several times",
    detail: "Started, stopped, started again.",
  },
  { value: "once-twice", label: "Once or twice", detail: "It didn't stick." },
  {
    value: "first-go",
    label: "This is my first real go",
    detail: "Nothing to undo. That's an advantage.",
  },
];

export function TriedBeforeScreen({
  value,
  onChange,
}: {
  value: TriedBeforeValue | undefined;
  onChange: (v: TriedBeforeValue) => void;
}) {
  return (
    <div>
      <QuestionHeader
        question="Have you tried to get fit before?"
        helper="No judgement here. Most people have, and it matters for how we build this."
      />
      <ul role="list" className="space-y-3 lg:space-y-2.5">
        {TRIED_BEFORE.map((opt) => (
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
    </div>
  );
}

/* ─── Barriers ──────────────────────────────────────────────────────── */

const BARRIERS: Array<{ value: BarrierValue; label: string }> = [
  { value: "time", label: "Time" },
  { value: "didnt-know-what", label: "Not knowing what to do" },
  { value: "boredom", label: "Boredom" },
  { value: "gyms-intimidate", label: "Gyms feel intimidating" },
  { value: "injury", label: "An injury or a niggle" },
  { value: "doing-it-alone", label: "Doing it on my own" },
];

export function BarriersScreen({
  selected,
  onToggle,
}: {
  selected: BarrierValue[];
  onToggle: (v: BarrierValue) => void;
}) {
  return (
    <div>
      <QuestionHeader
        question="What's got in the way before?"
        helper="Pick as many as apply. We plan around these rather than hoping they go away."
      />
      <ul role="list" className="flex flex-wrap gap-2.5">
        {BARRIERS.map((opt) => {
          const on = selected.includes(opt.value);
          return (
            <li key={opt.value}>
              <button
                type="button"
                onClick={() => onToggle(opt.value)}
                aria-pressed={on}
                className={cn(
                  "inline-flex h-11 items-center justify-center rounded-pill border px-4 text-sm font-medium transition-[border,background,transform] duration-fast ease-out active:scale-[0.97]",
                  on
                    ? "border-suth-accent bg-suth-accent text-[#0A0A0A]"
                    : "border-suth-border bg-suth-elevated text-suth-text hover:border-suth-border-strong",
                )}
              >
                {opt.label}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* ─── Readiness (coached route only) ────────────────────────────────── */

const READINESS: Array<{
  value: ReadinessValue;
  label: string;
  detail: string;
}> = [
  {
    value: "this-week",
    label: "This week",
    detail: "Ready to go. Ben will prioritise your call.",
  },
  {
    value: "this-month",
    label: "Sometime this month",
    detail: "Plenty of time to get set up properly.",
  },
  {
    value: "just-looking",
    label: "I'm just looking for now",
    detail: "Completely fine. We'll send the plan and leave you to it.",
  },
];

/**
 * Asked only of people heading down the coached route. It is the single
 * most useful thing Ben can know before he rings, and "just looking" is a
 * real answer that moves someone to the club rather than into his diary.
 */
export function ReadinessScreen({
  value,
  onChange,
}: {
  value: ReadinessValue | undefined;
  onChange: (v: ReadinessValue) => void;
}) {
  return (
    <div>
      <QuestionHeader
        question="When could you realistically start?"
        helper="So Ben knows whether to ring you this week or leave you be."
      />
      <ul role="list" className="space-y-3 lg:space-y-2.5">
        {READINESS.map((opt) => (
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
    </div>
  );
}
