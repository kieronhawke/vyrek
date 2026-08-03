/**
 * `Normaliser` — raw source records into our canonical model.
 *
 * Everything the source does oddly stops here: `HH:MM:SS` strings, division
 * codes, one row per doubles *team*, age groups as free text, ranks with
 * dashes in them. Downstream of this file nothing knows mika:Timing exists
 * (brief §6).
 *
 * It also owns the two decisions that cannot be undone later:
 * - **which athlete a row belongs to** (identity resolution), and
 * - **whether a row is fit to store at all** (validation and quarantine).
 *
 * Both are conservative on purpose. A row we quarantine can be reprocessed
 * from the console in a click. A row we merge onto the wrong person has already
 * published a stranger's times under their name.
 */

import type { ResultsRepository } from "../repository";
import type { UpsertAthlete, UpsertResult } from "../repository";
import type {
  EngineDivision,
  EngineEvent,
  EngineResultStatus,
  QuarantineRow,
  RawDivisionPage,
  RawEventGroup,
  RawResultRow,
  Splits,
} from "../types";
import { checkParseShape, type SentinelVerdict } from "../validate/sentinel";
import { validateRow } from "../validate/validate";
import { athleteSlug, decideIdentity, type ExistingAthlete } from "./identity";
import { parseRank, parseTimeToMs } from "./time";
import { DIVISION_PREFIXES } from "../source/mika-parse";

export type NormaliseContext = {
  event: EngineEvent;
  division: EngineDivision;
  ingestionRunId?: string;
  /** Diagnostics from the parser, for the shape sentinel. */
  diagnostics?: Parameters<typeof checkParseShape>[0];
};

export type NormaliseOutcome = {
  rows: UpsertResult[];
  quarantined: Omit<QuarantineRow, "id" | "createdAt">[];
  shape: SentinelVerdict;
  athletesCreated: number;
  identityReviews: number;
};

/* ── Catalogue-level helpers ─────────────────────────────────────────── */

/** `"2026 Chiba"` → `{ year: 2026, city: "Chiba" }`. */
export function parseGroupLabel(label: string): { year: number | null; city: string } {
  const match = /^(\d{4})\s+(.*)$/.exec(label.trim());
  if (match) return { year: Number(match[1]), city: match[2].trim() };
  return { year: null, city: label.trim() };
}

export function eventSlugFor(season: string, year: number, city: string): string {
  const citySlug = city
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `${season}-${year}-${citySlug}`;
}

/** `"season-9"` → `"s9"`. */
export function seasonKeyFor(seasonPath: string): string {
  const match = /season-(\d+)/i.exec(seasonPath);
  return match ? `s${match[1]}` : seasonPath;
}

/**
 * A division code plus a sex into our division key.
 *
 * The source splits sex by filter rather than by code, so `H_LR3…` is "HYROX
 * open" and the men's and women's boards are the same code with a different
 * query. Our model treats them as separate divisions, because that is what a
 * leaderboard URL means to a visitor.
 */
export function divisionKeyFor(prefix: string, sex?: string | null): string {
  const base = DIVISION_PREFIXES[prefix] ?? prefix.toLowerCase();
  const suffix = normaliseSex(sex);
  return suffix ? `${base}-${suffix}` : base;
}

/**
 * Which sexes a division code can actually have entrants in.
 *
 * The source offers M, W and X (Mixed) on every board, but Mixed only means
 * something for team formats — an individual race cannot be mixed, and asking
 * returns an empty board at the cost of a request.
 *
 * ⚠️ Omitting X entirely, which is what this did at first, silently drops whole
 * divisions: HYROX Relay Mixed is a real category with real results, and it was
 * never being fetched. Missing an entire division is the worst class of
 * accuracy bug, because nothing looks wrong — the board that is there is
 * complete, and the one that is not simply does not appear.
 *
 * Pro Doubles and Elite Doubles are deliberately absent: HYROX does not run
 * them mixed, and the frontend's DivisionCode union has no member for them, so
 * a mixed row there would have nowhere to live.
 */
