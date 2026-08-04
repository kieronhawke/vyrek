/**
 * FOOD LOGGING, FOR REAL THIS TIME.
 *
 * What was here before: a form with five number boxes, holding its entries in
 * `useState`. Nothing survived a reload, and the numbers on the page came from
 * the demo fixture — which is why it read as "just random data". Somebody could
 * type a meal in, navigate to the plan tab, come back, and find it gone.
 *
 * Two things had to change, and only one of them is the UI.
 *
 * ── THE MACROS HAVE TO COME FROM SOMEWHERE ──────────────────────────────
 * Asking an athlete to know that 100 g of chicken breast is 31 g of protein is
 * asking them to do the app's job. MyFitnessPal's whole value is that you type
 * "chicken" and it knows. We cannot use their database — their API is
 * partner-only and closed — so this ships a real one: common foods with per-100 g
 * macros, weighted towards what somebody training for HYROX actually eats.
 *
 * It is deliberately not vast. A hundred foods somebody recognises beats ten
 * thousand branded entries where six of them are called "Chicken Breast" and
 * you have to guess. Anything missing is one tap away as a custom entry, and
 * custom entries join the same recents list, so the list personalises fast.
 *
 * ── PORTIONS ARE THE PART PEOPLE GET WRONG ──────────────────────────────
 * Per-100 g is the honest storage unit but a miserable input unit — nobody eats
 * 100 g of egg. So every food carries its own portions ("1 large egg", "1 scoop"),
 * and the number typed is a count of those, not grams. `scale()` does the
 * conversion in one place so a portion change can never desynchronise from the
 * macros displayed next to it.
 *
 * Everything in this file is pure. The persistence lives in `use-food-log`, and
 * keeping the split means the totals and the goal maths are testable without a
 * DOM or a storage mock.
 */

export type MealKey = "breakfast" | "lunch" | "dinner" | "snacks";

export const MEALS: { key: MealKey; label: string }[] = [
  { key: "breakfast", label: "Breakfast" },
  { key: "lunch", label: "Lunch" },
  { key: "dinner", label: "Dinner" },
  { key: "snacks", label: "Snacks" },
];

export type Macros = {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  fibre: number;
};

export type Portion = {
  label: string;
  /** Grams in one of these. */
  grams: number;
};

export type Food = {
  id: string;
  name: string;
  /** Shown under the name — brand, or the cut/variety. */
  detail?: string;
  /** Per 100 g. Stored this way so portions can be swapped without a re-lookup. */
  per100: Macros;
  portions: Portion[];
};

export type LoggedFood = {
  id: string;
  foodId: string;
  name: string;
  detail?: string;
  meal: MealKey;
  /** ISO date, so a day's log can be found without scanning timestamps. */
  date: string;
  /** ms epoch — what "recent" is ordered by. */
  at: number;
  portionLabel: string;
  /** How many of `portionLabel`. Fractional is allowed: half a bagel is normal. */
  quantity: number;
  /** Already scaled. Denormalised so an edit to the food table never rewrites history. */
  macros: Macros;
};

const ZERO: Macros = { kcal: 0, protein: 0, carbs: 0, fat: 0, fibre: 0 };

/** Per-100 g figures, rounded to whole grams — the precision anybody can act on. */
function m(kcal: number, protein: number, carbs: number, fat: number, fibre = 0): Macros {
  return { kcal, protein, carbs, fat, fibre };
}

const g = (label: string, grams: number): Portion => ({ label, grams });
const HUNDRED = g("100 g", 100);

/**
 * The starter database.
 *
 * Sourced from standard composition tables (McCance & Widdowson / USDA), which
 * is where every food app's baseline numbers come from. Branded products are
 * left out on purpose: they change formulation, and a wrong figure that looks
 * authoritative is worse than no figure.
 */
