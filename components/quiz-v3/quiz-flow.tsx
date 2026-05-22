"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { QuizShell, withViewTransition } from "@/components/quiz-v3/quiz-shell";
import { ContinueButton } from "@/components/quiz-v3/continue-button";
import { WelcomeCarousel } from "@/components/quiz-v3/welcome-carousel";
import {
  PrimaryIntentScreen,
  applyIntentToggle,
} from "@/components/quiz-v3/screens/primary-intent";
import { ExperienceScreen } from "@/components/quiz-v3/screens/experience";
import { BestTimeScreen } from "@/components/quiz-v3/screens/best-time";
import { ActivityBaselineScreen } from "@/components/quiz-v3/screens/activity-baseline";
import {
  CalibrationScreen,
  isCalibrationValid,
} from "@/components/quiz-v3/screens/calibration";
import { FrequencyScreen } from "@/components/quiz-v3/screens/frequency";
import { SessionLengthScreen } from "@/components/quiz-v3/screens/session-length";
import { LocationScreen } from "@/components/quiz-v3/screens/location";
import { EquipmentScreen } from "@/components/quiz-v3/screens/equipment";
import { PartnerScreen } from "@/components/quiz-v3/screens/partner";
import { InjuriesScreen } from "@/components/quiz-v3/screens/injuries";
import { validateAccountForm } from "@/components/quiz-v3/screens/account-creation";

// Heavy screens that pull in third-party JS (react-day-picker, gsap) — defer
// them so the initial /quiz bundle stays light. Each is reached only after
// the user has spent at least a few seconds on earlier screens, so the
// network fetch overlaps with reading the previous screen.
const RaceDateScreen = dynamic(
  () =>
    import("@/components/quiz-v3/screens/race-date").then((m) => ({
      default: m.RaceDateScreen,
    })),
  { ssr: false },
);

const ReassuranceScreen1 = dynamic(
  () =>
    import("@/components/quiz-v3/screens/reassurance-1").then((m) => ({
      default: m.ReassuranceScreen1,
    })),
  { ssr: false },
);

const ReassuranceScreen2 = dynamic(
  () =>
    import("@/components/quiz-v3/screens/reassurance-2").then((m) => ({
      default: m.ReassuranceScreen2,
    })),
  { ssr: false },
);

const PlanSummaryScreen = dynamic(
  () =>
    import("@/components/quiz-v3/screens/plan-summary").then((m) => ({
      default: m.PlanSummaryScreen,
    })),
  { ssr: false },
);

const AccountCreationScreen = dynamic(
  () =>
    import("@/components/quiz-v3/screens/account-creation").then((m) => ({
      default: m.AccountCreationScreen,
    })),
  { ssr: false },
);

const CalculatingScreen = dynamic(
  () =>
    import("@/components/quiz-v3/screens/calculating").then((m) => ({
      default: m.CalculatingScreen,
    })),
  { ssr: false },
);
import { useQuizStateV3 } from "@/hooks/use-quiz-state-v3";
import { useHaptics } from "@/hooks/use-haptics";
import { capture } from "@/lib/posthog";
import { supabaseBrowser } from "@/lib/supabase/client";
import {
  applyIntentPreSelect,
  applyProgrammeShortcutV3,
  determineProgramme,
  type IntentValue,
  type ProgrammeFromUrl,
  type QuizAnswers,
} from "@/lib/quiz-flow";

type ScreenKind =
  | "welcome"
  | "primary-intent"
  | "reassurance-1"
  | "experience"
  | "best-time"
  | "race-date"
  | "reassurance-2"
  | "activity-baseline"
  | "calibration"
  | "frequency"
  | "session-length"
  | "location"
  | "equipment"
  | "partner"
  | "injuries"
  | "plan-summary"
  | "account-creation"
  | "calculating";

type ScreenDef = {
  kind: ScreenKind;
  showIf?: (a: QuizAnswers) => boolean;
};

