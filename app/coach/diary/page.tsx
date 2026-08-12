import Link from "next/link";
import { loadBookings } from "@/lib/booking/store";
import { formatBookingTime } from "@/lib/booking/model";

export const dynamic = "force-dynamic";

/**
 * DIARY — the real consultation bookings, read-only and phone-sized:
 * what's on today and this week. Moving or cancelling a call stays in
 * Mission Control's consultations page, which already emails and texts
 * the person about the change.
 */
export default async function CoachDiaryPage() {
  const bookings = await loadBookings();
  const now = Date.now();
  const weekAhead = now + 7 * 86400_000;
  const upcoming = bookings
    .filter(
      (b) =>
        b.status === "confirmed" &&
        new Date(b.startISO).getTime() >= now - 3600_000 &&
        new Date(b.startISO).getTime() <= weekAhead,
    )
    .sort((a, b) => a.startISO.localeCompare(b.startISO));

  const today = upcoming.filter(
    (b) => new Date(b.startISO).toDateString() === new Date().toDateString(),
  );
  const later = upcoming.filter((b) => !today.includes(b));

  const card: React.CSSProperties = {
    padding: "var(--space-2)",
    border: "1px solid var(--border)",
    borderRadius: 12,
    background: "var(--surface)",
  };

  return (
    <>
      <h1
        style={{
          fontSize: "var(--text-xl)",
          lineHeight: "var(--text-xl-lh)",
          fontWeight: 800,
          letterSpacing: "-0.02em",
          margin: "0 0 var(--space-3)",
        }}
      >
        Diary
      </h1>

      <h2 style={{ fontSize: "var(--text-md)", fontWeight: 800, margin: "0 0 var(--space-2)" }}>
        Today
      </h2>
      {today.length === 0 ? (
        <p style={{ color: "var(--text-muted)", margin: "0 0 var(--space-3)" }}>
          Nothing booked today.
        </p>
      ) : (
        <ul role="list" style={{ listStyle: "none", margin: "0 0 var(--space-3)", padding: 0, display: "grid", gap: 8 }}>
          {today.map((b) => (
            <li key={b.ref} style={card}>
              <strong>{b.name}</strong>
              <div style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>
                {formatBookingTime(b.startISO)} · {b.minutes ?? 30} min
              </div>
            </li>
          ))}
        </ul>
      )}

      <h2 style={{ fontSize: "var(--text-md)", fontWeight: 800, margin: "0 0 var(--space-2)" }}>
        This week
      </h2>
      {later.length === 0 ? (
        <p style={{ color: "var(--text-muted)" }}>Nothing else this week.</p>
      ) : (
        <ul role="list" style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 8 }}>
          {later.map((b) => (
            <li key={b.ref} style={card}>
              <strong>{b.name}</strong>
              <div style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>
                {formatBookingTime(b.startISO)} · {b.minutes ?? 30} min
              </div>
            </li>
          ))}
        </ul>
      )}

      <p style={{ marginTop: "var(--space-3)", fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>
        To move or cancel a call, use{" "}
        <Link href="/admin/calendar" style={{ color: "var(--accent)" }}>
          Consultations
        </Link>{" "}
        — the person is emailed and texted automatically.
      </p>
    </>
  );
}
