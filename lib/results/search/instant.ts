/**
 * Matching the prefetched name list, in the browser, between keystrokes.
 *
 * The rule this exists to satisfy: typing "ben" must put Ben Sutherland at the
 * top, not the 1,100th Ben in the archive, and it must happen before the next
 * character is typed. That rules out asking the server — a round trip is 200ms
 * on a good connection and the gap between keystrokes is about 150ms, so every
 * result a fast typist sees is answering a question they have already finished
 * asking.
 *
 * So the ranking has to be decided here, on a list already in memory.
 */

/** `[name, slug, nationality, races]` — see the popular-athletes route. */
export type PopularAthlete = readonly [string, string, string, number];

export type InstantMatch = {
  slug: string;
  name: string;
  countryIso: string;
  raceCount: number;
};

/**
 * Case, accent and punctuation folded, so "o'neill" matches "O'Neill" and
 * "jose" matches "José".
 *
 * Deliberately the same folding as `personKey` in the identity grouper: a name
 * that groups together in the database must match together here, or the list
 * shows two Ben Sutherlands the moment one of them is typed.
 */
export function fold(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/['’ʼ`]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * How well one typed term matches one word of a name.
 *
 * Completing a word is worth more than starting one, and starting one is worth
 * more than appearing inside it. This is the distinction that decides "ben"
 * → Ben Haldon before Benjamin Steker: "ben" *is* Haldon's name and merely
 * begins Steker's, even though Steker has raced more.
 */
function termQuality(word: string, term: string): number {
  if (word === term) return 3;
  if (word.startsWith(term)) return 2;
  if (word.includes(term)) return 1;
  return 0;
}

/**
 * How well a name answers what has been typed. Higher is better; 0 is no match.
 *
 * Every typed term has to land on some word of the name, in any order — so
 * "sut ben" finds Ben Sutherland just as "ben sut" does. On top of that:
 *
 *   +typing it straight through   "ben suth" → "Ben Sutherland"
 *   +landing on a surname         "sutherland", a deliberate thing to type,
 *                                 beats "ben", which narrows nothing
 *   +the name entire              an exact match wins outright
 *
 * A query that misses a word entirely falls back to a plain substring over the
 * whole name, which is what catches "utherl" from someone unsure of a spelling.
 */
export function score(foldedName: string, foldedQuery: string): number {
  if (!foldedQuery) return 0;

  const words = foldedName.split(" ");
  const terms = foldedQuery.split(" ");

  let quality = 0;
  for (const term of terms) {
    const best = Math.max(...words.map((word) => termQuality(word, term)));
    // One term with nowhere to land means this is not the name being typed.
    if (best === 0) return foldedName.includes(foldedQuery) ? 500 : 0;
    quality += best;
  }

  let total = 600 + quality * 10;
  if (foldedName.startsWith(foldedQuery)) total += 200;
  // Matched something other than the forename.
  if (terms.some((term) => words.slice(1).some((word) => termQuality(word, term) > 0))) {
    total += 100;
  }
  if (foldedName === foldedQuery) total += 300;
  return total;
}

/**
 * The instant suggestions for a query, best first.
 *
 * ⚠️ Ties break on race count, then on the *shorter* name. Without the length
 * rule, "ben" offers Benjamin Amsallem before Ben Haldon simply because one has
 * raced more — but a person typing three letters is far more likely to want the
 * name that is three letters long than one that merely contains them.
 */
export function instantSearch(
  index: readonly PopularAthlete[],
  query: string,
  limit = 8,
): InstantMatch[] {
  const q = fold(query);
  if (q.length < 2) return [];

  const hits: Array<{ athlete: PopularAthlete; rank: number }> = [];
  for (const athlete of index) {
    const rank = score(fold(athlete[0]), q);
    if (rank > 0) hits.push({ athlete, rank });
  }

  hits.sort((a, b) => {
    if (b.rank !== a.rank) return b.rank - a.rank;
    if (b.athlete[3] !== a.athlete[3]) return b.athlete[3] - a.athlete[3];
    if (a.athlete[0].length !== b.athlete[0].length) {
      return a.athlete[0].length - b.athlete[0].length;
    }
    return a.athlete[0].localeCompare(b.athlete[0]);
  });

  return hits.slice(0, limit).map(({ athlete: [name, slug, countryIso, raceCount] }) => ({
    slug,
    name,
    countryIso,
    raceCount,
  }));
}

/**
 * Fold the two result sets into one list without showing anybody twice.
 *
 * The instant matches arrive first and the server's answer lands a moment
 * later, usually containing the same people plus the long tail. Replacing the
 * list wholesale makes the suggestions flicker and, worse, moves the row under
 * a finger already on its way to tapping it — so the instant hits keep their
 * positions and the server only ever appends.
 */
export function mergeResults(
  instant: InstantMatch[],
  fromServer: InstantMatch[],
  limit = 8,
): InstantMatch[] {
  const seen = new Set(instant.map((a) => fold(a.name)));
  const merged = [...instant];
  for (const athlete of fromServer) {
    const key = fold(athlete.name);
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(athlete);
  }
  return merged.slice(0, limit);
}
