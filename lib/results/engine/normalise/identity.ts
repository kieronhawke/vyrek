/**
 * Athlete identity resolution.
 *
 * Unified race history is the whole value of an athlete page: "here is every
 * HYROX you have ever run, and here is how you have improved". Getting it wrong
 * fails in two directions and they are not symmetrical:
 *
 * - **Fragmenting** one person into three profiles is a poor experience.
 * - **Merging** two people into one profile publishes a stranger's race times
 *   under someone's name. That is a data protection incident, not a bug.
 *
 * So the rule is asymmetric on purpose: merge only on a stable source id or on
 * overwhelming evidence, and when in doubt fragment and flag for review. A
 * human resolves the ambiguous ones; the system never guesses (brief §13).
 */

import type { EngineAthlete } from "../types";

export const AUTO_MERGE_THRESHOLD = 0.9;
export const REVIEW_THRESHOLD = 0.6;

export type IdentityCandidate = {
  name: string;
  nationality?: string | null;
  ageGroup?: string | null;
  sourceAthleteId?: string | null;
};

export type IdentityDecision =
  | { action: "match"; athleteId: string; confidence: number; signals: Record<string, unknown> }
  | { action: "review"; athleteId: string; confidence: number; signals: Record<string, unknown> }
  | { action: "create"; confidence: number; signals: Record<string, unknown> };

/**
 * How many numbered variants of a base slug the allocator may hand out.
 *
 * This is not a style choice \u2014 it is the size of the window
 * `findTakenSlugs` checks against the database, and the allocator must not
 * count past it. See the allocator in `normaliser.ts` for what happened when
 * the two disagreed.
 */
export const SLUG_WINDOW = 10;

/**
 * A short, stable suffix derived from a person's own identity.
 *
 * FNV-1a, not crypto: this needs to be deterministic and collision-resistant
 * enough to separate the eleventh James Kelly from the twelfth, and nothing
 * more. It runs once per new athlete on a board of thousands.
 */
export function fingerprint(identity: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < identity.length; i += 1) {
    hash ^= identity.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(36).padStart(7, "0");
}

/**
 * \u26a0\ufe0f `[^a-z0-9]` erased every name not written in the Latin alphabet.
 *
 * "\u4f73\u4e3d \u4e07" folded to the empty string, as did every Chinese, Japanese, Korean,
 * Cyrillic, Greek, Hebrew and Arabic name in the archive. They all then
 * competed for one shared base, exhausted the numbered window on the first
 * large board, and collapsed into each other \u2014 2,523 rows, one of them
 * carrying 212 results belonging to as many different people.
 *
 * Unicode letters and digits are kept instead, so "\u4f73\u4e3d \u4e07" slugs to "\u4f73\u4e3d-\u4e07".
 * A non-ASCII URL segment is percent-encoded by the browser and works fine;
 * a name that slugs to nothing does not.
 *
 * Existing athletes keep their stored slug \u2014 `upsertAthletes` resolves a known
 * source id back to it \u2014 so no live URL moves.
 */
export function athleteSlug(name: string, disambiguator?: string): string {
  const base = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-|-$/g, "")
    // NFD splits a Hangul syllable into its jamo, so "김" leaves as three
    // characters that render identically but never compare equal to the
    // composed form a URL or a later ingest would carry. Recompose.
    .normalize("NFC");
  return disambiguator ? `${base}-${disambiguator}` : base;
}

/**
 * Score a candidate against an existing athlete.
 *
 * Name equality alone is deliberately *not* enough. "James Smith" from GBR aged
 * 30-34 and "James Smith" from GBR aged 30-34 are, on the available evidence,
 * indistinguishable — and there are a lot of James Smiths. That case scores
 * into the review band rather than the merge band, by design.
 */
export type ExistingAthlete = EngineAthlete & {
  /** Age group lives on the result, not the athlete, so callers thread it in. */
  ageGroup?: string | null;
};

export function scoreMatch(
  candidate: IdentityCandidate,
  existing: ExistingAthlete,
): { confidence: number; signals: Record<string, unknown> } {
  const signals: Record<string, unknown> = {};

  if (candidate.sourceAthleteId && existing.sourceAthleteId) {
    const same = candidate.sourceAthleteId === existing.sourceAthleteId;
    signals.sourceAthleteId = same ? "exact" : "conflict";
    // A stable id from the timing provider is the only thing we trust outright,
    // and a conflicting one is positive evidence they are different people.
    return { confidence: same ? 1 : 0, signals };
  }

  const sameName =
    normaliseName(candidate.name) === normaliseName(existing.name);
  signals.name = sameName ? "exact" : "different";
  if (!sameName) return { confidence: 0, signals };

  let confidence = 0.6; // same name, nothing else known

  if (candidate.nationality && existing.nationality) {
    const same = candidate.nationality === existing.nationality;
    signals.nationality = same ? "match" : "conflict";
    if (same) confidence += 0.1;
    // Different nationality on the same name is real evidence of two people.
    else confidence -= 0.35;
  }

  if (candidate.ageGroup && existing.ageGroup) {
    const same = candidate.ageGroup === existing.ageGroup;
    signals.ageGroup = same ? "match" : "conflict";
    // Age groups legitimately roll over between seasons, so a mismatch is weak
    // evidence against and a match is weak evidence for.
    if (same) confidence += 0.1;
    else confidence -= 0.1;
  }

  return { confidence: clamp(confidence), signals };
}

export function decideIdentity(
  candidate: IdentityCandidate,
  existing: ExistingAthlete[],
): IdentityDecision {
  if (existing.length === 0) {
    return { action: "create", confidence: 1, signals: { reason: "no candidates" } };
  }

  const scored = existing
    .map((athlete) => ({ athlete, ...scoreMatch(candidate, athlete) }))
    .sort((a, b) => b.confidence - a.confidence);

  const best = scored[0];

  if (best.confidence >= AUTO_MERGE_THRESHOLD) {
    return {
      action: "match",
      athleteId: best.athlete.id,
      confidence: best.confidence,
      signals: best.signals,
    };
  }

  if (best.confidence >= REVIEW_THRESHOLD) {
    // Fragment now, flag for a human. Two profiles that might be one person is
    // recoverable; one profile that is definitely two people is not.
    return {
      action: "review",
      athleteId: best.athlete.id,
      confidence: best.confidence,
      signals: best.signals,
    };
  }

  return { action: "create", confidence: best.confidence, signals: best.signals };
}

function normaliseName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function clamp(value: number): number {
  return Math.max(0, Math.min(1, value));
}
