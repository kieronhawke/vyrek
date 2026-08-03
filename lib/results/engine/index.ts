/**
 * How the rest of the app gets hold of the engine.
 *
 * Three decisions live here and nowhere else:
 *
 * 1. **Which store.** Supabase when its environment is configured, in-memory
 *    otherwise, so `pnpm dev` and CI work with no database at all.
 * 2. **Which source.** The real HYROX chain, or the fixture replay. Note that
 *    "real" still cannot make a request unless `HYROX_SOURCE_ACCESS=authorised`
 *    — the fetcher enforces that, not this file.
 * 3. **One fetcher per process**, so the outbound budget and the circuit
 *    breaker are genuinely global. Two fetchers would mean two budgets, and two
 *    budgets is the aggregate-rate bug the brief specifically warns about.
 */

import { MemoryResultsRepository } from "./memory-repo";
import { SupabaseResultsRepository } from "./supabase-repo";
import type { ResultsRepository } from "./repository";
import { ResultsService } from "./serve/service";
import { SyncEngine } from "./sync/engine";
import { SourceFetcher, isSourceAuthorised } from "./fetch/fetcher";
import { createHyroxChain } from "./source/hyrox-adapter";
import { ReplayAdapter, type ReplayFixtures } from "./source/replay-adapter";
import type { SourceAdapter } from "./source/adapter";
import { MemoryPublisher, type RealtimePublisher } from "./sync/publisher";
import { ResilientDataSource } from "./serve/resilient-source";
import { demoDataSource } from "../demo-source";

import {
  hasResultsSupabaseConfig,
  resultsProjectRef,
  resultsSupabaseMisconfigured,
} from "./supabase-client";

let repoSingleton: ResultsRepository | null = null;
let fetcherSingleton: SourceFetcher | null = null;
let publisherSingleton: RealtimePublisher | null = null;

export function hasSupabaseConfig(): boolean {
  return hasResultsSupabaseConfig();
}

export { resultsProjectRef };

export function getResultsRepository(): ResultsRepository {
  if (repoSingleton) return repoSingleton;
  repoSingleton = hasSupabaseConfig()
    ? new SupabaseResultsRepository()
    : new MemoryResultsRepository();
  return repoSingleton;
}

export function getResultsService(): ResultsService {
  return new ResultsService(getResultsRepository());
}

let servingSingleton: ResilientDataSource | null = null;

/**
 * What `/api/results/v1/*` reads.
 *
 * The same three tiers the site uses — live, last-good, demo — so a database
 * outage degrades the API instead of flattening it. A consumer that would
 * rather have an error than stale data can look at `tier` in the envelope, or
 * the `X-Results-Tier` header, and decide for itself. Serving stale data
 * without saying so is the only option that would be wrong.
 */
export function getServingSource(): ResilientDataSource {
  if (servingSingleton) return servingSingleton;
  servingSingleton = new ResilientDataSource(getResultsService(), demoDataSource);
  return servingSingleton;
}

export function servingDegradation() {
  return getServingSource().degradation();
}

/** One per process. See decision 3 above. */
export function getSourceFetcher(): SourceFetcher {
  if (!fetcherSingleton) fetcherSingleton = new SourceFetcher();
  return fetcherSingleton;
}

export function getPublisher(): RealtimePublisher {
  if (!publisherSingleton) publisherSingleton = new MemoryPublisher();
  return publisherSingleton;
}

export function createSourceAdapter(replayFixtures?: ReplayFixtures): SourceAdapter {
  if (process.env.HYROX_SOURCE_MODE === "replay" && replayFixtures) {
    return new ReplayAdapter(replayFixtures);
  }
  return createHyroxChain(getSourceFetcher());
}

export function getSyncEngine(adapter?: SourceAdapter): SyncEngine {
  return new SyncEngine({
    repo: getResultsRepository(),
    adapter: adapter ?? createSourceAdapter(),
    publisher: getPublisher(),
  });
}

/**
 * Whether ingestion can run at all.
 *
 * Surfaced to the operator console so "nothing is syncing" reads as a stated
 * reason rather than a mystery.
 */
export function ingestionStatus(): {
  canIngest: boolean;
  reason: string | null;
} {
  if (!isSourceAuthorised()) {
    return {
      canIngest: false,
      reason:
        "HYROX_SOURCE_ACCESS is not set, so outbound requests to the results source are " +
        "disabled in this environment. See docs/results/SOURCE.md §1.",
    };
  }
  const halfConfigured = resultsSupabaseMisconfigured();
  if (halfConfigured) {
    return { canIngest: false, reason: `${halfConfigured}. Both are needed, or neither.` };
  }
  if (!hasSupabaseConfig()) {
    return {
      canIngest: false,
      reason:
        "The results database is not configured, so there is nowhere to store ingested " +
        "results. Set RESULTS_SUPABASE_URL and RESULTS_SUPABASE_SECRET_KEY.",
    };
  }
  return { canIngest: true, reason: null };
}

export { ResultsService } from "./serve/service";
export { MemoryResultsRepository } from "./memory-repo";
export type { ResultsRepository } from "./repository";
