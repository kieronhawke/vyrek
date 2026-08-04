/**
 * One search box, two sources.
 *
 * The local table in `food.ts` is forty-odd whole foods with figures from
 * standard composition tables: chicken breast, oats, banana. Open Food Facts
 * is three million packaged products with barcodes, contributed by the public.
 *
 * They are good at opposite things, and the order matters. Somebody typing
 * "chicken" wants chicken, not "Chicken & Bacon Pasta Salad" from a
 * supermarket meal deal — so the curated list is searched first and always
 * wins the top of the results. Somebody typing "Weetabix" gets nothing from
 * the curated list, which is exactly what the packaged database is for.
 *
 * The merge is here rather than in the route so it can be tested without a
 * server, and so the fallback behaviour is a property of the search rather
 * than of one caller.
 */

import { searchFoods, type Food } from "@/lib/member/food";
import { searchOff, type SearchOptions } from "@/lib/member/off";

export type SearchResult = {
  foods: Food[];
  /**
   * True when the packaged database did not answer — offline, rate-limited,
   * or down. The sheet says so rather than implying the product does not
   * exist, because "we could not reach the database" and "there is no such
   * food" are very different things to tell somebody.
   */
  partial: boolean;
};

export async function searchAllFoods(
  query: string,
  opts: SearchOptions = {},
): Promise<SearchResult> {
  const q = query.trim();
  if (q.length < 2) return { foods: [], partial: false };

  const local = searchFoods(q);

  /* The curated list answers instantly and offline, so a failure out there
     must never take it down with it. `ok` is the service's own answer to
     "did you reach me", which is the only way to tell an honest empty result
     from a rate-limited one. */
  const packagedResult = await searchOff(q, opts);
  const packaged = packagedResult.foods;

  /* A curated whole food and a branded product can share a name — "porridge"
     is both. The curated one is the better answer, so it stays and the
     duplicate goes. */
  const seen = new Set(local.map((f) => f.name.toLowerCase()));
  const merged = [
    ...local,
    ...packaged.filter((f) => {
      const key = f.name.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }),
  ];

  return {
    foods: merged.slice(0, 30),
    // Only "partial" when the packaged half actually failed. An honest empty
    // result from a working service is not a degraded one.
    partial: !packagedResult.ok,
  };
}
