/**
 * `LiveDataSource` — the real one. Replaces `live-source.stub.ts`.
 *
 * The frontend brief left a stub full of typed TODOs describing what a feed had
 * to supply. This is that stub implemented against our own ingested database,
 * so `NEXT_PUBLIC_DATA_MODE=live` now works end to end and no component
 * changes.
 *
 * There are two implementations because there are two callers:
 *
 * - **On the server** (Server Components, route handlers, generateMetadata) it
 *   talks to `ResultsService` directly. Making an HTTP request to our own
 *   endpoint from inside our own server would add a network hop, a serialisation
 *   round trip and a second cache layer to reach code already in the process.
 * - **In the browser** it fetches `/api/results/v1/*`, because a browser cannot
 *   reach the database and must not try.
 *
 * Both satisfy the same interface, and the contract test runs against both — so
 * "it works on the server but not on the client" is a caught failure rather
 * than a discovered one.
 */

import type { StationId } from "./model";
import type { Distribution } from "./percentiles";
import type {
  AthleteProfile,
  EventSummary,
  RaceEventDetail,
  RankingPage,
  RecordsBoard,
  ResultDetail,
  ResultsDataSource,
  SearchResults,
  StartList,
} from "./source";
import type { EventStatus } from "./types";
import { demoDataSource } from "./demo-source";
import { ResilientDataSource } from "./engine/serve/resilient-source";

/* ── Server: straight to the service ──────────────────────────────────── */

export class DirectLiveDataSource implements ResultsDataSource {
  /**
   * The engine, loaded on first use.
   *
   * ⚠️ Lazy on purpose — a static import would pull the Supabase client and the
   * whole engine into the browser bundle — but `await import()` rather than
   * `require()`. `require` resolved under webpack and threw "Cannot find module
   * './engine'" under ESM, and because `ResilientDataSource` wraps this and
   * treats any throw as "the store is down", the failure did not surface as an
   * error: every call quietly fell through to the demo tier. Live mode looked
   * like it worked and served synthetic data.
   *
   * The promise is cached, so the module loads once rather than per call.
   */
  private enginePromise?: Promise<typeof import("./engine")>;

  private async service() {
    this.enginePromise ??= import("./engine");
    return (await this.enginePromise).getResultsService();
  }

  async listEvents(filter?: { season?: string; region?: string; status?: EventStatus }) {
    return (await this.service()).listEvents(filter);
  }
  async getEvent(slug: string) {
    return (await this.service()).getEvent(slug);
  }
  async getRanking(
    eventSlug: string,
    division: string,
    opts?: { cursor?: string; ageGroup?: string; q?: string; limit?: number },
  ) {
    return (await this.service()).getRanking(eventSlug, division, opts);
  }
  async getResult(id: string) {
    return (await this.service()).getResult(id);
  }
  async getAthlete(slug: string) {
    return (await this.service()).getAthlete(slug);
  }
  async getStarters(eventSlug: string) {
    return (await this.service()).getStarters(eventSlug);
  }
  async searchAll(q: string) {
    return (await this.service()).searchAll(q);
  }
  async getRecords() {
    return (await this.service()).getRecords();
  }
  async getStationDistribution(station: StationId, division: string) {
    return (await this.service()).getStationDistribution(station, division);
  }
  async getDivisionFinishTimes(eventSlug: string, division: string) {
    return (await this.service()).getDivisionFinishTimes(eventSlug, division);
  }
}

/* ── Browser: our own API ─────────────────────────────────────────────── */

export type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

export class HttpLiveDataSource implements ResultsDataSource {
  constructor(
    private baseUrl = "",
    private fetchImpl: FetchLike = (url, init) => fetch(url, init),
  ) {}

  /**
   * Unwraps the `{ data, attribution, mode }` envelope.
   *
   * A 404 returns null rather than throwing: "no such athlete" is a page state,
   * not an exception. Any other failure throws, because a component silently
   * rendering an empty board when the API is broken is worse than an error
   * boundary.
   */
  private async get<T>(path: string, fallback?: T): Promise<T> {
    const response = await this.fetchImpl(`${this.baseUrl}/api/results/v1${path}`);
    if (response.status === 404 && fallback !== undefined) return fallback;
    if (!response.ok) {
      throw new Error(`Results API ${path} failed: ${response.status}`);
    }
    const body = (await response.json()) as { data: T };
    return body.data;
  }

