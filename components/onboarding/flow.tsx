"use client";

import { useEffect, useRef, useState } from "react";
import { useRecord } from "@/lib/control/store";
import {
  ACCOUNTABILITY_OPTIONS,
  CHECKIN_OPTIONS,
  COACHING_STYLES,
  CONTACT_OPTIONS,
  DAYS,
  INJURY_AREAS,
  PLANS,
  blocker,
  emptyAnswers,
  planByKey,
  progress,
  stepsFor,
  summarise,
  type Answers,
  type InjuryDetail,
  type PlanKey,
  type Step,
} from "@/lib/onboarding/model";
import {
  INJURY_CARE_LABEL,
  INJURY_RECENCY_LABEL,
  INJURY_TRIGGER_OPTIONS,
  type InjuryValue,
} from "@/lib/quiz-flow";
import type { InvitePayload } from "@/lib/onboarding/token";

/**
 * THE ONBOARDING FLOW.
 *
 * ONE QUESTION A SCREEN. This is answered on a phone, standing up, probably
 * once. A long form with fourteen fields gets abandoned at field four; nine
 * screens with one decision each gets finished, because at every point the
 * next thing to do is the only thing on the screen.
 *
 * IT SAVES AS THEY GO. Somebody who gets a phone call halfway through comes
 * back to where they were, not to the beginning. That is also why the step is
 * in the URL — the back button does what a back button does.
 *
 * NOTHING IS ASKED THAT BEN ALREADY KNOWS. The invite carries their name,
 * email and phone; the first screen confirms rather than collects.
 *
 * THE CARD IS LAST. Every screen before it is answerable without commitment,
 * so by the time a price appears they have spent five minutes and told him
 * about their calf. Asking for a card first loses the whole funnel.
 *
 * WHAT IS REAL: the link, the answers, the plan, and the Stripe checkout —
 * genuinely, in test mode. What is not: the answers live in this browser
 * until there is a database, and the screen says so before they finish.
 */

type Props = {
  token: string;
  invite: InvitePayload;
  startStep?: string;
  cancelled?: boolean;
  /** What the quiz already told us, so nothing is asked twice. */
  prefill?: Partial<Answers>;
};

