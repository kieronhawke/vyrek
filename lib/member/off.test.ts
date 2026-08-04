import { describe, expect, it, vi } from "vitest";
import {
  isBarcode,
  lookupBarcode,
  macrosFrom,
  parseQuantity,
  plausible,
  portionsFor,
  searchOff,
  toFood,
} from "./off";

/** A response shaped like the real one, trimmed to the fields we ask for. */
function product(over: Record<string, unknown> = {}) {
  return {
    code: "5000108000000",
    product_name: "Weetabix",
    brands: "Weetabix",
    quantity: "430 g",
    serving_size: "2 biscuits (37.5 g)",
    serving_quantity: 37.5,
    nutriments: {
      "energy-kcal_100g": 362,
      proteins_100g: 11.5,
      carbohydrates_100g: 69,
      fat_100g: 2,
      fiber_100g: 10,
    },
    ...over,
  };
}

function jsonFetch(body: unknown, ok = true) {
  return vi.fn().mockResolvedValue({ ok, json: async () => body }) as unknown as typeof fetch;
}

describe("reading a product", () => {
  it("maps a normal product onto our own shape", () => {
    const food = toFood(product())!;
    expect(food.id).toBe("off:5000108000000");
    expect(food.name).toBe("Weetabix");
    expect(food.detail).toBe("Weetabix");
    expect(food.per100.kcal).toBe(362);
    expect(food.per100.protein).toBe(11.5);
  });

  /**
   * The single most important rule in this file.
   *
   * Open Food Facts is crowd-sourced and a large share of products carry a
   * name, a brand and a photo but no nutrition at all. A search row that logs
   * zero calories is worse than no row: the athlete taps it, sees their lunch
   * in the list, and has recorded nothing.
   */
  it("refuses a product with no energy figure", () => {
    expect(toFood(product({ nutriments: {} }))).toBeNull();
    expect(toFood(product({ nutriments: undefined }))).toBeNull();
  });

  it("converts kilojoules when kcal is missing", () => {
    const food = toFood(
      product({ nutriments: { energy_100g: 1515, proteins_100g: 11.5 } }),
    )!;
    expect(food.per100.kcal).toBe(362); // 1515 kJ / 4.184
  });

  /**
   * Fat is the densest macro at 9 kcal/g, so 100 g of pure fat is 900 kcal and
   * nothing edible beats it. Anything above is a contributor pasting per-pack
   * figures into the per-100g field, and it would land in somebody's daily
   * total unchallenged.
   */
  it("rejects figures that are not physically possible", () => {
    expect(plausible({ kcal: 9000, protein: 5, carbs: 5, fat: 5, fibre: 0 })).toBe(false);
    expect(plausible({ kcal: 0, protein: 0, carbs: 0, fat: 0, fibre: 0 })).toBe(false);
    expect(plausible({ kcal: 200, protein: 140, carbs: 5, fat: 5, fibre: 0 })).toBe(false);
    expect(plausible({ kcal: 362, protein: 11.5, carbs: 69, fat: 2, fibre: 10 })).toBe(true);
    expect(toFood(product({ nutriments: { "energy-kcal_100g": 9000 } }))).toBeNull();
  });

  it("treats a missing macro as zero, which is a real answer", () => {
    const m = macrosFrom({ "energy-kcal_100g": 100 })!;
    expect(m).toEqual({ kcal: 100, protein: 0, carbs: 0, fat: 0, fibre: 0 });
  });

  it("needs a name and a code", () => {
    expect(toFood(product({ product_name: "  " }))).toBeNull();
    expect(toFood(product({ code: undefined }))).toBeNull();
  });
});

describe("portions", () => {
  /* Nobody eats 100 g of cereal bar. Offering the serving and the pack is the
     app doing the arithmetic instead of the athlete. */
  it("offers the serving, the pack and 100 g", () => {
    const labels = portionsFor(product()).map((p) => p.label);
    expect(labels[0]).toContain("serving");
    expect(labels.some((l) => l.startsWith("1 pack"))).toBe(true);
    expect(labels.at(-1)).toBe("100 g");
  });

  it("always offers 100 g, even with nothing else known", () => {
    expect(portionsFor({ code: "1", product_name: "x" })).toEqual([
      { label: "100 g", grams: 100 },
    ]);
  });

  it("reads pack sizes in the units packs actually use", () => {
    expect(parseQuantity("430 g")).toBe(430);
    expect(parseQuantity("1 kg")).toBe(1000);
    expect(parseQuantity("330ml")).toBe(330);
    expect(parseQuantity("1,5 L")).toBe(1500);
    expect(parseQuantity("family size")).toBeNull();
    expect(parseQuantity(undefined)).toBeNull();
  });
});

