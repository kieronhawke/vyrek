"use client";

import { useEffect, useMemo, useState } from "react";
import { formatBookingTime } from "@/lib/booking/model";
import { monthsFor } from "@/lib/member/booking-calendar";

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

/** An existing booking, when this sheet is being used to change one. */
export type ExistingBooking = { ref: string; startISO: string };

export function CoachBooking({
  firstName,
  email,
  phone,
  existing,
  onBooked,
  onDropped,
  onCancel,
}: {
  firstName: string;
  email: string;
  phone: string;
  /**
   * Set when an athlete is changing a call rather than making one.
   *
   * Same picker either way. Booking and moving are the same question — which
   * of Ben's free times suits — and giving them two different screens would
   * mean two things to keep in step for no gain.
   */
  existing?: ExistingBooking;
  /** Posts the confirmation into the thread. */
  onBooked: (args: { ref: string; startISO: string }) => void;
  /** Called when an existing call is cancelled outright. */
  onDropped?: (args: { ref: string }) => void;
  onCancel: () => void;
}) {
  const [stage, setStage] = useState<Stage>("dates");
  const [open, setOpen] = useState<string[]>([]);
  const [date, setDate] = useState<string | null>(null);
  const [monthIndex, setMonthIndex] = useState(0);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /*
   * The number comes from the account, not from a field here.
   *
   * Asking for it again in the middle of a conversation is friction on the
   * one flow that should be frictionless, and they have already given it to
   * us. Where the account has none, the booking still goes through and the
   * confirmation email carries the detail — better than blocking a booking
   * over a field they can fill in later.
   */
  const number = phone;

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

  /** Give up the slot entirely. Ben and the athlete are both notified. */
  async function dropCall() {
    if (!existing) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/booking/${existing.ref}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel", reason: "Cancelled from the app" }),
      });
      const body = (await res.json()) as { ok: boolean; error?: string };
      if (!body.ok) {
        setError(body.error ?? "Could not cancel that. Try again in a moment.");
        return;
      }
      onDropped?.({ ref: existing.ref });
      setStage("done");
    } catch {
      setError("Could not reach the diary. Try again in a moment.");
    } finally {
      setBusy(false);
    }
  }

  async function book(slot: Slot) {
    setStage("confirming");
    setBusy(true);
    setError(null);
    try {
      /* Moving an existing call goes to its own endpoint, which frees the old
         slot, takes the new one and emails and texts both parties about the
         change. Posting a second booking would leave the first in the diary. */
      const res = existing
        ? await fetch(`/api/booking/${existing.ref}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "reschedule", startISO: slot.startISO }),
          })
        : await fetch("/api/booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: firstName,
          email,
          phone: number.trim() || "not given",
          startISO: slot.startISO,
          note: "Review call booked from the member app",
          rail: "athlete",
        }),
      });
      const body = (await res.json()) as { ok: boolean; ref?: string; error?: string };
      /* The reschedule endpoint answers with the new time rather than a ref,
         because the ref has not changed. */
      const ref = body.ref ?? existing?.ref;
      if (!body.ok || !ref) {
        /* The server re-checks the slot against stored state, so "taken" is a
           real answer here and not a bug. Say so and send them back to the
           times rather than failing silently. */
        setError(body.error ?? "That time has just gone. Pick another.");
        setStage("slots");
        return;
      }
      setStage("done");
      onBooked({ ref, startISO: slot.startISO });
    } catch {
      setError("Could not book that. Try again in a moment.");
      setStage("slots");
    } finally {
      setBusy(false);
    }
  }

  const months = useMemo(() => monthsFor(open), [open]);
  const month = months[monthIndex] ?? months[0] ?? null;

  return (
    <div className="cbook">
      <div className="cbook__head">
        <p className="cbook__title">
          {existing ? "Move your call" : "Book a review call with Ben"}
        </p>
        <button type="button" className="cbook__close" onClick={onCancel} aria-label="Close">
          ✕
        </button>
      </div>

      {/*
        Moving a call starts by showing the one they already have.
        The old sheet opened straight onto a picker with a "cancel this
        instead" link underneath, so the first thing on screen was a decision
        without the fact it applies to. Say what is booked, then offer the two
        things they can do about it.
      */}
      {existing && stage !== "done" ? (
        <div className="cbook__current">
          <span className="cbook__currentwhen">{formatBookingTime(existing.startISO)}</span>
          <span className="cbook__currentnote">Your call with Ben</span>
          <button
            type="button"
            className="cbook__drop"
            onClick={() => void dropCall()}
            disabled={busy}
          >
            Cancel it
          </button>
        </div>
      ) : null}

      {error ? (
        <p className="cbook__error" role="status">
          {error}
        </p>
      ) : null}

      {stage === "dates" || stage === "slots" ? (
        busy && stage === "dates" ? (
          <p className="cbook__note">Checking Ben&apos;s diary…</p>
        ) : open.length === 0 ? (
          <p className="cbook__note">
            Nothing free at the moment. Send him a message and he will find you
            a time.
          </p>
        ) : month ? (
          <>
            {/*
              A real calendar rather than a row of chips.

              Chips listed the next fourteen open days with no sense of where
              they sat in the week or the month, so "a Saturday in three weeks"
              meant counting. A month grid answers that at a glance, and the
              days Ben has nothing free are visibly greyed rather than absent —
              which is the difference between "he is busy then" and "the list
              stopped".
            */}
            {/* Calendar and times sit side by side where there is room, so
                picking a day does not push its times off the bottom. */}
            <div className="cbook__pick">
            <div className="cal">
              <div className="cal__head">
                <button
                  type="button"
                  className="cal__nav"
                  onClick={() => setMonthIndex((i) => i - 1)}
                  disabled={monthIndex === 0}
                  aria-label="Previous month"
                >
                  ‹
                </button>
                <span className="cal__month">{month.label}</span>
                <button
                  type="button"
                  className="cal__nav"
                  onClick={() => setMonthIndex((i) => i + 1)}
                  disabled={monthIndex >= months.length - 1}
                  aria-label="Next month"
                >
                  ›
                </button>
              </div>

              <div className="cal__dow" aria-hidden>
                {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
                  <span key={i}>{d}</span>
                ))}
              </div>

              <div className="cal__grid" role="group" aria-label="Available days">
                {month.cells.map((cell, i) =>
                  cell === null ? (
                    <span key={`pad-${i}`} className="cal__pad" />
                  ) : (
                    <button
                      key={cell.iso}
                      type="button"
                      className={`cal__day${cell.free ? " is-free" : ""}${
                        cell.iso === date ? " is-picked" : ""
                      }`}
                      disabled={!cell.free}
                      aria-pressed={cell.iso === date}
                      onClick={() => pickDate(cell.iso)}
                    >
                      {cell.day}
                    </button>
                  ),
                )}
              </div>
            </div>

            {/* The times sit under the calendar rather than replacing it, so
                changing your mind about the day is one tap and not a Back. */}
            {stage === "slots" ? (
              <div className="cbook__times">
                <p className="cbook__when">{date ? dayLabel(date) : ""}</p>
                {busy ? (
                  <p className="cbook__note">Loading times…</p>
                ) : slots.length === 0 ? (
                  <p className="cbook__note">Nothing left on that day.</p>
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
              </div>
            ) : (
              <p className="cbook__note">Pick a day to see Ben&apos;s free times.</p>
            )}
            </div>
          </>
        ) : null
      ) : null}

      {stage === "confirming" ? <p className="cbook__note">Booking it…</p> : null}

      {stage !== "done" ? (
        <p className="cbook__foot">
          You can move or cancel it later from this chat.
        </p>
      ) : null}
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