export function OnboardingFlow({ token, invite, startStep, cancelled, prefill }: Props) {
  const steps = stepsFor(invite.kind);
  const storeKey = `onboarding.${invite.email || invite.name}`;
  const { value: answers, save } = useRecord<Answers>(
    storeKey,
    { ...emptyAnswers(invite.name, invite.email, invite.phone), ...prefill },
  );

  const startIndex = Math.max(
    0,
    steps.findIndex((s) => s.key === startStep),
  );
  const [index, setIndex] = useState(startIndex === -1 ? 0 : startIndex);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(
    cancelled ? "No problem. Nothing was charged, so pick up where you left off." : null,
  );
  const headingRef = useRef<HTMLHeadingElement>(null);

  const step = steps[index];
  const stop = blocker(step.key, answers);
  const set = (patch: Partial<Answers>) => save({ ...answers, ...patch });

  // A plan Ben already agreed comes in on the invite, so they confirm rather
  // than choose.
  useEffect(() => {
    if (invite.plan && !answers.plan && planByKey(invite.plan)) {
      save({ ...answers, plan: invite.plan as PlanKey });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invite.plan]);

  /**
   * Moving between steps moves focus to the new heading.
   *
   * Without it a screen reader stays where the old button was and announces
   * nothing, and on a phone the browser keeps the previous scroll position —
   * so the person sees the middle of the next question.
   */
  function go(next: number) {
    setError(null);
    setIndex(next);
    window.history.replaceState(null, "", `?step=${steps[next].key}`);
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
    requestAnimationFrame(() => headingRef.current?.focus());
  }

  async function pay() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/onboarding/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // The client's own email lets the server dedupe and pre-fill Stripe
        // even on the short-SMS invite path, where the signed token carries
        // no email of its own.
        body: JSON.stringify({ token, plan: answers.plan, email: answers.email }),
      });
      const data = await res.json();
      if (data?.url) {
        window.location.href = data.url;
        return;
      }
      setError(
        data?.error === "STRIPE_NOT_CONFIGURED"
          ? "Payments are not switched on yet. Ben will sort this out. Nothing you have entered is lost."
          : data?.error === "SIGNING_NOT_CONFIGURED"
            ? "Payments are not switched on yet. Ben will sort this out. Nothing you have entered is lost."
            : data?.error === "ALREADY_SUBSCRIBED"
              ? "You're already set up and paying. There's nothing more to do here. Sign in to your account to manage it."
              : data?.error === "INVITE_INVALID"
                ? "This link has expired. Ask Ben for a new one. Your answers are saved on this device."
                : "Something went wrong reaching the payment page. Try again in a moment.",
      );
    } catch {
      setError("No connection. Try again when you are back online.");
    } finally {
      setBusy(false);
    }
  }

  const pct = Math.round(progress(steps, index) * 100);

  return (
    <div className="ob">
      <header className="ob-top">
        <span className="ob-mark">
          SUTH<span className="ob-mark__dot">.</span>
        </span>
        <span className="num ob-count">
          {index + 1} / {steps.length}
        </span>
      </header>

      <div className="ob-progress" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
        <span className="ob-progress__fill" style={{ width: `${pct}%` }} />
      </div>

      <main className="ob-main">
        <div className="ob-step" key={step.key}>
          <h1 className="ob-title" tabIndex={-1} ref={headingRef}>
            {step.title}
          </h1>
          <p className="ob-blurb">{step.blurb}</p>

          {error ? (
            <p className="ob-error" role="alert">
              {error}
            </p>
          ) : null}

          <div className="ob-body">
            <StepBody step={step} answers={answers} set={set} invite={invite} />
          </div>
        </div>
      </main>

      {/* The action bar is pinned. On a phone the next button must never be
          below the fold — that is the single commonest reason a step stalls. */}
      <footer className="ob-actions">
        {index > 0 ? (
          <button type="button" className="ob-back" onClick={() => go(index - 1)}>
            Back
          </button>
        ) : null}

        {stop ? (
          <span className="ob-stop" role="status">
            {stop}
          </span>
        ) : null}

        {step.key === "pay" ? (
          <button type="button" className="ob-next" onClick={pay} disabled={busy || !answers.plan}>
            {busy ? "Opening checkout…" : "Go to secure checkout"}
          </button>
        ) : (
          <button
            type="button"
            className="ob-next"
            onClick={() => go(index + 1)}
            disabled={Boolean(stop)}
          >
            {step.required ? "Continue" : "Continue"}
          </button>
        )}

        {!step.required && !stop ? (
          <button type="button" className="ob-skip" onClick={() => go(index + 1)}>
            Skip
          </button>
        ) : null}
      </footer>
    </div>
  );
}

/* ── The steps ─────────────────────────────────────────────────────────── */

function StepBody({
  step,
  answers,
  set,
  invite,
}: {
  step: Step;
  answers: Answers;
  set: (patch: Partial<Answers>) => void;
  invite: InvitePayload;
}) {
  switch (step.key) {
    case "welcome":
      return <Welcome invite={invite} />;
    case "account":
      return <Account answers={answers} set={set} />;
    case "about":
      return <About answers={answers} set={set} />;
    case "training":
      return (
        <Training answers={answers} set={set} beginner={invite.rail === "beginner"} />
      );
    case "health":
      return <Health answers={answers} set={set} />;
    case "availability":
      return <Availability answers={answers} set={set} />;
    case "support":
      return <Support answers={answers} set={set} />;
    case "photo":
      return <Photo answers={answers} set={set} />;
    case "plan":
      return <Plans answers={answers} set={set} invite={invite} />;
    case "pay":
      return (
        <Pay
          answers={answers}
          beginner={invite.rail === "beginner"}
          invite={invite}
        />
      );
    default:
      return null;
  }
}

