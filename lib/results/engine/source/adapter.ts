/**
 * `SourceAdapter` — the only code that knows what the source looks like.
 *
 * Everything source-specific lives behind this: mika's event codes, its
 * class-name-as-schema markup, its ajax2 transport, its missing ETags. If the
 * source changes shape, this file and the normaliser change and nothing else
 * does (brief §6).
 *
 * `FallbackChain` implements brief §11's ordered access methods: try the
 * structured endpoint, fall through to HTML, and if every method fails, write
 * nothing at all. Freezing on last-good data is always better than writing
 * something we are not sure about.
 */

import type { RawDivisionPage, RawEventGroup, RawResultDetail } from "../types";

export interface SourceAdapter {
  readonly name: string;
  /** Every race weekend the source lists for a season. */
  listEventGroups(seasonPath: string): Promise<RawEventGroup[]>;
  /** One division's rows. Paginated internally; returns the lot. */
  fetchDivision(
    seasonPath: string,
    sourceDivisionId: string,
    opts?: { maxRows?: number },
  ): Promise<RawDivisionPage>;
  /** Start list for an upcoming event. */
  fetchStartList(seasonPath: string, sourceDivisionId: string): Promise<RawDivisionPage>;
  /**
   * One athlete's full splits, from the per-result detail view.
   *
   * Separate from `fetchDivision` because it costs one request *per athlete* —
   * the list carries finish times only. A 3,000-entrant event is 3,000 requests,
   * which is why splits are filled in by their own paced worker rather than
   * during the division sync.
   */
  fetchResultDetail(
    seasonPath: string,
    opts: { idp: string; sourceDivisionId: string },
  ): Promise<RawResultDetail>;
  /** How many requests this adapter has made, for run accounting. */
  requestCount(): number;
}

export type ChainAttempt = {
  adapter: string;
  ok: boolean;
  error?: string;
};

/**
 * Tries each adapter in order. The first that succeeds wins; the attempts are
 * returned either way so the operator console can show *which* method served
 * the data and what the earlier ones said when they failed.
 */
export class FallbackChain implements SourceAdapter {
  readonly name = "fallback-chain";
  lastAttempts: ChainAttempt[] = [];

  constructor(private adapters: SourceAdapter[]) {
    if (adapters.length === 0) throw new Error("FallbackChain needs at least one adapter");
  }

  requestCount() {
    return this.adapters.reduce((sum, a) => sum + a.requestCount(), 0);
  }

  private async run<T>(fn: (adapter: SourceAdapter) => Promise<T>): Promise<T> {
    const attempts: ChainAttempt[] = [];
    let lastError: unknown;

    for (const adapter of this.adapters) {
      try {
        const value = await fn(adapter);
        attempts.push({ adapter: adapter.name, ok: true });
        this.lastAttempts = attempts;
        return value;
      } catch (error) {
        attempts.push({
          adapter: adapter.name,
          ok: false,
          error: error instanceof Error ? error.message : String(error),
        });
        lastError = error;
      }
    }

    this.lastAttempts = attempts;
    throw new AllSourcesFailedError(attempts, lastError);
  }

  listEventGroups(seasonPath: string) {
    return this.run((a) => a.listEventGroups(seasonPath));
  }

  fetchDivision(seasonPath: string, sourceDivisionId: string, opts?: { maxRows?: number }) {
    return this.run((a) => a.fetchDivision(seasonPath, sourceDivisionId, opts));
  }

  fetchStartList(seasonPath: string, sourceDivisionId: string) {
    return this.run((a) => a.fetchStartList(seasonPath, sourceDivisionId));
  }

  fetchResultDetail(seasonPath: string, opts: { idp: string; sourceDivisionId: string }) {
    return this.run((a) => a.fetchResultDetail(seasonPath, opts));
  }
}

/**
 * Every access method failed. The caller must not write: freeze on last-good
 * data, mark live events `updates_paused`, alert. Never present stale data as
 * live (brief §11).
 */
export class AllSourcesFailedError extends Error {
  readonly code = "ALL_SOURCES_FAILED";
  constructor(
    readonly attempts: ChainAttempt[],
    readonly cause?: unknown,
  ) {
    super(
      `Every source access method failed: ${attempts
        .map((a) => `${a.adapter} (${a.error ?? "unknown"})`)
        .join(", ")}`,
    );
    this.name = "AllSourcesFailedError";
  }
}
