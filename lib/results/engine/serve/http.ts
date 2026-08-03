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
  /**
   * Which tier answered: `live` from the database, `last-good` from the most
   * recent successful read, `demo` from the seeded dataset.
   *
   * Always present, because a consumer cannot tell stale data from fresh data
   * by looking at it, and quietly serving one as the other is the failure mode
   * worth engineering against.
   */
  tier: "live" | "last-good" | "demo";
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
  opts: { cache?: CachePolicy; status?: number; tier?: ApiEnvelope<T>["tier"] } = {},
): NextResponse {
  const tier = opts.tier ?? "live";
  const body: ApiEnvelope<T> = {
    data,
    attribution: ATTRIBUTION,
    mode: process.env.NEXT_PUBLIC_DATA_MODE === "live" ? "live" : "demo",
    tier,
  };
  return NextResponse.json(body, {
    status: opts.status ?? 200,
    headers: {
      // Degraded answers are never cached at the edge: caching a fallback
      // would outlive the outage that caused it.
      "Cache-Control": tier === "live" ? CACHE_HEADERS[opts.cache ?? "entity"] : "no-store",
      "X-Results-Attribution": ATTRIBUTION.timing,
      "X-Results-Tier": tier,
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
 * A store that is unreachable is reported as 503 with a plain explanation
 * rather than a 500 carrying a Postgres error string. The two are different
 * situations — "the database is not there" is operational and temporary,
 * "the code threw" is a bug — and a caller that cannot tell them apart will
 * retry the wrong one.
 */
export function apiError(error: unknown, status = 500): NextResponse {
  const message = describeError(error);

  if (isStoreUnreachable(message)) {
    return NextResponse.json(
      {
        error: "The results store is unavailable. Serving nothing rather than something wrong.",
        code: "STORE_UNAVAILABLE",
        attribution: ATTRIBUTION,
      },
      { status: 503, headers: { "Cache-Control": "no-store", "Retry-After": "60" } },
    );
  }

  return NextResponse.json(
    { error: message, code: "INTERNAL", attribution: ATTRIBUTION },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

/** DNS failure, refused connection, or a paused Supabase project. */
function isStoreUnreachable(message: string): boolean {
  return /ENOTFOUND|EAI_AGAIN|ECONNREFUSED|ETIMEDOUT|fetch failed|getaddrinfo|TypeError: fetch/i.test(
    message,
  );
}

/**
 * `String(error)` on a plain object gives "[object Object]", which is what a
 * caller then sees instead of a cause. Anything that is not an Error is
 * inspected for a message before being stringified.
 */
export function describeError(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  if (error && typeof error === "object") {
    const e = error as { message?: unknown; code?: unknown };
    if (typeof e.message === "string") {
      return e.code ? `${e.message} (code=${String(e.code)})` : e.message;
    }
    try {
      return JSON.stringify(error);
    } catch {
      return "unserialisable error";
    }
  }
  return String(error);
}