function Welcome({ invite }: { invite: InvitePayload }) {
  const first = invite.name.split(/\s+/)[0];
  return (
    <div className="ob-welcome">
      <p className="ob-lead">
        {first}, this is where Ben gets what he needs to write your training.
      </p>
      <ul className="ob-checklist">
        {(invite.kind === "payment"
          ? ["Pick the plan that suits you", "Add a card", "Your first week lands with you"]
          : [
              "A few questions about you and your training",
              "Anything he needs to know about injuries",
              "The days you can train",
              "Choose a plan",
            ]
        ).map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
      <p className="ob-note">
        {invite.kind === "payment" ? "About two minutes." : "About five minutes."} You can
        stop and come back. It saves as you go.
      </p>
    </div>
  );
}

function Account({ answers, set }: { answers: Answers; set: (p: Partial<Answers>) => void }) {
  return (
    <div className="ob-fields">
      {/* Sign-in options first: for most people this is one tap instead of
          inventing a password they will forget. */}
      <div className="ob-oauth">
        <button type="button" className="ob-oauth__btn" data-provider="google" disabled>
          {/* Drawn, not a letter and not the  character: that glyph only
              exists in Apple's own system font and renders as a blank box on
              Android and Windows, which is most of the people opening this. */}
          <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden focusable="false">
            <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.4a5.5 5.5 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.6-5.2 3.6-8.8z" />
            <path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-3l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5H1.3v3.1A12 12 0 0 0 12 24z" />
            <path fill="#FBBC05" d="M5.3 14.2a7.2 7.2 0 0 1 0-4.6V6.6H1.3a12 12 0 0 0 0 10.8l4-3.2z" />
            <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.6l4 3.1c.9-2.9 3.6-5 6.7-5z" />
          </svg>
          Continue with Google
        </button>
        <button type="button" className="ob-oauth__btn" data-provider="apple" disabled>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden focusable="false">
            <path d="M17.05 12.54c.02-2.3 1.88-3.4 1.96-3.45-1.07-1.56-2.73-1.78-3.32-1.8-1.41-.14-2.76.83-3.48.83-.72 0-1.83-.81-3-.79-1.55.02-2.98.9-3.77 2.28-1.6 2.79-.41 6.92 1.15 9.18.76 1.11 1.67 2.35 2.86 2.3 1.15-.05 1.58-.74 2.97-.74 1.38 0 1.77.74 2.98.72 1.23-.02 2.01-1.13 2.76-2.24.87-1.28 1.23-2.52 1.25-2.59-.03-.01-2.4-.92-2.42-3.7zM14.9 5.1c.63-.77 1.06-1.83.94-2.9-.91.04-2.01.61-2.67 1.37-.59.68-1.1 1.76-.96 2.8 1.01.08 2.05-.51 2.69-1.27z" />
          </svg>
          Continue with Apple
        </button>
        <p className="ob-note">
          Not switched on yet. Google and Apple sign-in need their providers
          enabling. Use your email for now and you can link them later.
        </p>
      </div>

      <div className="ob-or" aria-hidden>
        <span>or</span>
      </div>

      <Field label="Email" hint="Where your plan lands every week.">
        <input
          type="email"
          inputMode="email"
          autoComplete="email"
          value={answers.email}
          onChange={(e) => set({ email: e.target.value })}
          className="ob-input"
          placeholder="you@example.com"
        />
      </Field>
      <Field label="Mobile" hint="Optional. Ben texts when a week goes out.">
        <input
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          value={answers.phone}
          onChange={(e) => set({ phone: e.target.value })}
          className="ob-input"
          placeholder="07700 900000"
        />
      </Field>
    </div>
  );
}

function About({ answers, set }: { answers: Answers; set: (p: Partial<Answers>) => void }) {
  return (
    <div className="ob-fields">
      <Field label="Your name">
        <input
          value={answers.name}
          autoComplete="name"
          onChange={(e) => set({ name: e.target.value })}
          className="ob-input"
        />
      </Field>
      <Field label="Date of birth" hint="Used for age-group targets, nothing else.">
        <input
          type="date"
          value={answers.dateOfBirth}
          onChange={(e) => set({ dateOfBirth: e.target.value })}
          className="ob-input"
        />
      </Field>
      <Field label="What are you training for?" hint="In your own words.">
        <textarea
          value={answers.goal}
          onChange={(e) => set({ goal: e.target.value })}
          className="ob-input ob-textarea"
          rows={3}
          placeholder="Sub-1:20 at Manchester. The sled is where I lose it."
        />
      </Field>
    </div>
  );
}

/**
 * Where they are now, asked two different ways.
 *
 * The racing version was being shown to everybody, including clients who
 * came down the "getting fit" quiz — a flow built specifically so that it
 * never mentions HYROX — and were then sent a setup link opening with "My
 * first HYROX / A few races in / Experienced". Every bit of care taken on
 * the way in, undone at the moment they became a client.
 *
 * The stored value is the same either way; only the reading changes.
 */
const EXPERIENCE_OPTIONS = {
  athlete: [
    { key: "first", label: "My first HYROX", note: "Not raced one yet" },
    { key: "some", label: "A few races in", note: "Know the stations" },
    { key: "experienced", label: "Experienced", note: "Chasing a time" },
  ],
  beginner: [
    { key: "first", label: "Starting from scratch", note: "Not training at the moment" },
    { key: "some", label: "A bit active", note: "Some weeks more than others" },
    { key: "experienced", label: "I train regularly", note: "Just want it to add up to something" },
  ],
} as const;

function Training({
  answers,
  set,
  beginner,
}: {
  answers: Answers;
  set: (p: Partial<Answers>) => void;
  beginner?: boolean;
}) {
  return (
    <div className="ob-fields">
      <fieldset className="ob-choices">
        <legend className="ob-label">Where are you now?</legend>
        {(beginner ? EXPERIENCE_OPTIONS.beginner : EXPERIENCE_OPTIONS.athlete).map((o) => (
          <button
            key={o.key}
            type="button"
            className="ob-choice"
            aria-pressed={answers.experience === o.key}
            data-on={answers.experience === o.key || undefined}
            onClick={() => set({ experience: o.key as Answers["experience"] })}
          >
            <span className="ob-choice__label">{o.label}</span>
            <span className="ob-choice__note">{o.note}</span>
          </button>
        ))}
      </fieldset>

      <fieldset className="ob-choices">
        <legend className="ob-label">Days a week you can train</legend>
        <div className="ob-numbers">
          {/* Starts at 1: someone with one day a week is exactly as welcome,
              and a picker that starts at 2 quietly says otherwise. Runs to 7
              so a "trains every day" quiz answer has a button to land on. */}
          {[1, 2, 3, 4, 5, 6, 7].map((n) => (
            <button
              key={n}
              type="button"
              className="ob-number"
              aria-pressed={answers.trainingDays === n}
              data-on={answers.trainingDays === n || undefined}
              onClick={() => set({ trainingDays: n })}
              aria-label={`${n} days a week`}
            >
              {n}
            </button>
          ))}
        </div>
      </fieldset>

      <Field label="What does your week look like now?" hint="Optional, but it saves a call.">
        <textarea
          value={answers.currentTraining}
          onChange={(e) => set({ currentTraining: e.target.value })}
          className="ob-input ob-textarea"
          rows={3}
          placeholder="Two runs, two gym sessions, a class on Saturday."
        />
      </Field>
    </div>
  );
}

/**
 * The layered health screen, borrowed from the quiz because it works:
 * tap an area, answer three tap-able follow-ups about it, add a note if
 * words help. Nobody has to compose a paragraph about their back unless
 * they want to.
 */
function Health({ answers, set }: { answers: Answers; set: (p: Partial<Answers>) => void }) {
  const areas = answers.injuryAreas;

  function toggleArea(key: string) {
    if (key === "none") {
      // "All clear" is an answer, not the absence of one — and it clears
      // anything else that was tapped by mistake.
      set({ injuryAreas: areas.includes("none") ? [] : ["none"], injuryDetails: {} });
      return;
    }
    const next = areas.includes(key)
      ? areas.filter((a) => a !== key)
      : [...areas.filter((a) => a !== "none"), key];
    const details = { ...answers.injuryDetails };
    if (!next.includes(key)) delete details[key];
    else if (!details[key]) details[key] = { recency: "", care: "", triggers: [], note: "" };
    set({ injuryAreas: next, injuryDetails: details });
  }

  function setDetail(area: string, patch: Partial<InjuryDetail>) {
    const current = answers.injuryDetails[area] ?? {
      recency: "",
      care: "",
      triggers: [],
      note: "",
    };
    set({
      injuryDetails: { ...answers.injuryDetails, [area]: { ...current, ...patch } },
    });
  }

  const flagged = areas.filter((a) => a !== "none");

  return (
    <div className="ob-fields">
      {/* Article 9 special-category data. Saying who sees it is part of the
          lawful basis, not a nicety — spec/09 §14. */}
      <p className="ob-privacy">
        Only Ben sees this. It is never shown to anyone else and never used for
        anything except writing your training.
      </p>

      <fieldset className="ob-choices">
        <legend className="ob-label">Any injuries he should plan around?</legend>
        <div className="ob-days">
          {INJURY_AREAS.map((area) => (
            <button
              key={area.key}
              type="button"
              className="ob-day ob-day--wide"
              data-on={areas.includes(area.key) || undefined}
              aria-pressed={areas.includes(area.key)}
              onClick={() => toggleArea(area.key)}
            >
              {area.label}
            </button>
          ))}
        </div>
      </fieldset>

      {flagged.map((area) => {
        const label =
          INJURY_AREAS.find((a) => a.key === area)?.label ?? "that area";
        const detail = answers.injuryDetails[area] ?? {
          recency: "",
          care: "",
          triggers: [],
          note: "",
        };
        const triggers = INJURY_TRIGGER_OPTIONS[area as InjuryValue] ?? [];
        return (
          <div key={area} className="ob-injury">
            <p className="ob-label">About your {label.toLowerCase()}</p>

            <p className="ob-hint">How is it right now?</p>
            <div className="ob-pills">
              {(["current", "recent", "past"] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  className="ob-pill"
                  data-on={detail.recency === r || undefined}
                  aria-pressed={detail.recency === r}
                  onClick={() => setDetail(area, { recency: r })}
                >
                  {INJURY_RECENCY_LABEL[r]}
                </button>
              ))}
            </div>

            <p className="ob-hint">Anyone helping you with it?</p>
            <div className="ob-pills">
              {(["physio", "self-managed", "not-assessed"] as const).map((c) => (
                <button
                  key={c}
                  type="button"
                  className="ob-pill"
                  data-on={detail.care === c || undefined}
                  aria-pressed={detail.care === c}
                  onClick={() => setDetail(area, { care: c })}
                >
                  {INJURY_CARE_LABEL[c]}
                </button>
              ))}
            </div>

            {triggers.length > 0 ? (
              <>
                <p className="ob-hint">What tends to set it off? Tap any.</p>
                <div className="ob-pills">
                  {triggers.map((t) => {
                    const on = detail.triggers.includes(t.value);
                    return (
                      <button
                        key={t.value}
                        type="button"
                        className="ob-pill"
                        data-on={on || undefined}
                        aria-pressed={on}
                        onClick={() =>
                          setDetail(area, {
                            triggers: on
                              ? detail.triggers.filter((x) => x !== t.value)
                              : [...detail.triggers, t.value],
                          })
                        }
                      >
                        {t.label}
                      </button>
                    );
                  })}
                </div>
              </>
            ) : null}

            <input
              value={detail.note}
              onChange={(e) => setDetail(area, { note: e.target.value })}
              className="ob-input"
              placeholder="Anything else about it, in your own words (optional)"
              aria-label={`Anything else about your ${label.toLowerCase()}`}
            />
          </div>
        );
      })}

      <Field label="Anything else he should know" hint="Conditions, medication, anything that changes a session.">
        <textarea
          value={answers.conditions}
          onChange={(e) => set({ conditions: e.target.value })}
          className="ob-input ob-textarea"
          rows={3}
          placeholder="Asthma. I carry an inhaler."
        />
      </Field>
    </div>
  );
}

