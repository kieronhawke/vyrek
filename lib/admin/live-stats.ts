import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";

/**
 * The numbers behind the Live page: who's on now, how today and the week
 * are going, which pages and countries are pulling people in, and where
 * recent enquiries came from for the map. All from tables the site
 * already writes; nothing new is tracked.
 */

export type VisitorStats = {
  liveNow: number;
  today: number;
  last7Days: number;
  topPages: Array<{ path: string; count: number }>;
  topCountries: Array<{ country: string; count: number }>;
};

export async function visitorStats(): Promise<VisitorStats | null> {
  try {
    const sb = supabaseAdmin();
    const now = Date.now();
    const liveCutoff = new Date(now - 60_000).toISOString();
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const weekAgo = new Date(now - 7 * 86400_000).toISOString();

    const [live, today, week] = await Promise.all([
      sb
        .from("live_sessions")
        .select("id", { count: "exact", head: true })
        .gte("last_seen", liveCutoff),
      sb
        .from("live_sessions")
        .select("id", { count: "exact", head: true })
        .gte("started_at", startOfToday.toISOString()),
      sb
        .from("live_sessions")
        .select("path, country")
        .gte("started_at", weekAgo)
        .limit(5000),
    ]);

    const pageCounts = new Map<string, number>();
    const countryCounts = new Map<string, number>();
    for (const row of (week.data ?? []) as Array<{
      path: string;
      country: string | null;
    }>) {
      pageCounts.set(row.path, (pageCounts.get(row.path) ?? 0) + 1);
      if (row.country) {
        countryCounts.set(row.country, (countryCounts.get(row.country) ?? 0) + 1);
      }
    }
    const top = (m: Map<string, number>, n: number) =>
      Array.from(m.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, n);

    return {
      liveNow: live.count ?? 0,
      today: today.count ?? 0,
      last7Days: (week.data ?? []).length,
      topPages: top(pageCounts, 8).map(([path, count]) => ({ path, count })),
      topCountries: top(countryCounts, 8).map(([country, count]) => ({
        country,
        count,
      })),
    };
  } catch (e) {
    console.error("[live-stats] failed", e);
    return null;
  }
}

export type EnquiryPin = {
  id: string;
  name: string;
  place: string | null;
  latitude: number;
  longitude: number;
  createdISO: string;
};

/** Recent enquiries that carry coordinates, for the map. */
export async function enquiryPins(days = 60): Promise<EnquiryPin[]> {
  try {
    const sb = supabaseAdmin();
    const since = new Date(Date.now() - days * 86400_000).toISOString();
    const { data } = await sb
      .from("consultation_leads")
      .select("id, name, city, region, latitude, longitude, created_at")
      .gte("created_at", since)
      .not("latitude", "is", null)
      .limit(200);
    return ((data ?? []) as Array<{
      id: string;
      name: string;
      city: string | null;
      region: string | null;
      latitude: number;
      longitude: number;
      created_at: string;
    }>).map((r) => ({
      id: r.id,
      name: r.name,
      place: r.city ?? r.region ?? null,
      latitude: r.latitude,
      longitude: r.longitude,
      createdISO: r.created_at,
    }));
  } catch {
    return [];
  }
}
