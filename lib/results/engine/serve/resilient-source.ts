/**
 * `ResilientDataSource` — the answer to "what does the site do when the data
 * layer is broken".
 *
 * Ingestion already survives the *source* going away: it freezes on last-good
 * data and marks live events paused. This is the other half — surviving our own
 * *store* going away. A paused database, an expired key, a Supabase incident, a
 * network partition: all of them turn a working results section into a wall of
 * 500s unless something catches them.
 *
 * Three tiers, tried in order, and the last one cannot fail:
 *
 *   1. **Live** — the ingested database. What you get normally.
 *   2. **Last-good** — the most recent successful answer to this exact call,
 *      held in memory. Survives a blip without the visitor noticing anything
 *      except that the numbers stopped moving.
 *   3. **Demo** — the seeded dataset that ships in the repo. Always present,
 *      needs no network, and is the floor beneath which the site cannot fall.
 *
 * The tier in use is exposed through `degradation()` so the UI can be honest
 * about it, because silently serving demo data as though it were real results
 * would be worse than an error page.
 *
 * A circuit breaker sits in front: once the store has failed repeatedly there
 * is no value in making every page wait for the same timeout, so calls go
 * straight to the fallback until a cooldown elapses.
 */

import type { StationId } from "../../model";
import type { Distribution } from "../../percentiles";
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
} from "../../source";
import type { EventStatus } from "../../types";

export type Tier = "live" | "last-good" | "demo";

export type Degradation = {
  tier: Tier;
  since: string | null;
  reason: string | null;
  /** Consecutive store failures. Resets on the first success. */
  failures: number;
};

/** How many consecutive failures before we stop trying on every request. */
const BREAKER_THRESHOLD = Number(process.env.RESULTS_READ_BREAKER_THRESHOLD ?? 3);
/** How long to serve fallbacks before probing the store again. */
const BREAKER_COOLDOWN_MS = Number(process.env.RESULTS_READ_BREAKER_COOLDOWN_MS ?? 30_000);
/** Cap on remembered answers, so a crawler cannot grow this without bound. */
const CACHE_LIMIT = Number(process.env.RESULTS_READ_CACHE_LIMIT ?? 500);

type Deps = {
  now?: () => number;
  onFallback?: (method: string, error: unknown, tier: Tier) => void;
};

export class ResilientDataSource implements ResultsDataSource {
  private cache = new Map<string, unknown>();
  private failures = 0;
  private openedAt: number | null = null;
  private degradedSince: string | null = null;
  private lastReason: string | null = null;
  private currentTier: Tier = "live";
  private now: () => number;
  private onFallback?: Deps["onFallback"];

  constructor(
    private live: ResultsDataSource,
    private demo: ResultsDataSource,
    deps: Deps = {},
  ) {
    this.now = deps.now ?? (() => Date.now());
    this.onFallback = deps.onFallback;
  }

  degradation(): Degradation {
    return {
      tier: this.currentTier,
      since: this.degradedSince,
      reason: this.lastReason,
      failures: this.failures,
    };
  }

  /** Test hook, and the manual reset an operator would want. */
  reset() {
    this.cache.clear();
    this.failures = 0;
    this.openedAt = null;
    this.degradedSince = null;
    this.lastReason = null;
    this.currentTier = "live";
  }

  private breakerOpen(): boolean {
    if (this.openedAt === null) return false;
    if (this.now() - this.openedAt >= BREAKER_COOLDOWN_MS) {
      // Cooldown elapsed: allow one probe through rather than staying open
      // for ever, which would keep the site on demo data after a recovery.
      this.openedAt = null;
      return false;
    }
    return true;
  }

  private remember(key: string, value: unknown) {
    // Insertion-ordered eviction. A results page is read far more than it is
    // written, so the oldest entry is a fair thing to lose.
    if (this.cache.size >= CACHE_LIMIT) {
      const oldest = this.cache.keys().next().value;
      if (oldest !== undefined) this.cache.delete(oldest);
    }
    this.cache.set(key, value);
  }

  private succeed() {
    this.failures = 0;
    this.openedAt = null;
    this.degradedSince = null;
    this.lastReason = null;
    this.currentTier = "live";
  }

  private fail(method: string, error: unknown) {
    this.failures += 1;
    this.lastReason = error instanceof Error ? error.message : String(error);
    if (this.degradedSince === null) this.degradedSince = new Date(this.now()).toISOString();
    if (this.failures >= BREAKER_THRESHOLD && this.openedAt === null) {
      this.openedAt = this.now();
    }
    void method;
  }

