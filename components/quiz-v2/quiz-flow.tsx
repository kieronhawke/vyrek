"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  Suspense,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  SCREENS,
  visibleScreens,
  applyProgrammeShortcut,
  type Screen,
} from "@/lib/quiz-flow-v2";
import type { ProgramSlug, RunnaQuizAnswers } from "@/lib/quiz-schema";
import { useRunnaQuiz } from "@/hooks/use-runna-quiz";
import { useHaptics } from "@/hooks/use-haptics";
import { QuizShell, withViewTransition } from "@/components/quiz-v2/quiz-shell";
import { ScreenQuestion } from "@/components/quiz-v2/screen-question";
import { WelcomeCarousel } from "@/components/quiz-v2/welcome-carousel";
import { InterstitialScreen } from "@/components/quiz-v2/interstitial-screen";
import { SingleSelectScreen } from "@/components/quiz-v2/single-select-screen";
import { MultiSelectScreen } from "@/components/quiz-v2/multi-select-screen";
import { CalendarScreen } from "@/components/quiz-v2/calendar-screen";
import { SummaryScreen } from "@/components/quiz-v2/summary-screen";
import {
  EmailGateScreen,
  isValidEmail,
} from "@/components/quiz-v2/email-gate-screen";

function QuizFlowInner() {
  const router = useRouter();
  const params = useSearchParams();
  const { state, hydrated, setAnswer, mergeAnswers, setScreenIndex } =
    useRunnaQuiz();
  const haptic = useHaptics();

  // Apply ?program= entry-point shortcut once on mount.
  const program = params.get("program") as ProgramSlug | null;
  const appliedEntryPointRef = useRef(false);
  useEffect(() => {
    if (!hydrated || !state || !program) return;
    if (appliedEntryPointRef.current) return;
    appliedEntryPointRef.current = true;
    mergeAnswers(applyProgrammeShortcut(state.answers, program));
  }, [hydrated, state, program, mergeAnswers]);

  // `state.answers` is identity-stable per write, so we memo against the
  // reference (not its keys) to keep downstream `useMemo`/`useEffect`
  // dependencies sane.
  const answers = useMemo(
    () => state?.answers ?? {},
    [state?.answers],
  );
  const screens = useMemo(() => visibleScreens(answers), [answers]);

  // Clamp the persisted screen index to the now-visible list. Important
  // because answering an early question can shrink/grow the list.
  const screenIndex = state
    ? Math.max(0, Math.min(state.screenIndex, screens.length - 1))
    : 0;
  const currentScreen: Screen | undefined = screens[screenIndex];

  // Local draft state for inputs that need a Continue button.
  const [multiDraft, setMultiDraft] = useState<string[]>(
    () => (answers.equipment as string[] | undefined) ?? [],
  );
  const [calendarDraft, setCalendarDraft] = useState<Date | undefined>(
    answers.raceDate,
  );
  const [emailDraft, setEmailDraft] = useState<string>("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Re-sync multi-select draft when the current screen changes (e.g. user
  // navigates back and forth). Reading saved answers into local state on
  // navigation is the same canonical pattern as quiz-v1's draft hydration.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (currentScreen?.kind === "multi-select") {
      const id = currentScreen.id;
      const existing = answers[id];
      setMultiDraft(Array.isArray(existing) ? (existing as string[]) : []);
    }
    if (currentScreen?.kind === "calendar") {
      setCalendarDraft(answers.raceDate);
    }
  }, [currentScreen, answers]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const advance = useCallback(() => {
    if (!state) return;
    const nextIndex = Math.min(screenIndex + 1, screens.length - 1);
    withViewTransition(() => setScreenIndex(nextIndex));
  }, [state, screenIndex, screens.length, setScreenIndex]);

  const back = useCallback(() => {
    if (!state) return;
    const prevIndex = Math.max(0, screenIndex - 1);
    withViewTransition(() => setScreenIndex(prevIndex));
  }, [state, screenIndex, setScreenIndex]);

  const handleSingleSelect = useCallback(
    (id: keyof RunnaQuizAnswers, value: string) => {
      // setAnswer accepts the union of all answer field types.
      setAnswer(id, value as never);
      advance();
    },
    [setAnswer, advance],
  );

  const handleMultiContinue = useCallback(() => {
    if (!currentScreen || currentScreen.kind !== "multi-select") return;
    setAnswer(currentScreen.id, multiDraft as never);
    haptic("medium");
    advance();
  }, [currentScreen, multiDraft, setAnswer, haptic, advance]);

  const handleCalendarContinue = useCallback(() => {
    if (!currentScreen || currentScreen.kind !== "calendar") return;
    setAnswer("raceDate", calendarDraft as never);
    haptic("medium");
    advance();
  }, [currentScreen, calendarDraft, setAnswer, haptic, advance]);

  const handleCalendarSkip = useCallback(() => {
    setAnswer("raceDate", undefined as never);
    setCalendarDraft(undefined);
    haptic("light");
    advance();
  }, [setAnswer, haptic, advance]);

  const handleSummaryContinue = useCallback(() => {
    haptic("success");
    advance();
  }, [advance, haptic]);

  const handleEmailSubmit = useCallback(async () => {
    if (!isValidEmail(emailDraft)) {
      setEmailError("Enter a valid email address.");
      return;
    }
    setEmailError(null);
    setSubmitting(true);
    try {
      // /api/email-gate is not implemented yet — fall back silently so the
      // flow still routes to the plan reveal. Real wire-up is a follow-on
      // task per the night-of report.
      await fetch("/api/email-gate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: emailDraft,
          uuid: state?.uuid,
          answers: state?.answers,
        }),
      }).catch(() => {
        // network/route missing is OK in dev — proceed to plan reveal anyway
      });
      haptic("success");
      router.push("/quiz/done");
    } finally {
      setSubmitting(false);
    }
  }, [emailDraft, state, router, haptic]);

  if (!hydrated || !state || !currentScreen) {
    return (
      <main className="flex min-h-svh items-center justify-center bg-vyrek-base">
        <span className="font-mono text-xs uppercase tracking-[0.18em] text-vyrek-text-tertiary">
          One moment.
        </span>
      </main>
    );
  }

  const total = screens.length;
  const oneIndexed = screenIndex + 1;
  const hasAnswers = Object.keys(answers).length > 0;

  // Welcome and interstitials run full-bleed — no shell chrome.
  if (currentScreen.kind === "welcome") {
    return (
      <WelcomeCarousel
        slides={currentScreen.slides}
        skipLabel={currentScreen.skipLabel}
        onAdvance={advance}
      />
    );
  }
  if (currentScreen.kind === "interstitial") {
    return (
      <InterstitialScreen
        image={currentScreen.image}
        headline={currentScreen.headline}
        caption={currentScreen.caption}
        onAdvance={advance}
      />
    );
  }

  // Single-select — auto-advance, no Continue button
  if (currentScreen.kind === "single-select") {
    const id = currentScreen.id;
    const value = answers[id] as string | undefined;
    return (
      <QuizShell
        currentScreen={oneIndexed}
        totalScreens={total}
        onBack={screenIndex > 0 ? back : undefined}
        hasAnswers={hasAnswers}
      >
        <ScreenQuestion
          question={currentScreen.question}
          helper={currentScreen.helper}
        >
          <SingleSelectScreen
            options={currentScreen.options}
            current={value}
            onHaptic={() => haptic("light")}
            onSelect={(v) => handleSingleSelect(id, v)}
          />
        </ScreenQuestion>
      </QuizShell>
    );
  }

  // Multi-select — Continue button enabled once ≥1 chip on
  if (currentScreen.kind === "multi-select") {
    return (
      <QuizShell
        currentScreen={oneIndexed}
        totalScreens={total}
        onBack={screenIndex > 0 ? back : undefined}
        hasAnswers={hasAnswers}
        footer={
          <button
            type="button"
            onClick={handleMultiContinue}
            disabled={multiDraft.length === 0}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-pill bg-vyrek-accent px-6 text-base font-medium tracking-tight text-[#0A0A0A] transition-[background,opacity,transform] duration-fast ease-out hover:bg-vyrek-accent-hover active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
          >
            Continue →
          </button>
        }
      >
        <ScreenQuestion
          question={currentScreen.question}
          helper={currentScreen.helper}
        >
          <MultiSelectScreen
            options={currentScreen.options}
            selected={multiDraft}
            onHaptic={() => haptic("light")}
            onToggle={(v) =>
              setMultiDraft((curr) =>
                curr.includes(v) ? curr.filter((x) => x !== v) : [...curr, v],
              )
            }
          />
        </ScreenQuestion>
      </QuizShell>
    );
  }

  // Calendar — Continue or Skip
  if (currentScreen.kind === "calendar") {
    return (
      <QuizShell
        currentScreen={oneIndexed}
        totalScreens={total}
        onBack={screenIndex > 0 ? back : undefined}
        hasAnswers={hasAnswers}
        footer={
          <div className="flex w-full items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleCalendarSkip}
              className="text-sm text-vyrek-text-secondary underline-offset-4 hover:underline"
            >
              {currentScreen.skipLabel}
            </button>
            <button
              type="button"
              onClick={handleCalendarContinue}
              disabled={!calendarDraft}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-pill bg-vyrek-accent px-6 text-base font-medium tracking-tight text-[#0A0A0A] transition-[background,opacity,transform] duration-fast ease-out hover:bg-vyrek-accent-hover active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Continue →
            </button>
          </div>
        }
      >
        <ScreenQuestion
          question={currentScreen.question}
          helper={currentScreen.helper}
        >
          <CalendarScreen value={calendarDraft} onChange={setCalendarDraft} />
        </ScreenQuestion>
      </QuizShell>
    );
  }

  // Summary — single CTA, no Back-hidden but Skip-less
  if (currentScreen.kind === "summary") {
    return (
      <QuizShell
        currentScreen={oneIndexed}
        totalScreens={total}
        onBack={screenIndex > 0 ? back : undefined}
        hasAnswers={hasAnswers}
        footer={
          <button
            type="button"
            onClick={handleSummaryContinue}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-pill bg-vyrek-accent px-6 text-base font-medium tracking-tight text-[#0A0A0A] transition-[background,opacity,transform] duration-fast ease-out hover:bg-vyrek-accent-hover active:scale-[0.98]"
          >
            See my Week 1 →
          </button>
        }
      >
        <SummaryScreen answers={answers} />
      </QuizShell>
    );
  }

  // Email gate — final screen, submit POSTs to /api/email-gate (best-effort)
  if (currentScreen.kind === "email-gate") {
    return (
      <QuizShell
        currentScreen={oneIndexed}
        totalScreens={total}
        onBack={screenIndex > 0 ? back : undefined}
        hasAnswers={hasAnswers}
        footer={
          <button
            type="button"
            onClick={handleEmailSubmit}
            disabled={submitting || !emailDraft}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-pill bg-vyrek-accent px-6 text-base font-medium tracking-tight text-[#0A0A0A] transition-[background,opacity,transform] duration-fast ease-out hover:bg-vyrek-accent-hover active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
          >
            See my plan →
          </button>
        }
      >
        <EmailGateScreen
          value={emailDraft}
          onChange={setEmailDraft}
          error={emailError}
        />
      </QuizShell>
    );
  }

  // Exhaustiveness — TypeScript narrows this branch out, runtime fall-through
  // would mean a brand-new Screen kind was added without a handler.
  const exhaustive: never = currentScreen;
  void exhaustive;
  return null;
}

export default function QuizFlow() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-svh items-center justify-center bg-vyrek-base">
          <span className="font-mono text-xs uppercase tracking-[0.18em] text-vyrek-text-tertiary">
            One moment.
          </span>
        </main>
      }
    >
      <QuizFlowInner />
    </Suspense>
  );
}

// Re-export for static analysis tools that want the screen count.
export { SCREENS };