/**
 * How they want to be coached. Two people on the same plan can need
 * opposite things from Ben, and asking up front beats finding out in
 * week three that somebody hates being chased.
 */
function Support({ answers, set }: { answers: Answers; set: (p: Partial<Answers>) => void }) {
  return (
    <div className="ob-fields">
      <fieldset className="ob-choices">
        <legend className="ob-label">What gets the best out of you?</legend>
        {COACHING_STYLES.map((o) => (
          <button
            key={o.key}
            type="button"
            className="ob-choice"
            aria-pressed={answers.coachingStyle === o.key}
            data-on={answers.coachingStyle === o.key || undefined}
            onClick={() => set({ coachingStyle: o.key })}
          >
            <span className="ob-choice__label">{o.label}</span>
            <span className="ob-choice__note">{o.note}</span>
          </button>
        ))}
      </fieldset>

      <fieldset className="ob-choices">
        <legend className="ob-label">Keeping you on track</legend>
        {ACCOUNTABILITY_OPTIONS.map((o) => (
          <button
            key={o.key}
            type="button"
            className="ob-choice"
            aria-pressed={answers.accountability === o.key}
            data-on={answers.accountability === o.key || undefined}
            onClick={() => set({ accountability: o.key })}
          >
            <span className="ob-choice__label">{o.label}</span>
            <span className="ob-choice__note">{o.note}</span>
          </button>
        ))}
      </fieldset>

      <fieldset className="ob-choices">
        <legend className="ob-label">How often should he check in on progress?</legend>
        <div className="ob-pills">
          {CHECKIN_OPTIONS.map((o) => (
            <button
              key={o.key}
              type="button"
              className="ob-pill"
              data-on={answers.checkIn === o.key || undefined}
              aria-pressed={answers.checkIn === o.key}
              onClick={() => set({ checkIn: o.key })}
            >
              {o.label}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="ob-choices">
        <legend className="ob-label">Best way to reach you</legend>
        <div className="ob-pills">
          {CONTACT_OPTIONS.map((o) => (
            <button
              key={o.key}
              type="button"
              className="ob-pill"
              data-on={answers.contactPreference === o.key || undefined}
              aria-pressed={answers.contactPreference === o.key}
              onClick={() => set({ contactPreference: o.key })}
            >
              {o.label}
            </button>
          ))}
        </div>
      </fieldset>
    </div>
  );
}

function Availability({ answers, set }: { answers: Answers; set: (p: Partial<Answers>) => void }) {
  const toggle = (key: string) =>
    set({
      availableDays: answers.availableDays.includes(key)
        ? answers.availableDays.filter((d) => d !== key)
        : [...answers.availableDays, key],
    });

  return (
    <div className="ob-fields">
      <fieldset className="ob-choices">
        <legend className="ob-label">Which days?</legend>
        <div className="ob-days">
          {DAYS.map((d) => (
            <button
              key={d.key}
              type="button"
              className="ob-day"
              data-on={answers.availableDays.includes(d.key) || undefined}
              aria-pressed={answers.availableDays.includes(d.key)}
              onClick={() => toggle(d.key)}
            >
              {d.label}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="ob-choices">
        <legend className="ob-label">When, usually?</legend>
        {[
          { key: "morning", label: "Mornings" },
          { key: "lunch", label: "Lunchtimes" },
          { key: "evening", label: "Evenings" },
          { key: "varies", label: "It varies" },
        ].map((o) => (
          <button
            key={o.key}
            type="button"
            className="ob-choice"
            aria-pressed={answers.preferredTime === o.key}
            data-on={answers.preferredTime === o.key || undefined}
            onClick={() => set({ preferredTime: o.key as Answers["preferredTime"] })}
          >
            <span className="ob-choice__label">{o.label}</span>
          </button>
        ))}
      </fieldset>
    </div>
  );
}

/**
 * The photo screen with an actual editor: after choosing a picture you
 * can zoom with a slider and drag it around the circle until your face
 * is where you want it. Every adjustment re-crops the stored 320px
 * square, so what you see in the circle is exactly what is kept.
 *
 * The full-resolution original lives only in component state — it is a
 * phone photo measured in megabytes and localStorage is not.
 */
function Photo({ answers, set }: { answers: Answers; set: (p: Partial<Answers>) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);

  const SIZE = 320;

  function crop(image: HTMLImageElement, z: number, off: { x: number; y: number }) {
    const canvas = document.createElement("canvas");
    canvas.width = SIZE;
    canvas.height = SIZE;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    // A corrupt or zero-dimension file makes the scale Infinity and
    // drawImage throw. Bail cleanly rather than kill the photo step.
    if (!image.width || !image.height) return;
    const scale = Math.max(SIZE / image.width, SIZE / image.height) * z;
    const w = image.width * scale;
    const h = image.height * scale;
    // The image must always cover the square, so the drag can never pull
    // an edge into view and leave a black stripe on the avatar.
    const maxX = Math.max(0, (w - SIZE) / 2);
    const maxY = Math.max(0, (h - SIZE) / 2);
    const x = Math.min(maxX, Math.max(-maxX, off.x));
    const y = Math.min(maxY, Math.max(-maxY, off.y));
    ctx.drawImage(image, (SIZE - w) / 2 + x, (SIZE - h) / 2 + y, w, h);
    set({ photoDataUrl: canvas.toDataURL("image/jpeg", 0.82) });
    return { x, y };
  }

  function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const image = new Image();
      image.onload = () => {
        setImg(image);
        setZoom(1);
        setOffset({ x: 0, y: 0 });
        crop(image, 1, { x: 0, y: 0 });
      };
      image.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  }

  function applyZoom(z: number) {
    setZoom(z);
    if (img) {
      const clamped = crop(img, z, offset);
      if (clamped) setOffset(clamped);
    }
  }

  function onPointerDown(e: React.PointerEvent) {
    if (!img) return;
    (e.target as Element).setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!img || !drag.current) return;
    const next = {
      x: drag.current.ox + (e.clientX - drag.current.x),
      y: drag.current.oy + (e.clientY - drag.current.y),
    };
    const clamped = crop(img, zoom, next);
    if (clamped) setOffset(clamped);
  }

  function onPointerUp() {
    drag.current = null;
  }

  return (
    <div className="ob-photo">
      <div
        className="ob-avatar"
        data-empty={!answers.photoDataUrl || undefined}
        data-editable={Boolean(img) || undefined}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        style={img ? { touchAction: "none", cursor: "grab" } : undefined}
      >
        {answers.photoDataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={answers.photoDataUrl} alt="Your profile photo" draggable={false} />
        ) : (
          <span aria-hidden>+</span>
        )}
      </div>

      {img ? (
        <div className="ob-photo-tools">
          <label className="ob-hint" htmlFor="ob-zoom">
            Zoom, then drag the photo to line it up
          </label>
          <input
            id="ob-zoom"
            type="range"
            min={1}
            max={3}
            step={0.05}
            value={zoom}
            onChange={(e) => applyZoom(Number(e.target.value))}
            className="ob-zoom"
          />
        </div>
      ) : null}

      <label className="ob-upload">
        {answers.photoDataUrl ? "Choose a different photo" : "Take or choose a photo"}
        <input
          ref={input}
          type="file"
          accept="image/*"
          capture="user"
          onChange={pick}
          className="sr-only"
        />
      </label>

      {answers.photoDataUrl ? (
        <button
          type="button"
          className="ob-remove"
          onClick={() => {
            setImg(null);
            set({ photoDataUrl: "" });
          }}
        >
          Remove
        </button>
      ) : null}
    </div>
  );
}

/** "£220" for whole pounds, "£12.99" otherwise. */
function formatPence(pence: number): string {
  return pence % 100 === 0
    ? `£${pence / 100}`
    : `£${(pence / 100).toFixed(2)}`;
}

function Plans({
  answers,
  set,
  invite,
}: {
  answers: Answers;
  set: (p: Partial<Answers>) => void;
  invite: InvitePayload;
}) {
  // Ben agreed a personal rate with this client, so there is nothing to
  // choose: one card, their plan, their price. Showing the public menu here
  // would show an existing client a different number from the one Ben
  // quoted them, at the exact moment they reach for a card.
  if (invite.amountPence) {
    const p = planByKey(invite.plan) ?? PLANS[0];
    return (
      <div className="ob-plans">
        <button
          type="button"
          className="ob-plan"
          data-on
          data-featured
          onClick={() => set({ plan: p.key })}
          aria-pressed
        >
          <span className="ob-plan__flag">Your plan</span>
          <span className="ob-plan__head">
            <span className="ob-plan__name">{p.name}</span>
            <span className="ob-plan__price">
              <span className="num">{formatPence(invite.amountPence)}</span>
              <span className="ob-plan__cadence">a month</span>
            </span>
          </span>
          <span className="ob-plan__summary">
            The rate you agreed with Ben. Collected monthly, cancel any time.
          </span>
          <ul className="ob-plan__list">
            {p.includes.map((i) => (
              <li key={i}>{i}</li>
            ))}
          </ul>
        </button>
      </div>
    );
  }

  return (
    <div className="ob-plans">
      {PLANS.map((p) => (
        <button
          key={p.key}
          type="button"
          className="ob-plan"
          data-on={answers.plan === p.key || undefined}
          data-featured={p.featured || undefined}
          onClick={() => set({ plan: p.key })}
          aria-pressed={answers.plan === p.key}
        >
          {p.featured ? <span className="ob-plan__flag">Most popular</span> : null}
          <span className="ob-plan__head">
            <span className="ob-plan__name">{p.name}</span>
            <span className="ob-plan__price">
              <span className="num">{p.display}</span>
              <span className="ob-plan__cadence">{p.cadence}</span>
            </span>
          </span>
          <span className="ob-plan__summary">{p.summary}</span>
          <ul className="ob-plan__list">
            {p.includes.map((i) => (
              <li key={i}>{i}</li>
            ))}
          </ul>
          {p.trialDays > 0 ? (
            <span className="ob-plan__trial">{p.trialDays} days free first</span>
          ) : null}
        </button>
      ))}
    </div>
  );
}

function Pay({
  answers,
  beginner,
  invite,
}: {
  answers: Answers;
  beginner?: boolean;
  invite: InvitePayload;
}) {
  const plan = planByKey(answers.plan);
  const rows = summarise(answers, beginner);
  // The agreed rate wins over the public price, and an agreed rate has no
  // free days — the first collection is at checkout.
  const price = invite.amountPence
    ? formatPence(invite.amountPence)
    : plan?.display;
  const trialDays = invite.amountPence ? 0 : (plan?.trialDays ?? 0);

  return (
    <div className="ob-pay">
      {plan ? (
        <div className="ob-total">
          <span className="ob-total__name">{plan.name}</span>
          <span className="ob-total__price num">
            {price}
            <span className="ob-plan__cadence">{plan.cadence}</span>
          </span>
          {trialDays > 0 ? (
            <span className="ob-total__trial">
              Nothing today. Your first {trialDays} days are free.
            </span>
          ) : null}
        </div>
      ) : null}

      {rows.length ? (
        <div className="ob-summary">
          <p className="ob-label">What Ben has</p>
          <dl className="ob-summary__list">
            {rows.map((r) => (
              <div key={r.label}>
                <dt>{r.label}</dt>
                <dd>{r.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      ) : null}

      <p className="ob-note">
        Card details are handled by Stripe. They never touch Suth Performance.
        Cancel any time from your account.
      </p>

      <p className="ob-note ob-note--warn">
        Your answers are saved on this device until the client database is
        connected. Ben has what you sent him; do not clear this browser before
        your first week arrives.
      </p>
    </div>
  );
}

/* ── Bits ──────────────────────────────────────────────────────────────── */

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="ob-field">
      <span className="ob-label">{label}</span>
      {children}
      {hint ? <span className="ob-hint">{hint}</span> : null}
    </label>
  );
}
