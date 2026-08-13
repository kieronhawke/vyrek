import { NextResponse } from "next/server";
import { slotsForDate, localDateISO } from "@/lib/booking/availability";
import {
  findBooking,
  loadAvailability,
  takenStarts,
  updateBooking,
} from "@/lib/booking/store";
import { isBookingRef } from "@/lib/booking/model";
import {
  logOutcomes,
  notifyCancelled,
  notifyRescheduled,
} from "@/lib/booking/notify";
import { limiters, requestIp } from "@/lib/rate-limit";

export const runtime = "nodejs";

/**
 * Moving or cancelling one booking.
 *
 * THE REFERENCE IS THE CREDENTIAL. Six characters from a 28-symbol
 * alphabet is a little over 28 bits — not enough to protect an account,
 * and it is not protecting one. What it guards is the ability to move or
 * cancel a free phone call, and the worst an attacker who guessed one
 * could do is cancel a stranger's consultation, which both parties are
 * immediately emailed and texted about. The alternative is making somebody
 * log in to change the time of a call they have not had yet, which costs
 * more no-shows than it prevents mischief.
 *
 * Rate limited so guessing is not practical anyway.
 */

export async function GET(
  req: Request,
  { params }: { params: Promise<{ ref: string }> },
) {
  const { ref } = await params;
  if (!isBookingRef(ref)) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }
  // The ref alone reveals a name and a call time, so throttle GET like the
  // POST: without it, the short ref space could be walked to harvest client
  // names and consultation times.
  const limited = await limiters.consultation.limit(`lookup:${requestIp(req)}`);
  if (!limited.success) {
    return NextResponse.json(
      { ok: false, error: "Too many requests" },
      { status: 429, headers: { "Retry-After": "3600" } },
    );
  }
  const booking = await findBooking(ref);
  if (!booking) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }
  // Never the note or the rail — this endpoint is reachable with only the
  // reference, so it returns what somebody needs to recognise their own
  // booking and nothing more.
  return NextResponse.json({
    ok: true,
    booking: {
      ref: booking.ref,
      name: booking.name,
      startISO: booking.startISO,
      minutes: booking.minutes,
      status: booking.status,
    },
  });
}

type Body = { action?: "reschedule" | "cancel"; startISO?: string; reason?: string };

export async function POST(
  req: Request,
  { params }: { params: Promise<{ ref: string }> },
) {
  const ip = requestIp(req);
  const limited = await limiters.consultation.limit(`manage:${ip}`);
  if (!limited.success) {
    return NextResponse.json(
      { ok: false, error: "Too many attempts. Try again shortly." },
      { status: 429 },
    );
  }

  const { ref } = await params;
  if (!isBookingRef(ref)) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, error: "Bad request" }, { status: 400 });
  }

  const booking = await findBooking(ref);
  if (!booking) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }

  if (body.action === "cancel") {
    if (booking.status === "cancelled") {
      return NextResponse.json({ ok: true, status: "cancelled" });
    }
    const updated = await updateBooking(ref, {
      status: "cancelled",
      cancelledReason: body.reason?.slice(0, 300),
    });
    // A cancel can't lose a slot race, but the union includes the sentinel.
    if (!updated || updated === "SLOT_TAKEN") {
      return NextResponse.json(
        { ok: false, error: "Couldn't cancel that. Please try again." },
        { status: 500 },
      );
    }
    notifyCancelled(updated)
      .then((o) => logOutcomes(`cancelled ${ref}`, o))
      .catch(() => {});
    return NextResponse.json({ ok: true, status: "cancelled" });
  }

  if (body.action !== "reschedule") {
    return NextResponse.json({ ok: false, error: "Bad request" }, { status: 400 });
  }

  const start = new Date(body.startISO ?? "");
  if (Number.isNaN(start.getTime())) {
    return NextResponse.json(
      { ok: false, error: "Please choose a time." },
      { status: 400 },
    );
  }
  if (start.toISOString() === booking.startISO) {
    return NextResponse.json({ ok: true, startISO: booking.startISO });
  }

  const availability = await loadAvailability();
  const taken = (await takenStarts()).filter(
    // Its own slot is not a clash with itself, or moving a booking by ten
    // minutes would always be refused.
    (t) => t.toISOString() !== booking.startISO,
  );
  const offered = slotsForDate(
    localDateISO(start),
    availability,
    taken,
    new Date(),
  ).some((s) => s.start.getTime() === start.getTime());

  if (!offered) {
    return NextResponse.json(
      { ok: false, error: "That time isn't available.", code: "TAKEN" },
      { status: 409 },
    );
  }

  const previousISO = booking.startISO;
  const updated = await updateBooking(ref, {
    startISO: start.toISOString(),
    rescheduledFromISO: previousISO,
    status: "confirmed",
  });
  // Someone grabbed the slot between our availability check and our write.
  // Give the honest "that time's gone" rather than a generic "try again".
  if (updated === "SLOT_TAKEN") {
    return NextResponse.json(
      { ok: false, error: "That time isn't available.", code: "TAKEN" },
      { status: 409 },
    );
  }
  if (!updated) {
    return NextResponse.json(
      { ok: false, error: "Couldn't move that. Please try again." },
      { status: 500 },
    );
  }

  notifyRescheduled(updated, previousISO)
    .then((o) => logOutcomes(`rescheduled ${ref}`, o))
    .catch(() => {});

  return NextResponse.json({ ok: true, startISO: updated.startISO });
}
