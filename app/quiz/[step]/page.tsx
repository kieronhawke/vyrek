"use client";

import { useRouter } from "next/navigation";
import { use, useEffect, useMemo, useState } from "react";
import { QuestionShell } from "@/components/quiz/question-shell";
import { OptionCard } from "@/components/quiz/option-card";
import { SliderInput } from "@/components/quiz/slider-input";
import { MultiSelectList } from "@/components/quiz/multi-select-list";
import { useQuizState } from "@/hooks/use-quiz-state";
import { useHaptics } from "@/hooks/use-haptics";
import {
  matchProgramme,
  visibleQuestions,
  QUIZ_QUESTIONS,
  type QuizQuestion,
} from "@/lib/quiz-schema";

const PROGRAMME_LABEL: Record<string, string> = {
  "first-race": "First Race",
  "sub-90": "Sub-90",
  doubles: "Doubles",
  pro: "Pro",
};

export default function QuizStep({
  params,
}: {
  params: Promise<{ step: string }>;
}) {
  const { step } = use(params);
  const router = useRouter();
  const { state, hydrated, setAnswer } = useQuizState();
  const haptic = useHaptics();

  // Local draft so the user can pick/unpick without writing to storage on
  // every toggle. Committed when they hit Next.
  const [draft, setDraft] = useState<string | string[] | number | null>(null);

  const question = useMemo<QuizQuestion | undefined>(
    () => QUIZ_QUESTIONS.find((q) => q.id === step),
    [step],
  );

  // Visible questions calculated with the current saved state PLUS the
  // in-flight draft, so picking an answer that unlocks a conditional
  // question (e.g. experience=raced → finish-time) routes there next.
  const visible = useMemo(() => {
    if (!state) return [];
    const merged =
      draft === null || draft === undefined
        ? state.answers
        : { ...state.answers, [step]: draft };
    return visibleQuestions(merged);
  }, [state, draft, step]);
  const currentIndex = visible.findIndex((q) => q.id === step);

  // Hydrate the draft from saved answers when the step or state changes.
  // Synchronising React state with the saved-answers store on navigation
  // between quiz steps — the canonical place for this kind of cross-route
  // state restore is an effect, even though the ESLint rule frowns at it.
  useEffect(() => {
    if (!state || !question) return;
    const saved = state.answers[question.id];
    /* eslint-disable react-hooks/set-state-in-effect */
    if (saved !== undefined) {
      setDraft(saved);
    } else if (question.type === "slider") {
      setDraft(question.default);
    } else if (question.type === "multi-select") {
      setDraft([]);
    } else {
      setDraft(null);
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [state, question]);

  // Bounce to intro if the step doesn't exist or isn't visible for this state.
  useEffect(() => {
    if (!hydrated || !state) return;
    if (!question) {
      router.replace("/quiz");
      return;
    }
    if (question.showIf && !question.showIf(state.answers)) {
      router.replace("/quiz");
    }
  }, [hydrated, state, question, router]);

  if (!hydrated || !state || !question || draft === undefined) {
    return (
      <main className="flex min-h-svh items-center justify-center">
        <span className="font-mono text-xs uppercase tracking-[0.18em] text-vyrek-text-tertiary">
          One moment.
        </span>
      </main>
    );
  }

  const totalSteps = visible.length;
  const stepNumber = currentIndex + 1;

  const prevStep = visible[currentIndex - 1];
  const nextStep = visible[currentIndex + 1];
  const isLast = currentIndex === totalSteps - 1;

  const onNext = () => {
    if (draft === null && !question.optional) return;
    setAnswer(question.id, draft);
    haptic("medium");
    if (isLast) {
      router.push("/quiz/done");
    } else if (nextStep) {
      router.push(`/quiz/${nextStep.id}`);
    }
  };

  const canAdvance =
    question.optional ||
    (question.type === "multi-select"
      ? Array.isArray(draft) && draft.length > 0
      : draft !== null && draft !== "");

  const preview =
    PROGRAMME_LABEL[
      matchProgramme({ ...state.answers, [question.id]: draft ?? null })
    ];

  return (
    <QuestionShell
      current={stepNumber}
      total={totalSteps}
      question={question.question}
      helper={question.helper}
      preview={currentIndex >= 1 ? preview : undefined}
      backHref={prevStep ? `/quiz/${prevStep.id}` : "/quiz"}
      hasAnswers={Object.keys(state.answers).length > 0}
      onNext={onNext}
      nextDisabled={!canAdvance}
      nextLabel={isLast ? "See plan →" : "Next →"}
    >
      {question.type === "single-select" && (
        <ul role="list" className="space-y-3">
          {question.options.map((opt) => (
            <li key={opt.value}>
              <OptionCard
                label={opt.label}
                selected={draft === opt.value}
                onSelect={() => {
                  haptic("light");
                  setDraft(opt.value);
                }}
              />
            </li>
          ))}
        </ul>
      )}

      {question.type === "multi-select" && (
        <MultiSelectList
          options={question.options}
          selected={Array.isArray(draft) ? draft : []}
          onToggle={(value) => {
            haptic("light");
            setDraft((current) => {
              const arr = Array.isArray(current) ? current : [];
              return arr.includes(value)
                ? arr.filter((v) => v !== value)
                : [...arr, value];
            });
          }}
        />
      )}

      {question.type === "slider" && (
        <SliderInput
          value={typeof draft === "number" ? draft : question.default}
          onChange={(v) => setDraft(v)}
          min={question.min}
          max={question.max}
          labels={question.labels}
        />
      )}

      {question.type === "date" && (
        <div className="space-y-4">
          <input
            type="date"
            value={typeof draft === "string" ? draft : ""}
            onChange={(e) => setDraft(e.target.value)}
            className="h-14 w-full rounded-md border border-vyrek-border bg-vyrek-elevated px-4 text-base text-vyrek-text outline-none focus:border-vyrek-accent"
          />
          <button
            type="button"
            onClick={() => {
              setDraft(null);
              setAnswer(question.id, null);
              haptic("medium");
              router.push("/quiz/done");
            }}
            className="block w-full text-sm text-vyrek-text-secondary underline-offset-4 hover:underline"
          >
            No race booked — skip
          </button>
        </div>
      )}
    </QuestionShell>
  );
}
