/**
 * OPEN FOOD FACTS — the food database behind search and the barcode scanner.
 *
 * WHY THIS ONE
 * ------------
 * The app shipped with forty-three foods hardcoded in `food.ts`. That is a
 * good starter list and a hopeless search index: type "Weetabix", "Huel",
 * "Greggs", or the name of anything with a barcode on it and you got nothing,
 * which is exactly the "it doesn't find anything" problem.
 *
 * Open Food Facts is the only option that is simultaneously free, open, needs
 * no account or key, and carries barcodes — MyFitnessPal's and Nutritionix's
 * APIs are partner-only, and a paid key is a decision for Kieron rather than
 * something to quietly wire in. OFF has strong UK coverage because Tesco,
 * Sainsbury's and Waitrose ranges are heavily contributed.
 *
 * WHAT IT IS NOT
 * --------------
 * Crowd-sourced, so it is uneven. Plenty of products have a name, a brand and
 * a photo but no nutrition at all, and a few have obvious nonsense in them.
 * Both are handled here rather than in the UI:
 *
 *   - A product with no per-100g energy is **dropped from search**. A row that
 *     logs zero calories is worse than a row that is not there, because the
 *     athlete does not notice they logged nothing.
 *   - Absurd values are rejected outright (see `plausible`). 9,000 kcal per
 *     100 g is a data-entry error in the source, and passing it through would
 *     put it in somebody's daily total.
 *
 * NOTHING IS INVENTED. Where OFF has no figure for a macro we send zero for
 * that macro only if energy is present, because "0 g fibre" is a real and
 * common answer; where energy itself is missing the product does not appear.
 */

import type { Food, Macros, Portion } from "@/lib/member/food";

/**
 * OFF asks every client to identify itself, and rate-limits anonymous
 * hammering. This is the contact address on the account.
 */
const UA = "SuthPerformance/1.0 (https://suthperformance.com)";

const SEARCH_URL = "https://world.openfoodfacts.org/cgi/search.pl";
const PRODUCT_URL = "https://world.openfoodfacts.org/api/v2/product";

/** The fields worth asking for. Requesting all of them is a much bigger page. */
const FIELDS = [
  "code",
  "product_name",
  "brands",
  "quantity",
  "serving_size",
  "serving_quantity",
  "nutriments",
  "countries_tags",
].join(",");

type OffNutriments = Record<string, number | string | undefined>;

type OffProduct = {
  code?: string;
  product_name?: string;
  brands?: string;
  quantity?: string;
  serving_size?: string;
  serving_quantity?: number | string;
  nutriments?: OffNutriments;
  countries_tags?: string[];
};

function num(v: unknown): number | null {
  const n = typeof v === "string" ? Number(v) : typeof v === "number" ? v : NaN;
  return Number.isFinite(n) ? n : null;
}

/**
 * Is this figure physically possible per 100 g?
 *
 * Fat is the densest macro at 9 kcal/g, so 100 g of pure fat is 900 kcal and
 * nothing edible exceeds it. Anything above that is a contributor's typo —
 * usually per-portion figures pasted into the per-100g field — and letting it
 * through would put 9,000 kcal into somebody's day.
 */
export function plausible(macros: Macros): boolean {
  if (macros.kcal <= 0 || macros.kcal > 900) return false;
  for (const key of ["protein", "carbs", "fat", "fibre"] as const) {
    const v = macros[key];
    if (v < 0 || v > 100) return false;
  }
  return true;
}

