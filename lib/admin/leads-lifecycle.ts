import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { recentLeads } from "@/lib/leads/store";
import type { Lead } from "@/lib/leads/model";
import { loadBookings } from "@/lib/booking/store";

/**
 * THE LEAD, ALL THE WAY THROUGH.
 *
 * A lead is not just a row in a form table — it is a person moving through
 * a journey: they enquire, Ben rings them, they book a call, and then they
 * onboard and start paying. Until now those four facts lived in four
 * different tables and nothing joined them, so the admin could not tell a
 * cold enquiry from someone who had already booked and paid.
 *
 * This joins them by email in one pass: the enquiry (consultation_leads),
 * whether a call is booked (consultation_bookings), whether the onboarding
 * link has gone out and been opened (onboarding_invites), and whether they
 * have become a paying client (customers). The status is derived from the
 * furthest point they have reached.
 */

export type LeadStage =
  | "new" // just enquired, no next step yet
  | "booked" // a consultation is on the calendar
  | "call_done" // the call has happened (or was cancelled)
  | "link_sent" // onboarding link is out, not yet paying
  | "client"; // paying customer

export type LeadWithStage = {
  lead: Lead;
  stage: LeadStage;
  /** Human line under the status, e.g. "Call Thu 14 Aug, 6:30pm". */
  detail: string | null;
  bookingStartISO: string | null;
  bookingStatus: "confirmed" | "cancelled" | null;
  linkOpenedISO: string | null;
  customerId: string | null;
};

const norm = (e: string | null | undefined) => (e ?? "").trim().toLowerCase();

type Booking = { startISO: string; status: "confirmed" | "cancelled" };

/**
 * The most relevant booking, PURE and tested. A confirmed call still to
 * come (or within the last hour) beats a later-dated cancelled or past one,
 * so the callback list never hides a booked call behind a cancellation.
 */
export function chooseBooking(bookings: Booking[], nowMs: number): Booking | null {
  const isLive = (b: Booking) =>
    b.status === "confirmed" && new Date(b.startISO).getTime() >= nowMs - 3600_000;
  let best: Booking | null = null;
  for (const b of bookings) {
    if (!best) {
      best = b;
      continue;
    }
    const better = isLive(b) !== isLive(best) ? isLive(b) : b.startISO > best.startISO;
    if (better) best = b;
  }
  return best;
}

/**
 * Where a lead is in the journey, PURE and tested. Furthest-reached point
 * wins: paying client, then a live booked call, then link sent, then a past
 * call, else brand new.
 */
export function stageFor(opts: {
  hasCustomer: boolean;
  booking: Booking | null;
  hasInvite: boolean;
  linkOpenedISO: string | null;
  nowMs: number;
}): { stage: LeadStage; detail: string } {
  const { hasCustomer, booking, hasInvite, linkOpenedISO, nowMs } = opts;
  const live =
    booking?.status === "confirmed" &&
    new Date(booking.startISO).getTime() >= nowMs - 3600_000;
  if (hasCustomer) return { stage: "client", detail: "Signed up and paying" };
  if (booking && live) return { stage: "booked", detail: `Call ${fmt(booking.startISO)}` };
  if (hasInvite)
    return {
      stage: "link_sent",
      detail: linkOpenedISO
        ? `Link opened ${fmtDate(linkOpenedISO)}`
        : "Onboarding link sent, not opened yet",
    };
  if (booking)
    return {
      stage: "call_done",
      detail: booking.status === "cancelled" ? "Call was cancelled" : `Call was ${fmt(booking.startISO)}`,
    };
  return { stage: "new", detail: "Needs a callback" };
}

export async function leadsWithStage(limit = 100): Promise<LeadWithStage[]> {
  const leads = await recentLeads(limit);
  if (leads.length === 0) return [];

  const emails = Array.from(new Set(leads.map((l) => norm(l.email)).filter(Boolean)));
  const sb = supabaseAdmin();

  const [bookings, customersRes, invitesRes] = await Promise.all([
    loadBookings().then((b) => b, () => []),
    sb
      .from("customers")
      .select("id, email")
      .in("email", emails)
      .then((r) => r.data ?? [], () => []),
    sb
      .from("onboarding_invites")
      .select("opened_at, created_at, payload")
      .order("created_at", { ascending: false })
      .limit(500)
      .then((r) => r.data ?? [], () => []),
  ]);

  const customerByEmail = new Map<string, string>();
  for (const c of customersRes as Array<{ id: string; email: string }>) {
    customerByEmail.set(norm(c.email), c.id);
  }

  // Group bookings per email, then pick the most relevant one via the pure,
  // tested chooseBooking (a confirmed upcoming call beats a later cancelled
  // one). The empty-key guard matches the invite/customer joins.
  const nowMs = Date.now();
  const bookingsByEmail = new Map<string, Booking[]>();
  for (const b of bookings) {
    const key = norm(b.email);
    if (!key) continue;
    const list = bookingsByEmail.get(key) ?? [];
    list.push({ startISO: b.startISO, status: b.status });
    bookingsByEmail.set(key, list);
  }
  const bookingByEmail = new Map<string, Booking>();
  for (const [key, list] of bookingsByEmail) {
    const chosen = chooseBooking(list, nowMs);
    if (chosen) bookingByEmail.set(key, chosen);
  }

  const inviteByEmail = new Map<string, string | null>();
  for (const inv of invitesRes as Array<{
    opened_at: string | null;
    payload: { email?: string };
  }>) {
    const key = norm(inv.payload?.email);
    if (key && !inviteByEmail.has(key)) inviteByEmail.set(key, inv.opened_at);
  }

  return leads.map((lead): LeadWithStage => {
    const key = norm(lead.email);
    const customerId = customerByEmail.get(key) ?? null;
    const booking = bookingByEmail.get(key) ?? null;
    const linkOpened = inviteByEmail.get(key) ?? null;
    const hasInvite = inviteByEmail.has(key) || Boolean(lead.invitedAtISO);

    const { stage, detail } = stageFor({
      hasCustomer: Boolean(customerId),
      booking,
      hasInvite,
      linkOpenedISO: linkOpened,
      nowMs,
    });

    return {
      lead,
      stage,
      detail,
      bookingStartISO: booking?.startISO ?? null,
      bookingStatus: booking?.status ?? null,
      linkOpenedISO: linkOpened,
      customerId,
    };
  });
}

function fmt(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(iso));
}

function fmtDate(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
  }).format(new Date(iso));
}

export const STAGE_META: Record<
  LeadStage,
  { label: string; tone: "neutral" | "accent" | "warn" | "good" }
> = {
  new: { label: "New enquiry", tone: "warn" },
  booked: { label: "Call booked", tone: "accent" },
  call_done: { label: "Called", tone: "neutral" },
  link_sent: { label: "Link sent", tone: "accent" },
  client: { label: "Client", tone: "good" },
};
