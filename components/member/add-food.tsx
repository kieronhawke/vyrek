"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  FOODS,
  MEALS,
  scale,
  recentFoods,
  clockTime,
  isoDate,
  type Food,
  type LoggedFood,
  type MealKey,
  type Portion,
} from "@/lib/member/food";
import { useFoodSearch } from "@/hooks/use-food-search";
import { BarcodeScanner } from "@/components/member/barcode-scanner";
import { MealPhoto } from "@/components/member/meal-photo";

/**
 * THE ADD-FOOD SHEET.
 *
 * Modelled on the flow in the reference screenshots, because it is the one
 * every food app has converged on and athletes already know it: pick the meal,
 * search or tap something you have eaten before, adjust the portion, done.
 *
 * Two decisions worth writing down.
 *
 * **Recents come before search.** The empty state of the search box is not
 * empty — it is the list of things this person actually eats, one tap each.
 * By the second week that list covers most of a day, which is the difference
 * between logging being a habit and being a chore. A blank box with a magnifier
 * makes somebody do work the app already had the answer to.
 *
 * **Portions are buttons, not a unit dropdown.** A `<select>` of units next to
 * a number field is where these interfaces usually go wrong on a phone: two
 * taps and a scroll wheel to say "one egg". The portions are chips, the
 * quantity is a stepper, and the macros update live underneath so the number
 * being committed is visible before committing it.
 *
 * The sheet does not close itself after logging. Somebody adding breakfast is
 * usually adding three things, and re-opening the sheet twice is the sort of
 * papercut that stops people bothering by Thursday.
 */

