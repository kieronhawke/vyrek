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
import type { UpsertResult } from "../repository";
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

  async normaliseDivision(
    page: RawDivisionPage,
    ctx: NormaliseContext,
  ): Promise<NormaliseOutcome> {
    const rows: UpsertResult[] = [];
    const quarantined: NormaliseOutcome["quarantined"] = [];
    let athletesCreated = 0;
    let identityReviews = 0;

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

      const resolved = await this.resolveAthlete(raw, ageGroup);
      athletesCreated += resolved.created ? 1 : 0;
      identityReviews += resolved.review ? 1 : 0;

      // Doubles and relay: the row is a team. The first named athlete owns the
      // row; the rest are partners, resolved to their own profiles so their
      // race history is complete too.
      const partnerIds: string[] = [];
      if (raw.partnerNames && raw.partnerNames.length > 1) {
        for (const partner of raw.partnerNames.slice(1)) {
          const partnerResolved = await this.resolveAthlete(
            { ...raw, name: partner, sourceAthleteId: undefined },
            ageGroup,
          );
          partnerIds.push(partnerResolved.athleteId);
          athletesCreated += partnerResolved.created ? 1 : 0;
        }
      }

      rows.push({
        eventId: ctx.event.id,
        divisionId: ctx.division.id,
        athleteId: resolved.athleteId,
        sourceResultId: raw.sourceResultId,
        rankOverall,
        rankAgeGroup: parseRank(raw.rankAgeGroup),
        ageGroup,
        sex: normaliseSex(raw.sex),
        finishTimeMs,
        roxzoneTimeMs: roxzoneTimeMs ?? splits.roxzoneMs ?? null,
        status,
        wave: raw.wave ?? null,
        bib: raw.bib ?? null,
        splits,
        partnerAthleteIds: partnerIds,
        isDemo: false,
      });
    }

    const shape = ctx.diagnostics
      ? checkParseShape(ctx.diagnostics, {
          sourceDivisionId: page.sourceDivisionId,
          via: page.via,
        })
      : { ok: true as const };

    return { rows, quarantined, shape, athletesCreated, identityReviews };
  }

  /**
   * Find or create the athlete this row belongs to.
   *
   * Never merges below the confidence threshold: an uncertain match creates a
   * second profile and files a review, so a human decides whether two James
   * Smiths are one person.
   */
  private async resolveAthlete(
    raw: RawResultRow,
    ageGroup: string | null,
  ): Promise<{ athleteId: string; created: boolean; review: boolean }> {
    const name = (raw.partnerNames?.[0] ?? raw.name).trim();
    const nationality = normaliseNationality(raw.nationality);

    if (raw.sourceAthleteId) {
      const existing = await this.repo.getAthleteBySourceId(raw.sourceAthleteId);
      if (existing) return { athleteId: existing.id, created: false, review: false };
    }

    const candidates = (await this.repo.findAthletesByName(name)) as ExistingAthlete[];
    const decision = decideIdentity(
      { name, nationality, ageGroup, sourceAthleteId: raw.sourceAthleteId ?? null },
      candidates,
    );

    if (decision.action === "match") {
      return { athleteId: decision.athleteId, created: false, review: false };
    }

    // Both "create" and "review" create a profile. The difference is that a
    // review also files the pair for a human to look at.
    const slug = await this.uniqueSlug(name);
    const athlete = await this.repo.upsertAthlete({
      slug,
      name,
      nationality,
      gender: normaliseSex(raw.sex),
      sourceAthleteId: raw.sourceAthleteId ?? null,
      claimedByUserId: null,
      isDemo: false,
      isAnonymised: false,
      identityConfidence: decision.confidence,
      needsIdentityReview: decision.action === "review",
    });

    if (decision.action === "review") {
      await this.repo.recordMergeReview({
        athleteId: athlete.id,
        candidateAthleteId: decision.athleteId,
        confidence: decision.confidence,
        signals: decision.signals,
        resolution: null,
        resolvedAt: null,
      });
    }

    return { athleteId: athlete.id, created: true, review: decision.action === "review" };
  }

  private async uniqueSlug(name: string): Promise<string> {
    const base = athleteSlug(name);
    if (!(await this.repo.getAthleteBySlug(base))) return base;
    for (let n = 2; n < 500; n += 1) {
      const candidate = `${base}-${n}`;
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
