import { supabaseAdmin } from "@/lib/supabase/admin";
import type { Lead } from "@/lib/leads/model";

/**
 * WHERE A LEAD LIVES SO THE TEXT MESSAGE HAS SOMETHING TO OPEN.
 *
 * Postgres, since 3 August 2026. It was Redis, which was the right call when
 * the only database this app pointed at had been deleted — and the wrong one
 * the moment that was fixed, because Redis was never actually provisioned.
 * In practice every lead lived in a process-memory fallback, so the link in
 * Ben's text 404'd as soon as the server recycled. One store beats two, and
 * a store that exists beats one that does not.
 *
 * THE NINETY-DAY PROMISE NEEDS A CRON NOW. Redis expired records itself
 * through a TTL. Postgres does not, so `expireOldLeads` exists for a
 * scheduled job to call — and until one does, the retention line on the lead
 * page says what the code actually does rather than what it intends to.
 */

type Row = {
  id: string;
  created_at: string;
  name: string;
  email: string;
  phone: string | null;
  rail: string | null;
  wants: string | null;
  readiness: string | null;
  goal: string | null;
  programme: string | null;
  injury: string | null;
  brief: string;
  city: string | null;
  region: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
  landing_path: string | null;
  referrer: string | null;
  seconds_on_site: number | null;
  page_views: number | null;
  source_path: string | null;
  invited_at: string | null;
};

function toRow(lead: Lead) {
  return {
    id: lead.id,
    created_at: lead.createdISO,
    name: lead.name,
    email: lead.email,
    phone: lead.phone,
    rail: lead.rail,
    wants: lead.wants,
    readiness: lead.readiness,
    goal: lead.goal,
    programme: lead.programme,
    injury: lead.injury,
    brief: lead.brief,
    city: lead.city,
    region: lead.region,
    country: lead.country,
    latitude: lead.latitude,
    longitude: lead.longitude,
    landing_path: lead.landingPath,
    referrer: lead.referrer,
    seconds_on_site: lead.secondsOnSite,
    page_views: lead.pageViews,
    source_path: lead.sourcePath,
  };
}

function fromRow(r: Row): Lead {
  return {
    id: r.id,
    createdISO: r.created_at,
    name: r.name,
    email: r.email,
    phone: r.phone,
    invitedAtISO: r.invited_at,
    rail: r.rail,
    wants: r.wants,
    readiness: r.readiness,
    goal: r.goal,
    programme: r.programme,
    injury: r.injury,
    brief: r.brief,
    city: r.city,
    region: r.region,
    country: r.country,
    latitude: r.latitude,
    longitude: r.longitude,
    landingPath: r.landing_path,
    referrer: r.referrer,
    secondsOnSite: r.seconds_on_site,
    pageViews: r.page_views,
    sourcePath: r.source_path,
  };
}

/** True when the database is configured at all. Surfaced in the admin. */
export function leadStoreReady(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SECRET_KEY,
  );
}

export async function saveLead(lead: Lead): Promise<boolean> {
  try {
    const { error } = await supabaseAdmin()
      .from("consultation_leads")
      .insert(toRow(lead));
    if (error) {
      // The email and the text still go out carrying everything, so a
      // storage failure costs the link, not the lead.
      console.error("[leads] insert failed", error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.error("[leads] store unreachable", e);
    return false;
  }
}

export async function getLead(id: string): Promise<Lead | null> {
  try {
    const { data, error } = await supabaseAdmin()
      .from("consultation_leads")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error || !data) return null;
    return fromRow(data as Row);
  } catch {
    return null;
  }
}

/** Newest first, for the admin list. */
export async function recentLeads(limit = 100): Promise<Lead[]> {
  try {
    const { data, error } = await supabaseAdmin()
      .from("consultation_leads")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error || !data) return [];
    return (data as Row[]).map(fromRow);
  } catch {
    return [];
  }
}

/** Stamped when Ben sends the account setup link. Cosmetic; never fatal. */
export async function markInvited(id: string): Promise<void> {
  try {
    await supabaseAdmin()
      .from("consultation_leads")
      .update({ invited_at: new Date().toISOString() })
      .eq("id", id);
  } catch {
    /* Never worth failing the invite over. */
  }
}

/**
 * Delete leads older than `days`.
 *
 * Nothing calls this yet. It exists so the retention promise has an
 * implementation to point at the day a cron is added, rather than being a
 * sentence in a comment that quietly became untrue.
 */
export async function expireOldLeads(days = 90): Promise<number> {
  const cutoff = new Date(Date.now() - days * 86400_000).toISOString();
  try {
    const { data, error } = await supabaseAdmin()
      .from("consultation_leads")
      .delete()
      .lt("created_at", cutoff)
      .select("id");
    return error || !data ? 0 : data.length;
  } catch {
    return 0;
  }
}
