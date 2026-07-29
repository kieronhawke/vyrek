"use client";

import { OptionCard } from "@/components/quiz-v3/option-card";
import { QuestionHeader } from "@/components/quiz-v3/question-header";
import { cn } from "@/lib/utils";
import {
  INJURY_CARE_LABEL,
  INJURY_RECENCY_LABEL,
  INJURY_TRIGGER_OPTIONS,
  type InjuryCareValue,
  type InjuryRecencyValue,
  type InjuryValue,
} from "@/lib/quiz-flow";

const INJURY_NAME: Partial<Record<InjuryValue, string>> = {
  "lower-back": "lower back",
  knee: "knee",
  shoulder: "shoulder",
  "achilles-calf": "achilles or calf",
};

const RECENCY_ORDER: InjuryRecencyValue[] = ["current", "recent", "past"];
const CARE_ORDER: InjuryCareValue[] = ["physio", "self-managed", "not-assessed"];

function GroupLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-3 mt-8 font-mono text-[11px] uppercase tracking-[0.22em] text-suth-text-tertiary first:mt-0">
      {children}
    </p>
  );
}

export function InjuryDetailScreen({
  injury,
  recency,
  triggers,
  care,
  onRecency,
  onToggleTrigger,
  onCare,
}: {
  injury: InjuryValue;
  recency: InjuryRecencyValue | undefined;
  triggers: string[];
  care: InjuryCareValue | undefined;
  onRecency: (v: InjuryRecencyValue) => void;
  onToggleTrigger: (v: string) => void;
  onCare: (v: InjuryCareValue) => void;
}) {
  const name = INJURY_NAME[injury] ?? "injury";
  const triggerOptions = INJURY_TRIGGER_OPTIONS[injury] ?? [];

  return (
    <div>
      <QuestionHeader
        question={`Tell us about your ${name}.`}
        helper="A clearer picture means safer swaps and smarter loading, not a watered-down plan."
      />

      <GroupLabel>How is it right now?</GroupLabel>
      <ul role="list" className="space-y-3">
        {RECENCY_ORDER.map((v) => (
          <li key={v}>
            <OptionCard
              label={INJURY_RECENCY_LABEL[v]}
              selected={recency === v}
              onClick={() => onRecency(v)}
            />
          </li>
        ))}
      </ul>

      <GroupLabel>What tends to aggravate it? Pick any.</GroupLabel>
      <ul role="list" className="flex flex-wrap gap-2.5">
        {triggerOptions.map((opt) => {
          const on = triggers.includes(opt.value);
          return (
            <li key={opt.value}>
              <button
                type="button"
                onClick={() => onToggleTrigger(opt.value)}
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

      <GroupLabel>Anyone helping you with it?</GroupLabel>
      <ul role="list" className="space-y-3">
        {CARE_ORDER.map((v) => (
          <li key={v}>
            <OptionCard
              label={INJURY_CARE_LABEL[v]}
              selected={care === v}
              onClick={() => onCare(v)}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
