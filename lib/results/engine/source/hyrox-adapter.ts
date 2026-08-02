/**
 * The two access methods for results.hyrox.com, ordered.
 *
 * 1. `MikaAjaxAdapter` — the `content=ajax2` endpoint their own frontend calls.
 *    Primary, because the plain page renders **no rows at all** (SOURCE.md §4);
 *    a parser pointed at the page would parse a valid, permanently empty
 *    document forever.
 * 2. `MikaHtmlAdapter` — the rendered page. Kept as the fallback because if
 *    they ever move rows back into the HTML, or the ajax contract changes, this
 *    keeps working.
 *
 * Neither can make a request unless `HYROX_SOURCE_ACCESS=authorised`; the
 * fetcher enforces that and both share one fetcher, so they also share one
 * outbound budget and one circuit breaker.
 */

import { SourceFetcher } from "../fetch/fetcher";
import type { RawDivisionPage, RawEventGroup } from "../types";
import type { SourceAdapter } from "./adapter";
import { FallbackChain } from "./adapter";
import {
  extractAjax2Html,
  parseDivisionRows,
  parseEventGroups,
  weekendIdOf,
} from "./mika-parse";

const SOURCE_ORIGIN = process.env.HYROX_SOURCE_ORIGIN ?? "https://results.hyrox.com";
/** Their pager caps out well below this; 100 keeps request counts sane. */
const PAGE_SIZE = 100;
const MAX_PAGES = 60;

function seasonUrl(seasonPath: string, params: Record<string, string>) {
  const query = new URLSearchParams({ lang: "EN", ...params }).toString();
  return `${SOURCE_ORIGIN}/${seasonPath.replace(/^\/|\/$/g, "")}/?${query}`;
}

abstract class MikaAdapter implements SourceAdapter {
  abstract readonly name: string;
  protected abstract divisionUrl(
    seasonPath: string,
    sourceDivisionId: string,
    page: number,
  ): string;
  protected abstract extractRowsHtml(body: string): string | null;

  constructor(protected fetcher: SourceFetcher) {}

  requestCount() {
    return this.fetcher.requestCount;
  }

  async listEventGroups(seasonPath: string): Promise<RawEventGroup[]> {
    const { body } = await this.fetcher.fetchText(seasonUrl(seasonPath, { pid: "list" }));
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
    const sourceEventId = weekendIdOf(sourceDivisionId) ?? sourceDivisionId;
    const rows: RawDivisionPage["rows"] = [];
    let publishedEntrantCount: number | undefined;

    for (let page = 1; page <= MAX_PAGES; page += 1) {
      const { body } = await this.fetcher.fetchText(
        this.divisionUrl(seasonPath, sourceDivisionId, page),
      );
      const rowsHtml = this.extractRowsHtml(body);
      if (!rowsHtml) break;

      const parsed = parseDivisionRows(rowsHtml, sourceEventId, sourceDivisionId);
      if (publishedEntrantCount === undefined) {
        publishedEntrantCount = parsed.publishedEntrantCount;
      }
      rows.push(...parsed.rows);

      // A short page is the last page. Belt and braces against a pager that
      // happily serves page 999 of a 3-page list.
      if (parsed.rows.length < PAGE_SIZE) break;
      if (opts.maxRows && rows.length >= opts.maxRows) break;
    }

    return {
      sourceEventId,
      sourceDivisionId,
      publishedEntrantCount,
      rows,
      via: this.name === "mika-ajax2" ? "ajax2" : "html",
    };
  }

  async fetchStartList(seasonPath: string, sourceDivisionId: string): Promise<RawDivisionPage> {
    const sourceEventId = weekendIdOf(sourceDivisionId) ?? sourceDivisionId;
    const { body } = await this.fetcher.fetchText(
      seasonUrl(seasonPath, {
        pid: "startlist",
        event: sourceDivisionId,
        num_results: String(PAGE_SIZE),
      }),
    );
    const rowsHtml = this.extractRowsHtml(body) ?? body;
    const parsed = parseDivisionRows(rowsHtml, sourceEventId, sourceDivisionId);
    return {
      sourceEventId,
      sourceDivisionId,
      publishedEntrantCount: parsed.publishedEntrantCount,
      rows: parsed.rows,
      via: this.name === "mika-ajax2" ? "ajax2" : "html",
    };
  }
}

export class MikaAjaxAdapter extends MikaAdapter {
  readonly name = "mika-ajax2";

  protected divisionUrl(seasonPath: string, sourceDivisionId: string, page: number) {
    return seasonUrl(seasonPath, {
      content: "ajax2",
      client: "js",
      pid: "list",
      event: sourceDivisionId,
      page: String(page),
      num_results: String(PAGE_SIZE),
    });
  }

  protected extractRowsHtml(body: string) {
    return extractAjax2Html(body);
  }
}

export class MikaHtmlAdapter extends MikaAdapter {
  readonly name = "mika-html";

  protected divisionUrl(seasonPath: string, sourceDivisionId: string, page: number) {
    return seasonUrl(seasonPath, {
      pid: "list",
      event: sourceDivisionId,
      page: String(page),
      num_results: String(PAGE_SIZE),
    });
  }

  protected extractRowsHtml(body: string) {
    return body.includes("field-") ? body : null;
  }
}

/** Primary then fallback, sharing one fetcher and therefore one rate budget. */
export function createHyroxChain(fetcher = new SourceFetcher()): FallbackChain {
  return new FallbackChain([new MikaAjaxAdapter(fetcher), new MikaHtmlAdapter(fetcher)]);
}