const SCREENS: ScreenDef[] = [
  { kind: "welcome" },
  { kind: "primary-intent" },
  { kind: "reassurance-1" },
  { kind: "experience" },
  {
    kind: "best-time",
    showIf: (a) =>
      a.experience === "raced-few" || a.experience === "raced-many",
  },
  { kind: "race-date" },
  { kind: "reassurance-2" },
  { kind: "activity-baseline" },
  { kind: "calibration" },
  { kind: "frequency" },
  { kind: "session-length" },
  { kind: "location" },
  { kind: "equipment", showIf: (a) => a.location === "home" },
  {
    kind: "partner",
    // Skip if intent already declares doubles (already routed).
    showIf: (a) => !(a.intent ?? []).includes("doubles"),
  },
  { kind: "injuries" },
  { kind: "plan-summary" },
  { kind: "account-creation" },
  { kind: "calculating" },
];

function visibleScreens(answers: QuizAnswers): ScreenDef[] {
  return SCREENS.filter((s) => !s.showIf || s.showIf(answers));
}

/**
 * Numeric position of the screen in the *visible question* list (excluding
 * welcome, interstitials, plan-summary, account-creation, calculating).
 * Returns [position, total] where position is 1-indexed for display in
 * the shell counter "[X / Y]".
 */
function questionScreenIndex(
  screens: ScreenDef[],
  currentKind: ScreenKind,
): [number, number] {
  const questionKinds: ScreenKind[] = [
    "primary-intent",
    "experience",
    "best-time",
    "race-date",
    "activity-baseline",
    "calibration",
    "frequency",
    "session-length",
    "location",
    "equipment",
    "partner",
    "injuries",
    "plan-summary",
    "account-creation",
  ];
  const visibleQuestions = screens.filter((s) => questionKinds.includes(s.kind));
  const idx = visibleQuestions.findIndex((s) => s.kind === currentKind);
  return [idx + 1, visibleQuestions.length];
}

