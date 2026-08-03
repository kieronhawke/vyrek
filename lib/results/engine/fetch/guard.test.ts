/**
 * The safety mechanisms: authorisation gate, rate budget, circuit breaker,
 * backoff. Brief §14's backoff, aggregate-rate and access-control lines.
 *
 * All driven by injected clocks and injected randomness, so they assert exact
 * numbers rather than "roughly, probably, if the machine is not busy". A flaky
 * test on a safety mechanism gets deleted, and then the mechanism is untested.
 */

import { describe, expect, it, vi } from "vitest";
import {
  CircuitBreaker,
  OutboundBudget,
  backoffDelayMs,
  parseRetryAfter,
  type GuardDeps,
} from "./guard";
import {
  BudgetExhaustedError,
  CircuitOpenError,
  SourceAccessDeniedError,
  SourceFetcher,
  DEFAULT_USER_AGENT,
} from "./fetcher";

function clockDeps(start = 0): GuardDeps & { advance(ms: number): void } {
  let t = start;
  return {
    now: () => t,
    random: () => 0.5,
    advance(ms: number) {
      t += ms;
    },
  };
}

function response(opts: {
  status: number;
  body?: string;
  headers?: Record<string, string>;
}) {
  return {
    ok: opts.status >= 200 && opts.status < 300,
    status: opts.status,
    headers: { get: (name: string) => opts.headers?.[name.toLowerCase()] ?? null },
    text: async () => opts.body ?? "",
  };
}