  /**
   * The whole pattern, once.
   *
   * `demoCall` is a function rather than a value so the demo source is only
   * touched when it is actually needed — it reads from disk on first use.
   */
  private async attempt<T>(
    method: string,
    key: string,
    liveCall: () => Promise<T>,
    demoCall: () => Promise<T>,
  ): Promise<T> {
    if (!this.breakerOpen()) {
      try {
        const value = await liveCall();
        this.succeed();
        this.remember(key, value);
        return value;
      } catch (error) {
        this.fail(method, error);
      }
    }

    if (this.cache.has(key)) {
      this.currentTier = "last-good";
      this.onFallback?.(method, this.lastReason, "last-good");
      return this.cache.get(key) as T;
    }

    this.currentTier = "demo";
    this.onFallback?.(method, this.lastReason, "demo");
    try {
      return await demoCall();
    } catch {
      // The floor beneath the floor. Demo data is bundled in the repo, so this
      // should be unreachable — but "should be" is not a guarantee, and a
      // results page rendering empty beats a results page rendering a stack
      // trace.
      return emptyFor<T>(method);
    }
  }

  /* ── The contract ─────────────────────────────────────────────────── */

  listEvents(filter?: { season?: string; region?: string; status?: EventStatus }) {
    return this.attempt<EventSummary[]>(
      "listEvents",
      `listEvents:${JSON.stringify(filter ?? {})}`,
      () => this.live.listEvents(filter),
      () => this.demo.listEvents(filter),
    );
  }

  getEvent(slug: string) {
    return this.attempt<RaceEventDetail | null>(
      "getEvent",
      `getEvent:${slug}`,
      () => this.live.getEvent(slug),
      () => this.demo.getEvent(slug),
    );
  }

  getRanking(
    eventSlug: string,
    division: string,
    opts?: { cursor?: string; ageGroup?: string; q?: string; limit?: number },
  ) {
    return this.attempt<RankingPage | null>(
      "getRanking",
      `getRanking:${eventSlug}:${division}:${JSON.stringify(opts ?? {})}`,
      () => this.live.getRanking(eventSlug, division, opts),
      () => this.demo.getRanking(eventSlug, division, opts),
    );
  }

  getResult(id: string) {
    return this.attempt<ResultDetail | null>(
      "getResult",
      `getResult:${id}`,
      () => this.live.getResult(id),
      () => this.demo.getResult(id),
    );
  }

  getAthlete(slug: string) {
    return this.attempt<AthleteProfile | null>(
      "getAthlete",
      `getAthlete:${slug}`,
      () => this.live.getAthlete(slug),
      () => this.demo.getAthlete(slug),
    );
  }

  getStarters(eventSlug: string) {
    return this.attempt<StartList | null>(
      "getStarters",
      `getStarters:${eventSlug}`,
      () => this.live.getStarters(eventSlug),
      () => this.demo.getStarters(eventSlug),
    );
  }

  searchAll(q: string) {
    return this.attempt<SearchResults>(
      "searchAll",
      `searchAll:${q}`,
      () => this.live.searchAll(q),
      () => this.demo.searchAll(q),
    );
  }

  getRecords() {
    return this.attempt<RecordsBoard>(
      "getRecords",
      "getRecords",
      () => this.live.getRecords(),
      () => this.demo.getRecords(),
    );
  }

  getStationDistribution(station: StationId, division: string) {
    return this.attempt<Distribution>(
      "getStationDistribution",
      `getStationDistribution:${station}:${division}`,
      () => this.live.getStationDistribution(station, division),
      () => this.demo.getStationDistribution(station, division),
    );
  }

  getDivisionFinishTimes(eventSlug: string, division: string) {
    return this.attempt<number[]>(
      "getDivisionFinishTimes",
      `getDivisionFinishTimes:${eventSlug}:${division}`,
      () => this.live.getDivisionFinishTimes(eventSlug, division),
      () => this.demo.getDivisionFinishTimes(eventSlug, division),
    );
  }
}

/** Shape-correct emptiness, for the case that should never happen. */
function emptyFor<T>(method: string): T {
  switch (method) {
    case "listEvents":
    case "getDivisionFinishTimes":
      return [] as unknown as T;
    case "searchAll":
      return { athletes: [], events: [] } as unknown as T;
    case "getRecords":
      return { scope: "all-time", entries: [] } as unknown as T;
    default:
      return null as unknown as T;
  }
}
