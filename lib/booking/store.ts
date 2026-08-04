import { supabaseAdmin } from "@/lib/supabase/admin";
import {
  DEFAULT_AVAILABILITY,
  type Availability,
} from "@/lib/booking/availability";
import type { Booking } from "@/lib/booking/model";

/**
 * WHERE THE DIARY LIVES.
 *
 * Postgres, since 3 August 2026 — moved off Redis for the reason in
 * lib/leads/store.ts: Redis was never provisioned, so the "fallback" was
 * the real implementation, and it lost every booking on restart.
 *
 * THE DOUBLE-BOOK GUARD IS NOW IN THE DATABASE. `addBooking` still checks
 * first, because a refusal a person can read beats a constraint violation.
 * But the check and the write were never atomic, and two requests landing
 * in the same instant would both pass it. There is a partial unique index
 * on (starts_at) where status = 'confirmed', so the second one loses —
 * and losing looks the same to the caller as being told the slot has gone.
 */

const AVAILABILITY_ROW = 1;

type Row = {
  ref: string;
  created_at: string;
  name: string;
  email: string;
  phone: string;
  starts_at: string;
  minutes: number;
  status: "confirmed" | "cancelled";
  note: string | null;
  rail: string | null;
  rescheduled_from: string | null;
  cancelled_reason: string | null;
};

function fromRow(r: Row): Booking {
  return {
    ref: r.ref,
    name: r.name,
    email: r.email,
    phone: r.phone,
    startISO: new Date(r.starts_at).toISOString(),
    minutes: r.minutes,
    status: r.status,
    note: r.note ?? undefined,
    rail: (r.rail as Booking["rail"]) ?? undefined,
    createdISO: r.created_at,
    rescheduledFromISO: r.rescheduled_from
      ? new Date(r.rescheduled_from).toISOString()
      : undefined,
    cancelledReason: r.cancelled_reason ?? undefined,
  };
}

export function bookingStoreReady(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SECRET_KEY,
  );
}

/* ── Availability ──────────────────────────────────────────────────────── */

export async function loadAvailability(): Promise<Availability> {
  try {
    const { data, error } = await supabaseAdmin()
      .from("booking_availability")
      .select("config")
      .eq("id", AVAILABILITY_ROW)
      .maybeSingle();
    if (error || !data?.config) return DEFAULT_AVAILABILITY;
    return data.config as Availability;
  } catch {
    // A diary showing the default hours beats a page that 500s.
    return DEFAULT_AVAILABILITY;
  }
}

export async function saveAvailability(a: Availability): Promise<boolean> {
  try {
    const { error } = await supabaseAdmin()
      .from("booking_availability")
      .upsert(
        { id: AVAILABILITY_ROW, config: a, updated_at: new Date().toISOString() },
        { onConflict: "id" },
      );
    return !error;
  } catch {
    return false;
  }
}

/* ── Bookings ──────────────────────────────────────────────────────────── */

export async function loadBookings(): Promise<Booking[]> {
  try {
    const { data, error } = await supabaseAdmin()
      .from("consultation_bookings")
      .select("*")
      .order("starts_at", { ascending: true });
    if (error || !data) return [];
    return (data as Row[]).map(fromRow);
  } catch {
    return [];
  }
}

/** Confirmed starts only, which is what "taken" means to the slot maths. */
export async function takenStarts(): Promise<Date[]> {
  try {
    const { data, error } = await supabaseAdmin()
      .from("consultation_bookings")
      .select("starts_at")
      .eq("status", "confirmed");
    if (error || !data) return [];
    return (data as { starts_at: string }[]).map((r) => new Date(r.starts_at));
  } catch {
    return [];
  }
}

export type AddResult =
  | { ok: true; booking: Booking }
  | { ok: false; reason: "TAKEN" | "WRITE_FAILED" };

export async function addBooking(booking: Booking): Promise<AddResult> {
  try {
    const { error } = await supabaseAdmin()
      .from("consultation_bookings")
      .insert({
        ref: booking.ref,
        created_at: booking.createdISO,
        name: booking.name,
        email: booking.email,
        phone: booking.phone,
        starts_at: booking.startISO,
        minutes: booking.minutes,
        status: booking.status,
        note: booking.note ?? null,
        rail: booking.rail ?? null,
      });
    if (error) {
      // 23505 is a unique violation, and the only unique thing here besides
      // the reference is the slot. Somebody got there first.
      if (error.code === "23505") return { ok: false, reason: "TAKEN" };
      console.error("[booking] insert failed", error.message);
      return { ok: false, reason: "WRITE_FAILED" };
    }
    return { ok: true, booking };
  } catch (e) {
    console.error("[booking] store unreachable", e);
    return { ok: false, reason: "WRITE_FAILED" };
  }
}

export async function findBooking(ref: string): Promise<Booking | null> {
  try {
    const { data, error } = await supabaseAdmin()
      .from("consultation_bookings")
      .select("*")
      .eq("ref", ref.trim().toUpperCase())
      .maybeSingle();
    if (error || !data) return null;
    return fromRow(data as Row);
  } catch {
    return null;
  }
}

export async function updateBooking(
  ref: string,
  patch: Partial<Booking>,
): Promise<Booking | null> {
  const row: Record<string, unknown> = {};
  if (patch.startISO !== undefined) row.starts_at = patch.startISO;
  if (patch.status !== undefined) row.status = patch.status;
  if (patch.note !== undefined) row.note = patch.note ?? null;
  if (patch.rescheduledFromISO !== undefined) {
    row.rescheduled_from = patch.rescheduledFromISO ?? null;
  }
  if (patch.cancelledReason !== undefined) {
    row.cancelled_reason = patch.cancelledReason ?? null;
  }
  if (Object.keys(row).length === 0) return findBooking(ref);

  try {
    const { data, error } = await supabaseAdmin()
      .from("consultation_bookings")
      .update(row)
      .eq("ref", ref.trim().toUpperCase())
      .select("*")
      .maybeSingle();
    if (error || !data) return null;
    return fromRow(data as Row);
  } catch {
    return null;
  }
}

/** Confirmed and still to come, soonest first. What the admin opens on. */
export async function upcomingBookings(
  now: Date = new Date(),
): Promise<Booking[]> {
  try {
    const { data, error } = await supabaseAdmin()
      .from("consultation_bookings")
      .select("*")
      .eq("status", "confirmed")
      .gte("starts_at", now.toISOString())
      .order("starts_at", { ascending: true });
    if (error || !data) return [];
    return (data as Row[]).map(fromRow);
  } catch {
    return [];
  }
}
