/**
 * The only code in the system that is allowed to make an outbound request to
 * the results source. Everything else goes through the adapter, which goes
 * through this.
 *
 * Access is governed by `HYROX_SOURCE_ACCESS`. Written permission from HYROX is
 * on file; the flag exists so a misconfigured environment (a preview branch, a
 * local checkout, CI) cannot make outbound requests by accident. Unset, every
 * call throws `SourceAccessDeniedError` and the engine falls through to the
 * replay and demo sources.
 *
 * Everything else here exists to be a good guest: one global request budget
 * across all events, a circuit breaker, exponential backoff with jitter,
 * `Retry-After` honoured, and a User-Agent that names us with a contact URL.
 */

import {
  CircuitBreaker,
  OutboundBudget,
  backoffDelayMs,
  defaultDeps,
  parseRetryAfter,
  type GuardDeps,
} from "./guard";

export class SourceAccessDeniedError extends Error {
  readonly code = "SOURCE_ACCESS_DENIED";
  constructor(message: string) {
    super(message);
    this.name = "SourceAccessDeniedError";
  }
}

export class SourceUnavailableError extends Error {
  readonly code = "SOURCE_UNAVAILABLE";
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "SourceUnavailableError";
  }
}

export class BudgetExhaustedError extends Error {
  readonly code = "BUDGET_EXHAUSTED";
  constructor(readonly waitMs: number) {
    super(`Outbound budget exhausted; next slot in ${waitMs}ms`);
    this.name = "BudgetExhaustedError";
  }
}

export class CircuitOpenError extends Error {
  readonly code = "CIRCUIT_OPEN";
  constructor() {
    super("Circuit breaker is open; refusing to contact the source");
    this.name = "CircuitOpenError";
  }
}

/**
 * The standard identified-bot User-Agent format.
 *
 * `Mozilla/5.0 (compatible; <Name>/<version>; +<info url>)` is the convention
 * every well-behaved crawler uses — Googlebot's own string is exactly this
 * shape. We are fully named, with a contact URL, and nothing is disguised.
 *
 * Measured, not guessed: the source's edge rejects a User-Agent that does not
 * begin with a `Mozilla/5.0` token (403) and accepts this one (200). The filter
 * is on the string's *format*, not on who we are.
 */
export const DEFAULT_USER_AGENT =
  "Mozilla/5.0 (compatible; SuthPerformanceResultsBot/1.0; +https://www.suthperformance.com/about)";

export type FetchResponseLike = {
  ok: boolean;
  status: number;
  headers: { get(name: string): string | null };
  text(): Promise<string>;
};

export type FetcherOptions = {
  fetchImpl?: (url: string, init?: { headers?: Record<string, string>; signal?: AbortSignal }) => Promise<FetchResponseLike>;
  sleep?: (ms: number) => Promise<void>;
  deps?: GuardDeps;
  budget?: OutboundBudget;
  breaker?: CircuitBreaker;
  userAgent?: string;
  maxAttempts?: number;
  timeoutMs?: number;
  /** Overrides the env gate. Tests set this explicitly; production does not. */
  authorised?: boolean;
};

export type FetchOutcome = {
  body: string;
  status: number;
  /** Their own edge-cache indicator; useful telemetry, see SOURCE.md §6. */
  cacheState: string | null;
  attempts: number;
  requestsMade: number;
};

export function isSourceAuthorised(): boolean {
  return process.env.HYROX_SOURCE_ACCESS === "authorised";
}

export class SourceFetcher {
  private readonly budget: OutboundBudget;
  private readonly breaker: CircuitBreaker;
  private readonly deps: GuardDeps;
  private readonly sleep: (ms: number) => Promise<void>;
  private readonly fetchImpl: NonNullable<FetcherOptions["fetchImpl"]>;
  private readonly userAgent: string;
  private readonly maxAttempts: number;
  private readonly authorisedOverride?: boolean;

  /** Every request this instance has made, for `ingestion_runs.requests_made`. */
  requestCount = 0;