export const SEXES_FOR_PREFIX: Record<string, ("men" | "women" | "mixed")[]> = {
  H: ["men", "women"],
  HPRO: ["men", "women"],
  HA: ["men", "women"],
  HE: ["men", "women"],
  HD: ["men", "women", "mixed"],
  HD1: ["men", "women", "mixed"],
  HD2: ["men", "women", "mixed"],
  HMR: ["men", "women", "mixed"],
  HDP: ["men", "women"],
  HDE: ["men", "women"],
};

export function sexesForPrefix(prefix: string): ("men" | "women" | "mixed")[] {
  return SEXES_FOR_PREFIX[prefix] ?? ["men", "women"];
}

export function normaliseSex(sex?: string | null): "men" | "women" | "mixed" | null {
  if (!sex) return null;
  const value = sex.trim().toLowerCase();
  if (["m", "male", "men", "man", "h"].includes(value)) return "men";
  if (["w", "f", "female", "women", "woman", "d"].includes(value)) return "women";
  if (["x", "mixed", "mix"].includes(value)) return "mixed";
  return null;
}

export function divisionDisplayName(prefix: string, sex?: string | null): string {
  const names: Record<string, string> = {
    H: "HYROX",
    HPRO: "HYROX Pro",
    HD: "HYROX Doubles",
    HD1: "HYROX Doubles",
    HD2: "HYROX Doubles",
    HDP: "HYROX Pro Doubles",
    HMR: "HYROX Team Relay",
    HA: "HYROX Adaptive",
    HE: "HYROX Elite 15",
    HDE: "HYROX Elite 15 Doubles",
  };
  const base = names[prefix] ?? prefix;
  const suffix = normaliseSex(sex);
  if (!suffix) return base;
  return `${base} ${suffix === "men" ? "Men" : suffix === "women" ? "Women" : "Mixed"}`;
}

/** IOC three-letter codes, uppercased. Anything else is dropped, not guessed. */
export function normaliseNationality(raw?: string | null): string | null {
  if (!raw) return null;
  const value = raw.trim().toUpperCase();
  return /^[A-Z]{3}$/.test(value) ? value : null;
}

export function normaliseAgeGroup(raw?: string | null): string | null {
  if (!raw) return null;
  const value = raw.trim().toUpperCase().replace(/\s+/g, "");
  if (/^\d{2}-\d{2}$/.test(value)) return value;
  if (/^U\d{2}$/.test(value)) return value;
  if (/^\d{2}\+$/.test(value)) return value;
  return null;
}

export function normaliseStatus(raw?: string | null): EngineResultStatus {
  const value = (raw ?? "").trim().toLowerCase();
  if (value.includes("dnf")) return "dnf";
  if (value.includes("dns")) return "dns";
  if (value.includes("dq") || value.includes("disq")) return "dq";
  return "finished";
}

/** Raw event groups into upsertable events. Dates come from the sync, not here. */
export function normaliseEventGroup(group: RawEventGroup): {
  slug: string;
  season: string;
  year: number;
  city: string;
} | null {
  const { year, city } = parseGroupLabel(group.label);
  if (!city) return null;
  const season = seasonKeyFor(group.seasonPath);
  const resolvedYear = year ?? new Date().getUTCFullYear();
  return { slug: eventSlugFor(season, resolvedYear, city), season, year: resolvedYear, city };
}

/* ── Row-level normalisation ─────────────────────────────────────────── */

export class Normaliser {
  constructor(private repo: ResultsRepository) {}

