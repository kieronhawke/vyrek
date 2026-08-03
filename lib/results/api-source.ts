import "server-only";
import type { StationId } from "./model";
import { buildDistribution, type Distribution } from "./percentiles";
import type {
  ResultsDataSource, EventSummary, RaceEventDetail, RankingPage,
  AthleteProfile, StartList, SearchResults, RecordsBoard, ResultDetail,
} from "./source";

/**
 * HTTP-backed data source.
 *
 * Paths match the v1 API that lives in this repo at `app/api/results/v1/*`.
 * They were originally invented against a guessed contract and are now aligned
 * to the routes that actually exist — a doc describing endpoints nobody serves
 * is worse than no doc.
 *
 * Switch on with:
 *   RESULTS_SOURCE=api
 *   RESULTS_API_URL=https://www.suthperformance.com/api/results/v1
 *   RESULTS_API_KEY=…            (optional; sent as a Bearer token)
 *
 * Pointing it at our own origin is legitimate and is how a separately deployed
 * frontend would consume it. Server-rendering against the same deployment is
 * an extra hop, so prefer the direct source in that case — this exists for when
 * the API is consumed from elsewhere, or from a different deployment.
 *
 * The v1 API wraps every payload in an envelope —
 * `{ data, attribution, mode }` — so responses are unwrapped here. The
 * attribution block exists because the underlying results are timed and
 * published by mika:Timing for HYROX and must be credited wherever they are
 * shown; `lastAttribution()` exposes the most recent one for the UI to render.
 *
 * Three deliberate behaviours, because a results page must not fall over when
 * a feed hiccups mid-race:
 *
 * 1. **Every request has a timeout.** A hanging upstream would otherwise hold a
 *    server render open until the platform kills it.
 * 2. **Failures degrade, they do not throw.** A missing event renders the
 *    not-found page; a failed search returns no matches. The one exception is
 *    a page that cannot exist without its data, which calls `notFound()`.
 * 3. **Responses are revalidated, not cached forever.** Live events get a short
 *    window so the board actually moves.
 */

const TIMEOUT_MS = 8_000;

function baseUrl(): string {
  const url = process.env.RESULTS_API_URL;
  if (!url) throw new Error("RESULTS_API_URL is not set but RESULTS_SOURCE=api");
  return url.replace(/\/$/, "");
}

/** The v1 envelope. */
type Envelope<T> = {
  data: T;
  attribution?: { timing: string; organiser: string; note: string; url: string };
  mode?: "demo" | "live";
};

let latestAttribution: Envelope<unknown>["attribution"] | null = null;

/**
 * Attribution from the most recent API response.
 *
 * Not decorative: the results are mika:Timing's work published for HYROX, and
 * a page showing them has to say so. Reading it from the response rather than
 * hard-coding it means the credit follows whatever the API actually served.
 */
export function lastAttribution() {
  return latestAttribution;
}

type FetchOptions = {
  /** Seconds before Next revalidates. Short for anything that moves. */
  revalidate?: number;
  query?: Record<string, string | number | undefined>;
};

async function get<T>(path: string, options: FetchOptions = {}): Promise<T | null> {
  const url = new URL(baseUrl() + path);
  for (const [key, value] of Object.entries(options.query ?? {})) {
    if (value !== undefined && value !== "") url.searchParams.set(key, String(value));
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        accept: "application/json",
        ...(process.env.RESULTS_API_KEY
          ? { authorization: `Bearer ${process.env.RESULTS_API_KEY}` }
          : {}),
      },
      next: { revalidate: options.revalidate ?? 300 },
    });

    // 404 is a legitimate answer, not a failure — the caller renders not-found.
    if (response.status === 404) return null;
    if (!response.ok) {
      console.error(`[results-api] ${response.status} ${url.pathname}`);
      return null;
    }
    const body = (await response.json()) as Envelope<T> | T;
    // Unwrap the v1 envelope. Tolerates a bare payload too, so a future
    // endpoint that does not wrap does not silently return undefined.
    if (body && typeof body === "object" && "data" in body) {
      const envelope = body as Envelope<T>;
      if (envelope.attribution) latestAttribution = envelope.attribution;
      return envelope.data;
    }
    return body as T;
  } catch (error) {
    const reason = (error as Error).name === "AbortError"
      ? `timed out after ${TIMEOUT_MS}ms`
      : (error as Error).message;
    console.error(`[results-api] ${url.pathname}: ${reason}`);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export const apiDataSource: ResultsDataSource = {
  async listEvents(filter) {
    return (await get<EventSummary[]>("/events", {
      revalidate: 300,
      query: { season: filter?.season, region: filter?.region, status: filter?.status },
    })) ?? [];
  },

  async getEvent(slug) {
    // Live events move; finished ones do not. The caller cannot know which
    // before fetching, so this uses the shorter window for all of them.
    return get<RaceEventDetail>(`/event/${encodeURIComponent(slug)}`, { revalidate: 60 });
  },

  async getRanking(eventSlug, division, opts) {
    // The API takes a combined `{event}-{division}` slug, the same shape the
    // ranking page URL uses, and caps `limit` at 500 server-side. Asking for
    // MAX_SAFE_INTEGER would silently get 500 rows back, so the caller's
    // "give me everything" is expressed as the cap rather than as a lie.
    return get<RankingPage>(
      `/ranking/${encodeURIComponent(`${eventSlug}-${division}`)}`,
      {
        revalidate: 60,
        query: {
          cursor: opts?.cursor,
          ageGroup: opts?.ageGroup,
          q: opts?.q,
          limit: opts?.limit === Number.MAX_SAFE_INTEGER ? 500 : opts?.limit,
        },
      },
    );
  },

  async getResult(id) {
    return get<ResultDetail>(`/result/${encodeURIComponent(id)}`, { revalidate: 3600 });
  },

  async getAthlete(slug) {
    return get<AthleteProfile>(`/athlete/${encodeURIComponent(slug)}`, { revalidate: 3600 });
  },

  async getStarters(eventSlug) {
    return get<StartList>(`/starters/${encodeURIComponent(eventSlug)}`, { revalidate: 300 });
  },

  async searchAll(q) {
    if (q.trim().length < 2) return { athletes: [], events: [] };
    // Search backs a keystroke-driven palette; a stale answer beats a slow one.
    return (await get<SearchResults>("/search", {
      revalidate: 30,
      query: { q: q.trim() },
    })) ?? { athletes: [], events: [] };
  },

  async getRecords() {
    return (await get<RecordsBoard>("/records", { revalidate: 3600 }))
      ?? { scope: "all-time", entries: [] };
  },

  async getDivisionFinishTimes(eventSlug, division) {
    // Must be an indexed column upstream, not a scan: result pages call this on
    // every render, and building it from result rows cost 5.5s LCP locally.
    return (await get<number[]>("/finish-times", {
      revalidate: 300,
      query: { event: eventSlug, division },
    })) ?? [];
  },

  async getStationDistribution(station: StationId, division: string): Promise<Distribution> {
    // Accepts either a precomputed distribution or a raw sample array, because
    // whichever the API finds cheaper to serve is fine here.
    const payload = await get<Distribution | number[]>("/distribution", {
      revalidate: 3600,
      query: { station, division },
    });
    if (!payload) return buildDistribution([]);
    return Array.isArray(payload) ? buildDistribution(payload) : payload;
  },
};
