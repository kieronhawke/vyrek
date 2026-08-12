import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";

/**
 * Everything the business knows about one person, joined by email.
 *
 * The admin used to keep these in separate rooms: enquiries under Live,
 * calls under Consultations, sent links under Clients, and the paying
 * account under Customers. Ben is always asking about ONE person, so the
 * customer page pulls the whole story into one place.
 *
 * Email is the join key because it is the only identifier every one of
 * these tables shares. Matching is case-insensitive; a person who
 * enquired as Ben@x.com and signed up as ben@x.com is one person.
 *
 * Every reader degrades to empty: a missing table or a query error costs
 * a panel, never the page.
 */

export type JourneyEnquiry = {
  id: string;
  createdISO: string;
  wants: string | null;
  goal: string | null;
  place: string | null;
};

export type JourneyCall = {
  ref: string;
  startsISO: string;
  minutes: number;
  status: "confirmed" | "cancelled";
};

export type JourneyInvite = {
  id: string;
  createdISO: string;
  openedISO: string | null;
  kind: string;
  amountPence: number | null;
};

export type CustomerJourney = {
  enquiries: JourneyEnquiry[];
  calls: JourneyCall[];
  invites: JourneyInvite[];
};

export async function customerJourney(email: string): Promise<CustomerJourney> {
  const key = email.trim().toLowerCase();
  const empty: CustomerJourney = { enquiries: [], calls: [], invites: [] };
  if (!key) return empty;

  const sb = supabaseAdmin();

  const enquiriesQ = async (): Promise<JourneyEnquiry[]> => {
    const { data } = await sb
      .from("consultation_leads")
      .select("id, created_at, wants, goal, city, region, email")
      .ilike("email", key)
      .order("created_at", { ascending: false })
      .limit(10);
    return ((data ?? []) as Array<{
      id: string;
      created_at: string;
      wants: string | null;
      goal: string | null;
      city: string | null;
      region: string | null;
    }>).map((r) => ({
      id: r.id,
      createdISO: r.created_at,
      wants: r.wants,
      goal: r.goal,
      place: r.city ?? r.region ?? null,
    }));
  };

  const callsQ = async (): Promise<JourneyCall[]> => {
    const { data } = await sb
      .from("consultation_bookings")
      .select("ref, starts_at, minutes, status, email")
      .ilike("email", key)
      .order("starts_at", { ascending: false })
      .limit(10);
    return ((data ?? []) as Array<{
      ref: string;
      starts_at: string;
      minutes: number;
      status: "confirmed" | "cancelled";
    }>).map((r) => ({
      ref: r.ref,
      startsISO: r.starts_at,
      minutes: r.minutes,
      status: r.status,
    }));
  };

  const invitesQ = async (): Promise<JourneyInvite[]> => {
    const { data } = await sb
      .from("onboarding_invites")
      .select("id, created_at, opened_at, payload")
      .ilike("payload->>email", key)
      .order("created_at", { ascending: false })
      .limit(10);
    return ((data ?? []) as Array<{
      id: string;
      created_at: string;
      opened_at: string | null;
      payload: { kind?: string; amountPence?: number };
    }>).map((r) => ({
      id: r.id,
      createdISO: r.created_at,
      openedISO: r.opened_at,
      kind: r.payload?.kind === "payment" ? "payment link" : "full set-up",
      amountPence: r.payload?.amountPence ?? null,
    }));
  };

  const [enquiries, calls, invites] = await Promise.all([
    enquiriesQ().catch(() => empty.enquiries),
    callsQ().catch(() => empty.calls),
    invitesQ().catch(() => empty.invites),
  ]);

  return { enquiries, calls, invites };
}

/** The reverse direction: an enquiry email → its customer record, if any. */
export async function customerIdForEmail(
  email: string,
): Promise<string | null> {
  const key = email.trim().toLowerCase();
  if (!key) return null;
  try {
    const { data } = await supabaseAdmin()
      .from("customers")
      .select("id")
      .ilike("email", key)
      .maybeSingle();
    return (data as { id: string } | null)?.id ?? null;
  } catch {
    return null;
  }
}