  async listEvents(filter?: { season?: string; region?: string; status?: EventStatus }) {
    const query = new URLSearchParams();
    if (filter?.season) query.set("season", filter.season);
    if (filter?.region) query.set("region", filter.region);
    if (filter?.status) query.set("status", filter.status);
    const suffix = query.toString() ? `?${query}` : "";
    return this.get<EventSummary[]>(`/events${suffix}`, []);
  }

  async getEvent(slug: string) {
    return this.get<RaceEventDetail | null>(`/event/${encodeURIComponent(slug)}`, null);
  }

  async getRanking(
    eventSlug: string,
    division: string,
    opts?: { cursor?: string; ageGroup?: string; q?: string; limit?: number },
  ) {
    const query = new URLSearchParams();
    if (opts?.cursor) query.set("cursor", opts.cursor);
    if (opts?.ageGroup) query.set("ageGroup", opts.ageGroup);
    if (opts?.q) query.set("q", opts.q);
    if (opts?.limit) query.set("limit", String(opts.limit));
    const suffix = query.toString() ? `?${query}` : "";
    return this.get<RankingPage | null>(
      `/ranking/${encodeURIComponent(`${eventSlug}-${division}`)}${suffix}`,
      null,
    );
  }

  async getResult(id: string) {
    return this.get<ResultDetail | null>(`/result/${encodeURIComponent(id)}`, null);
  }

  async getAthlete(slug: string) {
    return this.get<AthleteProfile | null>(`/athlete/${encodeURIComponent(slug)}`, null);
  }

  async getStarters(eventSlug: string) {
    return this.get<StartList | null>(`/starters/${encodeURIComponent(eventSlug)}`, null);
  }

  async searchAll(q: string) {
    return this.get<SearchResults>(`/search?q=${encodeURIComponent(q)}`, {
      athletes: [],
      events: [],
    });
  }

  async getRecords() {
    return this.get<RecordsBoard>("/records", { scope: "all-time", entries: [] });
  }

  async getStationDistribution(station: StationId, division: string) {
    return this.get<Distribution>(
      `/distribution?station=${encodeURIComponent(station)}&division=${encodeURIComponent(division)}`,
    );
  }

  async getDivisionFinishTimes(eventSlug: string, division: string) {
    return this.get<number[]>(
      `/finish-times?event=${encodeURIComponent(eventSlug)}&division=${encodeURIComponent(division)}`,
      [],
    );
  }
}

/* ── Resilience ───────────────────────────────────────────────────────── */

/**
 * The exported source is wrapped, not raw.
 *
 * A paused project, a revoked key or a network partition would otherwise turn
 * every server-rendered results page into a 500. Wrapped, the same failure
 * serves the last good answer, or the seeded dataset, and says which — see
 * `resilient-source.ts` for the reasoning.
 *
 * A module-level singleton on purpose: the last-good cache and the circuit
 * breaker are only worth anything if they survive between requests.
 */
let resilient: ResilientDataSource | null = null;

function resilientSource(): ResilientDataSource {
  if (resilient) return resilient;
  const primary: ResultsDataSource =
    typeof window === "undefined" ? new DirectLiveDataSource() : new HttpLiveDataSource();
  resilient = new ResilientDataSource(primary, demoDataSource);
  return resilient;
}

/** What tier the last read came from, for the UI and the health endpoint. */
export function liveSourceDegradation() {
  return resilientSource().degradation();
}

export const liveDataSource: ResultsDataSource = new Proxy({} as ResultsDataSource, {
  get(_target, prop) {
    const source = resilientSource() as unknown as Record<string | symbol, unknown>;
    const value = source[prop];
    return typeof value === "function" ? value.bind(source) : value;
  },
});
