"use client";

import { useState } from "react";
import Link from "next/link";
import { BookingPicker } from "@/components/booking/booking-picker";
import {
  DIAL_CODES,
  DEFAULT_ISO,
  dialCodeFor,
  placeholderFor,
  optionLabel,
  isPhoneValid,
  toE164,
} from "@/lib/dial-codes";
import type { QuizAnswers } from "@/lib/quiz-flow";

/**
 * THE END OF THE ASSESSMENT ROUTE: PICK A TIME.
 *
 * It used to end on "First Race Programme" — a twelve-week plan reveal with
 * a price behind it. On a route that opens "free fitness assessment" and
 * asks nothing about racing, that was the wrong ending twice over: it named
 * a race to somebody who never mentioned one, and it offered a product to
 * somebody who was promised a conversation.
 *
 * TWO TAPS, NOT ONE, AND THAT IS A CORRECTION.
 *
 * This screen used to book the moment a time was tapped. It read as slick
 * and behaved badly: there was no moment to check the day before it was
 * committed, no button to press, and on a phone the whole thing happened
 * below the fold with nothing to confirm it had. Choosing a time now selects
 * it; a panel then states plainly who is being called and when, and the
 * booking happens on a button.
 *
 * AND IT CANNOT BOOK WITHOUT SOMEWHERE TO RING.
 *
 * The old version posted whatever it had. If the name was missing — a draft
 * saved before this route asked for one, resumed a week later — the server
 * answered "Please enter your name" on a screen with no name field on it,
 * which is a dead end dressed as a validation error. Anything missing is now
 * asked for right here, next to the time they just picked.
 */

type Slot = { startISO: string; label: string };

function formatChosen(startISO: string): string {
  const at = new Date(startISO);
  const day = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(at);
  const time = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })
    .format(at)
    .replace(/\s?(am|pm)/i, (s) => s.trim().toLowerCase());
  return `${day} at ${time}`;
}

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export function BookSlotScreen({
  answers,
  brief,
  onBooked,
}: {
  answers: QuizAnswers;
  /** The plain-text summary of everything they answered, for Ben. */
  brief: string;
  onBooked: (startISO: string, ref: string) => void;
}) {
  const [slot, setSlot] = useState<Slot | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Seeded from the quiz, editable here. Whatever the quiz already knows is
  // filled in and stays out of the way; only what is missing is asked for.
  const [name, setName] = useState(answers.name ?? "");
  const [email, setEmail] = useState(answers.email ?? "");
  const [iso, setIso] = useState(answers.phoneIso ?? DEFAULT_ISO);
  const [phone, setPhone] = useState(answers.phone ?? "");

  const first = (name || answers.name || "").trim().split(/\s+/)[0] || "you";
  const country = dialCodeFor(iso);

  const needsName = name.trim().length < 2;
  const needsEmail = !EMAIL.test(email.trim());
  const needsPhone = !isPhoneValid(iso, phone);
  const missing = needsName || needsEmail || needsPhone;

  const book = async () => {
    if (!slot || missing) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          // Stored in E.164 so Twilio can dial it from anywhere.
          phone: toE164(iso, phone) ?? phone,
          startISO: slot.startISO,
          rail: answers.rail,
          note: brief,
        }),
      });
      const d = (await res.json()) as {
        ok: boolean;
        ref?: string;
        error?: string;
        code?: string;
      };
      if (!d.ok || !d.ref) {
        setError(d.error ?? "That didn't work. Pick another time and it will.");
        // Somebody took it while they were typing. Back to the grid rather
        // than an error sitting under a time that no longer exists.
        if (d.code === "TAKEN") setSlot(null);
        return;
      }
      onBooked(slot.startISO, d.ref);
    } catch {
      setError("Couldn't reach the server. Try that again in a moment.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-suth-accent">
        [ Last step ]
      </p>
      <h1 className="mt-4 text-balance text-2xl font-bold leading-tight tracking-[-0.02em] text-suth-text md:text-3xl lg:text-[1.6rem] xl:text-3xl">
        When shall Ben call {first}?
      </h1>
      <p className="mt-2 max-w-prose text-sm leading-relaxed text-suth-text-secondary md:text-base lg:text-sm">
        Half an hour on the phone, free, no obligation. He&apos;ll have read
        everything you just told him before he rings.
      </p>

      {error ? (
        <p
          role="alert"
          className="mt-4 rounded-lg border border-suth-danger/40 bg-suth-danger/10 px-4 py-3 text-sm text-suth-text"
        >
          {error}
        </p>
      ) : null}

      <div className="mt-6">
        <BookingPicker onChosen={setSlot} />
      </div>

      {/* The confirm step. It appears under the picker the moment a time is
          chosen and carries everything the booking needs, so there is never
          a state where the button is live and the request would be refused. */}
      {slot ? (
        <div className="mt-8 rounded-2xl border border-suth-accent/40 bg-suth-elevated p-5 md:p-6">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-suth-accent">
            [ Your time ]
          </p>
          <p className="mt-2 text-lg font-semibold leading-snug text-suth-text">
            {formatChosen(slot.startISO)}
          </p>

          {missing ? (
            <>
              <p className="mt-4 text-sm leading-relaxed text-suth-text-secondary">
                Last thing — where should Ben reach you?
              </p>
              <div className="mt-4 space-y-3">
                {needsName ? (
                  <Field label="Your name">
                    <input
                      type="text"
                      value={name}
                      autoComplete="given-name"
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Sam"
                      className="h-12 w-full rounded-lg border border-suth-border bg-suth-base px-4 text-base text-suth-text outline-none transition-colors focus:border-suth-accent"
                    />
                  </Field>
                ) : null}
                {needsEmail ? (
                  <Field label="Email">
                    <input
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="h-12 w-full rounded-lg border border-suth-border bg-suth-base px-4 text-base text-suth-text outline-none transition-colors focus:border-suth-accent"
                    />
                  </Field>
                ) : null}
                {needsPhone ? (
                  <Field label="Mobile">
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <select
                        aria-label="Country dialling code"
                        value={iso}
                        onChange={(e) => setIso(e.target.value)}
                        className="h-12 w-full rounded-lg border border-suth-border bg-suth-base px-3 text-base text-suth-text outline-none transition-colors focus:border-suth-accent sm:w-[13rem] sm:shrink-0"
                      >
                        {DIAL_CODES.map((c) => (
                          <option key={c.iso} value={c.iso}>
                            {optionLabel(c)}
                          </option>
                        ))}
                      </select>
                      <input
                        type="tel"
                        inputMode="tel"
                        autoComplete="tel-national"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder={placeholderFor(iso)}
                        className="h-12 min-w-0 flex-1 rounded-lg border border-suth-border bg-suth-base px-4 text-base text-suth-text outline-none transition-colors focus:border-suth-accent"
                      />
                    </div>
                  </Field>
                ) : null}
              </div>
            </>
          ) : (
            <p className="mt-2 text-sm leading-relaxed text-suth-text-secondary">
              He&apos;ll ring {phone ? `${country.dial} ${phone}` : "your mobile"}.
            </p>
          )}

          <button
            type="button"
            onClick={book}
            disabled={busy || missing}
            className="mt-5 inline-flex h-14 w-full items-center justify-center rounded-pill bg-suth-accent px-6 text-base font-semibold tracking-tight text-[#0A0A0A] transition-[background,opacity] duration-fast hover:bg-suth-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? "Booking…" : "Confirm this time →"}
          </button>

          <button
            type="button"
            onClick={() => setSlot(null)}
            className="mt-3 inline-flex h-11 w-full items-center justify-center rounded-pill border border-suth-border px-6 text-sm font-medium text-suth-text-secondary transition-colors hover:border-suth-border-strong hover:text-suth-text"
          >
            Choose a different time
          </button>
        </div>
      ) : (
        <p className="mt-6 text-xs leading-relaxed text-suth-text-tertiary">
          Times are UK. Pick one and you&apos;ll get a chance to check it before
          anything is booked.
        </p>
      )}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block font-mono text-[11px] uppercase tracking-[0.18em] text-suth-text-tertiary">
        {label}
      </span>
      <span className="mt-1.5 block">{children}</span>
    </label>
  );
}