/** OFF's nutriment block onto ours. Null when there is no energy figure. */
export function macrosFrom(n: OffNutriments | undefined): Macros | null {
  if (!n) return null;
  // OFF gives kcal directly on most products and kJ on some.
  const kcal =
    num(n["energy-kcal_100g"]) ??
    (num(n["energy_100g"]) !== null ? Math.round(num(n["energy_100g"])! / 4.184) : null);
  if (kcal === null) return null;

  const macros: Macros = {
    kcal: Math.round(kcal),
    protein: round1(num(n["proteins_100g"]) ?? 0),
    carbs: round1(num(n["carbohydrates_100g"]) ?? 0),
    fat: round1(num(n["fat_100g"]) ?? 0),
    fibre: round1(num(n["fiber_100g"]) ?? 0),
  };
  return plausible(macros) ? macros : null;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/**
 * The portions to offer for a packaged product.
 *
 * Always 100 g, because that is the honest unit the figures are stored in.
 * A serving is added when OFF knows one, and the pack itself when the size
 * parses — "1 pack" is how somebody actually eats a 45 g cereal bar, and
 * making them work out that it is 45 g is the app failing to do its job.
 */
export function portionsFor(p: OffProduct): Portion[] {
  const out: Portion[] = [];

  const serving = num(p.serving_quantity);
  if (serving && serving > 0 && serving <= 2000) {
    const label = p.serving_size?.trim()
      ? `1 serving (${p.serving_size.trim()})`
      : "1 serving";
    out.push({ label, grams: Math.round(serving) });
  }

  const pack = parseQuantity(p.quantity);
  if (pack && pack > 0 && pack <= 5000 && pack !== serving) {
    out.push({ label: `1 pack (${p.quantity!.trim()})`, grams: Math.round(pack) });
  }

  out.push({ label: "100 g", grams: 100 });
  return out;
}

/** "45 g", "330ml", "1 kg" → grams. Millilitres are treated as grams. */
export function parseQuantity(raw: string | undefined): number | null {
  if (!raw) return null;
  const m = raw.trim().toLowerCase().match(/([\d.,]+)\s*(kg|g|l|ml|cl)\b/);
  if (!m) return null;
  const value = Number(m[1].replace(",", "."));
  if (!Number.isFinite(value)) return null;
  switch (m[2]) {
    case "kg":
      return value * 1000;
    case "l":
      return value * 1000;
    case "cl":
      return value * 10;
    default:
      return value;
  }
}

/** OFF's product onto ours. Null when it cannot be logged honestly. */
export function toFood(p: OffProduct): Food | null {
  const name = p.product_name?.trim();
  const code = p.code?.trim();
  if (!name || !code) return null;

  const per100 = macrosFrom(p.nutriments);
  /* No energy figure means no honest log entry. Showing the row anyway and
     recording zero calories is the worst outcome: the athlete believes they
     logged their lunch. */
  if (!per100) return null;

  const brand = p.brands?.split(",")[0]?.trim();

  return {
    id: `off:${code}`,
    name,
    detail: brand || undefined,
    per100,
    portions: portionsFor(p),
  };
}

export type SearchOptions = {
  /** Injected in tests. Defaults to global fetch. */
  fetcher?: typeof fetch;
  limit?: number;
  signal?: AbortSignal;
};

export type OffSearch = {
  foods: Food[];
  /**
   * Whether the service actually answered.
   *
   * This is not cosmetic. Open Food Facts rate-limits, and the first version
   * of this returned a bare [] either way — so a rate-limited search told the
   * athlete "no such food" when the truth was "we could not reach the
   * database". Those are different sentences and only one of them is true.
   */
  ok: boolean;
};

/**
 * Search the database.
 *
 * Never throws. A food search that explodes takes the logging sheet down with
 * it, and the curated list is still there behind it — degrading to "fewer
 * results" always beats degrading to "the page is broken". The caller is told
 * which happened via `ok`.
 */
export async function searchOff(
  query: string,
  { fetcher = fetch, limit = 20, signal }: SearchOptions = {},
): Promise<OffSearch> {
  const q = query.trim();
  if (q.length < 2) return { foods: [], ok: true };

  const url = new URL(SEARCH_URL);
  url.searchParams.set("search_terms", q);
  url.searchParams.set("search_simple", "1");
  url.searchParams.set("action", "process");
  url.searchParams.set("json", "1");
  url.searchParams.set("page_size", String(Math.min(limit * 2, 50)));
  url.searchParams.set("fields", FIELDS);
  /* UK first. The global index is dominated by French and US products, and an
     athlete in Leeds searching "hummus" should not have to scroll past nine
     Carrefour own-brands to find the one on their shelf. */
  url.searchParams.set("tagtype_0", "countries");
  url.searchParams.set("tag_contains_0", "contains");
  url.searchParams.set("tag_0", "united-kingdom");

  /*
   * One retry, briefly delayed.
   *
   * Measured from production: the same query that answers in 0.7s from a
   * laptop comes back empty from a Vercel function often enough to notice,
   * while the barcode endpoint on the same host is reliable. Open Food Facts
   * rate-limits their legacy search path, and datacentre egress wears that
   * first. A single retry converts a good share of those into an answer, and
   * the successful result is then edge-cached for a day so the next person
   * searching the same thing never touches OFF at all.
   *
   * One retry, not three: this sits behind a typing box, and an athlete
   * waiting four seconds for "weetabix" has already given up.
   */
  for (let attempt = 0; attempt < 2; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, 350));
    try {
      const res = await fetcher(url.toString(), {
        headers: { "User-Agent": UA, Accept: "application/json" },
        signal,
        // OFF is slow under load and this sits behind a typing box.
        next: { revalidate: 60 * 60 * 24 },
      } as RequestInit);
      if (!res.ok) continue;
      const body = (await res.json()) as { products?: OffProduct[] };
      const foods = dedupe((body.products ?? []).map(toFood).filter(isFood)).slice(0, limit);
      return { foods, ok: true };
    } catch {
      /* Network or parse failure. Fall through to the retry, then give up
         and let the caller say the database could not be reached. */
    }
  }
  return { foods: [], ok: false };
}

/** Look up one barcode. Null when it is unknown or has no usable nutrition. */
export async function lookupBarcode(
  code: string,
  { fetcher = fetch, signal }: SearchOptions = {},
): Promise<Food | null> {
  const clean = code.replace(/\D/g, "");
  if (!isBarcode(clean)) return null;

  try {
    const res = await fetcher(
      `${PRODUCT_URL}/${clean}.json?fields=${encodeURIComponent(FIELDS)}`,
      {
        headers: { "User-Agent": UA, Accept: "application/json" },
        signal,
        next: { revalidate: 60 * 60 * 24 * 7 },
      } as RequestInit,
    );
    if (!res.ok) return null;
    const body = (await res.json()) as { status?: number; product?: OffProduct };
    if (body.status !== 1 || !body.product) return null;
    return toFood({ ...body.product, code: clean });
  } catch {
    return null;
  }
}

/** EAN-8, UPC-A and EAN-13 are the ones on a supermarket shelf. */
export function isBarcode(value: string): boolean {
  return /^\d{8}$|^\d{12,13}$/.test(value.replace(/\D/g, ""));
}

function isFood(f: Food | null): f is Food {
  return f !== null;
}

/**
 * OFF carries the same product under several barcodes — different pack sizes,
 * re-listings, regional codes — and a results list with "Alpro Soya" four
 * times is the thing that makes these databases feel unusable.
 */
function dedupe(foods: Food[]): Food[] {
  const seen = new Set<string>();
  const out: Food[] = [];
  for (const f of foods) {
    const key = `${f.name.toLowerCase()}|${(f.detail ?? "").toLowerCase()}|${f.per100.kcal}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(f);
  }
  return out;
}
