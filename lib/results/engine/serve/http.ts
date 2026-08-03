/**
 * Shared shape for every `/api/results/v1/*` response.
 *
 * Two things are deliberately structural rather than left to each route:
 *
 * **Attribution.** The underlying facts are timed and published by mika:Timing
 * for HYROX. Every response carries that credit, so a view cannot render
 * ingested data without the attribution being available to render alongside it
 * (brief §2).
 *
 * **Caching.** Edge-cached with stale-while-revalidate, so a source outage —
 * or a database blip — still serves the last good response. This is the second
 * layer of the "public site availability is effectively 100 percent" claim; the
 * first is that we read from our own store at all.
 */

import { NextResponse } from "next/server";

export const ATTRIBUTION = {
  timing: "mika:Timing",
  organiser: "HYROX",
  note: "Results data is timed and published by mika:Timing for HYROX.",
  url: "https://results.hyrox.com/",
} as const;

export type ApiEnvelope<T> = {
  data: T;
  attribution: typeof ATTRIBUTION;
  /** `demo` when the payload came from seeded data rather than ingestion. */
  mode: "demo" | "live";
};

export type CachePolicy = "live" | "entity" | "static";

/**
 * Live boards revalidate in seconds; finished entities in minutes; reference
 * data in hours. All three keep serving stale for a day, because a stale
 * leaderboard is worth more to a visitor than a 500.
 */
const CACHE_HEADERS: Record<CachePolicy, string> = {
  live: "public, s-maxage=10, stale-while-revalidate=86400",
  entity: "public, s-maxage=300, stale-while-revalidate=86400",
  static: "public, s-maxage=3600, stale-while-revalidate=86400",
};

export function apiResponse<T>(
  data: T,
  opts: { cache?: CachePolicy; status?: number } = {},
): NextResponse {
  const body: ApiEnvelope<T> = {
    data,
    attribution: ATTRIBUTION,
    mode: process.env.NEXT_PUBLIC_DATA_MODE === "live" ? "live" : "demo",
  };
  return NextResponse.json(body, {
    status: opts.status ?? 200,
    headers: {
      "Cache-Control": CACHE_HEADERS[opts.cache ?? "entity"],
      "X-Results-Attribution": ATTRIBUTION.timing,
    },
  });
}

export function apiNotFound(what: string): NextResponse {
  return NextResponse.json(
    { error: `${what} not found`, attribution: ATTRIBUTION },
    { status: 404, headers: { "Cache-Control": "public, s-maxage=60" } },
  );
}

/**
 * A failure here must not take the page down.
 *
 * Routes call this in a catch and return an empty-but-valid payload where the
 * shape allows, so a component renders its empty state rather than throwing.
 */
export function apiError(error: unknown, status = 500): NextResponse {
  const message = error instanceof Error ? error.message : String(error);
  return NextResponse.json(
    { error: message, attribution: ATTRIBUTION },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}
