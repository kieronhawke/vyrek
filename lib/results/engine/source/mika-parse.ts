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
    .replace(/&nbsp;/g, " ")
    // A missing time renders as `<span class="text-muted">&ndash;</span>`.
    // Left encoded, it survives as the literal string "&ndash;" and lands in
    // the database as an athlete's finish time.
    .replace(/&[nm]dash;/g, "–");
}

function stripTags(value: string): string {
  return decodeEntities(value.replace(/<[^>]*>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Options of one named `<select>`, in document order.
 *
 * ⚠️ The name is escaped before it becomes a pattern. Mika names its filter
 * selects `search[age_class]` and `search[sex]`, and square brackets are a
 * character class in a regular expression — so the unescaped version matched
 * nothing at all, silently, and the age-group partitioning it fed simply never
 * ran.
 */
export function parseSelectOptions(
  html: string,
  selectName: string,
): { value: string; label: string }[] {
  const escaped = selectName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const selectRe = new RegExp(
    `<select[^>]*name=["']${escaped}["'][^>]*>([\\s\\S]*?)</select>`,
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
 * The age-group values a board offers, e.g. `U24`, `30`, `40`.
 *
 * These matter because the pager is capped: `?page=N` stops serving new rows
 * after about 280 entries however many the board claims to hold. Narrowing by
 * age group splits a large field into slices that each fit under that ceiling,
 * which is the only way to reach the whole of it.
 *
 * `%` is the "all" option and is excluded — asking for it is the unnarrowed
 * request we already made.
 */
export function parseAgeClasses(html: string): string[] {
  return parseSelectOptions(html, "search[age_class]")
    .map((o) => o.value)
    .filter((v) => v && v !== "%");
}

/** The weekend names the season offers, e.g. "2026 Chiba", "2026 Delhi". */
export function parseGroupNames(html: string): string[] {
  return parseSelectOptions(html, "event_main_group")
    .map((o) => o.value)
    .filter((v) => !splitEventCode(v));
}

/**
 * The division codes on a page, grouped by the weekend id inside each code.
 *
 * ⚠️ On the plain season page this returns **every weekend's codes at once**
 * with nothing saying which weekend is which — 73 codes across 22 weekends,
 * regardless of which group is selected, and with no `<optgroup>` to attribute
 * them. An earlier version labelled all of them with the first group name, so
 * 22 real race weekends collapsed onto one slug and Delhi's results would have
 * been stored against Chiba.
 *
 * The caller must therefore pass the weekend name it asked for, having narrowed
 * the page by POSTing `event_main_group` — see `hyrox-adapter.listEventGroups`.
 */
export function parseEventGroups(
  html: string,
  seasonPath: string,
  groupLabel?: string,
): RawEventGroup[] {
  const divisions = parseSelectOptions(html, "event");
  const byWeekend = new Map<string, RawEventGroup>();

  for (const division of divisions) {
    const parsed = splitEventCode(division.value);
    if (!parsed) continue;
    const ref = {
      sourceDivisionId: division.value,
      label: division.label,
      divisionPrefix: parsed.prefix,
    };
    const existing = byWeekend.get(parsed.weekendId);
    if (existing) {
      existing.divisions.push(ref);
    } else {
      byWeekend.set(parsed.weekendId, {
        sourceEventId: parsed.weekendId,
        // Empty when the caller did not narrow to a single weekend. An unnamed
        // weekend is skipped by the catalogue rather than guessed at.
        label: groupLabel ?? "",
        seasonPath,
        divisions: [ref],
      });
    }
  }

  return [...byWeekend.values()];
}

export type RowParseDiagnostics = ParseDiagnostics;

export type ParsedRows = {
  rows: RawResultRow[];
  diagnostics: RowParseDiagnostics;
  /** Real headcount: the rendered-row counter divided by `rowsPerEntrant`. */
  publishedEntrantCount?: number;
  /** The raw "N Results" counter, which counts rendered rows, not people. */
  publishedRowCount?: number;
  /** Rows the board emits per athlete, measured on this page. 2.0–2.9 observed. */
  rowsPerEntrant?: number;
};

/**
 * Field containers are keyed by their `type-*` class, on any tag.
 *
 * ⚠️ This is the correction that matters. The *header* row carries `field-*`
 * classes; the **data rows do not** — they carry only `type-*`. A parser keyed
 * on `field-*` therefore reads the column headings perfectly and finds zero
 * athletes, on a 200 response, with no error. Verified against a real
 * season-8 board: 100 rows present, 100 rows invisible.
 *
 * The name also arrives inside an `<h4>` rather than a `<div>`, so the reader
 * cannot assume divs either.
 */
const TYPE_OPEN_RE = /<(div|h4|span|td)[^>]*class="([^"]*\btype-([a-z_]+)\b[^"]*)"[^>]*>/g;

/**
 * Field values of one row, keyed by `type-*` name.
 *
 * Two nested things have to be stripped before the text is taken:
 *
 * - the responsive **label** div (`<div class="list-label">Nat</div>GBR`),
 *   which otherwise returns the column heading for every row; and
 * - the flag `<img alt="ITA">`, whose alt text would otherwise duplicate the
 *   nationality.
 *
 * `place` appears twice per row — overall then age-group — distinguished by
 * `place-primary` / `place-secondary` rather than by order, so a layout change
 * cannot silently swap an athlete's overall rank for their age-group rank.
 */
export function parseRowFields(block: string): Record<string, string> {
  const fields: Record<string, string> = {};
  TYPE_OPEN_RE.lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = TYPE_OPEN_RE.exec(block)) !== null) {
    const [, tag, classList, type] = match;
    let key = type;
    if (type === "place") {
      key = /place-secondary/.test(classList) ? "place_age" : "place_all";
    }

    const inner = readBalancedTag(block, match.index + match[0].length, tag);
    const value = stripTags(
      inner
        .replace(/<div[^>]*class="[^"]*list-label[^"]*"[^>]*>[\s\S]*?<\/div>/g, " ")
        .replace(/<img[^>]*>/g, " "),
    );

    // A dash is how this platform prints "no value". Storing it as text is how
    // a DNF ends up with a finish time of "–".
    const meaningful = /^[–—-]+$/.test(value) ? "" : value;

    // First non-empty write wins: the mobile duplicate of a field comes later
    // in the markup and carries the same value.
    if (meaningful && !fields[key]) fields[key] = meaningful;
  }

  // The stable per-result id lives in the detail link, not in a field.
  // The href is HTML-escaped in the source, so the separator is `&amp;` and the
  // character immediately before `idp=` is a semicolon. Matching only [?&] here
  // silently found nothing, and every id fell back to rank-plus-name — which
  // changes the moment a rank changes, so a live board would insert duplicates
  // instead of updating rows. Both separators are accepted.
  const idp = /(?:[?&]|&amp;)idp=([A-Za-z0-9]+)/.exec(block);
  if (idp) fields.idp = idp[1];

  return fields;
}

/**
 * Content of the element opened at `start`, counting nesting of that tag name.
 * Falls back to the rest of the block on unbalanced markup, which loses one
 * row's precision rather than the whole division.
 */
function readBalancedTag(html: string, start: number, tag: string): string {
  let depth = 1;
  const tagRe = new RegExp(`<(/?)${tag}\\b[^>]*>`, "g");
  tagRe.lastIndex = start;
  let match: RegExpExecArray | null;

  while ((match = tagRe.exec(html)) !== null) {
    depth += match[1] === "/" ? -1 : 1;
    if (depth === 0) return html.slice(start, match.index);
  }
  return html.slice(start);
}

/**
 * mika prints names as `Surname, Firstname`. Stored the way a person writes
 * their own name, because it is rendered on a public profile page and used for
 * identity matching — "Benzio, Sergio" and "Sergio Benzio" must not become two
 * athletes.
 */
export function normalisePersonName(raw: string): string {
  const value = raw.trim().replace(/\s+/g, " ");
  const parts = value.split(",");
  if (parts.length !== 2) return value;
  const [surname, forename] = parts.map((p) => p.trim());
  return surname && forename ? `${forename} ${surname}` : value;
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

  // `data-sex='M'` on the wrapping column is the only place the board states
  // which sex it is showing, and the rows themselves never say.
  const sexAttr = /data-sex=['"]([MWFX])['"]/i.exec(html)?.[1];

  // ⚠️ Rows are split by where the next one *starts*, not by `</li>`.
  //
  // The source emits unbalanced list markup — one real page had 161 `<li>` and
  // 156 `</li>` — so a non-greedy `<li …>…</li>` match runs past the end of a
  // row and swallows the ones after it. The parser then reads only the first
  // athlete out of each merged block: 100 rows became 37, and roughly 63% of
  // every large board was silently lost. It looked like the source paginating
  // badly, then like rows being dropped for unresolved athletes; it was neither.
  //
  // Splitting on the start marker is immune to that, because it never depends
  // on a closing tag being where it ought to be.
  const rows: RawResultRow[] = [];
  let candidateRows = 0;

  const startRe = /<li[^>]*class="[^"]*list-group-item[^"]*"[^>]*>/gi;
  const starts: number[] = [];
  let startMatch: RegExpExecArray | null;
  while ((startMatch = startRe.exec(html)) !== null) starts.push(startMatch.index);

  for (const [index, from] of starts.entries()) {
    const to = starts[index + 1] ?? html.length;
    const block = html.slice(from, to);
    if (/list-group-header/i.test(block)) continue;
    if (!/type-(fullname|relay_member)/.test(block)) continue;
    candidateRows += 1;

    const fields = parseRowFields(block);

    // Doubles and relay boards name the column `relay_member`, not `fullname`,
    // and drop the nationality column entirely.
    const isTeamRow = typeof fields.relay_member === "string";
    const rawName = fields.fullname ?? fields.relay_member ?? fields.name;
    if (!rawName) continue;

    // ⚠️ The comma means opposite things in the two columns. In `fullname` it
    // separates surname from forename ("Benzio, Sergio"); in `relay_member` it
    // separates one athlete from their partner ("Kevin Marshall, Danny Wood").
    // Normalising a team row would turn that pair into "Danny Wood Kevin
    // Marshall" — one athlete with both their names swapped and merged.
    const name = isTeamRow ? rawName.trim() : normalisePersonName(rawName);

    // `type-time` is the net total; `type-actual_ranking_time` is often a dash.
    const finishTime = fields.time ?? fields.time_finish_netto ?? fields.actual_ranking_time;

    rows.push({
      sourceResultId: buildResultId(sourceDivisionId, fields, name),
      sourceDivisionId,
      sourceEventId,
      sourceAthleteId: fields.idp || undefined,
      name,
      nationality: fields.nation_flag ?? fields.nation ?? undefined,
      ageGroup: fields.age_class || undefined,
      sex: fields.sex ?? sexAttr ?? undefined,
      rankOverall: fields.place_all || undefined,
      rankAgeGroup: fields.place_age || undefined,
      finishTime: finishTime || undefined,
      roxzoneTime: fields.time_roxzone || undefined,
      wave: fields.wave || undefined,
      bib: fields.startnumber || fields.bib || undefined,
      status: fields.status || undefined,
      partnerNames: splitPartnerNames(name),
      isTeam: isTeamRow || undefined,
    });
  }

  // The counter mika renders above the board: "153 Results", or "> 200 Results"
  // when it refuses to render an unfiltered set that large.
  //
  // Scoped to the `str_num` span rather than swept off the whole page. A loose
  // match picked up an unrelated number elsewhere in the markup and reported a
  // 153-row division as having 19 entrants — which would then have been fed
  // straight into the completeness checksum as a false pass.
  const counter = /class="[^"]*str_num[^"]*"[^>]*>([^<]*)</i.exec(html);
  const countMatch = counter ? /(\d+)/.exec(decodeEntities(counter[1])) : null;
  const publishedRowCount = countMatch ? Number(countMatch[1]) : undefined;

  // ⚠️ That counter counts *rendered rows*, not entrants.
  //
  // mika emits several `list-group-item` blocks per athlete — a wide one and a
  // narrow one, plus extras on some divisions — and "N Results" counts all of
  // them. It is not a headcount, and reading it as one is a trap that cost a
  // long investigation: Manchester 2023 open women reads "686 Results" for a
  // field of 281, and the missing 405 do not exist. Measured on the relay
  // boards, where the ratio is a clean 2.00: 15 teams, "30 Results".
  //
  // The ratio is not a constant (2.0 on relay, 2.44 on open women, 2.89 on pro)
  // so it cannot be hard-coded — but it is directly observable on the very page
  // being parsed, as rows-emitted over distinct-entrants. Dividing by it
  // recovers the real headcount, which is what the completeness check needs.
  //
  // Verified against the age-class partition, which is exhaustive and mutually
  // exclusive: the 15 slices of that division sum to 280 distinct athletes
  // against a stored 281, and their counters sum to 684 against a published 686.
  const distinctOnPage = new Set(rows.map((r) => r.sourceResultId)).size;
  const rowsPerEntrant = distinctOnPage > 0 ? rows.length / distinctOnPage : 1;
  const publishedEntrantCount =
    publishedRowCount === undefined
      ? undefined
      : Math.round(publishedRowCount / rowsPerEntrant);

  return {
    rows,
    publishedEntrantCount,
    publishedRowCount,
    rowsPerEntrant,
    diagnostics: {
      headerFields,
      candidateRows,
      parsedRows: rows.length,
      distinctRows: distinctOnPage,
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

  // ⚠️ Deduplicated, because the board repeats each athlete.
  //
  // mika renders every athlete two to four times per row (SOURCE.md §4), and
  // the name cell picks up each rendering — so a doubles pair arrived as
  // "Roncevic & Lousa & Roncevic & Lousa & Roncevic". Stored faithfully that
  // is a five-person doubles team: it inflated every team division's headcount,
  // created a duplicate athlete profile per repeat, and put the same person on
  // a result twice.
  //
  // Order is preserved, because position identifies the person on the entry
  // and re-ordering would move who is who.
  const seen = new Set<string>();
  const unique = parts.filter((part) => {
    const key = part.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return unique.length > 1 ? unique : undefined;
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
  // `idp` is mika's own per-entry id, carried on every detail link. It is the
  // stable key everything upserts on, and it is why re-running any sync is safe.
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
 * Real markup, one row per segment:
 *
 *     <tr class="f-time_01">
 *       <th class="desc">Running 1</th>
 *       <td class="f-time_01">00:02:48</td>
 *       <td class="last"><span class="text-muted">&ndash;</span></td>
 *     </tr>
 *
 * ⚠️ Matched strictly, against an explicit label list. The table also contains
 * `Run Total`, `Best Run Lap`, `Rox In`, `Rox Out` and per-station `In`/`Out`
 * timing-mat rows. A loose `/run/` match turns "Run Total" into a ninth run and
 * "Best Run Lap" into a tenth, and the splits then never sum to the finish —
 * which the validator would correctly quarantine, for entirely the wrong
 * reason. Station labels carry their distance ("1000m SkiErg", "50m Sled
 * Push"), so the distance is stripped before matching.
 */
export function parseDetailSplits(html: string): {
  runs: { key: string; time: string }[];
  stations: { key: string; time: string }[];
  roxzone?: string;
  finish?: string;
  bib?: string;
} {
  const runs: { key: string; time: string }[] = [];
  const stations: { key: string; time: string }[] = [];
  let roxzone: string | undefined;
  let finish: string | undefined;
  let bib: string | undefined;

  const rowRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let match: RegExpExecArray | null;

  while ((match = rowRe.exec(html)) !== null) {
    const cells = [...match[1].matchAll(/<(?:th|td)[^>]*>([\s\S]*?)<\/(?:th|td)>/gi)].map((c) =>
      stripTags(c[1]),
    );
    if (cells.length < 2) continue;

    const label = cells[0].trim();
    const value = cells[1].trim();

    if (/^bib\s*number$/i.test(label)) {
      bib = value;
      continue;
    }
    if (/^overall\s*time$/i.test(label)) {
      finish = value;
      continue;
    }
    if (/^roxzone\s*time$/i.test(label)) {
      roxzone = value;
      continue;
    }

    // "Running 3" and nothing else. Not "Run Total", not "Best Run Lap".
    const run = /^running\s+(\d+)$/i.exec(label);
    if (run) {
      runs.push({ key: `run-${run[1]}`, time: value });
      continue;
    }

    // Timing-mat rows: "1000m SkiErg In", "Rox Out". Segment totals only.
    if (/\b(in|out)$/i.test(label)) continue;

    const station = matchStationLabel(label);
    if (station) stations.push({ key: station, time: value });
  }

  runs.sort((a, b) => Number(/(\d+)/.exec(a.key)?.[1] ?? 0) - Number(/(\d+)/.exec(b.key)?.[1] ?? 0));
  return { runs, stations, roxzone, finish, bib };
}

/**
 * A station label to our key. The distance prefix is stripped first, so
 * "1000m SkiErg" and "SkiErg" both resolve.
 */
export function matchStationLabel(label: string): string | null {
  const l = label.toLowerCase().replace(/^\d+\s*m\s*/, "").trim();
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
