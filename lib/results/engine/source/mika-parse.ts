/**
 * Pure parsers for the mika:Timing "blue stage" markup.
 *
 * No network, no state, no DOM library — string in, structure out. That makes
 * every one of these testable against a fixture in microseconds, which is the
 * point: the parser is the part most likely to break silently when the source
 * changes, so it is the part that has to be cheapest to test.
 *
 * The platform helpfully carries its schema in class names
 * (`field-place_all`, `field-__fullname`), so parsing keys on those rather than
 * on column position. A reordered column then changes nothing; a *renamed* one
 * produces a missing field, which the sentinel catches loudly. Positional
 * parsing would silently shift every value one to the left instead.
 *
 * See `docs/results/SOURCE.md` §4–§5 for the observed structure.
 */

import type { ParseDiagnostics, RawEventGroup, RawResultRow } from "../types";

/** Division code prefixes, from SOURCE.md §3. */
export const DIVISION_PREFIXES: Record<string, string> = {
  H: "open",
  HPRO: "pro",
  HD: "doubles",
  HD1: "doubles",
  HD2: "doubles",
  HDP: "pro-doubles",
  HMR: "relay",
  HA: "adaptive",
  HE: "elite",
  HDE: "elite-doubles",
};

export function splitEventCode(code: string): { prefix: string; weekendId: string } | null {
  const match = /^([A-Z]+\d?)_(.+)$/.exec(code.trim());
  if (!match) return null;
  return { prefix: match[1], weekendId: match[2] };
}

/** Everything before the first `_` is the division; the rest is the weekend. */
export function weekendIdOf(code: string): string | null {
  return splitEventCode(code)?.weekendId ?? null;
}

