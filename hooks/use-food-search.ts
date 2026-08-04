"use client";

import { useEffect, useRef, useState } from "react";
import { searchFoods, type Food } from "@/lib/member/food";

/**
 * The search behind the add-food box.
 *
 * The curated table is searched **synchronously, on every keystroke**, so the
 * box never feels laggy for the foods most people log most often — chicken,
 * oats, banana. The packaged database is then asked in the background and its
 * results are appended when they land.
 *
 * That ordering is the whole design. A single awaited search would make even
 * "egg" wait on a network round trip, and the reason people abandon food
 * logging is friction, not missing products.
 */

export type FoodSearchState = {
  foods: Food[];
  /** A request is in flight. Only ever shown alongside existing results. */
  loading: boolean;
  /**
   * The packaged database could not be reached. Distinct from "no results" —
   * the sheet says "we could not reach the food database" rather than
   * implying the product does not exist.
   */
  offline: boolean;
};

const DEBOUNCE_MS = 250;

export function useFoodSearch(query: string): FoodSearchState {
  const q = query.trim();
  /* Local results are derived, not stored: they are cheap and always correct
     for the current query, so there is no state to get out of sync. */
  const local = q.length >= 1 ? searchFoods(q) : [];

  const [remote, setRemote] = useState<Food[]>([]);
  const [loading, setLoading] = useState(false);
  const [offline, setOffline] = useState(false);
  /** Which query the remote results belong to, so a slow reply cannot
      overwrite the results for something typed since. */
  const settled = useRef("");

  useEffect(() => {
    if (q.length < 2) {
      setRemote([]);
      setLoading(false);
      setOffline(false);
      return;
    }

    const controller = new AbortController();
    let cancelled = false;
    setLoading(true);

    const timer = window.setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/member/food/search?q=${encodeURIComponent(q)}`,
          { signal: controller.signal },
        );
        if (!res.ok) throw new Error(String(res.status));
        const body = (await res.json()) as { foods: Food[]; partial: boolean };
        if (cancelled) return;
        settled.current = q;
        setRemote(body.foods ?? []);
        setOffline(Boolean(body.partial));
      } catch (err) {
        if (cancelled || (err as Error)?.name === "AbortError") return;
        setRemote([]);
        setOffline(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      cancelled = true;
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [q]);

  /* The server already merged its own copy of the curated list in, so drop
     anything from the remote set that the local pass has already produced —
     otherwise every whole food appears twice while a request is in flight. */
  const seen = new Set(local.map((f) => f.id));
  const merged = [
    ...local,
    ...(settled.current === q ? remote : []).filter((f) => !seen.has(f.id)),
  ];

  return { foods: merged, loading, offline };
}
