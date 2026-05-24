"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import {
  PROGRAMME_DISPLAY,
  determineProgramme,
  determineStartDate,
  determineRaceDate,
  calculateWeeksUntilRace,
  type QuizAnswers,
  type WeightUnit,
} from "@/lib/quiz-flow";
import { generateWeek1, type Plan, type Workout } from "@/lib/plan-generator";
import { DayCard } from "@/components/plan/day-card";
import { DayDetailSheet } from "@/components/plan/day-detail-sheet";
import { PaywallCard } from "@/components/plan/paywall-card";
import { PlanValueSection } from "@/components/plan/plan-value-section";
// StickyCta removed in Fix 1 — was duplicating the PaywallCard CTA and
// reading as a "buy now" pop-up over the user's own Week 1. Single paywall
// card at the bottom (post-value-section) carries the conversion now.
import { WeekTabs } from "@/components/plan/week-tabs";
import { Eyebrow } from "@/components/shared/eyebrow";
import { capture } from "@/lib/posthog";

/**
 * Client-side plan reveal. Reads V3 quiz state from localStorage, generates
 * Week 1 deterministically, and renders the page. Weeks 2-12 stay blurred
 * with a paywall card, the actual workout data for those weeks is *never*
 * sent down to this component; it must be fetched from `/api/plan/[week]`
 * which enforces subscription server-side.
 *
 * Variant: `share` strips the paywall + sticky CTA and shows a public-friendly
 * view of Week 1, intended for `/plan/share/[id]`.
 */
