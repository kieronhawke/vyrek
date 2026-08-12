import Link from "next/link";
import { PageHeader, Card } from "@/components/admin/ui";
import { BookingCalendar } from "@/components/control/booking-calendar";
import { loadBookings } from "@/lib/booking/store";
import { formatBookingTime } from "@/lib/booking/model";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export const metadata = { title: "Consultations" };

/**
 * Map each upcoming booking's email to its enquiry id, so "Up next" can
 * link straight to the person's lead. One query for every email at once,
 * best-effort: a missing lead or an unreachable database just means no
 * link, never a broken page.
 */
async function leadIdsByEmail(
  emails: string[],
): Promise<Map<string, string>> {
  const byEmail = new Map<string, string>();
  if (emails.length === 0) return byEmail;
  try {
    const { data } = await supabaseAdmin()
      .from("consultation_leads")
      .select("id, email")
      .in("email", emails);
    for (const row of (data ?? []) as { id: string; email: string }[]) {
      // Keep the first lead we see per email; that's enough to open one.
      if (row.email && !byEmail.has(row.email)) byEmail.set(row.email, row.id);
    }
  } catch {
    // Best-effort only. No links beats no page.
  }
  return byEmail;
}

export default async function AdminCalendarPage() {
  const now = new Date();
  const bookings = await loadBookings();
  const upNext = bookings
    .filter((b) => b.status === "confirmed" && new Date(b.startISO) >= now)
    .sort((a, b) => a.startISO.localeCompare(b.startISO))
    .slice(0, 5);

  const leadIds = await leadIdsByEmail(upNext.map((b) => b.email));

  return (
    <>
      <PageHeader
        eyebrow="Diary"
        title="Consultations"
        description="What's booked in, and when people can book you. Moving or cancelling a call emails and texts them straight away."
      />

      <section className="mb-10">
        <h2 className="mb-3 font-mono text-[11px] uppercase tracking-[0.22em] text-suth-text-tertiary">
          Up next
        </h2>
        {upNext.length === 0 ? (
          <Card>
            <p className="text-sm text-suth-text-tertiary">
              Nothing booked in yet. Confirmed calls appear here as people book
              them.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {upNext.map((b) => {
              const leadId = leadIds.get(b.email);
              return (
                <Card key={b.ref}>
                  <p className="text-sm font-semibold text-suth-text">
                    {b.name}
                  </p>
                  <p className="mt-1 text-sm text-suth-text-secondary">
                    {formatBookingTime(b.startISO)}
                  </p>
                  {leadId ? (
                    <Link
                      href={`/l/${leadId}`}
                      className="mt-3 inline-flex text-sm text-suth-accent underline underline-offset-4"
                    >
                      Open enquiry →
                    </Link>
                  ) : null}
                </Card>
              );
            })}
          </div>
        )}
      </section>

      <BookingCalendar />
    </>
  );
}
