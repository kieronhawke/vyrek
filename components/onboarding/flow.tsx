"use client";

import { useEffect, useRef, useState } from "react";
import { useRecord } from "@/lib/control/store";
import {
  DAYS,
  CUSTOM_PLAN_KEY,
  PLANS,
  blocker,
  emptyAnswers,
  planByKey,
  planFor,
  plansFor,
  progress,
  stepsFor,
  summarise,
  type Answers,
  type PlanKey,
  type Step,
} from "@/lib/onboarding/model";
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

type Props = { token: string; invite: InvitePayload; startStep?: string; cancelled?: boolean };

export function OnboardingFlow({ token, invite, startStep, cancelled }: Props) {
  const steps = stepsFor(invite.kind);
  const storeKey = `onboarding.${invite.email || invite.name}`;
  const { value: answers, save } = useRecord<Answers>(
    storeKey,
    emptyAnswers(invite.name, invite.email, invite.phone),
  );

  const startIndex = Math.max(
    0,
    steps.findIndex((s) => s.key === startStep),
  );
  const [index, setIndex] = useState(startIndex === -1 ? 0 : startIndex);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(
    cancelled ? "No problem — nothing was charged. Pick up where you left off." : null,
  );
  const headingRef = useRef<HTMLHeadingElement>(null);

  const step = steps[index];
  const stop = blocker(step.key, answers);
  const set = (patch: Partial<Answers>) => save({ ...answers, ...patch });

  // A plan Ben already agreed comes in on the invite, so they confirm rather
  // than choose.
  useEffect(() => {
    /* An agreed price is itself a pre-selection: he quoted them a number, so
       it is already ticked when they arrive rather than sitting there as one
       of four things to weigh up. */
    if (!answers.plan && invite.customPence) {
      save({ ...answers, plan: CUSTOM_PLAN_KEY });
      return;
    }
    if (invite.plan && !answers.plan && planByKey(invite.plan)) {
      save({ ...answers, plan: invite.plan as PlanKey });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invite.plan, invite.customPence]);

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
        body: JSON.stringify({ token, plan: answers.plan }),
      });
      const data = await res.json();
      if (data?.url) {
        window.location.href = data.url;
        return;
      }
      setError(
        data?.error === "STRIPE_NOT_CONFIGURED"
          ? "Payments are not switched on yet. Ben will sort this out — nothing you have entered is lost."
          : data?.error === "INVITE_INVALID"
            ? "This link has expired. Ask Ben for a new one — your answers are saved on this device."
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
    case "photo":
      return <Photo answers={answers} set={set} />;
    case "plan":
      return <Plans answers={answers} set={set} invite={invite} />;
    case "pay":
      return <Pay answers={answers} beginner={invite.rail === "beginner"} invite={invite} />;
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
        stop and come back — it saves as you go.
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
          Not switched on yet — Google and Apple sign-in need their providers
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
          {[2, 3, 4, 5, 6].map((n) => (
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

function Health({ answers, set }: { answers: Answers; set: (p: Partial<Answers>) => void }) {
  return (
    <div className="ob-fields">
      {/* Article 9 special-category data. Saying who sees it is part of the
          lawful basis, not a nicety — spec/09 §14. */}
      <p className="ob-privacy">
        Only Ben sees this. It is never shown to anyone else and never used for
        anything except writing your training.
      </p>
      <Field label="Injuries, past or present">
        <textarea
          value={answers.injuries}
          onChange={(e) => set({ injuries: e.target.value })}
          className="ob-input ob-textarea"
          rows={3}
          placeholder="Left calf tear in June. Fine now but it flares if I add mileage fast."
        />
      </Field>
      <Field label="Anything else he should know">
        <textarea
          value={answers.conditions}
          onChange={(e) => set({ conditions: e.target.value })}
          className="ob-input ob-textarea"
          rows={3}
          placeholder="Asthma — I carry an inhaler."
        />
      </Field>
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

function Photo({ answers, set }: { answers: Answers; set: (p: Partial<Answers>) => void }) {
  const input = useRef<HTMLInputElement>(null);

  function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    // Downscaled before it is stored: a modern phone photo is 4MB and this
    // goes into localStorage, which has a handful of megabytes in total.
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const size = 320;
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        const scale = Math.max(size / img.width, size / img.height);
        const w = img.width * scale;
        const h = img.height * scale;
        ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
        set({ photoDataUrl: canvas.toDataURL("image/jpeg", 0.82) });
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  }

  return (
    <div className="ob-photo">
      <div className="ob-avatar" data-empty={!answers.photoDataUrl || undefined}>
        {answers.photoDataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={answers.photoDataUrl} alt="Your profile photo" />
        ) : (
          <span aria-hidden>+</span>
        )}
      </div>

      <label className="ob-upload">
        {answers.photoDataUrl ? "Choose a different one" : "Take or choose a photo"}
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
        <button type="button" className="ob-remove" onClick={() => set({ photoDataUrl: "" })}>
          Remove
        </button>
      ) : null}
    </div>
  );
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
  /*
   * A price Ben agreed with this person appears first, and only on their
   * link. It comes out of the signed invite rather than from anything this
   * page was told, so it cannot be edited into existence or edited down.
   */
  const plans = plansFor(
    invite.customPence
      ? { pence: invite.customPence, name: invite.customName }
      : null,
  );

  return (
    <div className="ob-plans">
      {plans.map((p) => (
        <button
          key={p.key}
          type="button"
          className="ob-plan"
          data-on={answers.plan === p.key || undefined}
          data-featured={p.featured || undefined}
          onClick={() => set({ plan: p.key })}
          aria-pressed={answers.plan === p.key}
        >
          {/* "Agreed with Ben" rather than "Most popular" on a bespoke price:
              claiming a plan built for one person is popular is a fabricated
              social proof, and it is also plainly silly to them. */}
          {p.featured ? (
            <span className="ob-plan__flag">
              {p.key === CUSTOM_PLAN_KEY ? "Agreed with Ben" : "Most popular"}
            </span>
          ) : null}
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
  /* Resolved against the invite, so the total on the last screen is the
     agreed price and not a blank where a standard plan key would have been. */
  const plan = planFor(
    answers.plan,
    invite.customPence
      ? { pence: invite.customPence, name: invite.customName }
      : null,
  );
  const rows = summarise(answers, beginner);

  return (
    <div className="ob-pay">
      {plan ? (
        <div className="ob-total">
          <span className="ob-total__name">{plan.name}</span>
          <span className="ob-total__price num">
            {plan.display}
            <span className="ob-plan__cadence">{plan.cadence}</span>
          </span>
          {plan.trialDays > 0 ? (
            <span className="ob-total__trial">
              Nothing today — your first {plan.trialDays} days are free.
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
