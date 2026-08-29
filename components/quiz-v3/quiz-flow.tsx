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
import { QuizCopyProvider, ScreenCopyScope } from "@/components/quiz-v3/copy-context";
import { ContinueButton } from "@/components/quiz-v3/continue-button";
import { PrimaryIntentScreen } from "@/components/quiz-v3/screens/primary-intent";
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
import { InjuryDetailScreen } from "@/components/quiz-v3/screens/injury-detail";
import { SupportPreferenceScreen } from "@/components/quiz-v3/screens/support-preference";
import {
  ContactCaptureScreen,
  isContactValid,
} from "@/components/quiz-v3/screens/contact-capture";
import { validateAccountForm } from "@/components/quiz-v3/screens/account-creation";
import {
  BarriersScreen,
  GoalScreen,
  ReadinessScreen,
  StartingPointScreen,
  TriedBeforeScreen,
} from "@/components/quiz-v3/screens/beginner";

// Heavy screens that pull in third-party JS (react-day-picker, gsap), defer
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

const MeetBenScreen = dynamic(
  () =>
    import("@/components/quiz-v3/screens/meet-ben").then((m) => ({
      default: m.MeetBenScreen,
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
  applyIntent,
  applyIntentPreSelect,
  applyProgrammeShortcutV3,
  applyRailPreSelect,
  applySupportPreSelect,
  determineProgramme,
  injuryNeedsDetail,
  INJURY_LABEL,
  isBeginnerRail,
  type BarrierValue,
  type IntentValue,
  type ProgrammeFromUrl,
  type QuizAnswers,
} from "@/lib/quiz-flow";
import { sift } from "@/lib/quiz-sift";
import { leadBrief } from "@/lib/lead-brief";
import {
  BookSlotScreen,
  BookedScreen,
} from "@/components/quiz-v3/screens/book-slot";
import { DEFAULT_ISO } from "@/lib/dial-codes";

type ScreenKind =
  | "primary-intent"
  | "goal"
  | "starting-point"
  | "tried-before"
  | "barriers"
  | "readiness"
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
  | "email-capture"
  | "injuries"
  | "injury-detail"
  | "support-preference"
  | "meet-ben"
  | "plan-summary"
  | "account-creation"
  | "calculating"
  | "book-slot"
  | "booked";

type ScreenDef = {
  kind: ScreenKind;
  showIf?: (a: QuizAnswers) => boolean;
};

const SCREENS: ScreenDef[] = [
  /* THE CAROUSEL IS GONE.
     It held two full-bleed slides on a 3.2-second timer, so somebody who
     clicked "free fitness assessment" waited six seconds, watching an
     animation, before being asked anything. It was the only auto-advancing
     screen in the funnel and the only one that took time away rather than
     giving something back. The quiz now opens on the question — which is
     the screen that actually earns their attention. */
  // Skipped when the entry surface already told us the rail, so a visitor
  // from a personal-training page isn't asked what brought them here.
  { kind: "primary-intent", showIf: (a) => !a.railLocked },
  // Skipped when screen one already pinned the goal ("losing weight and
  // getting stronger"), so nobody is asked what they want immediately
  // after telling us. Keyed on the intent rather than on `goal` itself:
  // `goal` is what this screen sets, so testing it would make the screen
  // vanish as it was answered.
  {
    kind: "goal",
    showIf: (a) => isBeginnerRail(a) && a.intent?.[0] !== "lose-weight",
  },
  { kind: "starting-point", showIf: isBeginnerRail },
  { kind: "reassurance-1" },
  { kind: "tried-before", showIf: isBeginnerRail },
  // The race and calibration questions are meaningless to someone who has
  // never heard of HYROX, which is exactly what the old single-flow quiz
  // asked them at screen two.
  { kind: "experience", showIf: (a) => !isBeginnerRail(a) },
  {
    kind: "best-time",
    showIf: (a) =>
      !isBeginnerRail(a) &&
      (a.experience === "raced-few" || a.experience === "raced-many"),
  },
  { kind: "race-date", showIf: (a) => !isBeginnerRail(a) },
  { kind: "reassurance-2" },
  // Email lands straight after the value interstitial and before the long
  // tail of logistics questions, so the ~60% who leave later are still
  // reachable by the abandonment sequence.
  { kind: "email-capture" },
  { kind: "barriers", showIf: isBeginnerRail },
  { kind: "activity-baseline", showIf: (a) => !isBeginnerRail(a) },
  // Calibration is framed around sled, wall ball and farmers carry weights.
  // Beginner rail skips it rather than ask a question it can't parse.
  { kind: "calibration", showIf: (a) => !isBeginnerRail(a) },
  { kind: "frequency" },
  { kind: "session-length" },
  { kind: "location" },
  { kind: "equipment", showIf: (a) => a.location === "home" },
  {
    kind: "partner",
    // Skip in all cases. Primary intent already captures "doubles". For
    // everyone else the answer is almost always "solo" and the screen
    // wastes the user's attention. Kept in the SCREENS list so resumed
    // sessions that already answered it stay valid.
    showIf: () => false,
  },
  { kind: "injuries" },
  {
    kind: "injury-detail",
    // Only for specific injuries; "none" and "other" skip straight on.
    showIf: (a) => injuryNeedsDetail(a.injuries),
  },
  // The sift. Last question before the reveal, so it is asked only after
  // the user has invested: commitment first, choice second.
  // Hidden when the entry surface already answered it (the club page CTA).
  { kind: "support-preference", showIf: (a) => !a.supportLocked },
  // Readiness is for Ben, so it is only worth asking of people heading his
  // way. Someone who picked self-serve is not going into his diary.
  { kind: "readiness", showIf: (a) => a.supportPreference !== "self" },
  // The human moment, immediately before the reveal.
  { kind: "meet-ben" },
  /* THE ENDING.
     This route opens "free fitness assessment" and never mentions a
     product, so it ends on the promise it made: a time in Ben's diary.
     The plan reveal, the account gate and the calculating cinematic all
     belonged to a funnel that sold a twelve-week programme, and showing
     "First Race Programme" to somebody who asked for help getting fit was
     the wrong ending twice — it named a race they never mentioned and
     offered a product they were never promised.

     Kept in SCREENS, unreachable, so a session saved mid-quiz under the
     old flow still resolves rather than crashing on an unknown kind. */
  { kind: "book-slot" },
  { kind: "booked" },
  { kind: "plan-summary", showIf: () => false },
  { kind: "account-creation", showIf: () => false },
  { kind: "calculating", showIf: () => false },
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
    "goal",
    "starting-point",
    "tried-before",
    "barriers",
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
    "email-capture",
    "injuries",
    "injury-detail",
    "support-preference",
    "readiness",
    "plan-summary",
    "account-creation",
  ];
  const visibleQuestions = screens.filter((s) => questionKinds.includes(s.kind));
  const idx = visibleQuestions.findIndex((s) => s.kind === currentKind);
  return [idx + 1, visibleQuestions.length];
}

function QuizV3Inner({ country }: { country?: string }) {
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
  const railParam = params.get("rail");
  const supportParam = params.get("support");
  const appliedPrefillRef = useRef(false);
  useEffect(() => {
    if (!hydrated || !state) return;
    if (appliedPrefillRef.current) return;
    appliedPrefillRef.current = true;

    let next = state.answers;
    if (railParam) {
      next = applyRailPreSelect(next, railParam);
    }
    if (supportParam) {
      next = applySupportPreSelect(next, supportParam);
    }
    if (intentParam) {
      next = applyIntentPreSelect(next, intentParam);
    }
    if (programParam) {
      next = applyProgrammeShortcutV3(next, programParam);
    }
    if (next !== state.answers) {
      mergeAnswers(next);
    }
  }, [
    hydrated,
    state,
    intentParam,
    programParam,
    railParam,
    supportParam,
    mergeAnswers,
  ]);

  /* A resumed session can carry a race date that has since passed. Found on
     3 August 2026 by opening the quiz on a session started on 29 July: it
     restored "race day 30 July" and offered a twelve-week build starting
     4 August, a plan for a race that had already happened.

     Rewinding to the race-date screen rather than clearing the session,
     because the other answers are still good and making somebody retake the
     whole quiz to change one date is worse than the bug. */
  const staleRaceDateRef = useRef(false);
  useEffect(() => {
    if (!hydrated || !state || staleRaceDateRef.current) return;
    const rd = state.answers.raceDate;
    if (!rd) return;
    const when = rd instanceof Date ? rd : new Date(rd as unknown as string);
    if (Number.isNaN(when.getTime())) return;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (when >= today) return;

    staleRaceDateRef.current = true;
    const visible = visibleScreens(state.answers);
    const raceDateIdx = visible.findIndex((sc) => sc.kind === "race-date");
    mergeAnswers({ ...state.answers, raceDate: undefined });
    if (raceDateIdx >= 0 && state.screenIndex > raceDateIdx) {
      setScreenIndex(raceDateIdx);
    }
  }, [hydrated, state, mergeAnswers, setScreenIndex]);

  const answers = useMemo<QuizAnswers>(
    () => state?.answers ?? { intent: [] },
    [state?.answers],
  );
  const screens = useMemo(() => visibleScreens(answers), [answers]);
  const screenIndex = state
    ? Math.max(0, Math.min(state.screenIndex, screens.length - 1)): 0;
  const current = screens[screenIndex];

  // Submit / loading flags for account creation.
  const [creating, setCreating] = useState(false);
  /* The booked slot, held for the confirmation screen.
     Deliberately component state rather than the persisted quiz store: it
     belongs to this visit, and a stale "you're booked for Tuesday" restored
     from localStorage a fortnight later would be a lie. */
  const [booked, setBooked] = useState<{ startISO: string; ref: string } | null>(
    null,
  );
  const [accountError, setAccountError] = useState<string | null>(null);

  // Track when the current screen mounted, for `time_on_screen_ms`.
  // Initialised to 0 and seeded in the effect below on first commit, the only
  // readers are event handlers further down, which cannot fire before mount.
  const screenMountTimeRef = useRef<number>(0);
  useEffect(() => {
    screenMountTimeRef.current = Date.now();
  }, [current?.kind]);

  // Email + password local drafts for account screen. Email and marketing
  // start as null meaning "not edited here", so they fall through to what
  // the user already gave us on the mid-flow email screen. Derived rather
  // than synced in an effect: an edit on the final screen still wins, and
  // there is no cascading render.
  const [emailDraft, setEmailDraft] = useState<string | null>(null);
  const [passwordDraft, setPasswordDraft] = useState("");
  const [marketingDraft, setMarketingDraft] = useState<boolean | null>(null);

  const emailValue = emailDraft ?? state?.answers.email ?? "";
  const marketingValue =
    marketingDraft ?? state?.answers.marketingOptIn ?? false;

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
    const validation = validateAccountForm(emailValue, passwordDraft);
    if (!validation.ok) {
      setAccountError(validation.error);
      haptic("warning");
      return;
    }
    setAccountError(null);
    setCreating(true);
    haptic("medium");

    // Recovery snapshot: write the answers + email under a separate key
    // so that if Supabase Auth signup succeeds but the server persist
    // fails (or the page reloads mid-submit), the user can retry without
    // losing data. The primary quiz state is already persisted by
    // useQuizStateV3; this is belt-and-braces for the cross-screen leap
    // out of the quiz domain.
    try {
      if (typeof window !== "undefined") {
        window.localStorage.setItem(
          "suth:quiz:v3:account-submit-snapshot",
          JSON.stringify({
            email: emailValue.trim().toLowerCase(),
            marketingOptIn: marketingValue,
            answers: {
              ...state.answers,
              raceDate:
                state.answers.raceDate instanceof Date
                  ? state.answers.raceDate.toISOString()
                  : state.answers.raceDate,
            },
            uuid: state.uuid,
            attemptedAt: new Date().toISOString(),
          }),
        );
      }
    } catch {
      /* localStorage may be full or unavailable; non-fatal */
    }

    try {
      /* THE ACCOUNT IS CREATED ON THE SERVER, THEN SIGNED IN HERE.
       *
       * This used to call supabase.auth.signUp() from the browser and it
       * silently did not work. The project requires email confirmation, so
       * signUp returned a user with no session and no confirmation mail
       * anybody had set up: people finished the quiz, were told they had an
       * account, and were neither signed in nor able to sign in. The account
       * existed and was unusable, which is worse than failing outright,
       * because nothing on screen said so.
       *
       * The server mints it confirmed with the service key; the password
       * they just typed then gets them a real session on the next line.
       */
      const supabase = supabaseBrowser();
      const emailNormalised = emailValue.trim().toLowerCase();

      // Creates the confirmed auth user AND the customer + quiz rows.
      const res = await fetch("/api/account/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password: passwordDraft,
          email: emailNormalised,
          marketingOptIn: marketingValue,
          quizState: {
            uuid: state.uuid,
            answers: {
              ...state.answers,
              raceDate:
                state.answers.raceDate instanceof Date
                  ? state.answers.raceDate.toISOString(): state.answers.raceDate,
            },
          },
        }),
      });

      if (res.status === 409) {
        setAccountError(
          "An account already exists with this email. Sign in instead.",
        );
        setCreating(false);
        haptic("warning");
        return;
      }

      if (!res.ok) {
        const detail = await res.text().catch(() => "");
        // Don't block the funnel, the auth user already exists and the
        // quiz state is in localStorage (plus the account-submit-snapshot
        // recovery key written above). Log + advance. The customer row
        // can be reconciled later by email match in /api/account/create
        // on a subsequent submission.
        console.error("[account/create] failed", res.status, detail);
      } else {
        // Successful persist — clear the recovery snapshot.
        try {
          if (typeof window !== "undefined") {
            window.localStorage.removeItem(
              "suth:quiz:v3:account-submit-snapshot",
            );
          }
        } catch {
          /* non-fatal */
        }
      }

      /* Sign them in for real. Without this they land on their plan with no
         session, and /app bounces them to a login they cannot pass. */
      const signIn = await supabase.auth.signInWithPassword({
        email: emailNormalised,
        password: passwordDraft,
      });
      if (signIn.error) {
        // The account exists either way, so this is not a dead end — say what
        // to do rather than pretending it worked.
        setAccountError(
          "Your account is set up, but signing you in failed. Try signing in from the login page.",
        );
        setCreating(false);
        haptic("warning");
        return;
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
        email_marketing_opt_in: marketingValue,
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
    emailValue,
    passwordDraft,
    marketingValue,
    haptic,
    advance,
    screens.length,
  ]);

  if (!hydrated || !state || !current) {
    // Pre-hydration / cold-load fallback. Shows a proper editorial frame
    // (image + headline + animated dots) instead of a dead "One moment"
    // string, matters for slow connections, link previews, and crawlers.
    return (
      <main className="relative isolate flex min-h-svh flex-col overflow-hidden bg-suth-base">
        <div aria-hidden className="absolute inset-0 -z-10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/media/images/track/programme-first-race.jpg"
            alt=""
            className="h-full w-full object-cover opacity-50 grayscale"
            loading="eager"
            decoding="async"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-suth-base/60 via-suth-base/30 to-suth-base/95" />
        </div>
        <div className="flex flex-1 flex-col justify-end px-6 pb-[max(2rem,calc(var(--safe-bottom)+2rem))] pt-[max(5rem,calc(var(--safe-top)+4rem))]">
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-suth-accent">
            [ THE SUTH PERFORMANCE QUIZ ]
          </p>
          <h1 className="mt-4 max-w-[16ch] text-4xl font-black leading-[1.05] tracking-[-0.04em] text-suth-text md:text-5xl">
            Hyrox training, personalised in three minutes.
          </h1>
          <p className="mt-5 max-w-md text-base leading-relaxed text-suth-text-secondary md:text-lg">
            We&apos;ll ask about your race date, experience, equipment, and
            schedule. You&apos;ll see your dated Week 1 for free.
          </p>
          <div
            aria-label="Loading quiz"
            className="mt-10 flex items-center gap-2"
          >
            <span className="inline-flex size-2 animate-pulse rounded-full bg-suth-accent" />
            <span className="inline-flex size-2 animate-pulse rounded-full bg-suth-accent [animation-delay:120ms]" />
            <span className="inline-flex size-2 animate-pulse rounded-full bg-suth-accent [animation-delay:240ms]" />
            <span className="ml-2 font-mono text-[11px] uppercase tracking-[0.18em] text-suth-text-tertiary">
              Loading
            </span>
          </div>
        </div>
      </main>
    );
  }

  /* EVERYTHING BELOW RENDERS ONE SCREEN, AND THE SCOPE TELLS THE HEADER
     AND BUTTON WHICH ONE IT IS.
     Wrapping the whole chain once rather than every branch is deliberate:
     there are twenty-odd early returns and a new screen added tomorrow
     would otherwise be the one nobody remembered to wrap. Hooks all run
     above this line, so an inline function here is safe.
     Named tokens rather than baked-in text — an edited question may say
     "{first}" or "{area}", and those are per-person words that must never
     end up stored in the copy table. */
  const screenTokens = {
    first: (state.answers.name ?? "").trim().split(/\s+/)[0] || undefined,
    area: state.answers.injuries
      ? INJURY_LABEL[state.answers.injuries]?.toLowerCase()
      : undefined,
  };
  const rendered = (() => {
  const hasAnswers = Object.keys(state.answers).some((k) => {
    const v = state.answers[k as keyof QuizAnswers];
    if (Array.isArray(v)) return v.length > 0;
    return v !== undefined && v !== null;
  });
  const [pos, total] = questionScreenIndex(screens, current.kind);

  // Declared before the full-bleed block because those screens take it too:
  // without a back control they are one-way doors, which breaks the
  // "back navigation always" rule and strands anyone who reaches the reveal
  // and wants to change an answer.
  const backHandler = screenIndex > 0 ? back : undefined;

  // ── Full-bleed screens (no shell)
  if (current.kind === "reassurance-1") {
    return (
      <ReassuranceScreen1
        beginner={isBeginnerRail(state.answers)}
        onContinue={advance}
        onBack={backHandler}
      />
    );
  }
  if (current.kind === "reassurance-2") {
    return (
      <ReassuranceScreen2
        beginner={isBeginnerRail(state.answers)}
        onContinue={advance}
        onBack={backHandler}
      />
    );
  }
  if (current.kind === "meet-ben") {
    return (
      <MeetBenScreen
        onBack={backHandler}
        beginner={isBeginnerRail(state.answers)}
        onContinue={() => {
          capture("quiz_meet_ben_continued", {
            beginner: isBeginnerRail(state.answers),
            user_uuid: state.uuid,
          });
          advance();
        }}
      />
    );
  }
  if (current.kind === "book-slot") {
    return (
      <QuizShell
        answers={state.answers}
        currentScreen={pos}
        totalScreens={total}
        onBack={backHandler}
        hasAnswers={hasAnswers}
      >
        <BookSlotScreen
          answers={state.answers}
          brief={leadBrief(state.answers, sift(state.answers))}
          onBooked={(startISO, ref) => {
            capture("assessment_booked", {
              user_uuid: state.uuid,
              rail: state.answers.rail,
            });
            haptic("success");
            setBooked({ startISO, ref });
            advance();
          }}
        />
      </QuizShell>
    );
  }

  if (current.kind === "booked") {
    // Falls back to the picker if somebody deep-links here without booking.
    if (!booked) {
      return (
        <QuizShell
          answers={state.answers}
          currentScreen={pos}
          totalScreens={total}
          onBack={backHandler}
          hasAnswers={hasAnswers}
        >
          <BookSlotScreen
            answers={state.answers}
            brief={leadBrief(state.answers, sift(state.answers))}
            onBooked={(startISO, ref) => setBooked({ startISO, ref })}
          />
        </QuizShell>
      );
    }
    return (
      <BookedScreen
        answers={state.answers}
        startISO={booked.startISO}
        reference={booked.ref}
      />
    );
  }

  if (current.kind === "calculating") {
    return <CalculatingScreen answers={state.answers} />;
  }

  // ── Question screens (in shell)

  if (current.kind === "primary-intent") {
    const intent = state.answers.intent ?? [];
    return (
      <QuizShell
        answers={state.answers}
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
          onChoose={(v: IntentValue) => {
            haptic("light");
            // mergeAnswers, not setAnswer: this one tap sets the intent, the
            // rail it implies, and clears whatever belongs to the rail being
            // left. See applyIntent in lib/quiz-flow.ts.
            mergeAnswers(applyIntent(state.answers, v));
          }}
        />
      </QuizShell>
    );
  }

  if (current.kind === "experience") {
    const value = state.answers.experience;
    return (
      <QuizShell
        answers={state.answers}
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
        answers={state.answers}
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
        answers={state.answers}
        currentScreen={pos}
        totalScreens={total}
        onBack={backHandler}
        hasAnswers={hasAnswers}
        footer={
          <div className="flex w-full items-stretch gap-3">
            <button
              type="button"
              onClick={() => {
                setAnswer("raceDate", undefined);
                continueWithHaptic(null);
              }}
              // Made into a real secondary button (was a tertiary text link).
              // When no date is picked, this is the only enabled action and
              // it needs visual weight that signals "this is a fine choice".
              className="inline-flex h-14 flex-1 items-center justify-center rounded-pill border border-suth-border bg-suth-elevated px-5 text-base font-medium text-suth-text transition-colors hover:border-suth-border-strong active:scale-[0.98]"
            >
              No race yet
            </button>
            <div className="flex-1">
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
        answers={state.answers}
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
        answers={state.answers}
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
        answers={state.answers}
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
          beginner={isBeginnerRail(state.answers)}
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
        answers={state.answers}
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
          beginner={isBeginnerRail(state.answers)}
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
        answers={state.answers}
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
          beginner={isBeginnerRail(state.answers)}
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
        answers={state.answers}
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
          beginner={isBeginnerRail(state.answers)}
          selected={selected}
          onToggle={(v) => {
            haptic("light");
            setAnswer("equipment", (curr) => {
              const arr = curr ?? [];
              return arr.includes(v)
                ? arr.filter((x) => x !== v): [...arr, v];
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
        answers={state.answers}
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
        answers={state.answers}
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
            if (v !== value) {
              // Changing the injury invalidates any follow-up detail
              // already captured for a different one.
              mergeAnswers({
                injuries: v,
                injuryRecency: undefined,
                injuryTriggers: undefined,
                injuryCare: undefined,
              });
            }
          }}
        />
      </QuizShell>
    );
  }

  if (current.kind === "injury-detail" && state.answers.injuries) {
    const { injuryRecency, injuryTriggers, injuryCare } = state.answers;
    return (
      <QuizShell
        answers={state.answers}
        currentScreen={pos}
        totalScreens={total}
        onBack={backHandler}
        hasAnswers={hasAnswers}
        footer={
          <ContinueButton
            disabled={!injuryRecency || !injuryCare}
            onClick={() => continueWithHaptic(injuryRecency)}
          />
        }
      >
        <InjuryDetailScreen
          injury={state.answers.injuries}
          recency={injuryRecency}
          triggers={injuryTriggers ?? []}
          care={injuryCare}
          onRecency={(v) => {
            haptic("light");
            setAnswer("injuryRecency", v);
          }}
          onToggleTrigger={(v) => {
            haptic("light");
            setAnswer("injuryTriggers", (curr) =>
              (curr ?? []).includes(v)
                ? (curr ?? []).filter((t) => t !== v)
                : [...(curr ?? []), v],
            );
          }}
          onCare={(v) => {
            haptic("light");
            setAnswer("injuryCare", v);
          }}
        />
      </QuizShell>
    );
  }

  if (current.kind === "goal") {
    const value = state.answers.goal;
    return (
      <QuizShell
        answers={state.answers}
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
        <GoalScreen
          value={value}
          onChange={(v) => {
            haptic("light");
            setAnswer("goal", v);
          }}
        />
      </QuizShell>
    );
  }

  if (current.kind === "starting-point") {
    const value = state.answers.startingPoint;
    return (
      <QuizShell
        answers={state.answers}
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
        <StartingPointScreen
          value={value}
          onChange={(v) => {
            haptic("light");
            setAnswer("startingPoint", v);
          }}
        />
      </QuizShell>
    );
  }

  if (current.kind === "tried-before") {
    const value = state.answers.triedBefore;
    return (
      <QuizShell
        answers={state.answers}
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
        <TriedBeforeScreen
          value={value}
          onChange={(v) => {
            haptic("light");
            setAnswer("triedBefore", v);
          }}
        />
      </QuizShell>
    );
  }

  if (current.kind === "barriers") {
    const selected = state.answers.barriers ?? [];
    return (
      <QuizShell
        answers={state.answers}
        currentScreen={pos}
        totalScreens={total}
        onBack={backHandler}
        hasAnswers={hasAnswers}
        footer={
          // Multi-select never auto-advances (hard rule), and an empty
          // answer is allowed: "nothing has got in the way" is legitimate.
          <ContinueButton onClick={() => continueWithHaptic(selected)} />
        }
      >
        <BarriersScreen
          selected={selected}
          onToggle={(v: BarrierValue) => {
            haptic("light");
            setAnswer("barriers", (curr) => {
              const list = curr ?? [];
              return list.includes(v)
                ? list.filter((x) => x !== v)
                : [...list, v];
            });
          }}
        />
      </QuizShell>
    );
  }

  if (current.kind === "readiness") {
    const value = state.answers.readiness;
    return (
      <QuizShell
        answers={state.answers}
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
        <ReadinessScreen
          value={value}
          onChange={(v) => {
            haptic("light");
            setAnswer("readiness", v);
          }}
        />
      </QuizShell>
    );
  }

  if (current.kind === "email-capture") {
    /* Was "Where should we send your plan?" — asking for an email so we could
       send something this route does not produce. It ends in a free call
       about their fitness, so it asks for the three things needed to make
       that call happen, and the phone carries a real dialling code. */
    const nameValue = state.answers.name ?? "";
    const emailValue = state.answers.email ?? "";
    /* Their own country first, the UK only as a last resort. An explicit
       choice always wins — once they have touched the dropdown, the answer
       is theirs and the header stops mattering. */
    const isoValue = state.answers.phoneIso ?? country ?? DEFAULT_ISO;
    const phoneValue = state.answers.phone ?? "";
    const ready = isContactValid(nameValue, emailValue, isoValue, phoneValue);
    return (
      <QuizShell
        answers={state.answers}
        currentScreen={pos}
        totalScreens={total}
        onBack={backHandler}
        hasAnswers={hasAnswers}
        footer={
          <ContinueButton
            disabled={!ready}
            onClick={() => continueWithHaptic({ hasContact: true })}
          />
        }
      >
        <ContactCaptureScreen
          name={nameValue}
          email={emailValue}
          phoneIso={isoValue}
          phone={phoneValue}
          // Complain only once they have committed to typing, never on a
          // field they have not reached yet.
          showError={emailValue.length > 3 || phoneValue.length > 3}
          onName={(v) => setAnswer("name", v)}
          onEmail={(v) => setAnswer("email", v)}
          onIso={(v) => {
            haptic("light");
            setAnswer("phoneIso", v);
          }}
          onPhone={(v) => setAnswer("phone", v)}
        />
      </QuizShell>
    );
  }

  if (current.kind === "support-preference") {
    const value = state.answers.supportPreference;
    return (
      <QuizShell
        answers={state.answers}
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
        <SupportPreferenceScreen
          rail={state.answers.rail ?? "athlete"}
          value={value}
          onChange={(v) => {
            haptic("light");
            setAnswer("supportPreference", v);
          }}
        />
      </QuizShell>
    );
  }

  if (current.kind === "plan-summary") {
    // On the coached route the money action is the inline lead form, which
    // sits below the fold on a phone. A sticky "Save my plan" would be the
    // only CTA in view and would walk people straight past it, so on that
    // route the sticky button drives into the form instead of past it.
    const coachedRoute = sift(state.answers).route === "coached";
    return (
      <QuizShell
        answers={state.answers}
        currentScreen={pos}
        totalScreens={total}
        onBack={backHandler}
        hasAnswers={hasAnswers}
        footer={
          coachedRoute ? (
            <ContinueButton
              label="Send my plan to Ben →"
              // Same visible words as the inline submit, deliberately: it
              // is a mirror of it. The accessible name says which one this
              // is, so a screen reader doesn't hear two identical buttons
              // that do different things.
              ariaLabel="Send my plan to Ben, go to the form"
              onClick={() => {
                haptic("medium");
                capture("quiz_summary_jump_to_lead", {
                  user_uuid: state.uuid,
                });
                document
                  .getElementById("lead-capture")
                  ?.scrollIntoView({ behavior: "smooth", block: "center" });
                // Focusing the first field is what makes the button feel
                // like it did something when the form is already in view
                // on a wide screen.
                window.setTimeout(() => {
                  document.getElementById("lead-capture-name")?.focus();
                }, 350);
              }}
            />
          ) : (
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
          )
        }
      >
        <PlanSummaryScreen answers={state.answers} />
      </QuizShell>
    );
  }

  if (current.kind === "account-creation") {
    return (
      <QuizShell
        answers={state.answers}
        currentScreen={pos}
        totalScreens={total}
        onBack={backHandler}
        hasAnswers={hasAnswers}
        footer={
          <ContinueButton
            label="Save my plan →"
            loading={creating}
            disabled={creating || !emailValue || passwordDraft.length < 8}
            onClick={onSubmitAccount}
          />
        }
      >
        <AccountCreationScreen
          email={emailValue}
          password={passwordDraft}
          marketingOptIn={marketingValue}
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

  // Exhaustiveness. TypeScript should have narrowed everything above.
  // If we reach here, a new kind was added without a handler.
   
  console.error("[quiz-v3] unhandled screen kind", current.kind);
  // Avoid blank screen
  router.push("/");
  return null;
  })();

  return (
    <ScreenCopyScope kind={current.kind} tokens={screenTokens}>
      {rendered}
    </ScreenCopyScope>
  );
}

function QuizColdLoadFallback() {
  return (
    <main className="relative isolate flex min-h-svh flex-col overflow-hidden bg-suth-base">
      <div aria-hidden className="absolute inset-0 -z-10">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/media/images/track/programme-first-race.jpg"
          alt=""
          className="h-full w-full object-cover opacity-50 grayscale"
          loading="eager"
          decoding="async"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-suth-base/60 via-suth-base/30 to-suth-base/95" />
      </div>
      <div className="flex flex-1 flex-col justify-end px-6 pb-[max(2rem,calc(var(--safe-bottom)+2rem))] pt-[max(5rem,calc(var(--safe-top)+4rem))]">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-suth-accent">
          [ THE SUTH PERFORMANCE QUIZ ]
        </p>
        <h1 className="mt-4 max-w-[16ch] text-4xl font-black leading-[1.05] tracking-[-0.04em] text-suth-text md:text-5xl">
          Hyrox training, personalised in three minutes.
        </h1>
        <p className="mt-5 max-w-md text-base leading-relaxed text-suth-text-secondary md:text-lg">
          We&apos;ll ask about your race date, experience, equipment, and
          schedule. You&apos;ll see your dated Week 1 for free.
        </p>
        <div aria-label="Loading quiz" className="mt-10 flex items-center gap-2">
          <span className="inline-flex size-2 animate-pulse rounded-full bg-suth-accent" />
          <span className="inline-flex size-2 animate-pulse rounded-full bg-suth-accent [animation-delay:120ms]" />
          <span className="inline-flex size-2 animate-pulse rounded-full bg-suth-accent [animation-delay:240ms]" />
          <span className="ml-2 font-mono text-[11px] uppercase tracking-[0.18em] text-suth-text-tertiary">
            Loading
          </span>
        </div>
      </div>
    </main>
  );
}

export default function QuizV3({
  copy = {},
  country,
}: {
  /** Ben's edits, read on the server. Empty means "as shipped". */
  copy?: Record<string, string>;
  /** ISO country from the visitor's IP, for the phone field's default. */
  country?: string;
}) {
  return (
    <QuizCopyProvider overrides={copy}>
      <Suspense fallback={<QuizColdLoadFallback />}>
        <QuizV3Inner country={country} />
      </Suspense>
    </QuizCopyProvider>
  );
}
