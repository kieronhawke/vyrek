import { NextResponse } from "next/server";
import { assertAdmin } from "@/lib/admin/auth";
import {
  DEFAULT_AVAILABILITY,
  parseMinutes,
  type Availability,
  type Weekday,
  type Window,
} from "@/lib/booking/availability";
import {
  bookingStoreReady,
  loadAvailability,
  loadBookings,
  saveAvailability,
} from "@/lib/booking/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Ben's side of the diary: read and write the availability.
 *
 * EVERY WINDOW IS RE-VALIDATED HERE rather than trusted from the form.
 * A start after its end, or a window running to 25:00, would not crash
 * anything — `slotsForDate` would simply produce nothing, and the symptom
 * would be a calendar that silently stopped taking bookings. That is the
 * worst class of bug for this feature, because nobody complains about a
 * booking they were never offered.
 */

function cleanWindows(raw: unknown): Window[] {
  if (!Array.isArray(raw)) return [];
  const out: Window[] = [];
  for (const w of raw) {
    if (!w || typeof w !== "object") continue;
    const rec = w as { start?: unknown; end?: unknown };
    const start =
      typeof rec.start === "number" ? rec.start : parseMinutes(String(rec.start ?? ""));
    const end =
      typeof rec.end === "number" ? rec.end : parseMinutes(String(rec.end ?? ""));
    if (start === null || end === null) continue;
    if (!Number.isFinite(start) || !Number.isFinite(end)) continue;
    if (start < 0 || end > 24 * 60) continue;
    // A window that ends before it starts is the commonest typo, and it
    // produces a day that quietly takes no bookings at all.
    if (end - start < 15) continue;
    out.push({ start, end });
  }
  return out.sort((a, b) => a.start - b.start);
}

export async function GET() {
  // Same gate as every other admin endpoint: redirects rather than 401s.
  await assertAdmin();
  const [availability, bookings] = await Promise.all([
    loadAvailability(),
    loadBookings(),
  ]);
  return NextResponse.json({
    ok: true,
    availability,
    bookings,
    durable: bookingStoreReady(),
  });
}

export async function PUT(req: Request) {
  await assertAdmin();

  let body: Partial<Availability>;
  try {
    body = (await req.json()) as Partial<Availability>;
  } catch {
    return NextResponse.json({ ok: false, error: "Bad request" }, { status: 400 });
  }

  const current = await loadAvailability();

  const weekly = { ...current.weekly };
  if (body.weekly && typeof body.weekly === "object") {
    for (const d of [0, 1, 2, 3, 4, 5, 6] as Weekday[]) {
      weekly[d] = cleanWindows((body.weekly as Record<number, unknown>)[d]);
    }
  }

  const overrides = Array.isArray(body.overrides)
    ? (body.overrides as unknown[])
        .filter(
          (o) =>
            !!o &&
            typeof o === "object" &&
            /^\d{4}-\d{2}-\d{2}$/.test(String((o as { date?: unknown }).date)),
        )
        .map((o) => {
          const rec = o as { date: string; windows?: unknown };
          return { date: rec.date, windows: cleanWindows(rec.windows) };
        })
    : current.overrides;

  const clampNumber = (v: unknown, fallback: number, min: number, max: number) =>
    typeof v === "number" && Number.isFinite(v)
      ? Math.min(max, Math.max(min, Math.round(v)))
      : fallback;

  const next: Availability = {
    weekly,
    overrides,
    slotMinutes: clampNumber(body.slotMinutes, current.slotMinutes, 15, 120),
    bufferMinutes: clampNumber(body.bufferMinutes, current.bufferMinutes, 0, 60),
    minNoticeHours: clampNumber(body.minNoticeHours, current.minNoticeHours, 0, 168),
    horizonDays: clampNumber(body.horizonDays, current.horizonDays, 1, 120),
  };

  const ok = await saveAvailability(next);
  if (!ok) {
    return NextResponse.json(
      { ok: false, error: "Couldn't save. Please try again." },
      { status: 500 },
    );
  }
  return NextResponse.json({ ok: true, availability: next, durable: bookingStoreReady() });
}

export async function DELETE() {
  await assertAdmin();
  const ok = await saveAvailability(DEFAULT_AVAILABILITY);
  return NextResponse.json({ ok, availability: DEFAULT_AVAILABILITY });
}
