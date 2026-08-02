/**
 * `ReplayAdapter` — a real `SourceAdapter` backed by recorded fixtures instead
 * of the network.
 *
 * This is what makes the engine provable. Every behaviour the brief asks for —
 * idempotency, live diffing, quarantine, completeness, fan-out — is exercised
 * end to end through the same code path production uses, with the only
 * difference being where the bytes come from. No mocking of the adapter, no
 * "assume the parser works".
 *
 * It also has a second job: a snapshot sequence. `advance()` moves to the next
 * recorded snapshot, which is how a live race is simulated deterministically —
 * poll one, poll two, assert that only the rows that actually changed were
 * written and that exactly one realtime event fired per change.
 */

import type { RawDivisionPage, RawEventGroup } from "../types";
import type { SourceAdapter } from "./adapter";
import { parseDivisionRows, parseEventGroups } from "./mika-parse";

export type ReplayFixtures = {
  /** seasonPath → season index HTML */
  seasonIndex: Record<string, string>;
  /**
   * sourceDivisionId → one HTML body per snapshot. Index 0 is the first poll.
   * A single-element array is a static division.
   */
  divisions: Record<string, string[]>;
  startLists?: Record<string, string>;
};

export class ReplayAdapter implements SourceAdapter {
  readonly name = "replay";
  private requests = 0;
  private snapshot = 0;

  constructor(private fixtures: ReplayFixtures) {}

  requestCount() {
    return this.requests;
  }

  /** Move every division to its next recorded snapshot. */
  advance(): number {
    this.snapshot += 1;
    return this.snapshot;
  }

  snapshotIndex() {
    return this.snapshot;
  }

  async listEventGroups(seasonPath: string): Promise<RawEventGroup[]> {
    this.requests += 1;
    const html = this.fixtures.seasonIndex[seasonPath];
    if (!html) throw new Error(`No replay fixture for season ${seasonPath}`);
    return parseEventGroups(html, seasonPath);
  }

  async fetchDivision(
    _seasonPath: string,
    sourceDivisionId: string,
  ): Promise<RawDivisionPage> {
    this.requests += 1;
    const snapshots = this.fixtures.divisions[sourceDivisionId];
    if (!snapshots || snapshots.length === 0) {
      throw new Error(`No replay fixture for division ${sourceDivisionId}`);
    }
    // Past the end of the sequence the last snapshot repeats, which is what a
    // finalised race does anyway.
    const html = snapshots[Math.min(this.snapshot, snapshots.length - 1)];
    const sourceEventId = sourceDivisionId.split("_")[1] ?? sourceDivisionId;
    const parsed = parseDivisionRows(html, sourceEventId, sourceDivisionId);
    return {
      sourceEventId,
      sourceDivisionId,
      publishedEntrantCount: parsed.publishedEntrantCount,
      rows: parsed.rows,
      via: "replay",
    };
  }

  async fetchStartList(_seasonPath: string, sourceDivisionId: string): Promise<RawDivisionPage> {
    this.requests += 1;
    const html = this.fixtures.startLists?.[sourceDivisionId];
    if (!html) throw new Error(`No replay start list for ${sourceDivisionId}`);
    const sourceEventId = sourceDivisionId.split("_")[1] ?? sourceDivisionId;
    const parsed = parseDivisionRows(html, sourceEventId, sourceDivisionId);
    return {
      sourceEventId,
      sourceDivisionId,
      publishedEntrantCount: parsed.publishedEntrantCount,
      rows: parsed.rows,
      via: "replay",
    };
  }
}

/** An adapter that always fails, for the fallback-chain and freeze tests. */
export class FailingAdapter implements SourceAdapter {
  constructor(
    readonly name = "failing",
    private message = "simulated source failure",
  ) {}
  requestCount() {
    return 0;
  }
  async listEventGroups(): Promise<RawEventGroup[]> {
    throw new Error(this.message);
  }
  async fetchDivision(): Promise<RawDivisionPage> {
    throw new Error(this.message);
  }
  async fetchStartList(): Promise<RawDivisionPage> {
    throw new Error(this.message);
  }
}