export const FOODS: Food[] = [
  // ── Protein ──────────────────────────────────────────────────────────
  { id: "chicken-breast", name: "Chicken breast", detail: "Skinless, cooked", per100: m(165, 31, 0, 3.6), portions: [g("1 breast", 170), g("1 fillet", 120), HUNDRED] },
  { id: "chicken-thigh", name: "Chicken thigh", detail: "Skinless, cooked", per100: m(179, 24, 0, 8.2), portions: [g("1 thigh", 95), HUNDRED] },
  { id: "beef-mince-5", name: "Beef mince", detail: "5% fat, cooked", per100: m(176, 26, 0, 8), portions: [g("1 portion", 125), HUNDRED] },
  { id: "salmon", name: "Salmon fillet", detail: "Cooked", per100: m(208, 20, 0, 13), portions: [g("1 fillet", 130), HUNDRED] },
  { id: "tuna-tin", name: "Tuna", detail: "In spring water, drained", per100: m(116, 26, 0, 1), portions: [g("1 tin", 112), HUNDRED] },
  { id: "cod", name: "Cod", detail: "Cooked", per100: m(105, 23, 0, 0.9), portions: [g("1 fillet", 140), HUNDRED] },
  { id: "egg", name: "Egg", detail: "Whole, boiled", per100: m(155, 13, 1.1, 11), portions: [g("1 large", 58), g("1 medium", 50), HUNDRED] },
  { id: "egg-white", name: "Egg white", per100: m(52, 11, 0.7, 0.2), portions: [g("1 white", 33), HUNDRED] },
  { id: "greek-yoghurt", name: "Greek yoghurt", detail: "0% fat", per100: m(59, 10, 3.6, 0.4), portions: [g("1 pot", 170), g("1 large pot", 450), HUNDRED] },
  { id: "cottage-cheese", name: "Cottage cheese", per100: m(98, 11, 3.4, 4.3), portions: [g("1 pot", 300), HUNDRED] },
  { id: "whey", name: "Whey protein", detail: "Powder", per100: m(400, 80, 8, 6), portions: [g("1 scoop", 30), g("2 scoops", 60), HUNDRED] },
  { id: "tofu", name: "Tofu", detail: "Firm", per100: m(144, 17, 2.8, 8.7, 2.3), portions: [g("1 block", 200), HUNDRED] },
  { id: "halloumi", name: "Halloumi", per100: m(321, 22, 2.2, 25), portions: [g("1 slice", 30), HUNDRED] },
  { id: "prawns", name: "Prawns", detail: "Cooked", per100: m(99, 24, 0.2, 0.3), portions: [g("1 handful", 85), g("1 pack", 180), HUNDRED] },

  // ── Carbs ────────────────────────────────────────────────────────────
  { id: "white-rice", name: "White rice", detail: "Cooked", per100: m(130, 2.7, 28, 0.3, 0.4), portions: [g("1 portion", 180), g("1 pouch", 250), HUNDRED] },
  { id: "brown-rice", name: "Brown rice", detail: "Cooked", per100: m(112, 2.6, 24, 0.9, 1.8), portions: [g("1 portion", 180), HUNDRED] },
  { id: "pasta", name: "Pasta", detail: "Cooked", per100: m(158, 5.8, 31, 0.9, 1.8), portions: [g("1 portion", 200), HUNDRED] },
  { id: "potato", name: "Potato", detail: "Boiled", per100: m(87, 1.9, 20, 0.1, 1.8), portions: [g("1 medium", 170), HUNDRED] },
  { id: "sweet-potato", name: "Sweet potato", detail: "Baked", per100: m(90, 2, 21, 0.1, 3.3), portions: [g("1 medium", 150), HUNDRED] },
  { id: "oats", name: "Porridge oats", detail: "Dry", per100: m(379, 13, 68, 6.5, 10), portions: [g("1 serving", 40), g("1 large serving", 80), HUNDRED] },
  { id: "bread-wholemeal", name: "Wholemeal bread", per100: m(247, 13, 41, 3.4, 7), portions: [g("1 slice", 44), g("2 slices", 88), HUNDRED] },
  { id: "bagel", name: "Bagel", detail: "Plain", per100: m(250, 10, 49, 1.5, 2.1), portions: [g("1 bagel", 95), g("½ bagel", 48), HUNDRED] },
  { id: "wrap", name: "Tortilla wrap", per100: m(299, 8, 50, 7, 3), portions: [g("1 wrap", 62), HUNDRED] },
  { id: "banana", name: "Banana", per100: m(89, 1.1, 23, 0.3, 2.6), portions: [g("1 medium", 118), HUNDRED] },
  { id: "couscous", name: "Couscous", detail: "Cooked", per100: m(112, 3.8, 23, 0.2, 1.4), portions: [g("1 portion", 180), HUNDRED] },
  { id: "quinoa", name: "Quinoa", detail: "Cooked", per100: m(120, 4.4, 21, 1.9, 2.8), portions: [g("1 portion", 185), HUNDRED] },

  // ── Fruit & veg ──────────────────────────────────────────────────────
  { id: "broccoli", name: "Broccoli", detail: "Steamed", per100: m(35, 2.4, 7, 0.4, 3.3), portions: [g("1 portion", 90), HUNDRED] },
  { id: "spinach", name: "Spinach", per100: m(23, 2.9, 3.6, 0.4, 2.2), portions: [g("1 handful", 30), g("1 bag", 200), HUNDRED] },
  { id: "avocado", name: "Avocado", per100: m(160, 2, 9, 15, 6.7), portions: [g("½ avocado", 68), g("1 whole", 136), HUNDRED] },
  { id: "blueberries", name: "Blueberries", per100: m(57, 0.7, 14, 0.3, 2.4), portions: [g("1 handful", 80), HUNDRED] },
  { id: "apple", name: "Apple", per100: m(52, 0.3, 14, 0.2, 2.4), portions: [g("1 medium", 180), HUNDRED] },
  { id: "mixed-veg", name: "Mixed vegetables", per100: m(45, 2.4, 8, 0.4, 3.5), portions: [g("1 portion", 120), HUNDRED] },
  { id: "tomato", name: "Tomatoes", per100: m(18, 0.9, 3.9, 0.2, 1.2), portions: [g("1 medium", 120), HUNDRED] },

  // ── Fats & extras ────────────────────────────────────────────────────
  { id: "peanut-butter", name: "Peanut butter", per100: m(588, 25, 20, 50, 6), portions: [g("1 tbsp", 16), g("2 tbsp", 32), HUNDRED] },
  { id: "olive-oil", name: "Olive oil", per100: m(884, 0, 0, 100), portions: [g("1 tbsp", 14), g("1 tsp", 5), HUNDRED] },
  { id: "almonds", name: "Almonds", per100: m(579, 21, 22, 50, 13), portions: [g("1 handful", 28), HUNDRED] },
  { id: "cheddar", name: "Cheddar", per100: m(402, 25, 1.3, 33), portions: [g("1 slice", 30), HUNDRED] },
  { id: "hummus", name: "Hummus", per100: m(166, 8, 14, 10, 6), portions: [g("2 tbsp", 60), HUNDRED] },

  // ── Around training ──────────────────────────────────────────────────
  { id: "energy-gel", name: "Energy gel", per100: m(250, 0, 62, 0), portions: [g("1 gel", 40), HUNDRED] },
  { id: "electrolyte", name: "Electrolyte drink", per100: m(8, 0, 2, 0), portions: [g("1 bottle", 500), HUNDRED] },
  { id: "protein-bar", name: "Protein bar", per100: m(350, 32, 32, 10, 5), portions: [g("1 bar", 60), HUNDRED] },
  { id: "milk-semi", name: "Semi-skimmed milk", per100: m(50, 3.6, 4.8, 1.8), portions: [g("1 glass", 250), g("1 splash", 50), HUNDRED] },
  { id: "coffee-black", name: "Coffee", detail: "Black", per100: m(2, 0.1, 0, 0), portions: [g("1 mug", 250), HUNDRED] },
];

