"use client";

import { useState } from "react";
import Link from "next/link";
import { BookingPicker } from "@/components/booking/booking-picker";
import { DEFAULT_ISO, dialCodeFor, toE164 } from "@/lib/dial-codes";
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
 * So it ends where the promise ends. They have already given a name, an
 * email and a number, so there is no form here — just the times Ben has
 * free, and the same picker the standalone booking page uses, because two
 * calendars that drift apart is how a double booking happens.
 *
 * ONE TAP. Choosing a time books it. Nothing to confirm, nothing to re-type
 * — every detail was collected three screens ago and asking again after
 * fifteen questions is where people give up.
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
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const first = (answers.name ?? "").trim().split(/\s+/)[0] || "you";
  const iso = answers.phoneIso ?? DEFAULT_ISO;

  const book = async (slot: Slot) => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: answers.name ?? "",
          email: answers.email ?? "",
          // Stored in E.164 so Twilio can dial it from anywhere.
          phone: toE164(iso, answers.phone ?? "") ?? answers.phone ?? "",
          startISO: slot.startISO,
          rail: answers.rail,
          note: brief,
        }),
      });
      const d = (await res.json()) as { ok: boolean; ref?: string; error?: string };
      if (!d.ok || !d.ref) {
        setError(d.error ?? "That didn't work. Pick another time and it will.");
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

      <div className={busy ? "mt-6 pointer-events-none opacity-60" : "mt-6"}>
        <BookingPicker onChosen={book} />
      </div>

      <p className="mt-6 text-xs leading-relaxed text-suth-text-tertiary">
        Times are UK. Choosing one books it — you can move it later from the
        email.
      </p>
    </div>
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

        <Link
          href="/"
          className="mt-10 inline-flex h-12 items-center justify-center rounded-pill border border-suth-border px-8 text-sm font-medium text-suth-text transition-colors hover:border-suth-border-strong"
        >
          Back to the site
        </Link>
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
