/**
 * The access methods for results.hyrox.com, ordered.
 *
 * ⚠️ Everything here is measured against the live source, not inferred. Three
 * things about this platform are counter-intuitive enough to be worth stating
 * before the code:
 *
 * 1. **`content=ajax2` is not a data endpoint.** It returns their JavaScript
 *    bundle. An earlier version of this file used it as the primary method and
 *    got 158KB of minified MD5 implementation, parsed zero rows out of it, and
 *    reported success. It is not used at all now.
 *
 * 2. **A division board will not render unfiltered.** `?pid=list&event=…`
 *    returns the page furniture and `> 200 Results` — it declines to render a
 *    set that large. Adding `search[sex]=M` returns the actual rows. So the sex
 *    filter is not an optimisation, it is how you get any data at all.
 *
 * 3. **One source division code is two of our divisions.** `H_LR3MS4JI163A` is
 *    "HYROX, Friday"; men and women are that same code with a different filter.
 *    Our `sourceDivisionId` carries the sex as a `#men` / `#women` suffix,
 *    which is stripped before it goes on the wire.
 *
 * The fallback is the unfiltered board, which does render for divisions under
 * the source's display threshold and keeps us collecting if the filter contract
 * ever changes.
 */

import { SourceFetcher } from "../fetch/fetcher";
import type { ParseDiagnostics, RawDivisionPage, RawEventGroup } from "../types";
import type { SourceAdapter } from "./adapter";
import { FallbackChain } from "./adapter";
import { parseDivisionRows, parseEventGroups, weekendIdOf } from "./mika-parse";

const SOURCE_ORIGIN = process.env.HYROX_SOURCE_ORIGIN ?? "https://results.hyrox.com";
/** Their pager serves 100 comfortably. */
const PAGE_SIZE = 100;
/** 60 pages is 6,000 athletes, comfortably above any real division. */
const MAX_PAGES = 60;

function seasonUrl(seasonPath: string, params: Record<string, string>) {
  const query = new URLSearchParams({ lang: "EN", ...params }).toString();
  return `${SOURCE_ORIGIN}/${seasonPath.replace(/^\/|\/$/g, "")}/?${query}`;
}

/** `H_LR3MS4JI163A#men` → `{ code: "H_LR3MS4JI163A", sex: "M" }`. */
export function splitDivisionRef(sourceDivisionId: string): { code: string; sex: string | null } {
  const [code, suffix] = sourceDivisionId.split("#");
  if (!suffix) return { code, sex: null };
  if (suffix === "men") return { code, sex: "M" };
  if (suffix === "women") return { code, sex: "W" };
  return { code, sex: null };
}

abstract class MikaAdapter implements SourceAdapter {
  abstract readonly name: string;
  /** Extra query parameters this method adds to the list request. */
  protected abstract listParams(sex: string | null): Record<string, string>;

  constructor(protected fetcher: SourceFetcher) {}

  requestCount() {
    return this.fetcher.requestCount;
  }

  async listEventGroups(seasonPath: string): Promise<RawEventGroup[]> {
    // The bare season path. `?pid=list` is the results view and carries no
    // event selector; only the season landing page does.
    const { body } = await this.fetcher.fetchText(seasonUrl(seasonPath, {}));
    const groups = parseEventGroups(body, seasonPath);
    if (groups.length === 0) {
      throw new Error(`No event groups parsed from ${seasonPath} — selector markup changed?`);
    }
    return groups;
  }

  async fetchDivision(
    seasonPath: string,
    sourceDivisionId: string,
    opts: { maxRows?: number } = {},
  ): Promise<RawDivisionPage> {
    const { code, sex } = splitDivisionRef(sourceDivisionId);
    const sourceEventId = weekendIdOf(code) ?? code;
    const rows: RawDivisionPage["rows"] = [];
    let publishedEntrantCount: number | undefined;
    const merged: ParseDiagnostics = {
      headerFields: [],
      candidateRows: 0,
      parsedRows: 0,
      emptyShell: true,
    };

    for (let page = 1; page <= MAX_PAGES; page += 1) {
      const { body } = await this.fetcher.fetchText(
        seasonUrl(seasonPath, {
          pid: "list",
          event: code,
          page: String(page),
          num_results: String(PAGE_SIZE),
          ...this.listParams(sex),
        }),
      );

      const parsed = parseDivisionRows(body, sourceEventId, sourceDivisionId);
      if (publishedEntrantCount === undefined) {
        publishedEntrantCount = parsed.publishedEntrantCount;
      }
      rows.push(...parsed.rows);

      // Merged across pages: the header is read once, counts accumulate, and
      // "empty shell" only survives if every page was one.
      if (merged.headerFields.length === 0) merged.headerFields = parsed.diagnostics.headerFields;
      merged.candidateRows += parsed.diagnostics.candidateRows;
      merged.parsedRows += parsed.diagnostics.parsedRows;
      merged.emptyShell = merged.emptyShell && parsed.diagnostics.emptyShell;

      // A short page is the last page. Belt and braces against a pager that
      // happily serves page 999 of a three-page list.
      if (parsed.rows.length < PAGE_SIZE) break;
      if (opts.maxRows && rows.length >= opts.maxRows) break;
    }

    // A method that returns nothing where the board itself says there are
    // entrants has not succeeded, it has failed quietly. Throwing hands over to
    // the next method in the chain rather than storing an empty division.
    if (rows.length === 0 && (publishedEntrantCount ?? 0) > 0) {
      throw new Error(
        `${this.name}: board reports ${publishedEntrantCount} entrants but rendered no rows ` +
          `for ${sourceDivisionId}`,
      );
    }

    return {
      sourceEventId,
      sourceDivisionId,
      publishedEntrantCount,
      rows,
      diagnostics: merged,
      via: "html",
    };
  }

  async fetchStartList(seasonPath: string, sourceDivisionId: string): Promise<RawDivisionPage> {
    const { code, sex } = splitDivisionRef(sourceDivisionId);
    const sourceEventId = weekendIdOf(code) ?? code;
    const { body } = await this.fetcher.fetchText(
      seasonUrl(seasonPath, {
        pid: "startlist",
        event: code,
        num_results: String(PAGE_SIZE),
        ...this.listParams(sex),
      }),
    );
    const parsed = parseDivisionRows(body, sourceEventId, sourceDivisionId);
    return {
      sourceEventId,
      sourceDivisionId,
      publishedEntrantCount: parsed.publishedEntrantCount,
      rows: parsed.rows,
      diagnostics: parsed.diagnostics,
      via: "html",
    };
  }
}

/** Primary: the sex-filtered board, which is the only one that renders rows. */
export class MikaFilteredListAdapter extends MikaAdapter {
  readonly name = "mika-filtered-list";

  protected listParams(sex: string | null): Record<string, string> {
    return sex ? { "search[sex]": sex } : {};
  }
}

/**
 * Fallback: the unfiltered board.
 *
 * Renders for divisions under the source's display threshold, and keeps us
 * collecting if the filter contract changes. Rows sit under a `data-sex`
 * attribute, so the normaliser can still tell the two divisions apart.
 */
export class MikaUnfilteredListAdapter extends MikaAdapter {
  readonly name = "mika-unfiltered-list";

  protected listParams(): Record<string, string> {
    return {};
  }
}

/** Both methods share one fetcher, and therefore one budget and one breaker. */
export function createHyroxChain(fetcher = new SourceFetcher()): FallbackChain {
  return new FallbackChain([
    new MikaFilteredListAdapter(fetcher),
    new MikaUnfilteredListAdapter(fetcher),
  ]);
}
