/**
 * Deterministic randomness for the demo data engine.
 *
 * Everything here is seeded and pure: the same seed always produces the same
 * dataset, on any machine, in any order. That matters because the generated
 * data is gitignored and regenerated on build — if it were not reproducible,
 * every build would reshuffle every ranking and every test fixture would rot.
 *
 * No dependency on `faker`: names come from bundled pools weighted by
 * nationality, which we need anyway to hit the brief's GBR-heavy mix.
 */

/** mulberry32 — small, fast, good enough distribution for synthetic race data. */
export function makeRng(seed: number) {
  let a = seed >>> 0;
  return function next(): number {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type Rng = ReturnType<typeof makeRng>;

/** Uniform float in [min, max). */
export function uniform(rng: Rng, min: number, max: number): number {
  return min + rng() * (max - min);
}

/** Integer in [min, max] inclusive. */
export function intBetween(rng: Rng, min: number, max: number): number {
  return Math.floor(uniform(rng, min, max + 1));
}

/**
 * Box–Muller normal. Race times are roughly normal with a right tail, so
 * callers that want the tail pass a skew (see `skewedNormal`).
 */
export function normal(rng: Rng, mean: number, sd: number): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = rng();
  while (v === 0) v = rng();
  return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/**
 * Finish times are not symmetric: the fast side is bounded by human limits,
 * the slow side is not. Positive `skew` stretches the slow tail only.
 */
export function skewedNormal(rng: Rng, mean: number, sd: number, skew: number): number {
  const base = normal(rng, mean, sd);
  return base > mean ? mean + (base - mean) * (1 + skew) : base;
}

export function pick<T>(rng: Rng, items: readonly T[]): T {
  return items[Math.floor(rng() * items.length)];
}

/** Pick by weight. Weights need not sum to 1. */
export function weightedPick<T>(rng: Rng, items: readonly (readonly [T, number])[]): T {
  const total = items.reduce((sum, [, w]) => sum + w, 0);
  let roll = rng() * total;
  for (const [item, weight] of items) {
    roll -= weight;
    if (roll <= 0) return item;
  }
  return items[items.length - 1][0];
}

/** Fisher–Yates, in place, seeded. */
export function shuffle<T>(rng: Rng, items: T[]): T[] {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}

/* ─── Synthetic names ─────────────────────────────────────────────
   Pools are ordinary given/family names, combined at random. No real
   athlete is represented; the two storyline Sutherlands are injected
   separately by the generator and flagged as placeholders. */

const GIVEN_MALE = [
  "James", "Oliver", "Harry", "Jack", "Charlie", "Thomas", "George", "Oscar",
  "William", "Noah", "Alfie", "Joshua", "Muhammad", "Henry", "Leo", "Archie",
  "Ethan", "Joseph", "Freddie", "Samuel", "Alexander", "Logan", "Daniel", "Isaac",
  "Max", "Mohammed", "Benjamin", "Mason", "Lucas", "Edward", "Harrison", "Jake",
  "Dylan", "Riley", "Finley", "Theo", "Sebastian", "Adam", "Zachary", "Arthur",
];

const GIVEN_FEMALE = [
  "Olivia", "Amelia", "Isla", "Ava", "Emily", "Sophia", "Grace", "Mia",
  "Poppy", "Ella", "Lily", "Freya", "Charlotte", "Evie", "Sophie", "Isabella",
  "Jessica", "Daisy", "Ruby", "Phoebe", "Florence", "Alice", "Chloe", "Rosie",
  "Sienna", "Matilda", "Eva", "Harper", "Maya", "Hannah", "Erin", "Niamh",
  "Aoife", "Saoirse", "Anya", "Zara", "Nadia", "Priya", "Mei", "Ines",
];

const FAMILY_GB = [
  "Smith", "Jones", "Taylor", "Brown", "Williams", "Wilson", "Johnson", "Davies",
  "Robinson", "Wright", "Thompson", "Evans", "Walker", "White", "Roberts", "Green",
  "Hall", "Wood", "Jackson", "Clarke", "Hughes", "Edwards", "Turner", "Harris",
  "Cooper", "Ward", "Baker", "Morgan", "King", "Watson", "Bennett", "Fletcher",
  "Whitfield", "Ashworth", "Blackwood", "Carlisle", "Denholm", "Ferrers", "Greaves", "Hollis",
];

const FAMILY_IE = ["Murphy", "Kelly", "O'Sullivan", "Byrne", "Ryan", "O'Connor", "Walsh", "Doyle"];
const FAMILY_DE = ["Muller", "Schmidt", "Weber", "Fischer", "Wagner", "Becker", "Hoffmann", "Richter"];
const FAMILY_IN = ["Sharma", "Patel", "Singh", "Reddy", "Iyer", "Nair", "Kulkarni", "Banerjee"];
const FAMILY_HK = ["Chan", "Wong", "Lee", "Cheung", "Lau", "Ng", "Ho", "Tsang"];
const FAMILY_SG = ["Tan", "Lim", "Goh", "Ong", "Teo", "Chua", "Yeo", "Koh"];
const FAMILY_US = ["Miller", "Davis", "Garcia", "Rodriguez", "Martinez", "Anderson", "Thomas", "Moore"];
const FAMILY_SE = ["Andersson", "Johansson", "Karlsson", "Nilsson", "Eriksson", "Larsson"];
const FAMILY_NL = ["de Jong", "Jansen", "de Vries", "van Dijk", "Bakker", "Visser"];
const FAMILY_ES = ["Garcia", "Fernandez", "Lopez", "Martin", "Sanchez", "Romero"];

const FAMILY_BY_NATION: Record<string, readonly string[]> = {
  gb: FAMILY_GB,
  ie: FAMILY_IE,
  de: FAMILY_DE,
  in: FAMILY_IN,
  hk: FAMILY_HK,
  sg: FAMILY_SG,
  us: FAMILY_US,
  se: FAMILY_SE,
  nl: FAMILY_NL,
  es: FAMILY_ES,
};

/**
 * Nationality mix per the brief: heavy on GBR, then IRL, GER, IND, HKG, SGP, USA.
 * Regional events re-weight this — a Mumbai race is mostly `in`.
 */
export const DEFAULT_NATION_WEIGHTS: readonly (readonly [string, number])[] = [
  ["gb", 52], ["ie", 8], ["de", 8], ["in", 6], ["hk", 5],
  ["sg", 4], ["us", 6], ["se", 4], ["nl", 4], ["es", 3],
];

export function makeName(rng: Rng, gender: "men" | "women", nation: string): string {
  const given = gender === "men" ? pick(rng, GIVEN_MALE) : pick(rng, GIVEN_FEMALE);
  const family = pick(rng, FAMILY_BY_NATION[nation] ?? FAMILY_GB);
  return `${given} ${family}`;
}

/** URL-safe slug. Collisions are resolved by the caller appending a counter. */
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/['']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
