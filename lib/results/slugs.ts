/**
 * Ranking slugs are `{eventSlug}-{divisionCode}`, e.g.
 * `s9-2026-london-hyrox-men`. Both halves contain hyphens, so the split
 * cannot be done positionally — it has to be resolved against the known
 * division codes.
 */

import { DIVISION_PROFILES } from "./model";
import type { DivisionCode } from "./types";

const CODES: DivisionCode[] = DIVISION_PROFILES.map((p) => p.code);
// Longest first: `hyrox-pro-doubles-men` must win over `hyrox-doubles-men`
// when both are suffixes of the same slug.
const CODES_BY_LENGTH = [...CODES].sort((a, b) => b.length - a.length);

export function parseRankingSlug(
  slug: string,
): { eventSlug: string; division: DivisionCode } | null {
  for (const code of CODES_BY_LENGTH) {
    const suffix = `-${code}`;
    if (slug.endsWith(suffix)) {
      const eventSlug = slug.slice(0, -suffix.length);
      if (eventSlug.length > 0) return { eventSlug, division: code };
    }
  }
  return null;
}

export function buildRankingSlug(eventSlug: string, division: string): string {
  return `${eventSlug}-${division}`;
}
