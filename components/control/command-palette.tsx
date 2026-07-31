"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { listCoachClients, listLeads } from "@/lib/control/fixtures";

/**
 * THE COMMAND PALETTE — docs/build-pack/spec/14 §5.
 *
 * "This is how a power user actually operates a control panel, and it's the
 * difference between 'good admin' and 'best admin'. Ship it in Phase A, not
 * as polish."
 *
 * Jump to any client, lead or page, and run any action. Actions are declared
 * here with the route or handler they trigger, so adding one in a later phase
 * is a single entry rather than a new surface.
 *
 * Budget: spec/16 §4 requires it to open in under 100ms from keypress. It is
 * mounted but hidden rather than lazily imported, and the list is filtered
 * synchronously in memory, so opening is a state flip.
 */

type Item = {
  id: string;
  label: string;
  hint?: string;
  group: "Clients" | "Leads" | "Go to" | "Actions";
  href?: string;
  keywords?: string;
};

const PAGES: Item[] = [
  { id: "p_today", label: "Today", group: "Go to", href: "/coach", keywords: "coach dashboard" },
  { id: "p_clients", label: "Clients", group: "Go to", href: "/coach/clients" },
  { id: "p_plans", label: "Plans", group: "Go to", href: "/coach/plans" },
  { id: "p_messages", label: "Messages", group: "Go to", href: "/coach/messages" },
  { id: "p_diary", label: "Diary", group: "Go to", href: "/coach/diary" },
  {
    id: "p_design",
    label: "Design system",
    group: "Go to",
    href: "/control-preview",
    keywords: "tokens split bar reference",
  },
];

/**
 * Actions are listed but not yet wired: the phases that own them have not
 * been built. They render disabled with an honest reason rather than being
 * hidden, so the shape of the tool is visible from day one — and so nothing
 * silently does nothing when clicked.
 */
const PENDING_ACTIONS: Item[] = [
  { id: "a_pay", label: "Send payment link", group: "Actions", hint: "Phase C" },
  { id: "a_paid", label: "Mark as paid", group: "Actions", hint: "Phase C" },
  { id: "a_plan", label: "Build next block", group: "Actions", hint: "Phase D" },
  { id: "a_msg", label: "Send a message", group: "Actions", hint: "Phase E" },
];

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const items = useMemo<Item[]>(() => {
    const clients: Item[] = listCoachClients().map((c) => ({
      id: `c:${c.id}`,
      label: c.name,
      hint:
        c.programmedUntilDays < 0
          ? "programming overdue"
          : `${c.programmedUntilDays} days programmed`,
      group: "Clients",
      href: `/coach/clients#${c.id}`,
    }));
    const leads: Item[] = listLeads().map((l) => ({
      id: `l:${l.id}`,
      label: l.name,
      hint: l.segment,
      group: "Leads",
      href: `/coach/clients#${l.id}`,
    }));
    return [...clients, ...leads, ...PAGES, ...PENDING_ACTIONS];
  }, []);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items.slice(0, 12);
    return items
      .filter((i) =>
        `${i.label} ${i.hint ?? ""} ${i.keywords ?? ""} ${i.group}`
          .toLowerCase()
          .includes(q),
      )
      .slice(0, 12);
  }, [items, query]);

  // Opening always starts from a clean query. Done here rather than in an
  // effect on `open`: resetting state in an effect triggers a second render
  // pass every time the palette opens, which is exactly the wrong place to
  // spend frames when spec/16 §4 budgets 100ms from keypress to open.
  const openPalette = useCallback(() => {
    setQuery("");
    setIndex(0);
    setOpen(true);
  }, []);

  // ⌘K / Ctrl-K anywhere, Escape to close.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => {
          if (o) return false;
          setQuery("");
          setIndex(0);
          return true;
        });
        return;
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!open) return;
    // Focus after paint so the caret lands reliably on mobile Safari.
    const id = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(id);
  }, [open]);

  function choose(item: Item) {
    if (!item.href) return; // pending action, deliberately inert
    setOpen(false);
    router.push(item.href);
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={openPalette}
        aria-keyshortcuts="Meta+K Control+K"
        style={{
          minHeight: 44,
          minWidth: 44,
          display: "inline-flex",
          alignItems: "center",
          gap: "var(--space-1)",
          padding: "0 var(--space-2)",
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-button)",
          color: "var(--text-muted)",
          fontSize: "var(--text-xs)",
          cursor: "pointer",
        }}
      >
        <span aria-hidden>⌘K</span>
        <span>Search</span>
      </button>
    );
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
      onClick={(e) => {
        if (e.target === e.currentTarget) setOpen(false);
      }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 60,
        background: "rgba(0,0,0,0.6)",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        padding: "var(--space-4) var(--space-2)",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 560,
          background: "var(--surface-raised)",
          border: "1px solid var(--border-strong)",
          borderRadius: "var(--radius-card)",
          overflow: "hidden",
        }}
      >
        <label htmlFor="cp-input" className="eyebrow" style={{ display: "block", padding: "var(--space-2) var(--space-2) 0" }}>
          Search or run a command
        </label>
        <input
          id="cp-input"
          ref={inputRef}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIndex(0);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setIndex((i) => Math.min(i + 1, results.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setIndex((i) => Math.max(i - 1, 0));
            } else if (e.key === "Enter" && results[index]) {
              e.preventDefault();
              choose(results[index]);
            }
          }}
          placeholder="Client, lead, page or action"
          autoComplete="off"
          style={{
            width: "100%",
            minHeight: 44,
            padding: "var(--space-1) var(--space-2)",
            background: "transparent",
            border: "none",
            borderBottom: "1px solid var(--border)",
            borderRadius: 0,
            color: "var(--text)",
            fontSize: "var(--text-base)",
            outline: "none",
          }}
        />

        <ul role="listbox" aria-label="Results" style={{ listStyle: "none", margin: 0, padding: 0, maxHeight: "50svh", overflowY: "auto" }}>
          {results.length === 0 ? (
            <li style={{ padding: "var(--space-2)", color: "var(--text-muted)" }}>
              Nothing matches “{query}”.
            </li>
          ) : (
            results.map((item, i) => {
              const pending = !item.href;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={i === index}
                    aria-disabled={pending || undefined}
                    onMouseEnter={() => setIndex(i)}
                    onClick={() => choose(item)}
                    style={{
                      width: "100%",
                      minHeight: 44,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "var(--space-2)",
                      padding: "0 var(--space-2)",
                      background: i === index ? "var(--surface)" : "transparent",
                      border: "none",
                      borderRadius: 0,
                      color: pending ? "var(--text-faint)" : "var(--text)",
                      textAlign: "left",
                      fontSize: "var(--text-sm)",
                      cursor: pending ? "not-allowed" : "pointer",
                    }}
                  >
                    <span style={{ display: "flex", alignItems: "baseline", gap: "var(--space-1)", minWidth: 0 }}>
                      <span className="eyebrow" style={{ flexShrink: 0 }}>
                        {item.group}
                      </span>
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {item.label}
                      </span>
                    </span>
                    {item.hint ? (
                      <span style={{ color: "var(--text-muted)", fontSize: "var(--text-xs)", flexShrink: 0 }}>
                        {item.hint}
                      </span>
                    ) : null}
                  </button>
                </li>
              );
            })
          )}
        </ul>
      </div>
    </div>
  );
}