/**
 * The confirmation. Warm, specific, and it says what happens next rather
 * than only that something happened.
 */
export function BookedScreen({
  answers,
  startISO,
  reference,
}: {
  answers: QuizAnswers;
  startISO: string;
  reference: string;
}) {
  const first = (answers.name ?? "").trim().split(/\s+/)[0] || "there";
  const iso = answers.phoneIso ?? DEFAULT_ISO;
  const country = dialCodeFor(iso);

  return (
    <section className="quiz-viewport flex flex-col items-center justify-center overflow-y-auto bg-suth-base px-6 py-12 text-center">
      <div className="w-full max-w-xl">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-suth-accent">
          [ Booked ]
        </p>
        <h1 className="mt-4 text-balance text-3xl font-black leading-[1.05] tracking-[-0.03em] text-suth-text md:text-5xl">
          Speak soon, {first}.
        </h1>
        <p className="mt-5 text-pretty text-lg leading-relaxed text-suth-text-secondary">
          Ben will call you <strong className="text-suth-text">{formatChosen(startISO)}</strong>.
        </p>

        <p className="mt-4 text-pretty text-base leading-relaxed text-suth-text-secondary">
          He&apos;s read what you sent. Whatever you&apos;re after — getting
          started, getting fitter, or chasing a time — he&apos;ll tell you
          honestly what it would take and whether he&apos;s the right person
          to help. No pressure, and nothing to prepare.
        </p>

        <dl className="mt-8 grid gap-3 text-left sm:grid-cols-3">
          <Fact label="When" value={formatChosen(startISO)} />
          <Fact label="How long" value="About 30 minutes" />
          <Fact label="Reference" value={reference} />
        </dl>

        <p className="mt-8 text-sm leading-relaxed text-suth-text-tertiary">
          A confirmation is on its way to{" "}
          <span className="text-suth-text-secondary">{answers.email}</span>, and
          a text to your {country.name} number. If the time stops working, the
          email moves it in two taps.
        </p>

        <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link
            href={`/book/manage/${reference}`}
            className="inline-flex h-12 items-center justify-center rounded-pill border border-suth-border px-8 text-sm font-medium text-suth-text transition-colors hover:border-suth-border-strong"
          >
            Move or cancel
          </Link>
          <Link
            href="/"
            className="inline-flex h-12 items-center justify-center rounded-pill border border-suth-border px-8 text-sm font-medium text-suth-text transition-colors hover:border-suth-border-strong"
          >
            Back to the site
          </Link>
        </div>
      </div>
    </section>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-suth-border bg-suth-elevated px-4 py-3">
      <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-suth-text-tertiary">
        {label}
      </dt>
      <dd className="mt-1 text-sm font-medium text-suth-text">{value}</dd>
    </div>
  );
}