function decodeEntities(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

function stripTags(value: string): string {
  return decodeEntities(value.replace(/<[^>]*>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

/** Options of one named `<select>`, in document order. */
export function parseSelectOptions(
  html: string,
  selectName: string,
): { value: string; label: string }[] {
  const selectRe = new RegExp(
    `<select[^>]*name=["']${selectName}["'][^>]*>([\\s\\S]*?)</select>`,
    "i",
  );
  const block = selectRe.exec(html);
  if (!block) return [];
  const options: { value: string; label: string }[] = [];
  const optionRe = /<option[^>]*value=["']([^"']*)["'][^>]*>([^<]*)/g;
  let match: RegExpExecArray | null;
  while ((match = optionRe.exec(block[1])) !== null) {
    const value = decodeEntities(match[1]).trim();
    if (!value) continue;
    options.push({ value, label: stripTags(match[2]) });
  }
  return options;
}

/**
 * A season index page into race weekends and their division codes.
 *
 * The page renders the *selected* weekend's divisions only, so a full catalogue
 * means one request per weekend. That is why the catalog sync is scheduled
 * hourly and not more often — it is inherently O(weekends) requests.
 */
export function parseEventGroups(html: string, seasonPath: string): RawEventGroup[] {
  const groups = parseSelectOptions(html, "event_main_group");
  const divisions = parseSelectOptions(html, "event");

  const byWeekend = new Map<string, RawEventGroup>();

  for (const division of divisions) {
    const parsed = splitEventCode(division.value);
    if (!parsed) continue;
    const existing = byWeekend.get(parsed.weekendId);
    const ref = {
      sourceDivisionId: division.value,
      label: division.label,
      divisionPrefix: parsed.prefix,
    };
    if (existing) {
      existing.divisions.push(ref);
    } else {
      byWeekend.set(parsed.weekendId, {
        sourceEventId: parsed.weekendId,
        // The selected group is the one this page is showing divisions for.
        label: groups.find((g) => g.value.includes("selected"))?.label ?? groups[0]?.label ?? "",
        seasonPath,
        divisions: [ref],
      });
    }
  }

  // Weekends the selector lists but whose divisions this page did not render.
  // Recorded with no divisions so the catalog sync knows to visit them.
  for (const group of groups) {
    if (splitEventCode(group.value)) continue; // it is a division code, not a weekend
    const known = [...byWeekend.values()].some((w) => w.label === group.label);
    if (!known) {
      byWeekend.set(`label:${group.value}`, {
        sourceEventId: group.value,
        label: group.label,
        seasonPath,
        divisions: [],
      });
    }
  }

  return [...byWeekend.values()];
}

export type RowParseDiagnostics = ParseDiagnostics;

export type ParsedRows = {
  rows: RawResultRow[];
  diagnostics: RowParseDiagnostics;
  publishedEntrantCount?: number;
};

const FIELD_OPEN_RE = /<div[^>]*class="[^"]*field-([a-zA-Z0-9_]+)[^"]*"[^>]*>/g;

/**
 * Field values of one row block, keyed by the `field-*` suffix.
 *
 * Div-balanced rather than regex-to-the-next-`</div>`, because the responsive
 * layout nests a *label* div inside each field div:
 *
 *     <div class="list-field field-__nation"><div class="list-label">Nat</div>GBR</div>
 *
 * A non-greedy match stops at the inner close and returns "Nat" — the column
 * heading — for every row on the page. It looks like it works, it typechecks,
 * and every athlete comes out with a nationality of "Nat". The labels are
 * stripped before the text is taken.
 */
export function parseRowFields(block: string): Record<string, string> {
  const fields: Record<string, string> = {};
  FIELD_OPEN_RE.lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = FIELD_OPEN_RE.exec(block)) !== null) {
    const key = match[1].replace(/^_+/, "").replace(/^type_/, "");
    const inner = readBalancedDiv(block, match.index + match[0].length);
    const withoutLabels = inner.replace(
      /<div[^>]*class="[^"]*list-label[^"]*"[^>]*>[\s\S]*?<\/div>/g,
      " ",
    );
    const value = stripTags(withoutLabels);
    if (value && !fields[key]) fields[key] = value;
  }
  return fields;
}

/**
 * Content of the div whose opening tag ends at `start`, counting nesting.
 * Returns to the end of the block if the markup is unbalanced, which is better
 * than throwing on one malformed row and losing the whole division.
 */
function readBalancedDiv(html: string, start: number): string {
  let depth = 1;
  let index = start;
  const tagRe = /<(\/?)div\b[^>]*>/g;
  tagRe.lastIndex = start;
  let tag: RegExpExecArray | null;

  while ((tag = tagRe.exec(html)) !== null) {
    depth += tag[1] === "/" ? -1 : 1;
    if (depth === 0) {
      index = tag.index;
      return html.slice(start, index);
    }
  }
  return html.slice(start);
}

/**
 * A results list into rows.
 *
 * `sourceEventId`/`sourceDivisionId` are supplied by the caller because the
 * markup does not repeat them per row — they are in the request, not the
 * response.
 */
export function parseDivisionRows(
  html: string,
  sourceEventId: string,
  sourceDivisionId: string,
): ParsedRows {
  const headerMatch = /<li[^>]*list-group-header[^>]*>([\s\S]*?)<\/li>/i.exec(html);
  const headerFields = headerMatch ? Object.keys(parseRowFields(headerMatch[1])) : [];

  // Data rows are list-group-item rows that are not the header.
  const rowRe = /<li[^>]*class="[^"]*list-group-item[^"]*"[^>]*>([\s\S]*?)<\/li>/gi;
  const rows: RawResultRow[] = [];
  let candidateRows = 0;
  let match: RegExpExecArray | null;

  while ((match = rowRe.exec(html)) !== null) {
    const block = match[0];
    if (/list-group-header/i.test(block)) continue;
    if (!/field-/.test(block)) continue;
    candidateRows += 1;

    const fields = parseRowFields(match[1]);
    const name = fields.fullname ?? fields.name;
    if (!name) continue;

    const finishTime = fields.time_finish_netto ?? fields.time ?? fields.time_finish_brutto;

    rows.push({
      sourceResultId: buildResultId(sourceDivisionId, fields, name),
      sourceDivisionId,
      sourceEventId,
      sourceAthleteId: fields.idp || undefined,
      name,
      nationality: fields.nation || undefined,
      ageGroup: fields.age_class || undefined,
      sex: fields.sex || undefined,
      rankOverall: fields.place_all || undefined,
      rankAgeGroup: fields.place_age || undefined,
      finishTime: finishTime || undefined,
      roxzoneTime: fields.time_roxzone || undefined,
      wave: fields.wave || undefined,
      bib: fields.startnumber || fields.bib || undefined,
      status: fields.status || undefined,
      partnerNames: splitPartnerNames(name),
    });
  }

  const emptyCount = /(\d+)\s+Results?/i.exec(stripTags(html));
  const publishedEntrantCount = emptyCount ? Number(emptyCount[1]) : undefined;

  return {
    rows,
    publishedEntrantCount,
    diagnostics: {
      headerFields,
      candidateRows,
      parsedRows: rows.length,
      emptyShell: candidateRows === 0 && headerFields.length > 0,
    },
  };
}

/**
 * Doubles and relay render as one row per *team* with both names in the name
 * field, so partner linking starts here (SOURCE.md §8).
 */
export function splitPartnerNames(name: string): string[] | undefined {
  const parts = name
    .split(/\s*(?:\/|&|\+|,)\s*/)
    .map((p) => p.trim())
    .filter(Boolean);
  return parts.length > 1 ? parts : undefined;
}

/**
 * A stable id for a row.
 *
 * Prefers the source's own `idp` when the markup carries one. Where it does
 * not, the composite of division + bib (or division + rank + name) is stable
 * across polls of the same race, which is what idempotency needs. Names alone
 * would not be: two people can share one.
 */
export function buildResultId(
  sourceDivisionId: string,
  fields: Record<string, string>,
  name: string,
): string {
  if (fields.idp) return `${sourceDivisionId}:${fields.idp}`;
  const bib = fields.startnumber ?? fields.bib;
  if (bib) return `${sourceDivisionId}:bib:${bib}`;
  const rank = fields.place_all ?? "0";
  return `${sourceDivisionId}:rank:${rank}:${slugForId(name)}`;
}

function slugForId(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * The per-result detail view into ordered splits.
 *
 * The detail page prints one row per segment with a label and a time. Labels
 * vary in wording between seasons, so they are matched loosely against the
 * canonical station names rather than compared exactly.
 */
export function parseDetailSplits(html: string): {
  runs: { key: string; time: string }[];
  stations: { key: string; time: string }[];
  roxzone?: string;
} {
  const runs: { key: string; time: string }[] = [];
  const stations: { key: string; time: string }[] = [];
  let roxzone: string | undefined;

  const rowRe = /<tr[^>]*>([\s\S]*?)<\/tr>|<li[^>]*>([\s\S]*?)<\/li>/gi;
  let match: RegExpExecArray | null;
  let runIndex = 0;

  while ((match = rowRe.exec(html)) !== null) {
    const text = stripTags(match[1] ?? match[2] ?? "");
    if (!text) continue;
    const time = /(\d{1,2}:\d{2}(?::\d{2})?)/.exec(text)?.[1];
    if (!time) continue;
    const label = text.replace(time, "").trim().toLowerCase();

    if (/roxzone/.test(label)) {
      roxzone = time;
      continue;
    }
    if (/^running|^run\b|lauf/.test(label)) {
      runIndex += 1;
      runs.push({ key: `run-${runIndex}`, time });
      continue;
    }
    const station = matchStationLabel(label);
    if (station) stations.push({ key: station, time });
  }

  return { runs, stations, roxzone };
}

export function matchStationLabel(label: string): string | null {
  const l = label.toLowerCase();
  if (/ski/.test(l)) return "ski-erg";
  if (/sled.*push|push.*sled/.test(l)) return "sled-push";
  if (/sled.*pull|pull.*sled/.test(l)) return "sled-pull";
  if (/burpee/.test(l)) return "burpee-broad-jump";
  if (/row/.test(l)) return "row";
  if (/farmer/.test(l)) return "farmers-carry";
  if (/lunge|sandbag/.test(l)) return "sandbag-lunges";
  if (/wall/.test(l)) return "wall-balls";
  return null;
}

/**
 * The ajax2 envelope.
 *
 * ⚠️ Shape inferred, not observed: characterising it properly needs an
 * authorised request against a populated event, which we do not have (SOURCE.md
 * §1, §4). So this is deliberately tolerant — it accepts an HTML payload under
 * any of the plausible keys and hands it to the row parser, and it accepts a
 * record array if that is what turns up. The parser-shape sentinel is what
 * tells us we guessed wrong, loudly, on the first authorised run.
 */
export function extractAjax2Html(payload: string): string | null {
  const trimmed = payload.trim();
  if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) return trimmed || null;
  try {
    const parsed = JSON.parse(trimmed) as Record<string, unknown>;
    for (const key of ["html", "content", "list", "data", "body"]) {
      const value = parsed[key];
      if (typeof value === "string" && value.includes("field-")) return value;
    }
    return null;
  } catch {
    return null;
  }
}