export function PlanReveal({
  initialAnswers,
  initialPlan,
  variant = "owner",
  shareId,
}: {
  initialAnswers?: QuizAnswers;
  initialPlan?: Plan;
  variant?: "owner" | "share";
  shareId?: string;
}) {
  const router = useRouter();
  const [answers, setAnswers] = useState<QuizAnswers | null>(
    initialAnswers ?? null,
  );
  const [activeWeek, setActiveWeek] = useState(1);
  const [openWorkout, setOpenWorkout] = useState<Workout | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToast(null), 2200);
  }, []);
  useEffect(
    () => () => {
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    },
    [],
  );
  const fired = useRef(false);

  useEffect(() => {
    if (answers) return;
    try {
      const raw = window.localStorage.getItem("vyrek:quiz:v3:state");
      if (!raw) {
        if (variant === "owner") router.replace("/quiz");
        return;
      }
      const parsed = JSON.parse(raw);
      if (parsed.answers?.raceDate) {
        parsed.answers.raceDate = new Date(parsed.answers.raceDate);
      }
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAnswers(parsed.answers ?? null);
    } catch {
      if (variant === "owner") router.replace("/quiz");
    }
  }, [answers, router, variant]);

  // Compose Plan + dates locally when we have the answers.
  const planContext = useMemo(() => {
    if (!answers) return null;
    if (initialPlan)
      return {
        plan: initialPlan,
        programme: initialPlan.programme,
        startDate: new Date(initialPlan.startDate),
      };
    const programme = determineProgramme(answers);
    const startDate = determineStartDate();
    const plan = generateWeek1(answers, programme, startDate);
    return { plan, programme, startDate };
  }, [answers, initialPlan]);

  useEffect(() => {
    if (!planContext || fired.current) return;
    fired.current = true;
    capture("plan_revealed", {
      programme: planContext.programme,
      variant,
      week: 1,
    });
  }, [planContext, variant]);

  const unit: WeightUnit = answers?.weightUnit ?? "kg";

  const onOpenWorkout = useCallback((w: Workout) => {
    setOpenWorkout(w);
    setSheetOpen(true);
    capture("workout_expanded", {
      workout_type: w.type,
      day: w.day,
    });
  }, []);

  const onCloseSheet = useCallback(() => {
    setSheetOpen(false);
    // delay so the slide-down animation completes before we clear the workout
    window.setTimeout(() => setOpenWorkout(null), 350);
  }, []);

  const onShare = useCallback(
    async (workout: Workout) => {
      const text = `${workout.day}'s training: ${workout.title}. ${workout.durationMin} min. From my Vyrek plan.`;
      const url = shareId
        ? `${window.location.origin}/plan/share/${shareId}`: window.location.href;
      try {
        if ((navigator as Navigator).share) {
          await (navigator as Navigator).share({
            title: "Vyrek workout",
            text,
            url,
          });
          capture("workout_shared", {
            workout_type: workout.type,
            method: "web-share",
          });
        } else if (navigator.clipboard) {
          await navigator.clipboard.writeText(`${text} ${url}`);
          capture("workout_shared", {
            workout_type: workout.type,
            method: "clipboard",
          });
          showToast("Copied to clipboard");
        }
      } catch {
        /* user cancelled, fine */
      }
    },
    [shareId, showToast],
  );

  const onStartTrial = useCallback(async () => {
    if (variant === "share") {
      // Public share view, viral CTA goes to /quiz, not checkout
      router.push("/quiz");
      return;
    }
    setCheckoutLoading(true);
    capture("paywall_clicked", {
      programme: planContext?.programme,
    });
    try {
      const res = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (res.ok) {
        const data = (await res.json()) as { url?: string };
        if (data.url) {
          window.location.href = data.url;
          return;
        }
      }
      // 503 = Stripe env not configured yet; 401 = no Supabase session.
      // Either way we keep the user on this page with a clear message rather
      // than bouncing them to /pricing.
      if (res.status === 503) {
        showToast("Checkout opens soon, first week is free");
      } else if (res.status === 401) {
        router.push("/quiz");
      } else {

        console.error("[plan] checkout session create failed", res.status);
        showToast("Couldn't open checkout. Try again in a moment.");
      }
    } catch (err) {

      console.error("[plan] checkout threw", err);
      showToast("Couldn't open checkout. Try again in a moment.");
    } finally {
      setCheckoutLoading(false);
    }
  }, [router, variant, planContext?.programme, showToast]);

  // Number animation for "60 min" on day cards, count up from 0 to target.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const els = document.querySelectorAll<HTMLElement>("[data-day-duration]");
    if (!els.length) return;
    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const el = entry.target as HTMLElement;
          const target = parseInt(el.dataset.target ?? "0", 10);
          if (!target || isNaN(target)) continue;
          if (prefersReduced) {
            el.textContent = String(target);
            observer.unobserve(el);
            continue;
          }
          const startedAt = performance.now();
          const duration = 600;
          const tick = (now: number) => {
            const t = Math.min(1, (now - startedAt) / duration);
            const v = Math.round(target * t);
            el.textContent = String(v);
            if (t < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
          observer.unobserve(el);
        }
      },
      { threshold: 0.4 },
    );
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [planContext]);

  if (!planContext) {
    return (
      <main className="flex min-h-svh flex-col items-center justify-center bg-vyrek-base px-6 text-center">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-vyrek-accent">
          [ YOUR PLAN ]
        </p>
        <h1 className="mt-4 max-w-md text-3xl font-black leading-[1.05] tracking-[-0.04em] text-vyrek-text md:text-4xl">
          Loading your personalised Hyrox plan
        </h1>
        <p className="mt-4 max-w-sm text-sm text-vyrek-text-secondary">
          Reading your quiz answers, generating Week 1.
        </p>
        <div className="mt-8 flex items-center gap-2">
          <span className="inline-flex size-2 animate-pulse rounded-full bg-vyrek-accent" />
          <span className="inline-flex size-2 animate-pulse rounded-full bg-vyrek-accent [animation-delay:120ms]" />
          <span className="inline-flex size-2 animate-pulse rounded-full bg-vyrek-accent [animation-delay:240ms]" />
        </div>
      </main>
    );
  }

  const { plan, programme, startDate } = planContext;
  const raceDate = determineRaceDate(startDate, answers?.raceDate);
  const weeksUntilRace = calculateWeeksUntilRace(raceDate);

  return (
    <main className="flex min-h-svh flex-col bg-vyrek-base pt-[var(--safe-top)]">
      <header className="grid h-14 shrink-0 grid-cols-[auto_1fr_auto] items-center gap-3 px-5">
        <Link
          href="/"
          aria-label="Home"
          className="-ml-3 inline-flex h-10 items-center px-3 text-vyrek-text-secondary transition-colors hover:text-vyrek-text"
        >
          ←
        </Link>
        <span aria-hidden />
        <span
          aria-hidden
          className="inline-flex size-9 items-center justify-center rounded-full border border-vyrek-border bg-vyrek-elevated font-mono text-xs uppercase tracking-[0.12em] text-vyrek-text"
        >
          {variant === "share" ? "★": "JW"}
        </span>
      </header>

      <div className="flex-1 px-5 pb-32">
        <div className="mx-auto max-w-md">
          <Eyebrow>Your plan</Eyebrow>
          <h1 className="mt-3 text-3xl font-black leading-tight tracking-[-0.04em] text-vyrek-text md:text-4xl">
            {PROGRAMME_DISPLAY[programme]}
          </h1>
          <p className="mt-3 max-w-md text-base leading-relaxed text-vyrek-text-secondary">
            12 weeks. Built around your race on{" "}
            <span className="text-vyrek-text">
              {format(raceDate, "EEEE, d MMMM yyyy")}
            </span>.
          </p>

          <dl className="mt-6 grid grid-cols-3 gap-3 rounded-md border border-vyrek-border-subtle bg-vyrek-elevated p-3 text-center">
            <div>
              <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-vyrek-text-tertiary">
                Days
              </dt>
              <dd className="mt-1 text-xl font-bold text-vyrek-text">
                {answers?.days ?? 4}
              </dd>
            </div>
            <div>
              <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-vyrek-text-tertiary">
                Time
              </dt>
              <dd className="mt-1 text-xl font-bold text-vyrek-text">
                {answers?.sessionLength ?? "60"}m
              </dd>
            </div>
            <div>
              <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-vyrek-text-tertiary">
                Start
              </dt>
              <dd className="mt-1 text-xl font-bold text-vyrek-text">
                {format(startDate, "EEE")}
              </dd>
            </div>
          </dl>

          <p className="mt-4 inline-block rounded-pill border border-vyrek-accent/30 bg-vyrek-accent/10 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.18em] text-vyrek-accent">
            {weeksUntilRace} weeks to your race
          </p>

          <hr className="my-8 border-t border-vyrek-border-subtle" />

          <WeekTabs
            active={activeWeek}
            unlockedWeeks={1}
            onSelect={setActiveWeek}
            onLockedTap={() => {
              const el = document.getElementById("paywall-card");
              el?.scrollIntoView({ behavior: "smooth", block: "center" });
              capture("paywall_scroll_to", { trigger: "week_tab" });
            }}
          />

          <h2 className="mt-6 font-mono text-[11px] uppercase tracking-[0.22em] text-vyrek-text-tertiary">
            [ WEEK 1 · {format(startDate, "d MMM")} ]
          </h2>

          <ul className="mt-3 space-y-3" role="list">
            {plan.workouts.map((w) => (
              <li key={w.day}>
                <DayCard workout={w} onOpen={() => onOpenWorkout(w)} />
              </li>
            ))}
          </ul>

          {variant === "owner" ? (
            <>
              {/* Value section above paywall: users see what they unlock
                  before the unlock prompt. Stagger fades in on scroll. */}
              <PlanValueSection />

              <hr className="my-10 border-t border-vyrek-border-subtle" />

              <div
                id="paywall-card"
                className="mx-auto w-full max-w-sm"
              >
                <PaywallCard
                  onStartTrial={onStartTrial}
                  loading={checkoutLoading}
                />
              </div>
            </>
          ): (
            <>
              <hr className="my-8 border-t border-vyrek-border-subtle" />
              <div className="rounded-lg border border-vyrek-border bg-vyrek-elevated p-6 text-center">
                <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-vyrek-accent">
                  [ VYREK · PERSONALISED HYROX TRAINING ]
                </p>
                <h3 className="mt-3 text-2xl font-black leading-tight tracking-[-0.02em] text-vyrek-text">
                  Want your own plan?
                </h3>
                <p className="mt-3 text-sm text-vyrek-text-secondary">
                  Three-minute quiz. Week 1 dated and ready before you pay.
                </p>
                <Link
                  href="/quiz"
                  className="mt-5 inline-flex h-12 w-full items-center justify-center rounded-pill bg-vyrek-accent px-6 text-base font-medium tracking-tight text-[#0A0A0A] transition-[background,transform] duration-fast ease-out hover:bg-vyrek-accent-hover active:scale-[0.98]"
                >
                  Take the quiz →
                </Link>
              </div>
            </>
          )}
        </div>
      </div>

      <DayDetailSheet
        workout={openWorkout}
        unit={unit}
        open={sheetOpen}
        onClose={onCloseSheet}
        onShare={onShare}
      />

      {toast ? (
        <div
          role="status"
          aria-live="polite"
          className="pointer-events-none fixed inset-x-0 bottom-24 z-50 flex justify-center px-5"
        >
          <div className="rounded-pill border border-vyrek-border bg-vyrek-elevated px-4 py-2 font-mono text-[11px] uppercase tracking-[0.18em] text-vyrek-text shadow-lg">
            {toast}
          </div>
        </div>
      ): null}
    </main>
  );
}
