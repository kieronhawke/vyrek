/**
 * LIVE SMOKE TEST — this one really does contact results.hyrox.com.
 *
 * Skipped unless `HYROX_LIVE_SMOKE=1`, so it never blocks a build and never
 * runs in CI by accident (engine brief §14, last line). Everything else in the
 * suite runs against recorded fixtures.
 *
 * What it is for: the deterministic tests prove the engine handles the markup
 * we recorded. This proves the markup we recorded is still the markup they
 * serve. Those are different claims, and only this one expires.
 *
 *   HYROX_LIVE_SMOKE=1 HYROX_SOURCE_ACCESS=authorised npx vitest run live-smoke
 *
 * Deliberately small: one season index and one division, spaced, read-only.
 */

import { describe, expect, it } from "vitest";
import { createHyroxChain } from "./hyrox-adapter";
import { SourceFetcher } from "../fetch/fetcher";
import { OutboundBudget } from "../fetch/guard";

const LIVE = process.env.HYROX_LIVE_SMOKE === "1";
const suite = LIVE ? describe : describe.skip;

/** A tight budget of its own: a smoke test must not eat the day's allowance. */
function smokeChain() {
  return createHyroxChain(
    new SourceFetcher({
      authorised: true,
      // The catalogue is N+1 (one GET, one POST per weekend), so a budget of 8
      // meant the smoke test spent a minute in backpressure rather than failing.
      budget: new OutboundBudget({ maxRequests: 60, windowMs: 60_000 }),
      maxAttempts: 2,
    }),
  );
}

suite("live source smoke", () => {
  it("the season index still lists race weekends and division codes", async () => {
    const chain = smokeChain();
    const groups = await chain.listEventGroups("season-9");

    expect(groups.length).toBeGreaterThan(0);
    // If this drops to zero the selector markup changed and the catalogue is
    // silently empty — the exact failure the parser-shape sentinel exists for.
    const withDivisions = groups.filter((g) => g.divisions.length > 0);
    expect(withDivisions.length).toBeGreaterThan(0);

    const codes = withDivisions.flatMap((g) => g.divisions.map((d) => d.sourceDivisionId));
    expect(codes.every((c) => /^[A-Z]+\d?_/.test(c))).toBe(true);

    console.log(
      `[live] ${groups.length} weekends, ${codes.length} division codes, ` +
        `via ${chain.lastAttempts.map((a) => a.adapter).join(" → ")}`,
    );
  }, 60_000);

  it("a division still returns parsable rows", async () => {
    const chain = smokeChain();
    const groups = await chain.listEventGroups("season-9");
    const target = groups.find((g) => g.divisions.length > 0)?.divisions[0];
    expect(target).toBeTruthy();

    const page = await chain.fetchDivision("season-9", target!.sourceDivisionId);

    console.log(
      `[live] ${target!.sourceDivisionId}: ${page.rows.length} rows via ${page.via}, ` +
        `published=${page.publishedEntrantCount ?? "—"}, ` +
        `header=[${page.diagnostics?.headerFields.join(", ") ?? ""}]`,
    );

    // An upcoming event legitimately has no rows, so the assertion is on the
    // *shape* rather than the count: either rows parsed, or the page was an
    // empty shell. What must never happen is candidate rows that fail to parse.
    const diagnostics = page.diagnostics;
    expect(diagnostics).toBeTruthy();
    if (diagnostics!.candidateRows > 0) {
      expect(diagnostics!.parsedRows).toBeGreaterThan(0);
    }
    if (page.rows.length > 0) {
      const row = page.rows[0];
      expect(row.name.length).toBeGreaterThan(1);
      // The bug that passes every static check: label divs nest inside field
      // divs, so a naive parser returns the column heading for every row.
      expect(row.nationality).not.toBe("Nat");
      expect(row.ageGroup).not.toBe("Age Group");
    }
  }, 90_000);
});
