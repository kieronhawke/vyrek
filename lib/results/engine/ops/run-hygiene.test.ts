/**
 * The two failures that only appear once this runs on a schedule, serverless,
 * against a shared database — and which the whole test suite was blind to
 * because it runs one process, once, in memory.
 */

import { describe, expect, it } from "vitest";
import { MemoryResultsRepository } from "../memory-repo";
import {
  RUN_STALE_AFTER_MS,
  reapStaleRuns,
  recordSharedRequests,
  sharedBudgetAllows,
  sharedRequestsInWindow,
} from "./run-hygiene";

describe("runs that were killed rather than thrown", () => {
  it("reaps a run left running long past any plausible execution", async () => {
    const repo = new MemoryResultsRepository();
    const run = await repo.startRun({ mode: "catalog", triggerSource: "cron" });

    const later = new Date(new Date(run.startedAt).getTime() + RUN_STALE_AFTER_MS + 60_000);
    const { reaped } = await reapStaleRuns(repo, later);

    expect(reaped).toEqual([run.id]);
    const after = await repo.latestRun("catalog");
    expect(after?.status).toBe("error");
    // The message has to say what happened, because the operator's next
    // question is always "do I need to do something".
    expect(after?.errors[0].message).toMatch(/abandoned/i);
    expect(after?.errors[0].message).toMatch(/idempotent/);
  });

  it("leaves a run that is genuinely still working alone", async () => {
    const repo = new MemoryResultsRepository();
    const run = await repo.startRun({ mode: "backfill", triggerSource: "cron" });

    const soon = new Date(new Date(run.startedAt).getTime() + 60_000);
    expect((await reapStaleRuns(repo, soon)).reaped).toEqual([]);
    expect((await repo.latestRun("backfill"))?.status).toBe("running");
  });

  it("does not touch runs that finished properly", async () => {
    const repo = new MemoryResultsRepository();
    const run = await repo.startRun({ mode: "live", triggerSource: "cron" });
    await repo.finishRun(run.id, { status: "ok" });

    const later = new Date(Date.now() + RUN_STALE_AFTER_MS * 3);
    expect((await reapStaleRuns(repo, later)).reaped).toEqual([]);
    expect((await repo.latestRun("live"))?.status).toBe("ok");
  });
});

describe("alerts do not flood the console", () => {
  it("counts a repeated problem instead of listing it again", async () => {
    const repo = new MemoryResultsRepository();
    const alert = {
      kind: "completeness" as const,
      severity: "info" as const,
      message: "155 event(s) have no match in the HYROX calendar",
      detail: {},
      sourceEventId: null,
      acknowledgedAt: null,
    };

    // The catalogue raises this on every run. Five runs is one problem.
    for (let i = 0; i < 5; i += 1) await repo.raiseAlert(alert);

    const open = await repo.listAlerts({ openOnly: true });
    expect(open).toHaveLength(1);
    expect(open[0].detail.occurrences).toBe(5);
  });

  it("treats a different message as a different problem", async () => {
    const repo = new MemoryResultsRepository();
    const base = {
      kind: "completeness" as const, severity: "warning" as const,
      detail: {}, sourceEventId: null, acknowledgedAt: null,
    };
    await repo.raiseAlert({ ...base, message: "open-men is short" });
    await repo.raiseAlert({ ...base, message: "open-women is short" });
    expect(await repo.listAlerts({ openOnly: true })).toHaveLength(2);
  });

  it("raises again once an operator has acknowledged it", async () => {
    const repo = new MemoryResultsRepository();
    const alert = {
      kind: "parser_shape" as const, severity: "critical" as const,
      message: "Parser may be broken", detail: {}, sourceEventId: null,
      acknowledgedAt: null,
    };
    const first = await repo.raiseAlert(alert);
    await repo.acknowledgeAlert(first.id);

    // Acknowledged means "I have seen this". If it happens again afterwards
    // that is news, and silence would be the wrong answer.
    await repo.raiseAlert(alert);
    expect(await repo.listAlerts({ openOnly: true })).toHaveLength(1);
  });
});

describe("the budget every instance shares", () => {
  it("counts requests across separate workers, not per process", async () => {
    const repo = new MemoryResultsRepository();
    const now = new Date("2026-08-03T10:00:00Z");

    // Three workers, each believing its own in-memory budget is untouched.
    await recordSharedRequests(repo, 8, now);
    await recordSharedRequests(repo, 8, now);
    expect(await sharedRequestsInWindow(repo, now)).toBe(16);

    process.env.HYROX_MAX_REQUESTS_PER_MINUTE = "20";
    const third = await sharedBudgetAllows(repo, { need: 8, now });
    expect(third.allowed).toBe(false);
    expect(third.reason).toMatch(/16 of 20/);
  });

  it("slides its window rather than resetting on a boundary", async () => {
    const repo = new MemoryResultsRepository();
    const t0 = new Date("2026-08-03T10:00:00Z");
    await recordSharedRequests(repo, 15, t0);
    expect(await sharedRequestsInWindow(repo, t0)).toBe(15);

    // A counter that resets on the minute would allow a double-rate burst
    // across the join. A sliding window does not.
    const halfway = new Date(t0.getTime() + 30_000);
    expect(await sharedRequestsInWindow(repo, halfway)).toBe(15);

    const later = new Date(t0.getTime() + 61_000);
    expect(await sharedRequestsInWindow(repo, later)).toBe(0);
  });

  it("allows a worker through when the minute is quiet", async () => {
    const repo = new MemoryResultsRepository();
    process.env.HYROX_MAX_REQUESTS_PER_MINUTE = "20";
    const verdict = await sharedBudgetAllows(repo, { need: 2 });
    expect(verdict.allowed).toBe(true);
    expect(verdict.reason).toBeNull();
  });

  it("keeps the stored log bounded under a runaway worker", async () => {
    const repo = new MemoryResultsRepository();
    const now = new Date("2026-08-03T10:00:00Z");
    for (let i = 0; i < 50; i += 1) await recordSharedRequests(repo, 20, now);
    const log = await repo.getSetting<{ at: number }[]>("outbound_request_log");
    // A settings row that grows without limit is its own outage.
    expect(log!.length).toBeLessThanOrEqual(200);
  });
});