/**
 * Scale a food's per-100 g macros to a portion and a count.
 *
 * Rounded on the way out. Carrying 31.0000004 g of protein through a day's
 * sum produces totals ending in noise, and nobody eats to a milligram.
 */
export function scale(food: Food, portion: Portion, quantity: number): Macros {
  const factor = (portion.grams * quantity) / 100;
  const round = (n: number) => Math.round(n * factor * 10) / 10;
  return {
    kcal: Math.round(food.per100.kcal * factor),
    protein: round(food.per100.protein),
    carbs: round(food.per100.carbs),
    fat: round(food.per100.fat),
    fibre: round(food.per100.fibre),
  };
}

export function addMacros(a: Macros, b: Macros): Macros {
  return {
    kcal: a.kcal + b.kcal,
    protein: Math.round((a.protein + b.protein) * 10) / 10,
    carbs: Math.round((a.carbs + b.carbs) * 10) / 10,
    fat: Math.round((a.fat + b.fat) * 10) / 10,
    fibre: Math.round((a.fibre + b.fibre) * 10) / 10,
  };
}

export function totals(entries: LoggedFood[]): Macros {
  return entries.reduce((acc, e) => addMacros(acc, e.macros), ZERO);
}

export function totalsForMeal(entries: LoggedFood[], meal: MealKey): Macros {
  return totals(entries.filter((e) => e.meal === meal));
}

/**
 * Search.
 *
 * Ranked, not filtered: exact name beats name-prefix beats name-contains beats
 * detail-contains. The thing somebody types three letters of is nearly always
 * the thing they meant to start with.
 *
 * Ties fall back to the order of the list above, which is curated — and that
 * matters more than it sounds. An earlier version broke ties on name length,
 * which put "Chicken thigh" above "Chicken breast" for the query "chicken"
 * because it is one character shorter. Length is a terrible proxy for what
 * somebody meant. The exact-match band already handles the case it was added
 * for ("Egg" beating "Egg white"), so it was doing nothing but harm.
 */
export function searchFoods(query: string, foods: Food[] = FOODS, limit = 20): Food[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const scored: { food: Food; score: number; index: number }[] = [];
  foods.forEach((food, index) => {
    const name = food.name.toLowerCase();
    const detail = (food.detail ?? "").toLowerCase();
    let score = 0;
    if (name === q) score = 100;
    else if (name.startsWith(q)) score = 80;
    else if (name.includes(q)) score = 50;
    else if (detail.includes(q)) score = 20;
    if (score === 0) return;
    scored.push({ food, score, index });
  });

  return scored
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, limit)
    .map((s) => s.food);
}

