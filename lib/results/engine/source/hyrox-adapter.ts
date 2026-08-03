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
import type {
  ParseDiagnostics,
  RawDivisionPage,
  RawEventGroup,
  RawResultDetail,
} from "../types";
import type { SourceAdapter } from "./adapter";
import { FallbackChain } from "./adapter";
import {
  parseAgeClasses,
  parseDetailSplits,
  parseDivisionRows,
  parseEventGroups,
  parseGroupNames,
  weekendIdOf,
} from "./mika-parse";

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
  if (suffix === "mixed") return { code, sex: "X" };
  return { code, sex: null };
}

abstract class MikaAdapter implements SourceAdapter {
  abstract readonly name: string;
  /** Extra query parameters this method adds to the list request. */
  protected abstract listParams(sex: string | null): Record<string, string>;

  /**
   * Walk one filtered view of a board, page by page, collecting distinct rows.
   *
   * Returns the last page's HTML too, because the caller needs the age-group
   * options and the published count off it.
   */
  private async collect(
    seasonPath: string,
    code: string,
    sourceEventId: string,
    sourceDivisionId: string,
    params: Record<string, string>,
    into: Map<string, RawDivisionPage["rows"][number]>,
    merged: ParseDiagnostics,
  ): Promise<{ published?: number; firstBody: string }> {
    let published: number | undefined;
    let firstBody = "";

    for (let page = 1; page <= MAX_PAGES; page += 1) {
      const { body } = await this.fetcher.fetchText(
        seasonUrl(seasonPath, {
          pid: "list",
          event: code,
          page: String(page),
          num_results: String(PAGE_SIZE),
          ...params,
        }),
      );
      if (page === 1) firstBody = body;

      const parsed = parseDivisionRows(body, sourceEventId, sourceDivisionId);
      if (published === undefined) published = parsed.publishedEntrantCount;

      const before = into.size;
      for (const row of parsed.rows) into.set(row.sourceResultId, row);

      if (merged.headerFields.length === 0) merged.headerFields = parsed.diagnostics.headerFields;
      merged.candidateRows += parsed.diagnostics.candidateRows;
      merged.parsedRows += parsed.diagnostics.parsedRows;
      merged.emptyShell = merged.emptyShell && parsed.diagnostics.emptyShell;

      // Nothing new means the pager has run out, whatever it served.
      if (into.size === before) break;
    }

    return { published, firstBody };
  }

  constructor(protected fetcher: SourceFetcher) {}

  requestCount() {
    return this.fetcher.requestCount;
  }

  /**
   * Every race weekend in a season, with its division codes.
   *
   * One GET for the weekend names, then **one POST per weekend** to find out
   * which division codes belong to it. That is N+1 requests and it is not
   * avoidable: the plain page lists all 73 codes across 22 weekends flat, with
   * no optgroup and no other marker, and passing `event_main_group` as a query
   * parameter changes nothing. Only the POST narrows it.
   *
   * This matters more than it looks. Attributing codes by position, or naming
   * them all after the selected weekend, silently files Delhi's results under
   * Chiba — one event, 22 weekends' results, unrecoverable without a re-sync.
   */
  async listEventGroups(seasonPath: string): Promise<RawEventGroup[]> {
    const { body } = await this.fetcher.fetchText(seasonUrl(seasonPath, {}));
    const names = parseGroupNames(body);
    if (names.length === 0) {
      throw new Error(`No weekend names parsed from ${seasonPath} — selector markup changed?`);
    }

    const groups: RawEventGroup[] = [];
    const seen = new Set<string>();

    for (const name of names) {
      const narrowed = await this.fetcher.fetchText(
        `${SOURCE_ORIGIN}/${seasonPath.replace(/^\/|\/$/g, "")}/index.php?pid=list`,
        { event_main_group: name, pid: "list", lang: "EN" },
      );
      for (const group of parseEventGroups(narrowed.body, seasonPath, name)) {
        // A weekend id can only belong to one weekend. If it turns up twice the
        // narrowing has failed, and taking the first is safer than overwriting
        // a correct attribution with a wrong one.
        if (seen.has(group.sourceEventId)) continue;
        seen.add(group.sourceEventId);
        groups.push(group);
      }
    }

    if (groups.length === 0) {
      throw new Error(`No division codes parsed for any weekend in ${seasonPath}`);
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
    // Accumulated by id, because the source renders each athlete two to four
    // times on a page — the same rank, name and entry id repeated — and the
    // duplication factor varies from row to row.
    const byId = new Map<string, RawDivisionPage["rows"][number]>();
    let publishedEntrantCount: number | undefined;
    const merged: ParseDiagnostics = {
      headerFields: [],
      candidateRows: 0,
      parsedRows: 0,
      emptyShell: true,
    };

    const first = await this.collect(
      seasonPath, code, sourceEventId, sourceDivisionId,
      this.listParams(sex), byId, merged,
    );
    publishedEntrantCount = first.published;

    // ⚠️ The pager is capped, and the cap is well below what a big board holds.
    //
    // Measured: a 686-entrant division served new rows for seven pages, reached
    // 282, and returned empty pages from page eight onward. No page parameter
    // reaches the other 404. The engine was correct and the source's pagination
    // simply stops.
    //
    // Narrowing by age group splits the field into slices that each fit under
    // that ceiling. It costs more requests, so it only happens when the board
    // says there is more to get than we managed to collect.
    if (publishedEntrantCount !== undefined && byId.size < publishedEntrantCount) {
      for (const ageClass of parseAgeClasses(first.firstBody)) {
        const before = byId.size;
        await this.collect(
          seasonPath, code, sourceEventId, sourceDivisionId,
          { ...this.listParams(sex), "search[age_class]": ageClass }, byId, merged,
        );
        void before;
        if (byId.size >= publishedEntrantCount) break;
        if (opts.maxRows && byId.size >= opts.maxRows) break;
      }
    }

    // A method that returns nothing where the board itself says there are
    // entrants has not succeeded, it has failed quietly. Throwing hands over to
    // the next method in the chain rather than storing an empty division.
    const rows = [...byId.values()];
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

  async fetchResultDetail(
    seasonPath: string,
    opts: { idp: string; sourceDivisionId: string },
  ): Promise<RawResultDetail> {
    const { code } = splitDivisionRef(opts.sourceDivisionId);
    const { body } = await this.fetcher.fetchText(
      seasonUrl(seasonPath, {
        content: "detail",
        fpid: "list",
        pid: "list",
        idp: opts.idp,
        event: code,
      }),
    );
    const splits = parseDetailSplits(body);
    if (splits.runs.length === 0 && splits.stations.length === 0) {
      throw new Error(`No splits parsed from detail view for ${opts.idp}`);
    }
    return {
      sourceResultId: `${opts.sourceDivisionId}:${opts.idp}`,
      idp: opts.idp,
      ...splits,
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
