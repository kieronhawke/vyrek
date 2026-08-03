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

let repoSingleton: ResultsRepository | null = null;
let fetcherSingleton: SourceFetcher | null = null;
let publisherSingleton: RealtimePublisher | null = null;

export function hasSupabaseConfig(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SECRET_KEY);
}

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
        "HYROX_SOURCE_ACCESS is not set. results.hyrox.com publishes Disallow: / and blocks " +
        "non-browser agents, so automated ingestion is off until HYROX grant access. " +
        "See docs/results/SOURCE.md §1 and ACTION-REQUIRED.md.",
    };
  }
  if (!hasSupabaseConfig()) {
    return {
      canIngest: false,
      reason: "Supabase is not configured, so there is nowhere to store ingested results.",
    };
  }
  return { canIngest: true, reason: null };
}

export { ResultsService } from "./serve/service";
export { MemoryResultsRepository } from "./memory-repo";
export type { ResultsRepository } from "./repository";
