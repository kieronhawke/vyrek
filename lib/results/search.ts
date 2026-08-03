/**
 * Search relevance.
 *
 * The reference site does substring matching: type "zach" and you get every
 * name containing it, in whatever order the database returned. That is fine
 * with ten athletes and useless with four thousand.
 *
 * This module does three things instead:
 *
 * 1. **Ranks by how you matched, not just whether you did.** An exact name
 *    beats a name that starts with your query, which beats a middle-of-word
 *    match, which beats a fuzzy one. Ties break on race count, because the
 *    athlete with 13 races is more likely to be the one you meant.
 * 2. **Tolerates typos and diacritics.** "johanson" finds Johansson,
 *    "malaga" finds Málaga. People type names they have heard, not read.
 * 3. **Understands what you typed.** "london 2026", "sub 90", "1:31:30" and
 *    "men" are all meaningful in this domain and none of them are a name.
 *
 * Pure functions, no I/O, so all of it is unit-tested.
 */

/** Strips accents and lowercases, so "Málaga" and "malaga" are the same word. */
export function normalise(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/['']/g, "")
    .trim();
}

/**
 * Damerau-Levenshtein distance, capped.
 *
 * Capped because we only care whether something is *close*, and bailing early
 * keeps this cheap enough to run across thousands of names per keystroke.
 */
export function editDistance(a: string, b: string, max = 2): number {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > max) return max + 1;

  let previous = Array.from({ length: b.length + 1 }, (_, i) => i);
  let beforePrevious: number[] = [];

  for (let i = 1; i <= a.length; i++) {
    const current = [i];
    let rowMin = i;

    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let value = Math.min(
        current[j - 1] + 1,
        previous[j] + 1,
        previous[j - 1] + cost,
      );
      // Transposition: "teh" -> "the" is one mistake, not two.
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        value = Math.min(value, beforePrevious[j - 2] + 1);
      }
      current.push(value);
      rowMin = Math.min(rowMin, value);
    }

    if (rowMin > max) return max + 1;
    beforePrevious = previous;
    previous = current;
  }

  return previous[b.length];
}

/* ─── Scoring ─────────────────────────────────────────────────────── */

export const MATCH = {
  exact: 1000,
  prefix: 800,
  wordPrefix: 600,
  initials: 500,
  contains: 300,
  fuzzy: 150,
  none: 0,
} as const;

export type MatchKind = keyof typeof MATCH;

/**
 * How well `candidate` matches `query`. Higher is better, 0 means no match.
 *
 * Typo tolerance only kicks in from four characters: at three or fewer, an
 * edit distance of two matches almost anything and the results become noise.
 */
export function scoreMatch(candidate: string, query: string): { score: number; kind: MatchKind } {
  const text = normalise(candidate);
  const needle = normalise(query);
  if (!needle) return { score: 0, kind: "none" };

  if (text === needle) return { score: MATCH.exact, kind: "exact" };
  if (text.startsWith(needle)) return { score: MATCH.prefix, kind: "prefix" };

  const words = text.split(/\s+/);
  if (words.some((w) => w.startsWith(needle))) {
    return { score: MATCH.wordPrefix, kind: "wordPrefix" };
  }

  // "cj" should find "Charlie Johansson".
  if (needle.length >= 2 && words.length >= 2) {
    const initials = words.map((w) => w[0]).join("");
    if (initials.startsWith(needle)) return { score: MATCH.initials, kind: "initials" };
  }

  if (text.includes(needle)) return { score: MATCH.contains, kind: "contains" };

  if (needle.length >= 4) {
    // Compare against whole words: "johanson" should reach "johansson"
    // without being dragged off by the rest of the name.
    const tolerance = needle.length >= 7 ? 2 : 1;
    for (const word of words) {
      if (editDistance(word, needle, tolerance) <= tolerance) {
        return { score: MATCH.fuzzy, kind: "fuzzy" };
      }
    }
  }

  return { score: 0, kind: "none" };
}

/** Multi-word queries: every term must match something. "zach patel" → both. */
export function scoreMultiTerm(candidate: string, query: string): { score: number; kind: MatchKind } {
  const terms = normalise(query).split(/\s+/).filter(Boolean);
  if (terms.length <= 1) return scoreMatch(candidate, query);

  // Try the whole phrase first — an exact full-name match should outrank the
  // sum of its parts.
  const whole = scoreMatch(candidate, query);
  if (whole.score >= MATCH.wordPrefix) return whole;

  let total = 0;
  let weakest: MatchKind = "exact";
  for (const term of terms) {
    const result = scoreMatch(candidate, term);
    if (result.score === 0) return { score: 0, kind: "none" };
    total += result.score;
    if (MATCH[result.kind] < MATCH[weakest]) weakest = result.kind;
  }
  return { score: Math.round(total / terms.length), kind: weakest };
}

/* ─── Query intent ────────────────────────────────────────────────── */

export type QueryIntent =
  | { type: "time"; seconds: number }
  | { type: "goal"; seconds: number; label: string }
  | { type: "year"; year: number }
  | { type: "text" };

const GOAL = /^sub[-\s]?(\d{2,3})$/i;
const TIME = /^(\d{1,2}):([0-5]\d)(?::([0-5]\d))?$/;

/**
 * Reads meaning out of the query where there is some.
 *
 * A results site gets a lot of searches that are not names: people type their
 * time to see where it places them, or "sub 90" because that is how the goal
 * is spoken. Recognising those turns a dead end into the right tool.
 */
export function detectIntent(query: string): QueryIntent {
  const text = query.trim();

  const goal = GOAL.exec(text);
  if (goal) {
    const minutes = Number(goal[1]);
    if (minutes >= 30 && minutes <= 180) {
      return { type: "goal", seconds: minutes * 60, label: `Sub ${minutes}` };
    }
  }

  const time = TIME.exec(text);
  if (time) {
    const a = Number(time[1]);
    const b = Number(time[2]);
    const c = time[3] ? Number(time[3]) : null;
    // "1:31:30" is h:mm:ss; "91:30" is mm:ss.
    const seconds = c === null ? a * 60 + b : a * 3600 + b * 60 + c;
    if (seconds >= 20 * 60 && seconds <= 5 * 3600) return { type: "time", seconds };
  }

  const year = /^(20\d{2})$/.exec(text);
  if (year) return { type: "year", year: Number(year[1]) };

  return { type: "text" };
}

/* ─── Ranking ─────────────────────────────────────────────────────── */

export type Rankable = { text: string; weight?: number };

/**
 * Sort by match quality, then by weight.
 *
 * Weight is race count for athletes and recency for events — the tie-break
 * that makes the first result usually the right one.
 */
export function rankBy<T extends Rankable>(items: T[], query: string, limit = 12): T[] {
  const scored: { item: T; score: number }[] = [];

  for (const item of items) {
    const { score } = scoreMultiTerm(item.text, query);
    if (score > 0) scored.push({ item, score: score + Math.min(item.weight ?? 0, 60) });
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((s) => s.item);
}