  constructor(opts: FetcherOptions = {}) {
    this.deps = opts.deps ?? defaultDeps;
    this.budget = opts.budget ?? new OutboundBudget(undefined, this.deps);
    this.breaker = opts.breaker ?? new CircuitBreaker(undefined, this.deps);
    this.sleep = opts.sleep ?? ((ms) => new Promise((r) => setTimeout(r, ms)));
    this.fetchImpl =
      opts.fetchImpl ??
      ((url, init) => fetch(url, init) as unknown as Promise<FetchResponseLike>);
    this.userAgent = opts.userAgent ?? process.env.HYROX_SOURCE_USER_AGENT ?? DEFAULT_USER_AGENT;
    this.maxAttempts = opts.maxAttempts ?? 4;
    this.authorisedOverride = opts.authorised;
  }

  private assertAuthorised() {
    const authorised = this.authorisedOverride ?? isSourceAuthorised();
    if (!authorised) {
      throw new SourceAccessDeniedError(
        "Source access is disabled in this environment. Set HYROX_SOURCE_ACCESS=authorised " +
          "to enable outbound requests to the results source.",
      );
    }
  }

  breakerState() {
    return this.breaker.state();
  }

  budgetRemaining() {
    return this.budget.remaining();
  }

  async fetchText(url: string): Promise<FetchOutcome> {
    this.assertAuthorised();

    let lastError: Error | null = null;

    for (let attempt = 0; attempt < this.maxAttempts; attempt += 1) {
      if (!this.breaker.canRequest()) throw new CircuitOpenError();

      if (!this.budget.tryConsume()) {
        const waitMs = this.budget.msUntilSlot();
        // Waiting inside the fetcher rather than throwing keeps back-pressure
        // where it belongs. A caller that cannot wait passes maxAttempts: 1.
        if (attempt + 1 >= this.maxAttempts) throw new BudgetExhaustedError(waitMs);
        await this.sleep(waitMs);
        continue;
      }

      this.requestCount += 1;

      try {
        const response = await this.fetchImpl(url, {
          headers: {
            "User-Agent": this.userAgent,
            Accept: "text/html,application/json;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-GB,en;q=0.9",
          },
        });

        if (response.status === 429 || response.status === 503) {
          this.breaker.recordFailure();
          const retryAfter = parseRetryAfter(
            response.headers.get("retry-after"),
            this.deps.now(),
          );
          lastError = new SourceUnavailableError(
            `Source rate-limited us (${response.status})`,
            response.status,
          );
          if (attempt + 1 >= this.maxAttempts) break;
          await this.sleep(backoffDelayMs(attempt, retryAfter, this.deps));
          continue;
        }

        if (response.status === 403) {
          // Not transient, so not worth retrying into: retrying a 403 four
          // times is how a soft block becomes a hard one. Surfaced immediately
          // so the console shows a real cause rather than a timeout.
          this.breaker.recordFailure();
          throw new SourceAccessDeniedError(
            `Source returned 403 for User-Agent "${this.userAgent}". The edge filters on ` +
              "User-Agent format; see docs/results/SOURCE.md §1.",
          );
        }

        if (!response.ok) {
          this.breaker.recordFailure();
          lastError = new SourceUnavailableError(
            `Source returned ${response.status}`,
            response.status,
          );
          if (attempt + 1 >= this.maxAttempts) break;
          await this.sleep(backoffDelayMs(attempt, null, this.deps));
          continue;
        }

        const body = await response.text();
        this.breaker.recordSuccess();
        return {
          body,
          status: response.status,
          cacheState: response.headers.get("x-results-cache"),
          attempts: attempt + 1,
          requestsMade: this.requestCount,
        };
      } catch (error) {
        if (error instanceof SourceAccessDeniedError) throw error;
        this.breaker.recordFailure();
        lastError = error instanceof Error ? error : new Error(String(error));
        if (attempt + 1 >= this.maxAttempts) break;
        await this.sleep(backoffDelayMs(attempt, null, this.deps));
      }
    }

    throw lastError ?? new SourceUnavailableError("Source unreachable");
  }
}
