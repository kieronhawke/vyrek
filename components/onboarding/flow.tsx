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
import { paymentSchedule, scheduleLines } from "@/lib/onboarding/schedule";
import { PasswordField } from "@/components/shared/password-field";
import { MIN_PASSWORD_LENGTH } from "@/lib/password-strength";

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
  /* React state, deliberately NOT part of `answers`.
     `answers` is persisted to this browser's storage so somebody who gets a
     phone call halfway through comes back to where they were. A password does
     not belong in that, and would still be sitting there long after they had
     finished. */
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  /* Coming back from Stripe having pressed cancel is not a failure, and it was
     being rendered through the error box — red border, role="alert" — which
     reads as "your payment was declined" to somebody already wondering whether
     something went wrong. */
  const [notice, setNotice] = useState<string | null>(
    cancelled ? "No problem, nothing was charged. Carry on when you're ready." : null,
  );
  const headingRef = useRef<HTMLHeadingElement>(null);

  const step = steps[index];
  const needsPassword = step.key === "account";
  const agreedRate = typeof invite.amountPence === "number";
  /* `blocker("pay")` says "Choose a plan first, then head to checkout" when no
     plan is set — right for the published tiers, and nonsense on an agreed
     rate, where there is no plan to choose and the step it names does not
     exist in this journey. It rendered directly above a button that was
     already lit, which reads as a form refusing to work. */
  const modelStop =
    step.key === "pay" && agreedRate ? null : blocker(step.key, answers);
  const stop =
    modelStop ??
    (needsPassword && !answers.name.trim()
      ? "What should Ben call you?"
      : needsPassword && password.length > 0 && password.length < MIN_PASSWORD_LENGTH
        ? `A password needs to be at least ${MIN_PASSWORD_LENGTH} characters.`
        : needsPassword && password.length === 0
          ? "Choose a password, so you can get back into your account."
          : null);
  const set = (patch: Partial<Answers>) => save({ ...answers, ...patch });

  /* A plan Ben already chose comes in on the invite, so it is ticked when they
     arrive rather than sitting there as one of three things to weigh up.

     An AGREED RATE has nothing to tick. There is no plan on that invite by
     design — checkout prices it from the signed amount and ignores anything
     this page sends — so the plan step is not in their journey at all. */
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
    /* `notice` deliberately survives this. It is set as the client leaves the
       details step and is meant to be read on the next one. */
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

  /**
   * FINISHING THE DETAILS STEP CREATES THE ACCOUNT.
   *
   * Here rather than at the card button, for one reason: if this comes back
   * saying the account already existed — because Ben sent a link before, or
   * because they abandoned a previous run at this one — the client needs to be
   * TOLD, and told while they are still looking at a screen that can say it.
   * Doing it at the card button means the next thing that happens is a
   * redirect to Stripe, and the message is gone before it is read.
   *
   * Blocking, unlike everything else this flow does before checkout. A
   * failure here means "you would pay and not be able to sign in", so it stops
   * rather than shrugging.
   */
  async function finishAccount() {
    if (!password) {
      go(index + 1);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/onboarding/account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          name: answers.name,
          email: answers.email,
          phone: answers.phone,
          password,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(
          data?.error === "WEAK_PASSWORD"
            ? "That password is too short. Use at least 8 characters."
            : data?.error === "EMAIL_INVALID"
              ? "That email address does not look right."
              : data?.error === "INVITE_INVALID"
                ? "This link has expired. Ask Ben for a new one."
                : "Could not set your account up just now. Nothing has been charged. Try again in a moment.",
        );
        return;
      }
      /* The endpoint will not overwrite an existing password on nothing more
         than possession of a link, so the one they just typed is not the one
         that works. This is the only screen that can say so. */
      if (data?.alreadyRegistered) {
        setNotice(
          "You already have an account with this email, so your existing password still applies. Nothing else changes.",
        );
      }
      go(index + 1);
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

          {notice && !error ? (
            <p className="ob-note" role="status">
              {notice}
            </p>
          ) : null}

          {error ? (
            <p className="ob-error" role="alert">
              {error}
            </p>
          ) : null}

          <div className="ob-body">
            <StepBody
              step={step}
              answers={answers}
              set={set}
              invite={invite}
              password={password}
              setPassword={setPassword}
            />
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
          <button
            type="button"
            className="ob-next"
            onClick={pay}
            disabled={busy || (!answers.plan && typeof invite.amountPence !== "number")}
          >
            {busy ? "Opening checkout…" : "Go to secure checkout"}
          </button>
        ) : (
          <button
            type="button"
            className="ob-next"
            onClick={step.key === "account" ? finishAccount : () => go(index + 1)}
            disabled={Boolean(stop) || busy}
          >
            {busy && step.key === "account" ? "Setting up…" : "Continue"}
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
  password,
  setPassword,
}: {
  step: Step;
  answers: Answers;
  set: (patch: Partial<Answers>) => void;
  invite: InvitePayload;
  password: string;
  setPassword: (v: string) => void;
}) {
  switch (step.key) {
    case "welcome":
      return <Welcome invite={invite} />;
    case "account":
      return (
        <Account
          answers={answers}
          set={set}
          password={password}
          setPassword={setPassword}
        />
      );
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

/**
 * THE FIRST SCREEN, WHICH HAS TO KNOW WHO IT IS TALKING TO.
 *
 * Every line here used to address a new client. "This is where Ben gets what
 * he needs to write your training" and "your first week lands with you" are
 * true of somebody who has just found him, and slightly insulting to somebody
 * he has coached for two years who has been sent a link to move onto card
 * payment. The checklist promised a plan menu that no longer exists on that
 * journey, which would have been the first thing they noticed was wrong.
 */
function Welcome({ invite }: { invite: InvitePayload }) {
  const first = invite.name.split(/\s+/)[0];
  const payment = invite.kind === "payment";
  /* The money, said once from the same numbers the checkout charges: what
     comes out today (a balance owed, the first month, or nothing) and what
     comes out monthly from when. See lib/onboarding/schedule.ts. */
  const lines =
    typeof invite.amountPence === "number"
      ? scheduleLines(
          paymentSchedule({
            amountPence: invite.amountPence,
            dueTodayPence: invite.dueTodayPence,
            startDay: invite.startDay,
          }),
        )
      : null;

  return (
    <div className="ob-welcome">
      <p className="ob-lead">
        {payment
          ? `${first}, this is where you put your card on file.`
          : `${first}, this is where Ben gets what he needs to write your training.`}
      </p>
      <ul className="ob-checklist">
        {(payment
          ? [
              "Your details, and a password for your account",
              lines ? `Your card. ${lines.today}` : "Your card",
              lines ? lines.monthly : "Your first payment is taken today.",
            ]
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
        {payment ? "About two minutes." : "About five minutes."} You can stop
        and come back. It saves as you go.
      </p>
    </div>
  );
}

/**
 * WHO THEY ARE, AND A WAY BACK IN.
 *
 * TWO DEAD BUTTONS USED TO SIT AT THE TOP OF THIS SCREEN. "Continue with
 * Google" and "Continue with Apple", both carrying a literal `disabled`, under
 * a note apologising that neither was switched on. That is three lines of
 * screen, on a phone, above the only two fields that worked — spent telling
 * somebody about a feature they cannot have. They are gone. When OAuth is
 * genuinely wired up they can come back, working.
 *
 * THE PASSWORD IS NEW AND IT MATTERS. The only door into the account used to
 * be a single-use sign-in link emailed after checkout. Lose that email and
 * somebody paying every month cannot reach the thing they are paying for.
 */
function Account({
  answers,
  set,
  password,
  setPassword,
}: {
  answers: Answers;
  set: (p: Partial<Answers>) => void;
  password: string;
  setPassword: (v: string) => void;
}) {
  return (
    <div className="ob-fields">
      <Field label="Your name">
        <input
          type="text"
          autoComplete="name"
          value={answers.name}
          onChange={(e) => set({ name: e.target.value })}
          className="ob-input"
          placeholder="Sam Reeves"
        />
      </Field>
      <Field label="Email" hint="Your receipts go here, and it is how you sign in.">
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
      <Field label="Mobile" hint="Optional. So Ben can reach you about a payment.">
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
      {/* The meter carries the rule and the encouragement, so there is no
          separate hint line saying "at least 8 characters" — it says that
          itself until there are eight, then moves on to what would actually
          make the password better. Their own name and email go in so it can
          object to a password built out of either. */}
      <PasswordField
        value={password}
        onChange={setPassword}
        personal={[answers.name, answers.email]}
        labelClassName="ob-label"
        inputClassName="ob-input"
      />
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
}: {
  answers: Answers;
  set: (p: Partial<Answers>) => void;
  invite: InvitePayload;
}) {
  /* Only new clients ever reach this step. An existing client on a rate Ben
     agreed has no menu — see PAYMENT_STEPS in lib/onboarding/model.ts. */
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

/**
 * THE LAST SCREEN BEFORE THE CARD.
 *
 * For an existing client this says four things and nothing else: the amount,
 * the day it first comes out, that they can stop whenever they like, and who
 * handles the card. Everything that used to be here besides those — a package
 * name, a list of what that package includes, a summary of questionnaire
 * answers they were never asked — described somebody else's arrangement. On
 * the one screen where a person decides whether to trust you with a card, a
 * sentence that is not true about them is the most expensive thing you can
 * put in front of them.
 */
function Pay({
  answers,
  beginner,
  invite,
}: {
  answers: Answers;
  beginner?: boolean;
  invite: InvitePayload;
}) {
  const agreed = typeof invite.amountPence === "number";

  if (agreed) {
    /* Both lines, always: what the card is charged the moment they press the
       button, and what it is charged monthly from when. A client who owes a
       balance sees "£100 today" here, in the same words as the email and the
       text, before Stripe asks for the card. */
    const schedule = paymentSchedule({
      amountPence: invite.amountPence!,
      dueTodayPence: invite.dueTodayPence,
      startDay: invite.startDay,
    });
    const lines = scheduleLines(schedule);
    return (
      <div className="ob-pay">
        <div className="ob-total">
          <span className="ob-total__name">The rate you agreed with Ben</span>
          <span className="ob-total__price num">
            {formatPence(schedule.monthlyPence)}
            <span className="ob-plan__cadence">a month</span>
          </span>
          <span className="ob-total__trial">{lines.today}</span>
          <span className="ob-total__trial">{lines.monthly}</span>
        </div>

        <p className="ob-note">
          {schedule.dueTodayPence > 0
            ? "The balance is what you and Ben agreed you owe so far. After that it collects automatically each month. Cancel any time from your account."
            : "It collects automatically each month from then on. Cancel any time from your account."}
        </p>

        <p className="ob-note">
          Card details are handled by Stripe. They never touch Suth Performance.
        </p>
      </div>
    );
  }

  const plan = planByKey(answers.plan);
  const rows = summarise(answers, beginner);
  const trialDays = plan?.trialDays ?? 0;

  return (
    <div className="ob-pay">
      {plan ? (
        <div className="ob-total">
          <span className="ob-total__name">{plan.name}</span>
          <span className="ob-total__price num">
            {plan.display}
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

      <p className="ob-note">
        Your answers go straight to Ben when you check out, so he has your
        injuries, availability and how you like to be coached before he writes
        week one. You don&apos;t need to keep this page open.
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