function QuizV3Inner() {
  const router = useRouter();
  const params = useSearchParams();
  const haptic = useHaptics();
  const {
    state,
    hydrated,
    setAnswer,
    mergeAnswers,
    setScreenIndex,
  } = useQuizStateV3();

  // URL pre-fill (intent= or program=). Apply once on mount.
  const intentParam = params.get("intent");
  const programParam = params.get("program") as ProgrammeFromUrl | null;
  const appliedPrefillRef = useRef(false);
  useEffect(() => {
    if (!hydrated || !state) return;
    if (appliedPrefillRef.current) return;
    appliedPrefillRef.current = true;

    let next = state.answers;
    if (intentParam) {
      next = applyIntentPreSelect(next, intentParam);
    }
    if (programParam) {
      next = applyProgrammeShortcutV3(next, programParam);
    }
    if (next !== state.answers) {
      mergeAnswers(next);
    }
  }, [hydrated, state, intentParam, programParam, mergeAnswers]);

  const answers = useMemo<QuizAnswers>(
    () => state?.answers ?? { intent: [] },
    [state?.answers],
  );
  const screens = useMemo(() => visibleScreens(answers), [answers]);
  const screenIndex = state
    ? Math.max(0, Math.min(state.screenIndex, screens.length - 1))
    : 0;
  const current = screens[screenIndex];

  // Submit / loading flags for account creation.
  const [creating, setCreating] = useState(false);
  const [accountError, setAccountError] = useState<string | null>(null);

  // Track when the current screen mounted, for `time_on_screen_ms`.
  // Initialised to 0 and seeded in the effect below on first commit — the only
  // readers are event handlers further down, which cannot fire before mount.
  const screenMountTimeRef = useRef<number>(0);
  useEffect(() => {
    screenMountTimeRef.current = Date.now();
  }, [current?.kind]);

  // Email + password local drafts for account screen.
  const [emailDraft, setEmailDraft] = useState("");
  const [passwordDraft, setPasswordDraft] = useState("");
  const [marketingDraft, setMarketingDraft] = useState(false);

  // Fire screen_viewed event on every screen change.
  useEffect(() => {
    if (!hydrated || !state || !current) return;
    const [pos, total] = questionScreenIndex(screens, current.kind);
    capture("quiz_screen_viewed", {
      screen_id: current.kind,
      screen_number: pos,
      total_screens: total,
      programme_path: determineProgramme(state.answers),
      user_uuid: state.uuid,
      is_resumed: state.resumed,
      timestamp: Date.now(),
    });
  }, [current?.kind, hydrated, state?.uuid]); // eslint-disable-line react-hooks/exhaustive-deps

  // Abandonment listeners (beforeunload + visibilitychange).
  useEffect(() => {
    if (!state || !current) return;
    if (current.kind === "calculating") return; // user completed

    const fire = (method: "tab_closed" | "navigated_away") => {
      const [pos, total] = questionScreenIndex(screens, current.kind);
      capture("quiz_abandoned", {
        screen_id: current.kind,
        screen_number: pos,
        total_screens: total,
        time_on_screen_ms: Date.now() - screenMountTimeRef.current,
        user_uuid: state.uuid,
        abandonment_method: method,
      });
    };

    const onVis = () => {
      if (document.visibilityState === "hidden") fire("navigated_away");
    };
    const onUnload = () => fire("tab_closed");
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("beforeunload", onUnload);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("beforeunload", onUnload);
    };
  }, [state, current, screens]);

  const advance = useCallback(() => {
    if (!state) return;
    const nextIdx = Math.min(screenIndex + 1, screens.length - 1);
    withViewTransition(() => setScreenIndex(nextIdx));
  }, [state, screenIndex, screens.length, setScreenIndex]);

  const back = useCallback(() => {
    if (!state) return;
    const prevIdx = Math.max(0, screenIndex - 1);
    haptic("light");
    capture("quiz_screen_back", {
      screen_id: current?.kind,
      user_uuid: state.uuid,
    });
    withViewTransition(() => setScreenIndex(prevIdx));
  }, [state, screenIndex, setScreenIndex, haptic, current?.kind]);

  const captureAnswered = useCallback(
    (answer: unknown) => {
      if (!state || !current) return;
      const [pos, total] = questionScreenIndex(screens, current.kind);
      capture("quiz_screen_answered", {
        screen_id: current.kind,
        screen_number: pos,
        answer,
        time_on_screen_ms: Date.now() - screenMountTimeRef.current,
        total_screens: total,
        user_uuid: state.uuid,
      });
    },
    [state, current, screens],
  );

  const continueWithHaptic = useCallback(
    (answer: unknown) => {
      haptic("medium");
      captureAnswered(answer);
      advance();
    },
    [haptic, captureAnswered, advance],
  );

  const onSubmitAccount = useCallback(async () => {
    if (!state) return;
    const validation = validateAccountForm(emailDraft, passwordDraft);
    if (!validation.ok) {
      setAccountError(validation.error);
      haptic("warning");
      return;
    }
    setAccountError(null);
    setCreating(true);
    haptic("medium");

    try {
      // 1. Create the Supabase Auth user from the browser.
      const supabase = supabaseBrowser();
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: emailDraft.trim().toLowerCase(),
        password: passwordDraft,
      });

      if (authError) {
        const msg = authError.message ?? "";
        if (
          msg.toLowerCase().includes("already") ||
          msg.toLowerCase().includes("registered")
        ) {
          setAccountError(
            "An account already exists with this email. Log in instead.",
          );
        } else {
          setAccountError(msg || "Couldn't save. Try again in a moment.");
        }
        setCreating(false);
        haptic("warning");
        return;
      }

      const authUserId = authData.user?.id;
      if (!authUserId) {
        setAccountError("Couldn't save. Try again in a moment.");
        setCreating(false);
        return;
      }

      // 2. Persist customer + quiz response via the server endpoint.
      const res = await fetch("/api/account/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          authUserId,
          email: emailDraft.trim().toLowerCase(),
          marketingOptIn: marketingDraft,
          quizState: {
            uuid: state.uuid,
            answers: {
              ...state.answers,
              raceDate:
                state.answers.raceDate instanceof Date
                  ? state.answers.raceDate.toISOString()
                  : state.answers.raceDate,
            },
          },
        }),
      });

      if (!res.ok) {
        const detail = await res.text().catch(() => "");
        // Don't block the funnel — the auth user already exists and the
        // quiz state is in localStorage. Log + advance.
         
        console.error("[account/create] failed", res.status, detail);
      }

      capture("quiz_completed", {
        programme: determineProgramme(state.answers),
        total_time_ms: Date.now() - new Date(state.startedAt).getTime(),
        screens_seen: screens.length,
        user_uuid: state.uuid,
        has_race_date: !!state.answers.raceDate,
        has_injury: state.answers.injuries && state.answers.injuries !== "none",
        partner: state.answers.partner,
      });
      capture("account_created", {
        user_uuid: state.uuid,
        email_marketing_opt_in: marketingDraft,
        programme: determineProgramme(state.answers),
      });

      haptic("success");
      // Advance to calculating cinematic
      advance();
    } catch (err) {
       
      console.error("[account/create] threw", err);
      setAccountError("Couldn't save. Try again in a moment.");
      haptic("error");
    } finally {
      setCreating(false);
    }
  }, [
    state,
    emailDraft,
    passwordDraft,
    marketingDraft,
    haptic,
    advance,
    screens.length,
  ]);

  if (!hydrated || !state || !current) {
    return (
      <main className="flex min-h-svh items-center justify-center bg-vyrek-base">
        <span className="font-mono text-xs uppercase tracking-[0.18em] text-vyrek-text-tertiary">
          One moment.
        </span>
      </main>
    );
  }

  const hasAnswers = Object.keys(state.answers).some((k) => {
    const v = state.answers[k as keyof QuizAnswers];
    if (Array.isArray(v)) return v.length > 0;
    return v !== undefined && v !== null;
  });
  const [pos, total] = questionScreenIndex(screens, current.kind);

  // ── Full-bleed screens (no shell)
  if (current.kind === "welcome") {
    return <WelcomeCarousel onAdvance={advance} />;
  }
  if (current.kind === "reassurance-1") {
    return <ReassuranceScreen1 onContinue={advance} />;
  }
  if (current.kind === "reassurance-2") {
    return <ReassuranceScreen2 onContinue={advance} />;
  }
  if (current.kind === "calculating") {
    return <CalculatingScreen answers={state.answers} />;
  }

  // ── Question screens (in shell)
  const backHandler = screenIndex > 0 ? back : undefined;

  if (current.kind === "primary-intent") {
    const intent = state.answers.intent ?? [];
    return (
      <QuizShell
        currentScreen={pos}
        totalScreens={total}
        onBack={backHandler}
        hasAnswers={hasAnswers}
        footer={
          <ContinueButton
            disabled={intent.length === 0}
            onClick={() => continueWithHaptic(intent)}
          />
        }
      >
        <PrimaryIntentScreen
          selected={intent}
          onToggle={(v: IntentValue) => {
            haptic("light");
            setAnswer("intent", (curr) =>
              applyIntentToggle(curr ?? [], v),
            );
          }}
        />
      </QuizShell>
    );
  }

  if (current.kind === "experience") {
    const value = state.answers.experience;
    return (
      <QuizShell
        currentScreen={pos}
        totalScreens={total}
        onBack={backHandler}
        hasAnswers={hasAnswers}
        footer={
          <ContinueButton
            disabled={!value}
            onClick={() => continueWithHaptic(value)}
          />
        }
      >
        <ExperienceScreen
          value={value}
          onChange={(v) => {
            haptic("light");
            setAnswer("experience", v);
          }}
        />
      </QuizShell>
    );
  }

  if (current.kind === "best-time") {
    const value = state.answers.bestTime;
    return (
      <QuizShell
        currentScreen={pos}
        totalScreens={total}
        onBack={backHandler}
        hasAnswers={hasAnswers}
        footer={
          <ContinueButton
            disabled={!value}
            onClick={() => continueWithHaptic(value)}
          />
        }
      >
        <BestTimeScreen
          value={value}
          onChange={(v) => {
            haptic("light");
            setAnswer("bestTime", v);
          }}
        />
      </QuizShell>
    );
  }

  if (current.kind === "race-date") {
    const value = state.answers.raceDate;
    return (
      <QuizShell
        currentScreen={pos}
        totalScreens={total}
        onBack={backHandler}
        hasAnswers={hasAnswers}
        footer={
          <div className="flex w-full items-center gap-3">
            <button
              type="button"
              onClick={() => {
                setAnswer("raceDate", undefined);
                continueWithHaptic(null);
              }}
              className="text-sm text-vyrek-text-secondary underline-offset-4 hover:underline"
            >
              No race booked →
            </button>
            <div className="ml-auto flex-1">
              <ContinueButton
                disabled={!value}
                onClick={() => continueWithHaptic(value?.toISOString())}
              />
            </div>
          </div>
        }
      >
        <RaceDateScreen
          value={value}
          onChange={(v) => {
            haptic("light");
            setAnswer("raceDate", v);
          }}
        />
      </QuizShell>
    );
  }

  if (current.kind === "activity-baseline") {
    const value = state.answers.activity;
    return (
      <QuizShell
        currentScreen={pos}
        totalScreens={total}
        onBack={backHandler}
        hasAnswers={hasAnswers}
        footer={
          <ContinueButton
            disabled={!value}
            onClick={() => continueWithHaptic(value)}
          />
        }
      >
        <ActivityBaselineScreen
          value={value}
          onChange={(v) => {
            haptic("light");
            setAnswer("activity", v);
          }}
        />
      </QuizShell>
    );
  }

  if (current.kind === "calibration") {
    const sex = state.answers.sex;
    const weight = state.answers.weight;
    const unit = state.answers.weightUnit ?? "kg";
    const valid = isCalibrationValid({ sex, weightKg: weight });
    return (
      <QuizShell
        currentScreen={pos}
        totalScreens={total}
        onBack={backHandler}
        hasAnswers={hasAnswers}
        footer={
          <ContinueButton
            disabled={!valid}
            onClick={() => continueWithHaptic({ sex, weight, unit })}
          />
        }
      >
        <CalibrationScreen
          sex={sex}
          weightKg={weight}
          unit={unit}
          onSexChange={(v) => {
            haptic("light");
            setAnswer("sex", v);
          }}
          onWeightChange={(kg) => setAnswer("weight", kg)}
          onUnitChange={(u) => {
            haptic("light");
            setAnswer("weightUnit", u);
            // If we don't have weight yet, also set a sensible default
            if (state.answers.weight === undefined) {
              setAnswer("weight", 75);
            }
          }}
        />
      </QuizShell>
    );
  }

  if (current.kind === "frequency") {
    const value = state.answers.days;
    return (
      <QuizShell
        currentScreen={pos}
        totalScreens={total}
        onBack={backHandler}
        hasAnswers={hasAnswers}
        footer={
          <ContinueButton
            disabled={!value}
            onClick={() => continueWithHaptic(value)}
          />
        }
      >
        <FrequencyScreen
          value={value}
          onChange={(v) => {
            haptic("light");
            setAnswer("days", v);
          }}
        />
      </QuizShell>
    );
  }

  if (current.kind === "session-length") {
    const value = state.answers.sessionLength;
    return (
      <QuizShell
        currentScreen={pos}
        totalScreens={total}
        onBack={backHandler}
        hasAnswers={hasAnswers}
        footer={
          <ContinueButton
            disabled={!value}
            onClick={() => continueWithHaptic(value)}
          />
        }
      >
        <SessionLengthScreen
          value={value}
          onChange={(v) => {
            haptic("light");
            setAnswer("sessionLength", v);
          }}
        />
      </QuizShell>
    );
  }

  if (current.kind === "location") {
    const value = state.answers.location;
    return (
      <QuizShell
        currentScreen={pos}
        totalScreens={total}
        onBack={backHandler}
        hasAnswers={hasAnswers}
        footer={
          <ContinueButton
            disabled={!value}
            onClick={() => continueWithHaptic(value)}
          />
        }
      >
        <LocationScreen
          value={value}
          onChange={(v) => {
            haptic("light");
            setAnswer("location", v);
          }}
        />
      </QuizShell>
    );
  }

  if (current.kind === "equipment") {
    const selected = state.answers.equipment ?? [];
    return (
      <QuizShell
        currentScreen={pos}
        totalScreens={total}
        onBack={backHandler}
        hasAnswers={hasAnswers}
        footer={
          <ContinueButton
            disabled={selected.length === 0}
            onClick={() => continueWithHaptic(selected)}
          />
        }
      >
        <EquipmentScreen
          selected={selected}
          onToggle={(v) => {
            haptic("light");
            setAnswer("equipment", (curr) => {
              const arr = curr ?? [];
              return arr.includes(v)
                ? arr.filter((x) => x !== v)
                : [...arr, v];
            });
          }}
        />
      </QuizShell>
    );
  }

  if (current.kind === "partner") {
    const value = state.answers.partner;
    return (
      <QuizShell
        currentScreen={pos}
        totalScreens={total}
        onBack={backHandler}
        hasAnswers={hasAnswers}
        footer={
          <ContinueButton
            disabled={!value}
            onClick={() => continueWithHaptic(value)}
          />
        }
      >
        <PartnerScreen
          value={value}
          onChange={(v) => {
            haptic("light");
            setAnswer("partner", v);
          }}
        />
      </QuizShell>
    );
  }

  if (current.kind === "injuries") {
    const value = state.answers.injuries;
    return (
      <QuizShell
        currentScreen={pos}
        totalScreens={total}
        onBack={backHandler}
        hasAnswers={hasAnswers}
        footer={
          <ContinueButton
            disabled={!value}
            onClick={() => continueWithHaptic(value)}
          />
        }
      >
        <InjuriesScreen
          value={value}
          onChange={(v) => {
            haptic("light");
            setAnswer("injuries", v);
          }}
        />
      </QuizShell>
    );
  }

  if (current.kind === "plan-summary") {
    return (
      <QuizShell
        currentScreen={pos}
        totalScreens={total}
        onBack={backHandler}
        hasAnswers={hasAnswers}
        footer={
          <ContinueButton
            label="Save my plan →"
            onClick={() => {
              capture("quiz_summary_continued", {
                time_on_summary_ms:
                  Date.now() - screenMountTimeRef.current,
                user_uuid: state.uuid,
              });
              haptic("success");
              advance();
            }}
          />
        }
      >
        <PlanSummaryScreen answers={state.answers} />
      </QuizShell>
    );
  }

  if (current.kind === "account-creation") {
    return (
      <QuizShell
        currentScreen={pos}
        totalScreens={total}
        onBack={backHandler}
        hasAnswers={hasAnswers}
        footer={
          <ContinueButton
            label="See my plan →"
            loading={creating}
            disabled={creating || !emailDraft || passwordDraft.length < 8}
            onClick={onSubmitAccount}
          />
        }
      >
        <AccountCreationScreen
          email={emailDraft}
          password={passwordDraft}
          marketingOptIn={marketingDraft}
          error={accountError}
          onEmailChange={(v) => {
            setEmailDraft(v);
            if (accountError) setAccountError(null);
          }}
          onPasswordChange={(v) => {
            setPasswordDraft(v);
            if (accountError) setAccountError(null);
          }}
          onMarketingChange={setMarketingDraft}
        />
      </QuizShell>
    );
  }

  // Exhaustiveness — TypeScript should have narrowed everything above.
  // If we reach here, a new kind was added without a handler.
   
  console.error("[quiz-v3] unhandled screen kind", current.kind);
  // Avoid blank screen
  router.push("/");
  return null;
}

export default function QuizV3() {
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
      <QuizV3Inner />
    </Suspense>
  );
}