describe("barcodes", () => {
  it("accepts the formats on a supermarket shelf and nothing else", () => {
    expect(isBarcode("5000108000000")).toBe(true); // EAN-13
    expect(isBarcode("012345678905")).toBe(true); // UPC-A
    expect(isBarcode("40170725")).toBe(true); // EAN-8
    expect(isBarcode("123")).toBe(false);
    expect(isBarcode("abcdefghijklm")).toBe(false);
  });

  it("looks one up and returns a loggable food", async () => {
    const fetcher = jsonFetch({ status: 1, product: product() });
    const food = await lookupBarcode("5000108000000", { fetcher });
    expect(food?.name).toBe("Weetabix");
  });

  it("returns nothing for an unknown code rather than an empty product", async () => {
    const fetcher = jsonFetch({ status: 0 });
    expect(await lookupBarcode("5000108000000", { fetcher })).toBeNull();
  });

  it("does not call out at all for something that is not a barcode", async () => {
    const fetcher = jsonFetch({});
    expect(await lookupBarcode("nope", { fetcher })).toBeNull();
    expect(fetcher).not.toHaveBeenCalled();
  });
});

describe("search", () => {
  it("returns loggable foods and drops the rest", async () => {
    const fetcher = jsonFetch({
      products: [
        product(),
        product({ code: "2", product_name: "No nutrition", nutriments: {} }),
      ],
    });
    const out = await searchOff("weetabix", { fetcher });
    expect(out.foods.map((f) => f.name)).toEqual(["Weetabix"]);
    expect(out.ok).toBe(true);
  });

  /* OFF carries the same product under several barcodes — pack sizes,
     re-listings, regional codes. A list with "Alpro Soya" four times in it is
     what makes these databases feel unusable. */
  it("collapses the same product listed under several codes", async () => {
    const fetcher = jsonFetch({
      products: [product({ code: "1" }), product({ code: "2" }), product({ code: "3" })],
    });
    expect((await searchOff("weetabix", { fetcher })).foods).toHaveLength(1);
  });

  it("does not search on a single character", async () => {
    const fetcher = jsonFetch({ products: [product()] });
    expect((await searchOff("w", { fetcher })).foods).toEqual([]);
    expect(fetcher).not.toHaveBeenCalled();
  });

  /**
   * A food search that throws takes the whole logging sheet with it, and the
   * local starter list is still there behind it. Degrading to "fewer results"
   * beats degrading to "the page is broken".
   */
  it("returns nothing rather than throwing when the service fails", async () => {
    const boom = vi.fn().mockRejectedValue(new Error("network")) as unknown as typeof fetch;
    expect(await searchOff("weetabix", { fetcher: boom })).toEqual({ foods: [], ok: false });

    const bad = jsonFetch({}, false);
    expect(await searchOff("weetabix", { fetcher: bad })).toEqual({ foods: [], ok: false });
  });

  /**
   * The distinction that matters most to the athlete.
   *
   * Open Food Facts rate-limits, and an earlier version returned a bare []
   * either way — so a rate-limited search told somebody "no such food" when
   * the truth was "we could not reach the database". The sheet says different
   * things in those two cases, and it can only do that if this does.
   */
  it("tells an empty result apart from a failed one", async () => {
    const empty = await searchOff("qwertyuiop", { fetcher: jsonFetch({ products: [] }) });
    expect(empty).toEqual({ foods: [], ok: true });

    const failed = await searchOff("chicken", { fetcher: jsonFetch({}, false) });
    expect(failed.ok).toBe(false);
  });

  it("asks for UK products first", async () => {
    const fetcher = jsonFetch({ products: [] });
    await searchOff("hummus", { fetcher });
    const url = (fetcher as unknown as { mock: { calls: string[][] } }).mock.calls[0][0];
    expect(url).toContain("united-kingdom");
  });
});

describe("retrying a rate-limited search", () => {
  /**
   * Measured from production: the query that answers in 0.7s from a laptop
   * comes back empty from a Vercel function often enough to notice. Open Food
   * Facts rate-limits their legacy search path and datacentre egress wears
   * that first, so one retry converts a good share of those into an answer.
   */
  it("tries again once when the first attempt is refused", async () => {
    let calls = 0;
    const flaky = (async () => {
      calls++;
      if (calls === 1) return { ok: false, json: async () => ({}) };
      return {
        ok: true,
        json: async () => ({ products: [product()] }),
      };
    }) as unknown as typeof fetch;

    const out = await searchOff("weetabix", { fetcher: flaky });
    expect(calls).toBe(2);
    expect(out.ok).toBe(true);
    expect(out.foods).toHaveLength(1);
  });

  /* One retry, not three. This sits behind a typing box and somebody waiting
     four seconds for "weetabix" has already given up. */
  it("gives up after the second attempt rather than hammering", async () => {
    let calls = 0;
    const dead = (async () => {
      calls++;
      return { ok: false, json: async () => ({}) };
    }) as unknown as typeof fetch;

    const out = await searchOff("weetabix", { fetcher: dead });
    expect(calls).toBe(2);
    expect(out).toEqual({ foods: [], ok: false });
  });
});
