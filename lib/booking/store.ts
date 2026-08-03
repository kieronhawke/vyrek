import { Redis } from "@upstash/redis";
import {
  DEFAULT_AVAILABILITY,
  type Availability,
} from "@/lib/booking/availability";
import type { Booking } from "@/lib/booking/model";

/**
 * WHERE THE DIARY LIVES.
 *
 * Upstash Redis when it is configured, an in-process map when it is not —
 * the same arrangement as lib/rate-limit.ts and lib/onboarding/invite-store.ts,
 * so there is one storage story in this codebase rather than three.
 *
 * THE FALLBACK IS FOR LOCAL DEVELOPMENT ONLY, and unlike a rate limiter,
 * losing a booking matters. Without Redis a booking survives until the
 * server restarts and is invisible to any other instance, which on Vercel
 * means the next request may not see it at all. `bookingStoreReady()`
 * reports which mode is live so the admin calendar can say so out loud
 * rather than looking like it is working.
 *
 * Supabase would be the natural home, but the project this app points at
 * (iiezxhzbissemvsfytwl) currently returns NXDOMAIN — it has been deleted.
 * Flagged separately; this module deliberately does not depend on it.
 */

const AVAILABILITY_KEY = "suth:booking:availability";
const BOOKINGS_KEY = "suth:booking:all";

function redisOrNull(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

export function bookingStoreReady(): boolean {
  return redisOrNull() !== null;
}

/* In-memory fallback, pinned to globalThis rather than module scope.
   Next.js gives route handlers and page components separate module graphs,
   so a module-level object is two objects — the booking endpoint would
   write to one and the admin diary read from the other, and every booking
   made in development would be invisible on the page meant to show it. */
const memory: { availability: Availability | null; bookings: Booking[] } =
  ((globalThis as unknown as {
    __suthBookings?: { availability: Availability | null; bookings: Booking[] };
  }).__suthBookings ??= { availability: null, bookings: [] });

/* ── Availability ──────────────────────────────────────────────────────── */

export async function loadAvailability(): Promise<Availability> {
  const redis = redisOrNull();
  if (!redis) return memory.availability ?? DEFAULT_AVAILABILITY;
  try {
    const stored = await redis.get<Availability>(AVAILABILITY_KEY);
    return stored ?? DEFAULT_AVAILABILITY;
  } catch {
    // A diary that shows the default hours beats a page that 500s.
    return DEFAULT_AVAILABILITY;
  }
}

export async function saveAvailability(a: Availability): Promise<boolean> {
  const redis = redisOrNull();
  if (!redis) {
    memory.availability = a;
    return true;
  }
  try {
    await redis.set(AVAILABILITY_KEY, a);
    return true;
  } catch {
    return false;
  }
}

/* ── Bookings ──────────────────────────────────────────────────────────── */

export async function loadBookings(): Promise<Booking[]> {
  const redis = redisOrNull();
  if (!redis) return memory.bookings;
  try {
    return (await redis.get<Booking[]>(BOOKINGS_KEY)) ?? [];
  } catch {
    return [];
  }
}

async function writeBookings(all: Booking[]): Promise<boolean> {
  const redis = redisOrNull();
  if (!redis) {
    memory.bookings = all;
    return true;
  }
  try {
    await redis.set(BOOKINGS_KEY, all);
    return true;
  } catch {
    return false;
  }
}

/** Confirmed bookings only, which is what "taken" means to the slot maths. */
export async function takenStarts(): Promise<Date[]> {
  const all = await loadBookings();
  return all
    .filter((b) => b.status === "confirmed")
    .map((b) => new Date(b.startISO));
}

export type AddResult =
  | { ok: true; booking: Booking }
  | { ok: false; reason: "TAKEN" | "WRITE_FAILED" };

/**
 * Take a slot, refusing if somebody got there first.
 *
 * The check and the write are not atomic, and on this traffic they do not
 * need to be: two people would have to choose the same thirty-minute slot
 * within the same few hundred milliseconds. What matters is that the check
 * happens on the server against stored state rather than against whatever
 * the browser was showing, which may be minutes old.
 */
export async function addBooking(booking: Booking): Promise<AddResult> {
  const all = await loadBookings();
  const clash = all.some(
    (b) => b.status === "confirmed" && b.startISO === booking.startISO,
  );
  if (clash) return { ok: false, reason: "TAKEN" };

  const ok = await writeBookings([...all, booking]);
  return ok ? { ok: true, booking } : { ok: false, reason: "WRITE_FAILED" };
}

export async function findBooking(ref: string): Promise<Booking | null> {
  const all = await loadBookings();
  const wanted = ref.trim().toUpperCase();
  return all.find((b) => b.ref === wanted) ?? null;
}

export async function updateBooking(
  ref: string,
  patch: Partial<Booking>,
): Promise<Booking | null> {
  const all = await loadBookings();
  const wanted = ref.trim().toUpperCase();
  const i = all.findIndex((b) => b.ref === wanted);
  if (i < 0) return null;

  const next = { ...all[i], ...patch, ref: all[i].ref };
  all[i] = next;
  const ok = await writeBookings(all);
  return ok ? next : null;
}

/** Confirmed and still to come, soonest first. What the admin page opens on. */
export async function upcomingBookings(
  now: Date = new Date(),
): Promise<Booking[]> {
  const all = await loadBookings();
  return all
    .filter((b) => b.status === "confirmed" && new Date(b.startISO) >= now)
    .sort((a, b) => a.startISO.localeCompare(b.startISO));
}
