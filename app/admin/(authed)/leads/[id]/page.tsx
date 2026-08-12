import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader, Card, Badge } from "@/components/admin/ui";
import { getLead } from "@/lib/leads/store";
import { isLeadId } from "@/lib/leads/model";
import { loadBookings } from "@/lib/booking/store";
import { formatBookingTime } from "@/lib/booking/model";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { SendPaymentLink } from "@/components/admin/send-payment-link";
import { STAGE_META, type LeadStage } from "@/lib/admin/leads-lifecycle";

export const dynamic = "force-dynamic";

export const metadata = { title: "Lead" };

const norm = (e: string | null | undefined) => (e ?? "").trim().toLowerCase();

/**
 * ONE LEAD, THE WHOLE STORY AND THE NEXT STEP.
 *
 * Everything they submitted, whether a call is booked, and the one action
 * that moves them on: send the onboarding link. When they pay, they turn
 * into a client and drop off the callback list automatically.
 */
export default async function AdminLeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!isLeadId(id)) notFound();
  const lead = await getLead(id);
  if (!lead) notFound();

  const key = norm(lead.email);
  const sb = supabaseAdmin();
  const [bookings, custRes, invRes] = await Promise.all([
    loadBookings().then((b) => b, () => []),
    sb.from("customers").select("id").eq("email", key).maybeSingle().then((r) => r.data, () => null),
    sb
      .from("onboarding_invites")
      .select("opened_at, created_at, payload")
      .order("created_at", { ascending: false })
      .limit(500)
      .then((r) => r.data ?? [], () => []),
  ]);

  const booking =
    bookings
      .filter((b) => norm(b.email) === key)
      .sort((a, b) => b.startISO.localeCompare(a.startISO))[0] ?? null;
  const customerId = (custRes as { id: string } | null)?.id ?? null;
  const invite = (invRes as Array<{ opened_at: string | null; payload: { email?: string } }>).find(
    (i) => norm(i.payload?.email) === key,
  );
  const now = Date.now();

  let stage: LeadStage = "new";
  if (customerId) stage = "client";
  else if (booking && booking.status === "confirmed" && new Date(booking.startISO).getTime() >= now - 3600_000) stage = "booked";
  else if (invite || lead.invitedAtISO) stage = "link_sent";
  else if (booking) stage = "call_done";
  const meta = STAGE_META[stage];

  return (
    <>
      <PageHeader
        eyebrow="Lead"
        title={lead.name}
        description={lead.wants || lead.goal || "Consultation enquiry"}
        actions={
          <Link
            href="/admin/leads"
            className="inline-flex h-10 items-center rounded-pill border border-suth-border bg-suth-elevated px-4 text-sm text-suth-text"
          >
            ← All leads
          </Link>
        }
      />

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Badge tone={meta.tone}>{meta.label}</Badge>
        {stage === "booked" && booking ? (
          <span className="text-sm text-suth-text-secondary">
            Call booked for {formatBookingTime(booking.startISO)}, in Ben&apos;s diary.
          </span>
        ) : null}
        {customerId ? (
          <Link href={`/admin/customers/${customerId}`} className="text-sm text-suth-accent underline-offset-4 hover:underline">
            Open their client record →
          </Link>
        ) : null}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-suth-text-tertiary">
            Contact
          </p>
          <dl className="mt-3 space-y-2 text-sm">
            <Row label="Name" value={lead.name} />
            <Row label="Email" value={lead.email} />
            <Row label="Phone" value={lead.phone} />
            <Row label="Roughly" value={[lead.city, lead.region].filter(Boolean).join(", ") || null} />
            <Row label="Enquired" value={new Date(lead.createdISO).toLocaleString("en-GB")} />
          </dl>
          <div className="mt-4 flex flex-wrap gap-2 border-t border-suth-border-subtle pt-4">
            {lead.phone ? (
              <a href={`tel:${lead.phone.replace(/\s+/g, "")}`} className="inline-flex h-10 items-center rounded-pill bg-suth-accent px-4 text-sm font-semibold text-[#0A0A0A]">
                Call {lead.name.split(" ")[0]}
              </a>
            ) : null}
            <a href={`mailto:${lead.email}`} className="inline-flex h-10 items-center rounded-pill border border-suth-border px-4 text-sm text-suth-text">
              Email
            </a>
            <a href={`/l/${lead.id}`} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center rounded-pill border border-suth-border px-4 text-sm text-suth-text">
              Phone view ↗
            </a>
          </div>
        </Card>

        <Card>
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-suth-text-tertiary">
            What they told us
          </p>
          <dl className="mt-3 space-y-2 text-sm">
            <Row label="Route" value={lead.rail} />
            <Row label="Wants" value={lead.wants} />
            <Row label="Ready" value={lead.readiness} />
            <Row label="Goal" value={lead.goal} />
            <Row label="Plan" value={lead.programme} />
            <Row label="Injury" value={lead.injury} />
          </dl>
          {lead.brief ? (
            <>
              <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.22em] text-suth-text-tertiary">
                In their words
              </p>
              <pre className="mt-2 whitespace-pre-wrap font-mono text-[13px] leading-relaxed text-suth-text-secondary">
                {lead.brief}
              </pre>
            </>
          ) : null}
        </Card>
      </div>

      <section className="mt-8">
        <h2 className="mb-3 font-mono text-[11px] uppercase tracking-[0.22em] text-suth-text-tertiary">
          {stage === "client" ? "They're a client" : "Send their onboarding link"}
        </h2>
        {stage === "client" ? (
          <Card>
            <p className="text-sm text-suth-text-secondary">
              {lead.name.split(" ")[0]} has signed up and is paying. There&apos;s
              nothing more to do here.
            </p>
          </Card>
        ) : (
          <>
            {invite ? (
              <p className="mb-3 text-sm text-suth-text-secondary">
                An onboarding link has already gone out{invite.opened_at ? ", and they've opened it" : ", not opened yet"}. Sending again replaces it.
              </p>
            ) : null}
            <SendPaymentLink initialName={lead.name} initialEmail={lead.email} />
          </>
        )}
      </section>
    </>
  );
}

function Row({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 border-b border-suth-border-subtle py-2 last:border-b-0">
      <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-suth-text-tertiary">
        {label}
      </dt>
      <dd className="max-w-[70%] break-words text-right text-sm text-suth-text">{value}</dd>
    </div>
  );
}