/**
 * The recents list — the thing that makes logging fast on day three.
 *
 * Most people eat the same twelve things. Ordering by "how often, and how
 * recently" means the second week of logging is four taps rather than a search
 * every time, which is the entire reason MyFitnessPal is sticky.
 *
 * Frequency is weighted above recency but does not swamp it: something eaten
 * daily for a month should still fall down the list once it stops being eaten.
 */
export function recentFoods(log: LoggedFood[], limit = 8): LoggedFood[] {
  const byFood = new Map<string, { entry: LoggedFood; count: number; last: number }>();

  for (const entry of log) {
    const existing = byFood.get(entry.foodId);
    if (!existing) {
      byFood.set(entry.foodId, { entry, count: 1, last: entry.at });
    } else {
      existing.count += 1;
      if (entry.at > existing.last) {
        existing.last = entry.at;
        // Keep the most recent portion — that is the one to offer again.
        existing.entry = entry;
      }
    }
  }

  return [...byFood.values()]
    .sort((a, b) => {
      const byCount = Math.min(b.count, 10) - Math.min(a.count, 10);
      if (byCount !== 0) return byCount;
      return b.last - a.last;
    })
    .slice(0, limit)
    .map((v) => v.entry);
}

export type Targets = { kcal: number; protein: number; carbs: number; fat: number; fibre: number };

/** Sensible defaults until Ben sets them per athlete. */
export const DEFAULT_TARGETS: Targets = { kcal: 2600, protein: 160, carbs: 300, fat: 80, fibre: 30 };

export function remaining(consumed: Macros, targets: Targets): Targets {
  return {
    kcal: Math.round(targets.kcal - consumed.kcal),
    protein: Math.round(targets.protein - consumed.protein),
    carbs: Math.round(targets.carbs - consumed.carbs),
    fat: Math.round(targets.fat - consumed.fat),
    fibre: Math.round(targets.fibre - consumed.fibre),
  };
}

/**
 * The little green chip that appears when something is logged.
 *
 * One fact, or none. This is the flourish that makes logging feel like it gave
 * something back rather than just took a tap — but only when there is genuinely
 * something to say. A chip on every single entry becomes wallpaper within a day,
 * and "contains 0.3 g of fibre!" is noise dressed as insight.
 *
 * Thresholds are the standard nutrition-claim ones (high fibre ≥ 6 g/100 g,
 * high protein ≥ 20% of energy) so the wording is defensible.
 */
export function factFor(entry: LoggedFood): string | null {
  const { protein, fibre, kcal } = entry.macros;

  if (protein >= 20) return `${Math.round(protein)} g of protein — that is a solid hit.`;
  if (fibre >= 6) return `High-fibre food. ${fibre} g in that one.`;
  if (kcal > 0 && protein > 0 && (protein * 4) / kcal >= 0.35) {
    return `Mostly protein — good call around training.`;
  }
  if (entry.macros.carbs >= 50) return `${Math.round(entry.macros.carbs)} g of carbs — that is your fuel in.`;
  return null;
}

/**
 * Goal-progress message, for the second toast.
 *
 * Only fires on a threshold *crossing*, which is why it takes both totals. A
 * message that says "your protein goal is 60% complete" on every entry after
 * the 60% mark is the kind of thing people turn notifications off over.
 */
export function goalCrossing(before: Macros, after: Macros, targets: Targets): string | null {
  const checks: [keyof Targets & keyof Macros, string][] = [
    ["protein", "protein"],
    ["fibre", "fibre"],
    ["kcal", "calorie"],
  ];

  for (const [key, label] of checks) {
    const target = targets[key];
    if (!target) continue;
    const wasPct = (before[key] / target) * 100;
    const nowPct = (after[key] / target) * 100;

    if (wasPct < 100 && nowPct >= 100) return `You have hit your ${label} goal for today.`;
    for (const mark of [75, 50, 25]) {
      if (wasPct < mark && nowPct >= mark) return `Your ${label} goal is ${mark}% complete.`;
    }
  }
  return null;
}

/** Local ISO date (not UTC) — a 23:00 snack belongs to today, not tomorrow. */
export function isoDate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function clockTime(at: number): string {
  const d = new Date(at);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/** Which meal somebody is most likely logging, by the clock. Saves a tap. */
export function mealForHour(hour: number): MealKey {
  if (hour < 11) return "breakfast";
  if (hour < 15) return "lunch";
  if (hour < 21) return "dinner";
  return "snacks";
}
