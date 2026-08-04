"use client";

import { useEffect, useState } from "react";
import { formatBookingTime } from "@/lib/booking/model";

/**
 * BOOK A REVIEW CALL, WITHOUT LEAVING THE THREAD.
 *
 * The athlete asked for this to be seamless and inside the chat, and that is
 * also the right call for a different reason: sending somebody to a separate
 * booking page mid-conversation loses the conversation. They come back to a
 * blank composer having forgotten what they were going to say.
 *
 * IT USES THE REAL BOOKING SYSTEM. Not a copy of it. `/api/booking` is the
 * same endpoint the public consultation form posts to, which means:
 *
 *   - the slot is re-checked server-side against stored state, so two people
 *     cannot take the same time;
 *   - the confirmation email and the text both go out already, through
 *     `notifyBooked`, with no new send path to keep in step;
 *   - Ben sees it in the same diary as everything else rather than in a
 *     second list nobody remembers to look at.
 *
 * Building a parallel booking flow for members would have been faster and
 * would have drifted from the real one inside a month.
 */

type Slot = { startISO: string; label: string };

type Stage = "dates" | "slots" | "confirming" | "done" | "error";

export function CoachBooking({
  firstName,
  email,
  phone,
  onBooked,
  onCancel,
}: {
  firstName: string;
  email: string;
  phone: string;
  /** Posts the confirmation into the thread. */
  onBooked: (args: { ref: string; startISO: string }) => void;
  onCancel: () => void;
}) {
  const [stage, setStage] = useState<Stage>("dates");
  const [open, setOpen] = useState<string[]>([]);
  const [date, setDate] = useState<string | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /* A consultation is a phone call, so the endpoint requires a number and we
     do not store one against a member yet. Asking here beats letting them
     pick a time and then bounce off a validation error they cannot fix. */
  const [number, setNumber] = useState(phone);

  /* Which days have anything free at all. Asking for slots day by day would
     mean the athlete tapping through empty dates to find one. */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setBusy(true);
      try {
        const res = await fetch("/api/booking");
        const body = (await res.json()) as { ok: boolean; open?: string[] };
        if (cancelled) return;
        if (!body.ok) throw new Error("unavailable");
        setOpen(body.open ?? []);
      } catch {
        if (!cancelled) {
          setError("Could not load Ben's diary. Try again in a moment.");
          setStage("error");
        }
      } finally {
        if (!cancelled) setBusy(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function pickDate(d: string) {
    setDate(d);
    setStage("slots");
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/booking?date=${encodeURIComponent(d)}`);
      const body = (await res.json()) as { ok: boolean; slots?: Slot[] };
      setSlots(body.slots ?? []);
    } catch {
      setError("Could not load times for that day.");
    } finally {
      setBusy(false);
    }
  }

  async function book(slot: Slot) {
    if (number.trim().length < 7) {
      setError("Ben needs a number to call you on.");
      return;
    }
    setStage("confirming");
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: firstName,
          email,
          phone: number.trim(),
          startISO: slot.startISO,
          note: "Review call booked from the member app",
          rail: "athlete",
        }),
      });
      const body = (await res.json()) as { ok: boolean; ref?: string; error?: string };
      if (!body.ok || !body.ref) {
        /* The server re-checks the slot against stored state, so "taken" is a
           real answer here and not a bug. Say so and send them back to the
           times rather than failing silently. */
        setError(body.error ?? "That time has just gone. Pick another.");
        setStage("slots");
        return;
      }
      setStage("done");
      onBooked({ ref: body.ref, startISO: slot.startISO });
    } catch {
      setError("Could not book that. Try again in a moment.");
      setStage("slots");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="cbook">
      <div className="cbook__head">
        <p className="cbook__title">Book a review call with Ben</p>
        <button type="button" className="cbook__close" onClick={onCancel} aria-label="Close">
          ✕
        </button>
      </div>

      {error ? (
        <p className="cbook__error" role="status">
          {error}
        </p>
      ) : null}

      {stage === "dates" ? (
        busy ? (
          <p className="cbook__note">Checking Ben&apos;s diary…</p>
        ) : open.length === 0 ? (
          <p className="cbook__note">
            Nothing free at the moment. Send him a message and he will find you
            a time.
          </p>
        ) : (
          <>
            <p className="cbook__note">Pick a day.</p>
            <div className="cbook__grid">
              {open.slice(0, 14).map((d) => (
                <button
                  key={d}
                  type="button"
                  className="cbook__chip"
                  onClick={() => pickDate(d)}
                >
                  {dayLabel(d)}
                </button>
              ))}
            </div>
          </>
        )
      ) : null}

      {stage === "slots" ? (
        <>
          <button type="button" className="cbook__back" onClick={() => setStage("dates")}>
            ← Another day
          </button>
          <label className="cbook__field">
            <span>Number for Ben to call</span>
            <input
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              className="addfood__search"
              value={number}
              onChange={(e) => setNumber(e.target.value)}
              placeholder="07…"
            />
          </label>
          {busy ? (
            <p className="cbook__note">Loading times…</p>
          ) : slots.length === 0 ? (
            <p className="cbook__note">Nothing left on that day. Try another.</p>
          ) : (
            <div className="cbook__grid">
              {slots.map((s) => (
                <button
                  key={s.startISO}
                  type="button"
                  className="cbook__chip"
                  onClick={() => book(s)}
                >
                  {s.label}
                </button>
              ))}
            </div>
          )}
        </>
      ) : null}

      {stage === "confirming" ? <p className="cbook__note">Booking it…</p> : null}

      {stage === "done" && date ? (
        <p className="cbook__note">Booked. The confirmation is on its way.</p>
      ) : null}

      <p className="cbook__foot">
        You will get an email and a text confirming it, both with a link to
        move or cancel.
      </p>
    </div>
  );
}

/** "Tuesday 5 Aug" — the booking system's own formatter does times. */
function dayLabel(iso: string): string {
  const d = new Date(`${iso}T12:00:00Z`);
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "Europe/London",
  }).format(d);
}

export { formatBookingTime };
