import "server-only";
import type { StationId } from "./model";
import { buildDistribution, type Distribution } from "./percentiles";
import type {
  ResultsDataSource, EventSummary, RaceEventDetail, RankingPage,
  AthleteProfile, StartList, SearchResults, RecordsBoard, ResultDetail,
} from "./source";

/**
 * HTTP-backed data source, ready for the API being built.
 *
 * Switch on with:
 *   RESULTS_SOURCE=api
 *   RESULTS_API_URL=https://api.example.com/v1
 *   RESULTS_API_KEY=…            (optional; sent as a Bearer token)
 *
 * The full endpoint contract is in `docs/results/API-CONTRACT.md`. Every method
 * maps to exactly one GET, and the JSON shapes are the types in `./source.ts` —
 * so if the API returns those, nothing else in the app changes.
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
    return (await response.json()) as T;
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
    return get<RaceEventDetail>(`/events/${encodeURIComponent(slug)}`, { revalidate: 60 });
  },

  async getRanking(eventSlug, division, opts) {
    return get<RankingPage>(
      `/events/${encodeURIComponent(eventSlug)}/rankings/${encodeURIComponent(division)}`,
      {
        revalidate: 60,
        query: {
          cursor: opts?.cursor,
          ageGroup: opts?.ageGroup,
          q: opts?.q,
          limit: opts?.limit === Number.MAX_SAFE_INTEGER ? "all" : opts?.limit,
        },
      },
    );
  },

  async getResult(id) {
    return get<ResultDetail>(`/results/${encodeURIComponent(id)}`, { revalidate: 3600 });
  },

  async getAthlete(slug) {
    return get<AthleteProfile>(`/athletes/${encodeURIComponent(slug)}`, { revalidate: 3600 });
  },

  async getStarters(eventSlug) {
    return get<StartList>(`/events/${encodeURIComponent(eventSlug)}/starters`, { revalidate: 300 });
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
    return (await get<number[]>(
      `/events/${encodeURIComponent(eventSlug)}/divisions/${encodeURIComponent(division)}/finish-times`,
      { revalidate: 300 },
    )) ?? [];
  },

  async getStationDistribution(station: StationId, division: string): Promise<Distribution> {
    // Accepts either a precomputed distribution or a raw sample array, because
    // whichever the API finds cheaper to serve is fine here.
    const payload = await get<Distribution | number[]>(
      `/distributions/${encodeURIComponent(division)}/${encodeURIComponent(station)}`,
      { revalidate: 3600 },
    );
    if (!payload) return buildDistribution([]);
    return Array.isArray(payload) ? buildDistribution(payload) : payload;
  },
};