describe("authorisation gate (§2, SOURCE.md §1)", () => {
  it("refuses to make any request when access is not authorised", async () => {
    const fetchImpl = vi.fn();
    const fetcher = new SourceFetcher({ fetchImpl, authorised: false });

    await expect(fetcher.fetchText("https://results.hyrox.com/season-9/")).rejects.toThrow(
      SourceAccessDeniedError,
    );
    // The point: not one outbound request was attempted.
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("identifies itself honestly when it is authorised", async () => {
    const seen: Record<string, string>[] = [];
    const fetchImpl = vi.fn(async (_url: string, init?: { headers?: Record<string, string> }) => {
      if (init?.headers) seen.push(init.headers);
      return response({ status: 200, body: "ok" });
    });
    const fetcher = new SourceFetcher({ fetchImpl, authorised: true });

    await fetcher.fetchText("https://results.hyrox.com/season-9/");

    const headers = seen[0];
    expect(headers["User-Agent"]).toBe(DEFAULT_USER_AGENT);
    // Named, versioned and contactable, in the standard identified-bot format.
    // The leading Mozilla/5.0 token is part of that convention (Googlebot sends
    // the same shape); what matters is that we are not passing as a plain
    // browser, so the "compatible;" clause naming us must be present.
    expect(headers["User-Agent"]).toMatch(/compatible; SuthPerformanceResultsBot\/\d/);
    expect(headers["User-Agent"]).toMatch(/suthperformance\.com/);
  });

  it("treats a 403 as not-welcome rather than something to retry into", async () => {
    const fetchImpl = vi.fn(async () => response({ status: 403 }));
    const fetcher = new SourceFetcher({ fetchImpl, authorised: true, sleep: async () => {} });

    await expect(fetcher.fetchText("https://results.hyrox.com/")).rejects.toThrow(
      SourceAccessDeniedError,
    );
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
});

describe("backoff and Retry-After (§14)", () => {
  it("honours Retry-After in seconds over its own guess", () => {
    const deps = clockDeps();
    expect(backoffDelayMs(3, 42, deps)).toBe(42_000);
  });

  it("honours Retry-After as an HTTP date", () => {
    const now = Date.parse("2026-08-03T10:00:00Z");
    expect(parseRetryAfter("Mon, 03 Aug 2026 10:00:30 GMT", now)).toBe(30);
  });

  it("backs off exponentially with jitter when no Retry-After is sent", () => {
    const deps = clockDeps();
    // Full jitter at random()=0.5 is half the exponential ceiling.
    expect(backoffDelayMs(0, null, deps)).toBe(500);
    expect(backoffDelayMs(1, null, deps)).toBe(1000);
    expect(backoffDelayMs(4, null, deps)).toBe(8000);
    // Capped, so a long outage does not schedule a retry next Tuesday.
    expect(backoffDelayMs(20, null, deps)).toBe(30_000);
  });

  it("retries a 429 and respects the header", async () => {
    const deps = clockDeps();
    const slept: number[] = [];
    let call = 0;
    const fetchImpl = vi.fn(async () => {
      call += 1;
      return call === 1
        ? response({ status: 429, headers: { "retry-after": "7" } })
        : response({ status: 200, body: "ok" });
    });

    const fetcher = new SourceFetcher({
      fetchImpl,
      authorised: true,
      deps,
      sleep: async (ms) => {
        slept.push(ms);
      },
    });

    const outcome = await fetcher.fetchText("https://results.hyrox.com/");
    expect(outcome.body).toBe("ok");
    expect(slept).toEqual([7000]);
  });
});

describe("global outbound budget (§13)", () => {
  it("caps total requests across simultaneous live events", () => {
    const deps = clockDeps();
    const budget = new OutboundBudget({ maxRequests: 20, windowMs: 60_000 }, deps);

    // Five events all polling at once share one budget, not one each.
    for (let i = 0; i < 20; i += 1) expect(budget.tryConsume()).toBe(true);
    expect(budget.tryConsume()).toBe(false);
    expect(budget.remaining()).toBe(0);

    // The window rolls.
    deps.advance(60_001);
    expect(budget.remaining()).toBe(20);
  });

  it("jitters the wait so releases do not synchronise", () => {
    const deps = clockDeps();
    const budget = new OutboundBudget({ maxRequests: 1, windowMs: 60_000 }, deps);
    budget.tryConsume();
    deps.advance(10_000);
    // 50s left in the window, plus jitter from random()=0.5.
    expect(budget.msUntilSlot()).toBe(50_000 + 500);
  });

  it("throws rather than silently exceeding the budget", async () => {
    const deps = clockDeps();
    const budget = new OutboundBudget({ maxRequests: 0, windowMs: 60_000 }, deps);
    const fetcher = new SourceFetcher({
      fetchImpl: async () => response({ status: 200 }),
      authorised: true,
      budget,
      deps,
      maxAttempts: 1,
    });

    await expect(fetcher.fetchText("https://results.hyrox.com/")).rejects.toThrow(
      BudgetExhaustedError,
    );
  });
});

describe("circuit breaker (§13)", () => {
  it("trips after repeated failures and refuses to contact the source", async () => {
    const deps = clockDeps();
    const breaker = new CircuitBreaker(
      { failureThreshold: 3, windowMs: 120_000, cooldownMs: 300_000 },
      deps,
    );

    expect(breaker.state()).toBe("closed");
    breaker.recordFailure();
    breaker.recordFailure();
    expect(breaker.state()).toBe("closed");
    breaker.recordFailure();
    expect(breaker.state()).toBe("open");
    expect(breaker.canRequest()).toBe(false);

    // After the cooldown, exactly one probe is allowed through.
    deps.advance(300_001);
    expect(breaker.state()).toBe("half-open");
    expect(breaker.canRequest()).toBe(true);
    expect(breaker.canRequest()).toBe(false);

    breaker.recordSuccess();
    expect(breaker.state()).toBe("closed");
  });

  it("stops the fetcher once open", async () => {
    const deps = clockDeps();
    const breaker = new CircuitBreaker(
      { failureThreshold: 1, windowMs: 120_000, cooldownMs: 300_000 },
      deps,
    );
    breaker.recordFailure();

    const fetchImpl = vi.fn();
    const fetcher = new SourceFetcher({ fetchImpl, authorised: true, breaker, deps });

    await expect(fetcher.fetchText("https://results.hyrox.com/")).rejects.toThrow(
      CircuitOpenError,
    );
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("trips under a forced error spike during real fetches", async () => {
    const deps = clockDeps();
    const breaker = new CircuitBreaker(
      { failureThreshold: 3, windowMs: 120_000, cooldownMs: 300_000 },
      deps,
    );
    const fetcher = new SourceFetcher({
      fetchImpl: async () => response({ status: 500 }),
      authorised: true,
      breaker,
      deps,
      sleep: async () => {},
      maxAttempts: 3,
    });

    await expect(fetcher.fetchText("https://results.hyrox.com/")).rejects.toThrow();
    expect(breaker.state()).toBe("open");
  });
});
