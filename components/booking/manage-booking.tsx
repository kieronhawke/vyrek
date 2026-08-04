"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BookingPicker } from "@/components/booking/booking-picker";

/**
 * MOVING OR CANCELLING YOUR OWN CALL.
 *
 * Reached from the link in the confirmation email and text. No login,
 * because making somebody create an account to move a free phone call
 * costs more missed calls than it prevents mischief — see the note on the
 * API route about what the reference actually protects.
 *
 * CANCELLING ASKS ONCE. It is the one irreversible thing on the page, and
 * a stray tap on a phone should not empty Ben's diary.
 */

type Booking = {
  ref: string;
  name: string;
  startISO: string;
  status: "confirmed" | "cancelled";
};

function formatWhen(startISO: string): string {
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

export function ManageBooking({ reference }: { reference: string }) {
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [moving, setMoving] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  /* The new time is chosen, then confirmed. Tapping a slot used to move the
     booking outright — the same one-tap mistake the quiz and /book had, and
     the more dangerous of the three, because here it silently overwrites a
     time somebody has already arranged their day around and fires a text
     saying so. A misplaced tap should not be able to do that. */
  const [pending, setPending] = useState<{ startISO: string; label: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    fetch(`/api/booking/${reference}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("404"))))
      .then((d: { booking: Booking }) => live && setBooking(d.booking))
      .catch(() => live && setError("We couldn't find that booking."))
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
  }, [reference]);

  const act = async (body: Record<string, unknown>, done: string) => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/booking/${reference}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as {
        ok: boolean;
        error?: string;
        startISO?: string;
        status?: string;
      };
      if (!data.ok) {
        setError(data.error ?? "That didn't work. Please try again.");
        return;
      }
      setBooking((b) =>
        b
          ? {
              ...b,
              startISO: data.startISO ?? b.startISO,
              status: data.status === "cancelled" ? "cancelled" : b.status,
            }
          : b,
      );
      setMoving(false);
      setConfirmCancel(false);
      setNotice(done);
    } catch {
      setError("Couldn't reach the server. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-suth-text-tertiary">Loading…</p>;
  }

  if (!booking) {
    return (
      <div>
        <p className="text-base text-suth-text-secondary">
          {error ?? "We couldn't find that booking."}
        </p>
        <Link
          href="/book"
          className="mt-4 inline-block text-sm text-suth-accent underline underline-offset-4"
        >
          Book a new time
        </Link>
      </div>
    );
  }

  if (booking.status === "cancelled") {
    return (
      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-suth-text-tertiary">
          [ Cancelled ]
        </p>
        <h2 className="mt-3 text-2xl font-black tracking-[-0.02em] text-suth-text">
          That call is cancelled.
        </h2>
        <p className="mt-3 text-base text-suth-text-secondary">
          Nothing is booked in. If you still want to talk it through, pick a
          new time whenever suits.
        </p>
        <Link
          href="/book"
          className="mt-6 inline-flex h-12 items-center justify-center rounded-pill bg-suth-accent px-8 text-base font-medium text-[#0A0A0A] hover:bg-suth-accent-hover"
        >
          Book another time
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="rounded-2xl border border-suth-border bg-suth-elevated p-6 md:p-8">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-suth-accent">
          [ Your call ]
        </p>
        <h2 className="mt-3 text-2xl font-black tracking-[-0.02em] text-suth-text md:text-3xl">
          {formatWhen(booking.startISO)}
        </h2>
        <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.16em] text-suth-text-tertiary">
          Reference {booking.ref} · UK time
        </p>

        {notice ? (
          <p
            aria-live="polite"
            className="mt-4 rounded-lg border border-suth-accent/40 bg-suth-accent/10 px-4 py-3 text-sm text-suth-text"
          >
            {notice}
          </p>
        ) : null}

        {error ? (
          <p
            role="alert"
            className="mt-4 rounded-lg border border-suth-danger/40 bg-suth-danger/10 px-4 py-3 text-sm text-suth-text"
          >
            {error}
          </p>
        ) : null}

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => {
              setMoving((m) => !m);
              setConfirmCancel(false);
            }}
            className="inline-flex h-11 items-center justify-center rounded-pill bg-suth-accent px-6 text-sm font-medium text-[#0A0A0A] hover:bg-suth-accent-hover"
          >
            {moving ? "Keep this time" : "Move it"}
          </button>

          {confirmCancel ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => act({ action: "cancel" }, "Cancelled.")}
              className="inline-flex h-11 items-center justify-center rounded-pill border border-suth-danger bg-suth-danger/15 px-6 text-sm font-medium text-suth-text disabled:opacity-50"
            >
              {busy ? "Cancelling…" : "Yes, cancel the call"}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setConfirmCancel(true);
                setMoving(false);
              }}
              className="inline-flex h-11 items-center justify-center rounded-pill border border-suth-border px-6 text-sm font-medium text-suth-text-secondary hover:border-suth-border-strong hover:text-suth-text"
            >
              Cancel
            </button>
          )}
        </div>

        {confirmCancel ? (
          <p className="mt-3 text-sm text-suth-text-secondary">
            This cancels the call and lets Ben know. You can always book
            another.
          </p>
        ) : null}
      </div>

      {moving ? (
        <div>
          <h3 className="mb-6 text-lg font-bold tracking-[-0.02em] text-suth-text">
            Pick a new time
          </h3>
          <BookingPicker
            excludeRef={booking.ref}
            onChosen={(s) => setPending({ startISO: s.startISO, label: s.label })}
          />

          {pending ? (
            <div className="mt-8 rounded-2xl border border-suth-accent/40 bg-suth-elevated p-5 md:p-6">
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-suth-accent">
                [ New time ]
              </p>
              <p className="mt-2 text-lg font-semibold leading-snug text-suth-text">
                {formatWhen(pending.startISO)}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-suth-text-secondary">
                Moving from {formatWhen(booking.startISO)}. Ben will get the
                change and you&apos;ll get a text with the new time.
              </p>

              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  act(
                    { action: "reschedule", startISO: pending.startISO },
                    "Moved. We've sent you the new time.",
                  )
                }
                className="mt-5 inline-flex h-14 w-full items-center justify-center rounded-pill bg-suth-accent px-6 text-base font-semibold tracking-tight text-[#0A0A0A] transition-[background,opacity] duration-fast hover:bg-suth-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busy ? "Moving…" : "Confirm the new time →"}
              </button>
              <button
                type="button"
                onClick={() => setPending(null)}
                className="mt-3 inline-flex h-11 w-full items-center justify-center rounded-pill border border-suth-border px-6 text-sm font-medium text-suth-text-secondary transition-colors hover:border-suth-border-strong hover:text-suth-text"
              >
                Choose a different time
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
