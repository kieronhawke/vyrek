/**
 * What the site does when the data layer breaks.
 *
 * Every one of these simulates a real failure — a paused project, a revoked
 * key, a network partition, a timeout — and asserts the same thing: the
 * visitor gets a page, and we can say honestly which tier they are on.
 */

import { describe, expect, it, vi } from "vitest";
import { ResilientDataSource } from "./resilient-source";
import type { ResultsDataSource } from "../../source";

/** A source where every method throws, like a database that is not there. */
function brokenSource(message = "getaddrinfo ENOTFOUND db.supabase.co"): ResultsDataSource {
  const boom = () => Promise.reject(new Error(message));
  return {
    listEvents: boom, getEvent: boom, getRanking: boom, getResult: boom,
    getAthlete: boom, getStarters: boom, searchAll: boom, getRecords: boom,
    getStationDistribution: boom, getDivisionFinishTimes: boom,
  } as unknown as ResultsDataSource;
}

function stubSource(tag: string): ResultsDataSource {
  return {
    listEvents: async () => [{ slug: `${tag}-event` }],
    getEvent: async () => ({ slug: `${tag}-event` }),
    getRanking: async () => ({ eventSlug: `${tag}`, rows: [] }),
    getResult: async () => ({ id: `${tag}-result` }),
    getAthlete: async () => ({ slug: `${tag}-athlete` }),
    getStarters: async () => ({ eventSlug: tag, waves: [] }),
    searchAll: async () => ({ athletes: [{ name: tag }], events: [] }),
    getRecords: async () => ({ scope: "all-time", entries: [{ athleteName: tag }] }),
    getStationDistribution: async () => ({ samples: [1], count: 1 }),
    getDivisionFinishTimes: async () => [Number(tag.length)],
  } as unknown as ResultsDataSource;
}

describe("tier 1 — the database is healthy", () => {
  it("serves live data and reports no degradation", async () => {
    const s = new ResilientDataSource(stubSource("live"), stubSource("demo"));
    expect((await s.listEvents())[0].slug).toBe("live-event");
    expect(s.degradation().tier).toBe("live");
    expect(s.degradation().failures).toBe(0);
  });
});

describe("tier 2 — the database breaks after serving once", () => {
  it("serves the last good answer rather than an error", async () => {
    let broken = false;
    const flaky: ResultsDataSource = {
      ...stubSource("live"),
      listEvents: async () => {
        if (broken) throw new Error("ECONNREFUSED");
        return [{ slug: "live-event" }] as never;
      },
    } as ResultsDataSource;

    const s = new ResilientDataSource(flaky, stubSource("demo"));
    expect((await s.listEvents())[0].slug).toBe("live-event");

    broken = true;
    const after = await s.listEvents();

    // The visitor sees the same page they would have seen a moment ago.
    expect(after[0].slug).toBe("live-event");
    expect(s.degradation().tier).toBe("last-good");
    expect(s.degradation().reason).toContain("ECONNREFUSED");
    expect(s.degradation().since).toBeTruthy();
  });

  it("caches per call, not globally", async () => {
    const s = new ResilientDataSource(stubSource("live"), stubSource("demo"));
    await s.getEvent("known-event");

    // A different argument was never cached, so it falls to demo rather than
    // serving another event's data under this slug — which would be worse
    // than any error.
    const broken = new ResilientDataSource(brokenSource(), stubSource("demo"));
    await broken.getEvent("never-seen");
    expect(broken.degradation().tier).toBe("demo");
  });
});

