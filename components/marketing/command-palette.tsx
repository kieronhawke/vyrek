"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type CommandItem = {
  label: string;
  href: string;
  group: string;
  hint?: string;
  keywords?: string;
};

const STATIC_ITEMS: CommandItem[] = [
  // Primary actions
  { label: "Find your plan (start quiz)", href: "/quiz", group: "Actions", hint: "→", keywords: "quiz start training plan" },
  { label: "See pricing", href: "/pricing", group: "Actions", keywords: "price subscription cost membership" },
  { label: "See your plan", href: "/plan", group: "Actions", keywords: "week 1 plan" },
  // Programmes
  { label: "First Race programme", href: "/quiz?program=first-race", group: "Programmes", keywords: "first race beginner" },
  { label: "Sub-90 programme", href: "/quiz?program=sub-90", group: "Programmes", keywords: "sub 90 plateau" },
  { label: "Doubles programme", href: "/quiz?program=doubles", group: "Programmes", keywords: "pair team partner" },
  { label: "Pro programme", href: "/quiz?program=pro", group: "Programmes", keywords: "elite qualifier" },
  // Resources
  { label: "Hyrox locations (UK cities)", href: "/hyrox", group: "Resources", keywords: "city local town" },
  { label: "Station guides", href: "/hyrox/stations", group: "Resources", keywords: "sled wall ball burpee farmers" },
  { label: "Race events calendar", href: "/hyrox/events", group: "Resources", keywords: "race date schedule excel manchester" },
  { label: "Gear guides", href: "/hyrox/gear", group: "Resources", keywords: "shoes gloves kit" },
  { label: "Plans by goal time", href: "/plans", group: "Resources", keywords: "sub 60 75 90 100" },
  { label: "Compare to other sports", href: "/compare", group: "Resources", keywords: "crossfit spartan marathon" },
  { label: "Pace calculator", href: "/tools/pace-calculator", group: "Tools", keywords: "predict finish time" },
  // Journal
  { label: "Journal (blog)", href: "/blog", group: "Journal", keywords: "blog articles guides" },
  { label: "How it works", href: "/how-it-works", group: "Company", keywords: "method process" },
  { label: "About", href: "/about", group: "Company" },
  { label: "Press & brand", href: "/press", group: "Company" },
  { label: "Refer & earn £20", href: "/account/refer", group: "Company", keywords: "referral friend" },
  // Settings
  { label: "Contact", href: "/contact", group: "Help" },
];

function fuzzyScore(needle: string, hay: string): number {
  needle = needle.toLowerCase();
  hay = hay.toLowerCase();
  if (!needle) return 1;
  if (hay.includes(needle)) return 10 - (hay.indexOf(needle) / 50);
  // character-sequence match
  let i = 0;
  let score = 0;
  for (const c of hay) {
    if (c === needle[i]) {
      i++;
      score += 1;
      if (i === needle.length) return score / hay.length;
    }
  }
  return 0;
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Open on Cmd/Ctrl-K, or "/" when not focused on an input.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isModK =
        (e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "K");
      const isSlash =
        e.key === "/" &&
        !(e.target instanceof HTMLInputElement) &&
        !(e.target instanceof HTMLTextAreaElement) &&
        !(e.target instanceof HTMLSelectElement);
      if (isModK || isSlash) {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape" && open) {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // Focus input on open. Each setState is intentional — Esc/open-toggle is
  // an external trigger, not a sync reflection of some other render-time
  // value, so the canonical sync-from-event pattern applies.
  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setQuery("");
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setActive(0);
      window.setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  // Lock body scroll while open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const results = useMemo(() => {
    if (!query.trim()) return STATIC_ITEMS;
    const q = query.trim();
    return STATIC_ITEMS.map((it) => ({
      it,
      score: Math.max(
        fuzzyScore(q, it.label),
        fuzzyScore(q, it.keywords ?? ""),
        fuzzyScore(q, it.group),
      ),
    }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((x) => x.it);
  }, [query]);

  // Group results by their group label, preserving the result-order ranking.
  const grouped = useMemo(() => {
    const out: Record<string, CommandItem[]> = {};
    for (const it of results) {
      if (!out[it.group]) out[it.group] = [];
      out[it.group].push(it);
    }
    return out;
  }, [results]);

  const flatResults = results;

  const onSelect = useCallback(
    (idx: number) => {
      const it = flatResults[idx];
      if (!it) return;
      setOpen(false);
      router.push(it.href);
    },
    [flatResults, router],
  );

  useEffect(() => {
    // Reset highlighted row when the filtered list changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setActive(0);
  }, [query]);

  const onKeyDownInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(flatResults.length - 1, a + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      onSelect(active);
    }
  };

  return (
    <>
      {/* Floating hint chip — only visible on >=lg, never on touch */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open command palette"
        className="fixed bottom-4 right-4 z-40 hidden h-10 items-center gap-2 rounded-pill border border-vyrek-border bg-vyrek-elevated/90 px-3 font-mono text-[11px] uppercase tracking-[0.18em] text-vyrek-text-secondary shadow-lg backdrop-blur-md transition-colors hover:text-vyrek-text lg:inline-flex"
      >
        <span aria-hidden>⌘K</span>
        <span>Search</span>
      </button>

      {open ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Command palette"
          className="fixed inset-0 z-[80] flex items-start justify-center px-4 pt-[10vh]"
        >
          <button
            type="button"
            aria-label="Close"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          />
          <div className="relative z-10 w-full max-w-xl overflow-hidden rounded-lg border border-vyrek-border bg-vyrek-elevated shadow-2xl">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onKeyDownInput}
              placeholder="Search routes, programmes, cities, stations…"
              className="h-14 w-full border-b border-vyrek-border-subtle bg-transparent px-5 text-base text-vyrek-text placeholder:text-vyrek-text-tertiary focus:outline-none"
              aria-label="Search"
            />
            <ul role="listbox" className="max-h-[60vh] overflow-y-auto p-2">
              {Object.keys(grouped).length === 0 ? (
                <li className="px-3 py-6 text-center text-sm text-vyrek-text-tertiary">
                  No matches. Try &ldquo;sub 90&rdquo;, &ldquo;london&rdquo;, &ldquo;wall ball&rdquo;.
                </li>
              ) : (
                Object.entries(grouped).map(([group, items]) => (
                  <li key={group}>
                    <p className="px-3 pb-1 pt-3 font-mono text-[10px] uppercase tracking-[0.22em] text-vyrek-text-tertiary">
                      {group}
                    </p>
                    <ul role="group">
                      {items.map((it) => {
                        const flatIdx = flatResults.indexOf(it);
                        const isActive = flatIdx === active;
                        return (
                          <li key={it.href}>
                            <button
                              type="button"
                              onClick={() => onSelect(flatIdx)}
                              onMouseEnter={() => setActive(flatIdx)}
                              className={`flex w-full items-center justify-between gap-3 rounded-md px-3 py-2.5 text-left text-sm transition-colors ${isActive ? "bg-vyrek-overlay text-vyrek-text" : "text-vyrek-text-secondary hover:text-vyrek-text"}`}
                            >
                              <span>{it.label}</span>
                              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-vyrek-text-tertiary">
                                {isActive ? "↵" : it.hint ?? ""}
                              </span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </li>
                ))
              )}
            </ul>
            <div className="flex items-center justify-between gap-3 border-t border-vyrek-border-subtle px-4 py-2.5 font-mono text-[10px] uppercase tracking-[0.18em] text-vyrek-text-tertiary">
              <span>↑↓ navigate · ↵ go</span>
              <span>Esc to close</span>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