  /**
   * A whole division: parse, validate, resolve athletes, build rows.
   *
   * ⚠️ Athletes are resolved in **bulk**, and the reason is not only speed.
   *
   * Resolving one at a time cost up to three round trips each — around 460 for
   * a single 77-row doubles board, and half a million across the catalogue.
   * That is fifteen hours of pure latency at 100ms a call, and it made the
   * backfill look broken when it was merely crawling.
   *
   * It also leaked. Every one of those calls is a window in which the process
   * can die with athletes created and their rows unwritten, and a killed
   * backfill left 13,000 profiles attached to nothing. Batching shrinks that
   * window from hundreds of calls to two.
   */
  async normaliseDivision(
    page: RawDivisionPage,
    ctx: NormaliseContext,
  ): Promise<NormaliseOutcome> {
    const quarantined: NormaliseOutcome["quarantined"] = [];

    /* 1 ── Validate first, so nothing is resolved for a row we will not keep. */

    type Prepared = {
      raw: RawResultRow;
      status: EngineResultStatus;
      finishTimeMs: number | null;
      roxzoneTimeMs: number | null;
      splits: Splits;
      ageGroup: string | null;
      rankOverall: number | null;
      /** One entry per person on the row; index 0 owns it. */
      people: { name: string; stableId: string | null }[];
    };

    const prepared: Prepared[] = [];

    for (const raw of page.rows) {
      const status = normaliseStatus(raw.status);
      const finishTimeMs = parseTimeToMs(raw.finishTime);
      const roxzoneTimeMs = parseTimeToMs(raw.roxzoneTime);
      const splits = normaliseSplits(raw.splits);
      const ageGroup = normaliseAgeGroup(raw.ageGroup);
      const rankOverall = parseRank(raw.rankOverall);

      const verdict = validateRow({
        sourceResultId: raw.sourceResultId,
        finishTimeMs,
        roxzoneTimeMs,
        splits,
        status,
        rankOverall,
        name: raw.name,
      });

      if (!verdict.ok) {
        quarantined.push({
          sourceEventId: raw.sourceEventId,
          sourceDivisionId: raw.sourceDivisionId,
          sourceResultId: raw.sourceResultId,
          reason: verdict.failures.map((f) => f.reason).join(","),
          detail: { failures: verdict.failures },
          rawPayload: raw,
          ingestionRunId: ctx.ingestionRunId ?? null,
          reprocessedAt: null,
        });
        continue;
      }

      const isTeam = Boolean(raw.isTeam || (raw.partnerNames && raw.partnerNames.length > 1));
      const names = raw.partnerNames?.length ? raw.partnerNames : [raw.name];
      const people = names.map((name, position) => ({
        name: name.trim(),
        // A team entry id identifies the entry, not a person, so it is
        // qualified by position. An individual row's idp is already one person.
        //
        // ⚠️ Qualified by the *division* too, not just the entry id.
        //
        // `idp#p0` alone is not unique across the catalogue: the same entry id
        // turned up on boards at Incheon, Taipei, Shanghai, Osaka, Wuhan, Hong
        // Kong and Beijing, so one synthetic athlete absorbed a different
        // person from each — and ended up listed in all fourteen divisions of a
        // single event, which no human races. `sourceResultId` already carries
        // the division, and it is the only identifier here guaranteed unique.
        //
        // Individuals are untouched: a real `idp` is a person, and re-scoping it
        // would split one athlete's career across every event they ever raced.
        stableId: raw.sourceAthleteId
          ? isTeam
            ? `${raw.sourceResultId}#p${position}`
            : raw.sourceAthleteId
          : null,
      }));

      prepared.push({
        raw, status, finishTimeMs, roxzoneTimeMs, splits, ageGroup, rankOverall, people,
      });
    }

    /* 2 ── One read for every athlete this division already knows. */

    const stableIds = [
      ...new Set(prepared.flatMap((p) => p.people.map((x) => x.stableId).filter(Boolean))),
    ] as string[];
    const known = new Map(
      (await this.repo.getAthletesBySourceIds(stableIds)).map((a) => [a.sourceAthleteId!, a]),
    );

    /* 3 ── Decide what is missing, then write it in one go. */

    const toCreate: UpsertAthlete[] = [];
    const pendingBySlug = new Map<string, string>(); // stableId -> slug
    /**
     * Slug chosen for a person the source gave no id for.
     *
     * ⚠️ Not every row carries an `idp`. On one real board only 41% did, and a
     * person with no id was created but then never findable again — so the row
     * that owned them was dropped as "owner unresolved". 405 of 686 results
     * silently vanished from a single division, and the completeness check
     * reported it as a missing page.
     *
     * Keyed by name and position, because two people on the same team row can
     * share neither.
     */
    const pendingByPerson = new Map<string, string>();
    const personKey = (rowId: string, position: number) => `${rowId}#${position}`;
    let identityReviews = 0;

    // Every slug this division might need, checked in one go.
    //
    // Allocating them one at a time was the last per-athlete round trip: a
    // 638-row doubles board needed 1,276 of them, which is what turned a
    // seven-request fetch into a division that never finished. Collisions are
    // then resolved in memory, against the database *and* against slugs
    // claimed earlier in this same batch — which the database cannot warn
    // about, because those rows do not exist yet.
    const missing = prepared.flatMap((p) =>
      p.people.filter(
        (person) => !(person.stableId && known.has(person.stableId)),
      ),
    );
    const bases = [...new Set(missing.map((person) => athleteSlug(person.name)))];
    const candidates = bases.flatMap((base) => [base, ...Array.from({ length: 9 }, (_, i) => `${base}-${i + 2}`)]);
    const taken = await this.repo.findTakenSlugs(candidates);
    const claimedSlugs = new Set<string>(taken);

    const allocate = (name: string): string => {
      const base = athleteSlug(name);
      if (!claimedSlugs.has(base)) return base;
      for (let n = 2; n < 500; n += 1) {
        const candidate = `${base}-${n}`;
        if (!claimedSlugs.has(candidate)) return candidate;
      }
      return `${base}-${Date.now().toString(36)}`;
    };

    for (const p of prepared) {
      for (const [position, person] of p.people.entries()) {
        if (person.stableId && known.has(person.stableId)) continue;
        if (person.stableId && pendingBySlug.has(person.stableId)) continue;

        const nationality = normaliseNationality(p.raw.nationality);

        // The name fallback only matters when the source gave no id at all,
        // which is rare — but when it happens the conservative rule still
        // applies: never merge two people on a name alone.
        let confidence = 1;
        let needsReview = false;
        if (!person.stableId) {
          const candidates = (await this.repo.findAthletesByName(person.name)) as ExistingAthlete[];
          const decision = decideIdentity(
            { name: person.name, nationality, ageGroup: p.ageGroup, sourceAthleteId: null },
            candidates,
          );
          if (decision.action === "match") {
            const matched = candidates.find((c) => c.id === decision.athleteId)!;
            known.set(`person:${personKey(p.raw.sourceResultId, position)}`, matched);
            continue;
          }
          confidence = decision.confidence;
          needsReview = decision.action === "review";
          if (needsReview) identityReviews += 1;
        }

        const slug = allocate(person.name);
        claimedSlugs.add(slug);
        if (person.stableId) pendingBySlug.set(person.stableId, slug);
        else pendingByPerson.set(personKey(p.raw.sourceResultId, position), slug);

        toCreate.push({
          slug,
          name: person.name,
          nationality,
          gender: normaliseSex(p.raw.sex),
          sourceAthleteId: person.stableId,
          claimedByUserId: null,
          isDemo: false,
          isAnonymised: false,
          identityConfidence: confidence,
          needsIdentityReview: needsReview,
        });
      }
    }

    const created = await this.repo.upsertAthletes(toCreate);
    for (const a of created) {
      if (a.sourceAthleteId) known.set(a.sourceAthleteId, a);
      known.set(`slug:${a.slug}`, a);
    }

    /* 4 ── Build the rows. */

    const rows: UpsertResult[] = [];

    let unresolved = 0;

    for (const p of prepared) {
      const ids = p.people.map((person, position) => {
        if (person.stableId && known.has(person.stableId)) return known.get(person.stableId)!.id;

        const slug = person.stableId
          ? pendingBySlug.get(person.stableId)
          : pendingByPerson.get(personKey(p.raw.sourceResultId, position));
        if (slug && known.has(`slug:${slug}`)) return known.get(`slug:${slug}`)!.id;

        return known.get(`person:${personKey(p.raw.sourceResultId, position)}`)?.id;
      });

      // A row whose owner could not be resolved is not written — storing a
      // result pointing at nobody is worse than not storing it — but it is
      // counted, because silently dropping rows is how a division loses 59% of
      // itself and still reports success.
      if (!ids[0]) {
        unresolved += 1;
        continue;
      }

      rows.push({
        eventId: ctx.event.id,
        divisionId: ctx.division.id,
        athleteId: ids[0],
        sourceResultId: p.raw.sourceResultId,
        rankOverall: p.rankOverall,
        rankAgeGroup: parseRank(p.raw.rankAgeGroup),
        ageGroup: p.ageGroup,
        sex: normaliseSex(p.raw.sex),
        finishTimeMs: p.finishTimeMs,
        roxzoneTimeMs: p.roxzoneTimeMs ?? p.splits.roxzoneMs ?? null,
        status: p.status,
        wave: p.raw.wave ?? null,
        bib: p.raw.bib ?? null,
        splits: p.splits,
        partnerAthleteIds: ids.slice(1).filter(Boolean) as string[],
        isDemo: false,
      });
    }

    const shape = ctx.diagnostics
      ? checkParseShape(ctx.diagnostics, {
          sourceDivisionId: page.sourceDivisionId,
          via: page.via,
        })
      : { ok: true as const };

    if (unresolved > 0) {
      quarantined.push({
        sourceEventId: page.sourceEventId,
        sourceDivisionId: page.sourceDivisionId,
        sourceResultId: null,
        reason: "athlete_unresolved",
        detail: { rows: unresolved, of: prepared.length, stage: "resolve" },
        rawPayload: null,
        ingestionRunId: ctx.ingestionRunId ?? null,
        reprocessedAt: null,
      });
    }

    return { rows, quarantined, shape, athletesCreated: created.length, identityReviews };
  }

