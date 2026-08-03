"use client";

import { useState } from "react";
import { BookingPicker } from "@/components/booking/booking-picker";

/**
 * BOOKING THE CALL.
 *
 * Time first, details second, and that order is the design. Asking for a
 * name and a number before showing whether there is a slot on Thursday is
 * asking somebody to pay before they know what they are buying — the
 * details form only appears once a time is chosen, and by then they have
 * decided.
 *
 * THREE FIELDS. Name, email, phone. Everything else Ben can ask on the
 * call, which is what the call is for.
 *
 * The phone number is required here even though it is optional elsewhere on
 * the site, because the thing being booked is a phone call.
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

export function BookingForm({
  presetName = "",
  presetEmail = "",
  presetPhone = "",
  rail,
  note,
}: {
  presetName?: string;
  presetEmail?: string;
  presetPhone?: string;
  rail?: string;
  note?: string;
}) {
  const [slot, setSlot] = useState<Slot | null>(null);
  const [name, setName] = useState(presetName);
  const [email, setEmail] = useState(presetEmail);
  const [phone, setPhone] = useState(presetPhone);
  const [company, setCompany] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ ref: string; startISO: string } | null>(
    null,
  );

  if (done) {
    return (
      <section
        aria-live="polite"
        className="rounded-2xl border border-suth-accent/40 bg-suth-elevated p-8"
      >
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-suth-accent">
          [ Booked ]
        </p>
        <h2 className="mt-3 text-2xl font-black tracking-[-0.02em] text-suth-text md:text-3xl">
          You&apos;re in.
        </h2>
        <p className="mt-3 text-base leading-relaxed text-suth-text-secondary">
          Ben will call you on {formatChosen(done.startISO)}. There&apos;s a
          confirmation in your inbox and a text on its way.
        </p>
        <dl className="mt-6 flex flex-wrap gap-x-8 gap-y-3">
          <div>
            <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-suth-text-tertiary">
              Reference
            </dt>
            <dd className="mt-1 font-mono text-sm text-suth-text">{done.ref}</dd>
          </div>
          <div>
            <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-suth-text-tertiary">
              Need to change it?
            </dt>
            <dd className="mt-1 text-sm">
              <a
                href={`/book/manage/${done.ref}`}
                className="text-suth-accent underline underline-offset-4"
              >
                Move or cancel
              </a>
            </dd>
          </div>
        </dl>
      </section>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!slot) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          phone,
          company,
          startISO: slot.startISO,
          rail,
          note,
        }),
      });
      const data = (await res.json()) as {
        ok: boolean;
        ref?: string;
        startISO?: string;
        error?: string;
        code?: string;
      };
      if (!data.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        // The slot went while they were typing: send them back to the grid
        // rather than leaving a dead time selected under an error message.
        if (data.code === "TAKEN") setSlot(null);
        return;
      }
      setDone({ ref: data.ref!, startISO: data.startISO ?? slot.startISO });
    } catch {
      setError("Couldn't reach the server. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-10">
      <BookingPicker onChosen={setSlot} />

      {slot ? (
        <form
          onSubmit={submit}
          className="rounded-2xl border border-suth-border bg-suth-elevated p-6 md:p-8"
        >
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-suth-accent">
            [ {formatChosen(slot.startISO)} ]
          </p>
          <h2 className="mt-3 text-xl font-bold tracking-[-0.02em] text-suth-text md:text-2xl">
            Where should Ben call you?
          </h2>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <Field
              id="book-name"
              label="Your name"
              value={name}
              onChange={setName}
              autoComplete="name"
              required
            />
            <Field
              id="book-email"
              label="Email"
              type="email"
              value={email}
              onChange={setEmail}
              autoComplete="email"
              required
            />
            <Field
              id="book-phone"
              label="Mobile"
              type="tel"
              value={phone}
              onChange={setPhone}
              autoComplete="tel"
              required
            />
          </div>

          {/* Honeypot. Off-screen rather than display:none, which some bots
              specifically check for. */}
          <div aria-hidden className="absolute left-[-9999px] top-0">
            <label htmlFor="book-company">Company</label>
            <input
              id="book-company"
              name="company"
              tabIndex={-1}
              autoComplete="off"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
            />
          </div>

          {error ? (
            <p
              role="alert"
              className="mt-4 rounded-lg border border-suth-danger/40 bg-suth-danger/10 px-4 py-3 text-sm text-suth-text"
            >
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={busy}
            className="mt-6 inline-flex h-12 w-full items-center justify-center rounded-pill bg-suth-accent px-8 text-base font-medium text-[#0A0A0A] transition-[background,opacity] hover:bg-suth-accent-hover disabled:opacity-50 md:w-auto md:min-w-[16rem]"
          >
            {busy ? "Booking…" : "Confirm my call"}
          </button>

          <p className="mt-4 text-xs leading-relaxed text-suth-text-tertiary">
            Free, about thirty minutes, no obligation. We&apos;ll only use
            your number for this call.
          </p>
        </form>
      ) : null}
    </div>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  type = "text",
  autoComplete,
  required,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  autoComplete?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="block font-mono text-[10px] uppercase tracking-[0.18em] text-suth-text-tertiary"
      >
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        required={required}
        autoComplete={autoComplete}
        onChange={(e) => onChange(e.target.value)}
        className="mt-2 h-12 w-full rounded-lg border border-suth-border bg-suth-base px-4 text-base text-suth-text outline-none transition-colors focus:border-suth-accent"
      />
    </div>
  );
}
