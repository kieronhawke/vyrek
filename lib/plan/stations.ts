/**
 * WHAT KIND OF WORK IS THIS LINE?
 *
 * "20 mins ski", "8x1km off 90", "15 wall balls @ 9kg" are three different
 * things, and on paper they currently look identical — a wall of grey text a
 * reader has to parse word by word at six in the morning. Classifying each
 * line lets the export give it an icon and a colour, so the shape of a session
 * is visible before it is read.
 *
 * KEYWORDS, NOT A MODEL. Ben writes in a consistent shorthand lifted straight
 * from his spreadsheets, and the eight HYROX stations have fixed names. A
 * keyword table is right for that, gets it right on his actual sheets, and —
 * unlike anything cleverer — is inspectable when it gets one wrong.
 *
 * NOTHING IS EVER DROPPED. An unrecognised line classifies as "other" and is
 * rendered in full. A plan export that quietly loses a line Ben wrote is worse
 * than one with no icons at all.
 */

export type StationKey =
  | "run"
  | "ski"
  | "row"
  | "bike"
  | "sled-push"
  | "sled-pull"
  | "burpee"
  | "farmers"
  | "lunges"
  | "wall-balls"
  | "strength"
  | "core"
  | "warmup"
  | "cooldown"
  | "rest"
  | "other";

export type StationMeta = {
  key: StationKey;
  label: string;
  /** A CSS colour token, used for the spine on each line. */
  tone: "accent" | "run" | "erg" | "strength" | "rest" | "neutral";
};

const TABLE: { key: StationKey; label: string; tone: StationMeta["tone"]; match: RegExp }[] = [
  // ORDER IS THE ALGORITHM: the first match wins.
  //
  // Rest, warm-up and cool-down come first because they describe what a line
  // *is*, and they routinely contain the words of the work inside them —
  // "Warm-up: 10 mins easy" classified as a run until they were moved here.
  { key: "rest", label: "Rest", tone: "rest", match: /^\s*rest\b|\bday off\b|\brest day\b/i },
  { key: "warmup", label: "Warm-up", tone: "neutral", match: /warm[- ]?up|\bmobility\b|\bactivation\b/i },
  { key: "cooldown", label: "Cool-down", tone: "neutral", match: /cool[- ]?down|\bstretch|\bflush\b/i },

  // Then the specific before the general: "sled pull" must beat "sled", and
  // "burpee broad jump" must not be caught by anything matching "broad".
  { key: "sled-pull", label: "Sled pull", tone: "strength", match: /\bsled\s*pull|\bpull\s*sled/i },
  // "50m push @ 205kg" inside a Hyrox EMOM is a sled, and Ben writes it that
  // way. Anchored to a distance so it cannot swallow a press-up.
  { key: "sled-push", label: "Sled push", tone: "strength", match: /\bsled\s*push|\bpush\s*sled|\bsled\b|\d+\s*m\s+push\b/i },
  { key: "burpee", label: "Burpee broad jump", tone: "accent", match: /\bburpee/i },
  { key: "farmers", label: "Farmers carry", tone: "strength", match: /farmer|\bcarry\b/i },
  { key: "lunges", label: "Sandbag lunges", tone: "strength", match: /lunge|sandbag/i },
  { key: "wall-balls", label: "Wall balls", tone: "accent", match: /wall\s*ball|\bwb\b/i },
  { key: "ski", label: "Ski erg", tone: "erg", match: /\bski\b|skierg/i },
  { key: "row", label: "Row", tone: "erg", match: /\brow(ing)?\b|rower/i },
  { key: "bike", label: "Bike", tone: "erg", match: /\bbike\b|assault|echo|watt\s*bike/i },

  // `km` deliberately has no leading word boundary: Ben writes "8x1km", where
  // the digit and the k are both word characters, so \bkm never matches.
  {
    key: "run",
    label: "Run",
    tone: "run",
    match: /\brun\b|km\b|\bmile|\bstrides?\b|\bjog\b|\btempo\b|\bprogression\b|\beasy\b/i,
  },
  { key: "core", label: "Core", tone: "neutral", match: /\bcore\b|\bplank|\bab[s]?\b|hollow|sit[- ]?up/i },
  {
    key: "strength",
    label: "Strength",
    tone: "strength",
    match: /\bsquat|\bdeadlift|\bpress\b|\bbench\b|\bclean\b|\bsnatch\b|\bkg\b|\brdl\b|\bpull[- ]?up|\bhinge\b|\bthruster/i,
  },
];

export const STATION_META: Record<StationKey, StationMeta> = {
  ...Object.fromEntries(
    TABLE.map((t) => [t.key, { key: t.key, label: t.label, tone: t.tone }]),
  ),
  other: { key: "other", label: "Work", tone: "neutral" },
} as Record<StationKey, StationMeta>;

/** The kind of work a single line describes. */
export function classifyLine(text: string): StationKey {
  const t = text.trim();
  if (!t) return "other";
  for (const row of TABLE) {
    if (row.match.test(t)) return row.key;
  }
  return "other";
}

/**
 * The one station that best describes a whole session, for a day heading.
 *
 * The most frequent classified kind wins, ignoring warm-ups, cool-downs and
 * unclassified lines — a session is not "a warm-up" because it starts with
 * one. Ties go to whichever appeared first, which is the order Ben wrote it
 * and therefore the order he thinks of it in.
 */
export function sessionStation(text: string): StationKey {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (!lines.length) return "other";

  const counts = new Map<StationKey, number>();
  const firstSeen = new Map<StationKey, number>();
  lines.forEach((line, i) => {
    const key = classifyLine(line);
    if (key === "warmup" || key === "cooldown" || key === "other") return;
    counts.set(key, (counts.get(key) ?? 0) + 1);
    if (!firstSeen.has(key)) firstSeen.set(key, i);
  });

  if (!counts.size) return classifyLine(lines[0]);

  let best: StationKey = "other";
  let bestN = -1;
  for (const [key, n] of counts) {
    const better =
      n > bestN || (n === bestN && (firstSeen.get(key) ?? 0) < (firstSeen.get(best) ?? 0));
    if (better) {
      best = key;
      bestN = n;
    }
  }
  return best;
}

/**
 * How hard a session looks, 1–3, from the words rather than a guess at load.
 *
 * Used only to tint a day card so a week's shape is visible at a glance. It is
 * deliberately coarse: pretending to know that a session is 7.5/10 hard from
 * its text would be inventing a number, which HARD-RULES §1 forbids.
 */
export function intensityOf(text: string): 1 | 2 | 3 {
  const t = text.toLowerCase();
  if (!t.trim() || /^rest\b/.test(t.trim())) return 1;
  if (/\brace\s*pace|\bmax\b|\bthreshold\b|\bemom\b|\bamrap\b|\bintervals?\b|\bsprint/.test(t)) {
    return 3;
  }
  if (/\beasy\b|\bzone\s*2\b|\bsteady\b|\brecovery\b|\bflush\b|\bmobility\b/.test(t)) return 1;
  return 2;
}
