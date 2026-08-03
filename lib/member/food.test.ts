import { describe, it, expect } from "vitest";
import {
  FOODS,
  scale,
  totals,
  totalsForMeal,
  searchFoods,
  recentFoods,
  remaining,
  factFor,
  goalCrossing,
  isoDate,
  mealForHour,
  DEFAULT_TARGETS,
  type LoggedFood,
  type MealKey,
  type Macros,
} from "./food";

const food = (id: string) => FOODS.find((f) => f.id === id)!;

function entry(over: Partial<LoggedFood> = {}): LoggedFood {
  return {
    id: "e1",
    foodId: "chicken-breast",
    name: "Chicken breast",
    meal: "lunch" as MealKey,
    date: "2026-08-03",
    at: 1_000,
    portionLabel: "1 breast",
    quantity: 1,
    macros: { kcal: 280, protein: 53, carbs: 0, fat: 6, fibre: 0 },
    ...over,
  };
}

describe("the food database", () => {
  it("gives every food a portion somebody would actually use", () => {
    for (const f of FOODS) {
      expect(f.portions.length, `${f.id} has no portions`).toBeGreaterThan(0);
      // Per-100 g alone is not a usable input unit — nobody eats 100 g of egg.
      expect(f.portions.some((p) => p.grams !== 100), `${f.id} only offers 100 g`).toBe(true);
    }
  });

  it("has no duplicate ids", () => {
    // Two foods sharing an id would silently merge in the recents list.
    const ids = FOODS.map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("keeps macros roughly consistent with the calories claimed", () => {
    /*
     * 4/4/9 kcal per gram. A food whose macros do not add up to its calories is
     * a typo, and a typo here quietly corrupts every total an athlete sees.
     *
     * Fibre is counted at 2 kcal/g, not 4. Composition tables report it inside
     * the carbohydrate figure, but the body does not get 4 kcal from it — so a
     * naive 4/4/9 sum overstates spinach by 30% and would force the tolerance
     * so wide that a real transposed digit slipped through.
     */
    for (const f of FOODS) {
      const { kcal, protein, carbs, fat, fibre } = f.per100;
      if (kcal < 20) continue; // Coffee and electrolyte: rounding dominates.
      const digestibleCarbs = Math.max(0, carbs - fibre);
      const derived = protein * 4 + digestibleCarbs * 4 + fibre * 2 + fat * 9;
      const drift = Math.abs(derived - kcal) / kcal;
      expect(drift, `${f.id}: ${kcal} kcal but macros give ${Math.round(derived)}`).toBeLessThan(0.25);
    }
  });
});

describe("scale", () => {
  it("scales per-100 g figures to a real portion", () => {
    const chicken = food("chicken-breast"); // 165 kcal, 31 g protein per 100 g
    const one = scale(chicken, { label: "1 breast", grams: 170 }, 1);
    expect(one.kcal).toBe(281); // 165 × 1.7
    expect(one.protein).toBeCloseTo(52.7, 1);
  });

  it("handles a fractional quantity", () => {
    // Half a bagel is a completely normal thing to eat.
    const bagel = food("bagel");
    const half = scale(bagel, { label: "1 bagel", grams: 95 }, 0.5);
    const whole = scale(bagel, { label: "1 bagel", grams: 95 }, 1);
    expect(half.kcal).toBe(Math.round(whole.kcal / 2));
  });

  it("does not carry floating-point noise into the numbers on screen", () => {
    const oats = scale(food("oats"), { label: "1 serving", grams: 40 }, 1);
    // One decimal place is the most anybody can act on.
    expect(oats.protein).toBe(Math.round(oats.protein * 10) / 10);
    expect(Number.isInteger(oats.kcal)).toBe(true);
  });
});

describe("totals", () => {
  it("sums an empty log to zero rather than NaN", () => {
    expect(totals([])).toEqual({ kcal: 0, protein: 0, carbs: 0, fat: 0, fibre: 0 });
  });

  it("sums a day", () => {
    const t = totals([
      entry({ id: "a", macros: { kcal: 300, protein: 30, carbs: 10, fat: 5, fibre: 2 } }),
      entry({ id: "b", macros: { kcal: 200, protein: 10, carbs: 40, fat: 2, fibre: 3 } }),
    ]);
    expect(t).toEqual({ kcal: 500, protein: 40, carbs: 50, fat: 7, fibre: 5 });
  });

  it("keeps decimal sums clean across many entries", () => {
    // 0.1 + 0.2 territory: ten entries of 3.3 g must not read 33.000000000000004.
    const many = Array.from({ length: 10 }, (_, i) =>
      entry({ id: `x${i}`, macros: { kcal: 10, protein: 3.3, carbs: 0, fat: 0, fibre: 0 } }),
    );
    expect(totals(many).protein).toBe(33);
  });

  it("splits by meal", () => {
    const log = [
      entry({ id: "a", meal: "breakfast", macros: { kcal: 400, protein: 20, carbs: 50, fat: 10, fibre: 5 } }),
      entry({ id: "b", meal: "dinner", macros: { kcal: 700, protein: 50, carbs: 60, fat: 20, fibre: 8 } }),
    ];
    expect(totalsForMeal(log, "breakfast").kcal).toBe(400);
    expect(totalsForMeal(log, "lunch").kcal).toBe(0);
  });
});

describe("search", () => {
  it("returns nothing for an empty query rather than the whole database", () => {
    // The recents list owns the empty state; dumping 45 foods over it is worse.
    expect(searchFoods("")).toEqual([]);
    expect(searchFoods("   ")).toEqual([]);
  });

  it("puts an exact name match first", () => {
    // Typing "egg" nearly always means the egg, not the egg white.
    expect(searchFoods("egg")[0].id).toBe("egg");
  });

  it("breaks a tie on curated order, not name length", () => {
    /*
     * Both start with "chicken", so they score identically. Ranking by name
     * length put the thigh first because it is one character shorter — which
     * is nonsense, and visibly wrong on the screen. Breast is listed first in
     * the database because it is what people log.
     */
    expect(searchFoods("chicken")[0].id).toBe("chicken-breast");
  });

  it("ranks a prefix above a mid-word match", () => {
    const ids = searchFoods("rice").map((f) => f.id);
    // "White rice" and "Brown rice" both contain it; neither starts with it,
    // so this only checks both surface rather than pinning an order.
    expect(ids).toContain("white-rice");
    expect(ids).toContain("brown-rice");
  });

  it("finds a food by its detail line", () => {
    // "skinless" is not in any name, but it is how somebody might search.
    expect(searchFoods("skinless").length).toBeGreaterThan(0);
  });

  it("is case- and whitespace-insensitive", () => {
    expect(searchFoods("  CHICKEN ").length).toBe(searchFoods("chicken").length);
  });

  it("respects the limit", () => {
    expect(searchFoods("e", FOODS, 3).length).toBeLessThanOrEqual(3);
  });
});

describe("recents", () => {
  it("collapses repeats of the same food to one row", () => {
    const log = [
      entry({ id: "1", foodId: "egg", at: 100 }),
      entry({ id: "2", foodId: "egg", at: 200 }),
      entry({ id: "3", foodId: "oats", at: 150 }),
    ];
    const recents = recentFoods(log);
    expect(recents.length).toBe(2);
    expect(recents.filter((r) => r.foodId === "egg").length).toBe(1);
  });

  it("offers the most recent portion of a repeated food", () => {
    // If somebody switched from one egg to three, three is the better offer.
    const log = [
      entry({ id: "1", foodId: "egg", at: 100, quantity: 1 }),
      entry({ id: "2", foodId: "egg", at: 500, quantity: 3 }),
    ];
    expect(recentFoods(log)[0].quantity).toBe(3);
  });

  it("puts the thing eaten most often first", () => {
    const log = [
      ...Array.from({ length: 5 }, (_, i) => entry({ id: `o${i}`, foodId: "oats", at: i })),
      entry({ id: "late", foodId: "salmon", at: 9_999 }),
    ];
    // Salmon is more recent, but oats is the habit — and the habit is what
    // somebody wants one tap away.
    expect(recentFoods(log)[0].foodId).toBe("oats");
  });

  it("lets recency break a tie on frequency", () => {
    const log = [
      entry({ id: "a", foodId: "oats", at: 100 }),
      entry({ id: "b", foodId: "salmon", at: 900 }),
    ];
    expect(recentFoods(log)[0].foodId).toBe("salmon");
  });

  it("caps the frequency weight so an old habit eventually falls off", () => {
    /*
     * Something eaten 200 times last year should not outrank this week's food
     * forever. The count is clamped, so once both are past the cap, recency
     * decides.
     */
    const log = [
      ...Array.from({ length: 200 }, (_, i) => entry({ id: `old${i}`, foodId: "oats", at: i })),
      ...Array.from({ length: 12 }, (_, i) => entry({ id: `new${i}`, foodId: "salmon", at: 50_000 + i })),
    ];
    expect(recentFoods(log)[0].foodId).toBe("salmon");
  });

  it("respects the limit", () => {
    const log = FOODS.slice(0, 20).map((f, i) => entry({ id: `e${i}`, foodId: f.id, at: i }));
    expect(recentFoods(log, 5).length).toBe(5);
  });

  it("returns nothing for an empty log", () => {
    expect(recentFoods([])).toEqual([]);
  });
});

describe("remaining", () => {
  it("counts down from the target", () => {
    const consumed: Macros = { kcal: 600, protein: 40, carbs: 70, fat: 20, fibre: 8 };
    expect(remaining(consumed, DEFAULT_TARGETS).kcal).toBe(2000);
  });

  it("goes negative rather than clamping at zero", () => {
    // Being 300 over is information. Showing "0 left" hides it.
    const consumed: Macros = { kcal: 2900, protein: 0, carbs: 0, fat: 0, fibre: 0 };
    expect(remaining(consumed, DEFAULT_TARGETS).kcal).toBe(-300);
  });
});

describe("the fact chip", () => {
  it("says something worth reading about a high-protein entry", () => {
    expect(factFor(entry())).toMatch(/protein/i);
  });

  it("stays quiet when there is nothing to say", () => {
    // A chip on every entry becomes wallpaper within a day.
    const black = entry({ macros: { kcal: 5, protein: 0.2, carbs: 0, fat: 0, fibre: 0 } });
    expect(factFor(black)).toBeNull();
  });

  it("flags fibre at the standard claim threshold", () => {
    const beans = entry({ macros: { kcal: 200, protein: 10, carbs: 30, fat: 1, fibre: 9 } });
    expect(factFor(beans)).toMatch(/fibre/i);
  });

  it("does not divide by zero on a zero-calorie entry", () => {
    const water = entry({ macros: { kcal: 0, protein: 0, carbs: 0, fat: 0, fibre: 0 } });
    expect(() => factFor(water)).not.toThrow();
    expect(factFor(water)).toBeNull();
  });
});

describe("goal crossings", () => {
  const t = { ...DEFAULT_TARGETS, protein: 100 };
  const macros = (protein: number): Macros => ({ kcal: 0, protein, carbs: 0, fat: 0, fibre: 0 });

  it("fires once, on the crossing", () => {
    expect(goalCrossing(macros(20), macros(30), t)).toMatch(/25%/);
  });

  it("says nothing when the mark was already passed", () => {
    // This is the difference between a nice moment and a notification people
    // turn off: it must not fire on every entry after 25%.
    expect(goalCrossing(macros(30), macros(40), t)).toBeNull();
  });

  it("celebrates hitting the goal outright", () => {
    expect(goalCrossing(macros(90), macros(105), t)).toMatch(/hit your protein goal/i);
  });

  it("reports the highest mark crossed when one entry jumps several", () => {
    // 10 → 80 crosses 25, 50 and 75. Three toasts would be absurd.
    expect(goalCrossing(macros(10), macros(80), t)).toMatch(/75%/);
  });

  it("survives a zero target without dividing by zero", () => {
    expect(() => goalCrossing(macros(0), macros(10), { ...t, protein: 0 })).not.toThrow();
  });
});

describe("dates and meals", () => {
  it("uses the local date, so a late snack belongs to today", () => {
    /*
     * `toISOString()` would push a 23:00 entry in BST into tomorrow's log. The
     * athlete would tick it off, then find their day empty and yesterday's
     * suddenly heavier.
     */
    const lateSnack = new Date(2026, 7, 3, 23, 30);
    expect(isoDate(lateSnack)).toBe("2026-08-03");
  });

  it("pads single-digit months and days", () => {
    expect(isoDate(new Date(2026, 0, 5))).toBe("2026-01-05");
  });

  it("guesses the meal from the clock", () => {
    expect(mealForHour(8)).toBe("breakfast");
    expect(mealForHour(13)).toBe("lunch");
    expect(mealForHour(19)).toBe("dinner");
    expect(mealForHour(22)).toBe("snacks");
  });
});