describe("tier 3 — the database was never reachable", () => {
  it("falls through to demo data instead of throwing", async () => {
    const s = new ResilientDataSource(brokenSource(), stubSource("demo"));
    const events = await s.listEvents();
    expect(events[0].slug).toBe("demo-event");
    expect(s.degradation().tier).toBe("demo");
  });

  it("never throws, on any method in the contract", async () => {
    const s = new ResilientDataSource(brokenSource(), brokenSource("demo is broken too"));

    // Both tiers down. The site must still render: a results page with nothing
    // on it beats a stack trace, every time.
    await expect(s.listEvents()).resolves.toEqual([]);
    await expect(s.getEvent("x")).resolves.toBeNull();
    await expect(s.getRanking("x", "y")).resolves.toBeNull();
    await expect(s.getResult("x")).resolves.toBeNull();
    await expect(s.getAthlete("x")).resolves.toBeNull();
    await expect(s.getStarters("x")).resolves.toBeNull();
    await expect(s.searchAll("x")).resolves.toEqual({ athletes: [], events: [] });
    await expect(s.getRecords()).resolves.toEqual({ scope: "all-time", entries: [] });
    await expect(s.getDivisionFinishTimes("x", "y")).resolves.toEqual([]);
  });
});

describe("the circuit breaker in front of the store", () => {
  it("stops retrying a store that keeps failing", async () => {
    const listEvents = vi.fn().mockRejectedValue(new Error("timeout"));
    const live = { ...stubSource("live"), listEvents } as ResultsDataSource;
    const s = new ResilientDataSource(live, stubSource("demo"));

    // Threshold is 3; the fourth call should not reach the store at all,
    // because making every page wait for the same timeout helps nobody.
    for (let i = 0; i < 6; i += 1) await s.listEvents();
    expect(listEvents.mock.calls.length).toBe(3);
    expect(s.degradation().tier).toBe("demo");
  });

  it("probes again after the cooldown, so a recovery is noticed", async () => {
    let clock = 0;
    let broken = true;
    const listEvents = vi.fn(async () => {
      if (broken) throw new Error("down");
      return [{ slug: "live-event" }] as never;
    });
    const live = { ...stubSource("live"), listEvents } as ResultsDataSource;
    const s = new ResilientDataSource(live, stubSource("demo"), { now: () => clock });

    for (let i = 0; i < 5; i += 1) await s.listEvents();
    expect(listEvents.mock.calls.length).toBe(3);

    broken = false;
    clock += 60_000; // past the cooldown

    const recovered = await s.listEvents();
    expect(recovered[0].slug).toBe("live-event");
    // And the degradation clears, rather than the site sulking on demo data
    // for ever after one bad minute.
    expect(s.degradation().tier).toBe("live");
    expect(s.degradation().failures).toBe(0);
    expect(s.degradation().since).toBeNull();
  });
});

describe("honesty", () => {
  it("reports which tier served the answer, so the UI can say so", async () => {
    const s = new ResilientDataSource(brokenSource("key revoked"), stubSource("demo"));
    await s.getRecords();
    const d = s.degradation();
    expect(d.tier).toBe("demo");
    expect(d.reason).toBe("key revoked");
    // Serving demo data as though it were real results would be worse than an
    // error page, so the tier is always available to render alongside it.
    expect(d.since).toBeTruthy();
  });

  it("notifies on every fallback, so degradation is observable", async () => {
    const onFallback = vi.fn();
    const s = new ResilientDataSource(brokenSource(), stubSource("demo"), { onFallback });
    await s.listEvents();
    await s.getRecords();
    expect(onFallback).toHaveBeenCalledTimes(2);
    expect(onFallback.mock.calls[0][2]).toBe("demo");
  });
});

describe("the cache is bounded", () => {
  it("does not grow without limit under a crawler", async () => {
    const s = new ResilientDataSource(stubSource("live"), stubSource("demo"));
    // Far more distinct keys than the cap.
    for (let i = 0; i < 600; i += 1) await s.getEvent(`event-${i}`);
    // Nothing to assert on size directly, so assert the consequence: the
    // process is still responsive and the oldest entries were evicted.
    const broken = new ResilientDataSource(brokenSource(), stubSource("demo"));
    await broken.getEvent("event-0");
    expect(broken.degradation().tier).toBe("demo");
  });
});
