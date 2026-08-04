/**
 * One person, one profile — resolved at read time.
 *
 * ⚠️ The source has no stable athlete id across events. `JGDMS4JI10FBA2` and
 * `JGDMS4JI13526B` are the same Ben Sutherland at two different races, and a
 * doubles partner gets a fresh id for every entry. Stored faithfully, that is
 * exactly what we hold: one profile per race, each showing a single result.
 *
 * So searching a name returns five half-empty profiles instead of one career,
 * which defeats the point of having a results archive at all.
 *
 * This groups them back together **without touching the stored rows**. Nothing
 * is merged destructively, so a wrong grouping is a display bug rather than
 * data loss, and it corrects itself the moment the rule improves.
 *
 * ## The rule, and why it is drawn here
 *
 * Athletes group when their names match and their nationalities do not
 * contradict — an unknown nationality joins a known one, but two *different*
 * known nationalities never merge.
 *
 * This will occasionally join two real people who share a name and a country.
 * That is a deliberate trade: the alternative, which is what we had, splits
 * every real athlete's career across as many profiles as they have races. One
 * is a rare and correctable error; the other is wrong for everybody, always.
 * The claim flow exists to fix the rare case.
 */

import type { EngineAthlete } from "../types";

/**
 * Case, accent and punctuation folded; "Ben O'Neill" and "ben oneill" match.
 *
 * ⚠️ Apostrophes are removed, not turned into spaces. Folding them to a space
 * gives "o neill", which does not match the "oneill" the same person is filed
 * under at another event — so the two halves of an Irish or Scottish surname
 * would never group. Hyphens and spaces still fold to a single space, because
 * "Marie-Claire" and "Marie Claire" are the same person written two ways.
 */
export function personKey(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['\u2019\u02bc`]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * Which of these athletes are the same person as `target`.
 *
 * Always includes `target` itself, so a caller can use the result
 * unconditionally.
 */
export function samePerson(target: EngineAthlete, candidates: EngineAthlete[]): EngineAthlete[] {
  const key = personKey(target.name);
  const nationality = (target.nationality ?? "").trim().toUpperCase();

  return candidates.filter((c) => {
    if (c.id === target.id) return true;
    if (c.isAnonymised) return false;
    if (personKey(c.name) !== key) return false;

    // An unknown nationality is not evidence of a different person; two known
    // and different ones are.
    const theirs = (c.nationality ?? "").trim().toUpperCase();
    if (!nationality || !theirs) return true;
    return nationality === theirs;
  });
}

/**
 * Collapse a search result set to one entry per person.
 *
 * Keeps the profile with the most races as the one to link to — it is the most
 * likely to already look like a career — and sums the rest into its count.
 */
export function dedupePeople<T extends { name: string; countryIso: string; raceCount: number }>(
  people: T[],
): T[] {
  const groups = new Map<string, T[]>();
  for (const p of people) {
    // Nationality is part of the key only when known, so an unknown one folds
    // into the known group rather than forming a second entry.
    const key = `${personKey(p.name)}|${(p.countryIso ?? "").trim().toUpperCase()}`;
    groups.set(key, [...(groups.get(key) ?? []), p]);
  }

  // Fold unknown-nationality groups into a known one for the same name.
  const byName = new Map<string, T[]>();
  for (const [key, members] of groups) {
    const name = key.split("|")[0];
    byName.set(name, [...(byName.get(name) ?? []), ...members]);
  }

  const out: T[] = [];
  for (const members of byName.values()) {
    const nationalities = new Set(
      members.map((m) => (m.countryIso ?? "").trim().toUpperCase()).filter(Boolean),
    );
    // Two different known nationalities: genuinely ambiguous, keep them apart.
    if (nationalities.size > 1) {
      for (const [, sub] of groupBy(members, (m) => (m.countryIso ?? "").toUpperCase())) {
        out.push(collapse(sub));
      }
      continue;
    }
    out.push(collapse(members));
  }
  return out.sort((a, b) => b.raceCount - a.raceCount);
}

function collapse<T extends { raceCount: number }>(members: T[]): T {
  const best = [...members].sort((a, b) => b.raceCount - a.raceCount)[0];
  const total = members.reduce((sum, m) => sum + m.raceCount, 0);
  return { ...best, raceCount: total };
}

function groupBy<T>(items: T[], key: (item: T) => string): Map<string, T[]> {
  const out = new Map<string, T[]>();
  for (const item of items) {
    const k = key(item);
    out.set(k, [...(out.get(k) ?? []), item]);
  }
  return out;
}