function newId(): string {
  // `crypto.randomUUID` is not in older iOS Safari, which is exactly the
  // browser this runs on most.
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `f-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}

export function AddFood({
  meal,
  onMeal,
  history,
  onAdd,
  onClose,
}: {
  meal: MealKey;
  onMeal: (m: MealKey) => void;
  history: LoggedFood[];
  onAdd: (entry: LoggedFood) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<Food | null>(null);
  const [portion, setPortion] = useState<Portion | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [custom, setCustom] = useState(false);
  const [justLogged, setJustLogged] = useState<string | null>(null);
  /** Which way of finding food is on screen. Search is the default. */
  const [mode, setMode] = useState<"search" | "scan" | "photo">("search");
  const [photo, setPhoto] = useState<string | null>(null);
  const search = useRef<HTMLInputElement>(null);
  const tick = useRef<number | null>(null);

  useEffect(() => () => { if (tick.current) window.clearTimeout(tick.current); }, []);

  /* Curated foods answer on the keystroke; the packaged database lands a
     moment later. See hooks/use-food-search.ts for why that order matters. */
  const { foods: results, loading, offline } = useFoodSearch(query);
  const recents = useMemo(() => recentFoods(history, 8), [history]);

  function choose(food: Food) {
    setPicked(food);
    setPortion(food.portions[0]);
    setQuantity(1);
  }

  /** Flash a tick on a row so a one-tap add is visibly acknowledged. */
  function flash(key: string) {
    setJustLogged(key);
    if (tick.current) window.clearTimeout(tick.current);
    tick.current = window.setTimeout(() => setJustLogged(null), 1400);
  }

  function commit(food: Food, p: Portion, qty: number) {
    const now = new Date();
    onAdd({
      id: newId(),
      foodId: food.id,
      name: food.name,
      detail: food.detail,
      meal,
      date: isoDate(now),
      at: now.getTime(),
      portionLabel: p.label,
      quantity: qty,
      macros: scale(food, p, qty),
      photo: photo ?? undefined,
    });
    setPhoto(null);
    flash(food.id);
    setPicked(null);
    setQuery("");
    // Focus back to search: the next thing is usually another food.
    search.current?.focus();
  }

  /** One-tap re-log from recents — same food, same portion as last time. */
  function relog(prev: LoggedFood) {
    const food = FOODS.find((f) => f.id === prev.foodId);
    const now = new Date();
    onAdd({
      ...prev,
      id: newId(),
      meal,
      date: isoDate(now),
      at: now.getTime(),
      // Re-derive from the food table where we can, so a corrected figure
      // propagates; fall back to the stored macros for custom entries.
      macros: food
        ? scale(food, food.portions.find((p) => p.label === prev.portionLabel) ?? food.portions[0], prev.quantity)
        : prev.macros,
    });
    flash(prev.foodId);
  }

  const preview = picked && portion ? scale(picked, portion, quantity) : null;

  return (
    <div className="addfood">
      <div className="addfood__head">
        <label className="sr-only" htmlFor="addfood-meal">Meal</label>
        <select
          id="addfood-meal"
          className="addfood__meal"
          value={meal}
          onChange={(e) => onMeal(e.target.value as MealKey)}
        >
          {MEALS.map((m) => (
            <option key={m.key} value={m.key}>{m.label}</option>
          ))}
        </select>
        <button type="button" className="addfood__close" onClick={onClose} aria-label="Close">
          ✕
        </button>
      </div>

      {/* Three ways in. Search is the default because it is the one that
          works everywhere; scan is the fastest when there is a packet in
          your hand; the photo is for the meal that is in no database. */}
      <div className="addfood__modes" role="group" aria-label="How to add food">
        <button
          type="button"
          className="addfood__mode"
          aria-pressed={mode === "search"}
          onClick={() => setMode("search")}
        >
          Search
        </button>
        <button
          type="button"
          className="addfood__mode"
          aria-pressed={mode === "scan"}
          onClick={() => { setMode("scan"); setPicked(null); }}
        >
          Scan barcode
        </button>
        <button
          type="button"
          className="addfood__mode"
          aria-pressed={mode === "photo"}
          onClick={() => setMode("photo")}
        >
          Photo
        </button>
      </div>

      {mode === "scan" ? (
        <BarcodeScanner
          onFound={(food) => {
            choose(food);
            setMode("search");
          }}
          onClose={() => setMode("search")}
        />
      ) : null}

      {mode === "photo" ? <MealPhoto photo={photo} onPhoto={setPhoto} /> : null}

      {mode === "search" ? (
        <input
          ref={search}
          type="search"
          className="addfood__search"
          placeholder="Search any food or brand…"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setPicked(null); }}
          aria-label="Search foods"
          autoComplete="off"
        />
      ) : null}

      {/* A photo taken before the food is picked stays visible, so it is
          obvious it will be attached to whatever is logged next. */}
      {photo && mode !== "photo" ? (
        <p className="addfood__photonote">
          A photo will be attached to this entry.{" "}
          <button type="button" className="addfood__link" onClick={() => setPhoto(null)}>
            Remove
          </button>
        </p>
      ) : null}

      {/* ── Portion picker, once something is chosen ─────────────────── */}
      {picked && portion ? (
        <div className="addfood__portion">
          <p className="addfood__picked">
            {picked.name}
            {picked.detail ? <span> · {picked.detail}</span> : null}
          </p>

          <div className="addfood__chips" role="group" aria-label="Portion size">
            {picked.portions.map((p) => (
              <button
                key={p.label}
                type="button"
                className="addfood__chip"
                aria-pressed={p.label === portion.label}
                onClick={() => setPortion(p)}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="addfood__qty">
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.max(0.5, Math.round((q - 0.5) * 2) / 2))}
              aria-label="Less"
            >
              −
            </button>
            <span className="num" aria-live="polite">{quantity}</span>
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.min(20, q + 0.5))}
              aria-label="More"
            >
              +
            </button>
          </div>

          {preview ? (
            <p className="addfood__preview num">
              {preview.kcal} kcal · P {preview.protein} · C {preview.carbs} · F {preview.fat}
            </p>
          ) : null}

          <button
            type="button"
            className="addfood__commit"
            onClick={() => commit(picked, portion, quantity)}
          >
            Add to {MEALS.find((m) => m.key === meal)?.label.toLowerCase()}
          </button>
        </div>
      ) : null}

      {/* ── Results, or recents when nothing is typed ─────────────────── */}
      {!picked && mode === "search" ? (
        <>
          {offline ? (
            <p className="addfood__notice" role="status">
              Could not reach the food database. Showing the foods stored on
              this device — a brand or packet may be missing until it is back.
            </p>
          ) : null}
          {query ? (
            <ul className="addfood__list" role="list">
              {results.map((f) => (
                <li key={f.id}>
                  <button type="button" className="addfood__row" onClick={() => choose(f)}>
                    <span className="addfood__row-name">
                      {f.name}
                      {f.detail ? <span className="addfood__row-detail">{f.detail}</span> : null}
                    </span>
                    <span className="addfood__row-kcal num">{f.per100.kcal}<small> /100g</small></span>
                  </button>
                </li>
              ))}
              {loading && results.length === 0 ? (
                <li className="addfood__empty">
                  <p>Searching…</p>
                </li>
              ) : null}
              {!loading && results.length === 0 ? (
                <li className="addfood__empty">
                  <p>Nothing matching “{query}”.</p>
                  <button type="button" className="addfood__link" onClick={() => setCustom(true)}>
                    Add it yourself
                  </button>
                </li>
              ) : null}
            </ul>
          ) : recents.length > 0 ? (
            <>
              <p className="addfood__label">Recently logged</p>
              <ul className="addfood__list" role="list">
                {recents.map((r) => (
                  <li key={r.foodId}>
                    <span className="addfood__recent">
                      <span className="addfood__row-name">
                        {r.name}
                        <span className="addfood__row-detail">
                          {r.quantity} × {r.portionLabel} · {r.macros.kcal} kcal
                        </span>
                      </span>
                      <button
                        type="button"
                        className="addfood__plus"
                        onClick={() => relog(r)}
                        aria-label={`Log ${r.name} again`}
                      >
                        {justLogged === r.foodId ? "✓" : "+"}
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="addfood__hint">
              Search for what you ate. Anything you log shows up here after, so
              the food you eat every week is one tap.
            </p>
          )}

          <button type="button" className="addfood__link" onClick={() => setCustom((c) => !c)}>
            {custom ? "Cancel" : "Not listed? Add it yourself"}
          </button>

          {custom ? <CustomFood meal={meal} onAdd={(e) => { onAdd(e); setCustom(false); flash(e.foodId); }} /> : null}
        </>
      ) : null}
    </div>
  );
}

/**
 * The escape hatch.
 *
 * Forty-five foods will not cover a takeaway or somebody's own recipe, and a
 * logger that cannot record what you actually ate stops being used. Custom
 * entries get a stable id derived from the name, so logging "Mum's lasagne"
 * twice collapses into one recents row rather than two.
 */
function CustomFood({ meal, onAdd }: { meal: MealKey; onAdd: (e: LoggedFood) => void }) {
  const [name, setName] = useState("");
  const [kcal, setKcal] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fat, setFat] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !kcal) return;
    const now = new Date();
    const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-");
    onAdd({
      id: newId(),
      foodId: `custom-${slug}`,
      name: name.trim(),
      meal,
      date: isoDate(now),
      at: now.getTime(),
      portionLabel: "1 serving",
      quantity: 1,
      macros: {
        kcal: Number(kcal) || 0,
        protein: Number(protein) || 0,
        carbs: Number(carbs) || 0,
        fat: Number(fat) || 0,
        fibre: 0,
      },
    });
    setName(""); setKcal(""); setProtein(""); setCarbs(""); setFat("");
  }

  return (
    <form className="addfood__custom" onSubmit={submit}>
      <label className="sr-only" htmlFor="cf-name">Food name</label>
      <input
        id="cf-name"
        className="addfood__search"
        placeholder="What was it?"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
      />
      <div className="addfood__nums">
        <Num id="cf-kcal" label="kcal" value={kcal} onChange={setKcal} required />
        <Num id="cf-p" label="Protein" value={protein} onChange={setProtein} />
        <Num id="cf-c" label="Carbs" value={carbs} onChange={setCarbs} />
        <Num id="cf-f" label="Fat" value={fat} onChange={setFat} />
      </div>
      <button type="submit" className="addfood__commit">Add</button>
    </form>
  );
}

function Num({
  id, label, value, onChange, required,
}: {
  id: string; label: string; value: string; onChange: (v: string) => void; required?: boolean;
}) {
  return (
    <label className="addfood__num" htmlFor={id}>
      <span>{label}</span>
      <input
        id={id}
        type="number"
        inputMode="decimal"
        min="0"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
      />
    </label>
  );
}

export { clockTime };
