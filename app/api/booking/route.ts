import { NextResponse } from "next/server";
import {
  bookableDates,
  dateRange,
  slotsForDate,
} from "@/lib/booking/availability";
import {
  addBooking,
  loadAvailability,
  takenStarts,
} from "@/lib/booking/store";
import { newBookingRef, type Booking } from "@/lib/booking/model";
import { logOutcomes, notifyBooked } from "@/lib/booking/notify";
import { limiters, requestIp } from "@/lib/rate-limit";

export const runtime = "nodejs";

/**
 * The public booking endpoint.
 *
 * GET  — which dates are open and what times are on a given date.
 * POST — take a slot.
 *
 * THE SLOT IS RE-CHECKED HERE, against stored state, not against whatever
 * the page was showing. A booking page can sit open for an hour; the times
 * on it are a snapshot from the moment it loaded. Trusting them is how two
 * people end up on the same call.
 */

const EMAIL_RE = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,24}$/;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date");

  const availability = await loadAvailability();
  const taken = await takenStarts();
  const now = new Date();

  if (date) {
    const slots = slotsForDate(date, availability, taken, now).map((s) => ({
      startISO: s.start.toISOString(),
      label: s.label,
    }));
    return NextResponse.json({ ok: true, date, slots });
  }

  const dates = dateRange(now, availability.horizonDays);
  const open = bookableDates(dates, availability, taken, now);
  return NextResponse.json({
    ok: true,
    open: [...open],
    horizonDays: availability.horizonDays,
    slotMinutes: availability.slotMinutes,
  });
}

type Body = {
  name?: string;
  email?: string;
  phone?: string;
  startISO?: string;
  note?: string;
  rail?: string;
  /** Honeypot — a real person never fills this. */
  company?: string;
};

export async function POST(req: Request) {
  const ip = requestIp(req);
  const limited = await limiters.consultation.limit(`book:${ip}`);
  if (!limited.success) {
    return NextResponse.json(
      { ok: false, error: "Too many attempts. Try again shortly." },
      { status: 429, headers: { "Retry-After": "3600" } },
    );
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Something went wrong." },
      { status: 400 },
    );
  }

  if (body.company) {
    // Honeypot tripped. Answer as though it worked so the bot learns nothing.
    return NextResponse.json({ ok: true, ref: "OK" });
  }

  const name = body.name?.trim() ?? "";
  const email = body.email?.trim() ?? "";
  const phone = body.phone?.trim() ?? "";
  const startISO = body.startISO?.trim() ?? "";

  if (name.length < 2 || name.length > 120) {
    return NextResponse.json(
      { ok: false, error: "Please enter your name." },
      { status: 400 },
    );
  }
  if (!EMAIL_RE.test(email) || email.length > 254) {
    return NextResponse.json(
      { ok: false, error: "Please enter a valid email address." },
      { status: 400 },
    );
  }
  // A consultation is a phone call, so the number is not optional here even
  // though it is elsewhere.
  if (phone.length < 7 || phone.length > 32) {
    return NextResponse.json(
      { ok: false, error: "Please enter a phone number Ben can call." },
      { status: 400 },
    );
  }

  const start = new Date(startISO);
  if (Number.isNaN(start.getTime())) {
    return NextResponse.json(
      { ok: false, error: "Please choose a time." },
      { status: 400 },
    );
  }

  // Is that time genuinely on offer right now? This rejects a stale page, a
  // slot taken thirty seconds ago, and a hand-crafted request equally.
  const availability = await loadAvailability();
  const taken = await takenStarts();
  const now = new Date();
  const dateISO = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(start);

  const offered = slotsForDate(dateISO, availability, taken, now).some(
    (s) => s.start.getTime() === start.getTime(),
  );
  if (!offered) {
    return NextResponse.json(
      {
        ok: false,
        error: "That time has just gone. Pick another and you're set.",
        code: "TAKEN",
      },
      { status: 409 },
    );
  }

  const booking: Booking = {
    ref: newBookingRef(),
    name,
    email,
    phone,
    startISO: start.toISOString(),
    minutes: availability.slotMinutes,
    status: "confirmed",
    note: body.note?.trim().slice(0, 2000) || undefined,
    rail: body.rail === "beginner" ? "beginner" : body.rail === "athlete" ? "athlete" : undefined,
    createdISO: now.toISOString(),
  };

  const saved = await addBooking(booking);
  if (!saved.ok) {
    return NextResponse.json(
      {
        ok: false,
        error:
          saved.reason === "TAKEN"
            ? "That time has just gone. Pick another and you're set."
            : "We couldn't save that booking. Please try again.",
        code: saved.reason,
      },
      { status: saved.reason === "TAKEN" ? 409 : 500 },
    );
  }

  // Notifications never block the answer: the booking is already stored, and
  // the person is waiting on this response.
  notifyBooked(booking)
    .then((o) => logOutcomes(`booked ${booking.ref}`, o))
    .catch(() => {});

  return NextResponse.json({
    ok: true,
    ref: booking.ref,
    startISO: booking.startISO,
  });
}