  /**
   * A slug nobody else is using — including anyone claimed earlier in this same
   * batch, which the database cannot tell us about because they are not written
   * yet.
   */
  private async uniqueSlug(name: string, claimed: Set<string> = new Set()): Promise<string> {
    const base = athleteSlug(name);
    if (!claimed.has(base) && !(await this.repo.getAthleteBySlug(base))) return base;
    for (let n = 2; n < 500; n += 1) {
      const candidate = `${base}-${n}`;
      if (claimed.has(candidate)) continue;
      if (!(await this.repo.getAthleteBySlug(candidate))) return candidate;
    }
    // 500 people with one name is not a real case; a suffix beats throwing.
    return `${base}-${Date.now().toString(36)}`;
  }
}

/** Raw split labels to ordered, millisecond segments. */
export function normaliseSplits(raw?: Record<string, string>): Splits {
  const runs: Splits["runs"] = [];
  const stations: Splits["stations"] = [];
  let roxzoneMs: number | undefined;

  for (const [label, value] of Object.entries(raw ?? {})) {
    const ms = parseTimeToMs(value);
    if (ms === null) continue;
    if (/^roxzone$/i.test(label)) {
      roxzoneMs = ms;
      continue;
    }
    if (/^run-\d+$/i.test(label)) {
      runs.push({ key: label.toLowerCase(), timeMs: ms });
      continue;
    }
    stations.push({ key: label, timeMs: ms });
  }

  runs.sort((a, b) => runNumber(a.key) - runNumber(b.key));
  return { runs, stations, roxzoneMs };
}

function runNumber(key: string): number {
  return Number(/(\d+)/.exec(key)?.[1] ?? 0);
}
