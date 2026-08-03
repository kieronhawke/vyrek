"use client";

import { useState } from "react";
import Link from "next/link";
import { newId, useCollection } from "@/lib/control/store";
import {
  SEED_ATHLETES,
  TIER_LABEL,
  TIER_ORDER,
  URGENCY_LABEL,
  URGENCY_TONE,
  daysLeft,
  monthlyRevenue,
  needsProgramming,
  sortByUrgency,
  urgency,
  type Tier,
  type TrackedAthlete,
} from "@/lib/control/tracker";

/**
 * THE COACH TRACKER.
 *
 * Ben's spreadsheet answers one question — who is programmed until when — and
 * makes you read 27 rows to answer it, because half the dates are typed prose.
 * This answers it before you scroll: everyone due inside the week, most urgent
 * first, each one a click from the builder that fixes it.
 *
 * Everything is editable and persists. Names are his to type in; the seed is
 * deliberately anonymous because the repository is public.
 */

const field: React.CSSProperties = {
  minHeight: 40,
  padding: "6px 8px",
  border: "1px solid var(--border-strong)",
  borderRadius: 4,
  background: "var(--bg)",
  color: "var(--text)",
  fontSize: "var(--text-sm)",
  fontFamily: "inherit",
  width: "100%",
};

const btn: React.CSSProperties = {
  minHeight: 44,
  padding: "0 14px",
  borderRadius: 999,
  border: "1px solid var(--border-strong)",
  background: "var(--surface)",
  color: "var(--text)",
  fontSize: "var(--text-sm)",
  fontWeight: 650,
  cursor: "pointer",
};

const money = (n: number) =>
  new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0,
  }).format(n);

function planHref(base: string, a: TrackedAthlete) {
  return `${base}/plans/${a.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
}

export function CoachTracker({ base }: { base: string }) {
  const { items, update, add, remove, reset } = useCollection<TrackedAthlete>(
    "tracker",
    SEED_ATHLETES,
  );
  const [editing, setEditing] = useState<string | null>(null);
  const [newName, setNewName] = useState("");

  const due = needsProgramming(items);
  const noPayment = items.filter((a) => !a.paymentSet);

  function addAthlete() {
    const name = newName.trim();
    if (!name) return;
    add({
      id: newId("a", items),
      name,
      tier: "tier2",
      programmedUntil: null,
      note: "New — no plan written yet",
      monthly: 95,
      paymentSet: false,
    });
    setNewName("");
  }

  return (
    <div style={{ display: "grid", gap: "var(--space-3)" }}>
      {/* ── The answer, before the list ───────────────────────────────── */}
      <section
        style={{
          border: "1px solid var(--border)",
          borderInlineStart: `3px solid ${due.length ? "var(--danger)" : "var(--accent)"}`,
          borderRadius: "var(--radius-card)",
          background: "var(--surface)",
        }}
      >
        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: "var(--space-2)",
            flexWrap: "wrap",
            padding: "var(--space-2)",
            borderBottom: due.length ? "1px solid var(--border)" : "none",
          }}
        >
          <h2 className="eyebrow" style={{ margin: 0 }}>
            Needs a plan this week · {due.length}
          </h2>
          <span className="eyebrow">
            {items.length} athletes · {money(monthlyRevenue(items))} a month
            {noPayment.length ? ` · ${noPayment.length} without a card` : ""}
          </span>
        </header>

        {due.length ? (
          <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {due.map((a, i) => {
              const u = urgency(a);
              const d = daysLeft(a);
              return (
                <li
                  key={a.id}
                  style={{ borderTop: i === 0 ? "none" : "1px solid var(--border)" }}
                >
                  <Link
                    href={planHref(base, a)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "var(--space-2)",
                      minHeight: 48,
                      padding: "0 var(--space-2)",
                      textDecoration: "none",
                      color: "inherit",
                      flexWrap: "wrap",
                    }}
                  >
                    <span style={{ fontWeight: 650, flex: "1 1 140px" }}>{a.name}</span>
                    <span className="eyebrow">{TIER_LABEL[a.tier]}</span>
                    <span
                      className="num"
                      style={{ color: URGENCY_TONE[u], fontWeight: 700, fontSize: "var(--text-xs)" }}
                    >
                      {d === null
                        ? URGENCY_LABEL[u]
                        : d < 0
                          ? `${Math.abs(d)}d overdue`
                          : `${d}d left`}
                    </span>
                    <span style={{ color: "var(--accent-text)", fontWeight: 650, fontSize: "var(--text-sm)" }}>
                      Write it →
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <p style={{ margin: 0, padding: "var(--space-2)", fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>
            Everyone is programmed for the week ahead.
          </p>
        )}
      </section>

      {/* ── Add ───────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", gap: "var(--space-1)", flexWrap: "wrap" }}>
        <input
          aria-label="New athlete name"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addAthlete()}
          placeholder="Add an athlete"
          style={{ ...field, minHeight: 44, flex: "1 1 220px" }}
        />
        <button
          type="button"
          onClick={addAthlete}
          disabled={!newName.trim()}
          style={{
            ...btn,
            border: "none",
            background: newName.trim() ? "var(--accent)" : "var(--surface)",
            color: newName.trim() ? "var(--accent-ink)" : "var(--text-faint)",
            cursor: newName.trim() ? "pointer" : "not-allowed",
          }}
        >
          Add
        </button>
        <button type="button" onClick={reset} style={btn}>
          Reset
        </button>
      </div>

      {/* ── The book, by tier ─────────────────────────────────────────── */}
      {TIER_ORDER.map((tier) => {
        const group = sortByUrgency(items.filter((a) => a.tier === tier));
        if (!group.length) return null;
        return (
          <section key={tier}>
            <h2 className="eyebrow" style={{ margin: "0 0 var(--space-1)" }}>
              {TIER_LABEL[tier]} · {group.length} · {money(monthlyRevenue(group))} a month
            </h2>
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 4 }}>
              {group.map((a) => {
                const u = urgency(a);
                const d = daysLeft(a);
                const open = editing === a.id;
                return (
                  <li
                    key={a.id}
                    style={{
                      border: "1px solid var(--border)",
                      borderRadius: "var(--radius-card)",
                      background: "var(--surface)",
                      padding: "var(--space-2)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "var(--space-2)",
                        flexWrap: "wrap",
                      }}
                    >
                      <span style={{ fontWeight: 650, flex: "1 1 130px" }}>{a.name}</span>

                      <span
                        className="num"
                        style={{
                          fontSize: "var(--text-xs)",
                          fontWeight: 700,
                          color: URGENCY_TONE[u],
                        }}
                      >
                        {d === null
                          ? URGENCY_LABEL[u]
                          : d < 0
                            ? `${Math.abs(d)}d overdue`
                            : `${d}d left`}
                      </span>

                      {a.note ? <span className="eyebrow">{a.note}</span> : null}
                      {!a.paymentSet ? (
                        <span className="eyebrow" style={{ color: "var(--warn)" }}>
                          No card
                        </span>
                      ) : null}

                      <Link
                        href={planHref(base, a)}
                        style={{
                          ...btn,
                          display: "inline-flex",
                          alignItems: "center",
                          textDecoration: "none",
                        }}
                      >
                        Plan
                      </Link>
                      <button
                        type="button"
                        onClick={() => setEditing(open ? null : a.id)}
                        style={btn}
                        aria-expanded={open}
                      >
                        {open ? "Done" : "Edit"}
                      </button>
                    </div>

                    {open ? (
                      <div
                        style={{
                          marginTop: "var(--space-2)",
                          paddingTop: "var(--space-2)",
                          borderTop: "1px solid var(--border)",
                          display: "grid",
                          gap: "var(--space-2)",
                          gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
                        }}
                      >
                        <label>
                          <span className="eyebrow" style={{ display: "block", marginBottom: 4 }}>Name</span>
                          <input
                            aria-label={`Name for ${a.name}`}
                            value={a.name}
                            onChange={(e) => update(a.id, { name: e.target.value })}
                            style={field}
                          />
                        </label>
                        <label>
                          <span className="eyebrow" style={{ display: "block", marginBottom: 4 }}>Tier</span>
                          <select
                            aria-label={`Tier for ${a.name}`}
                            value={a.tier}
                            onChange={(e) => update(a.id, { tier: e.target.value as Tier })}
                            style={field}
                          >
                            {TIER_ORDER.map((t) => (
                              <option key={t} value={t}>{TIER_LABEL[t]}</option>
                            ))}
                          </select>
                        </label>
                        <label>
                          <span className="eyebrow" style={{ display: "block", marginBottom: 4 }}>
                            Programmed until
                          </span>
                          <input
                            type="date"
                            aria-label={`Programmed until for ${a.name}`}
                            value={a.programmedUntil ?? ""}
                            onChange={(e) =>
                              update(a.id, { programmedUntil: e.target.value || null })
                            }
                            style={field}
                          />
                        </label>
                        <label>
                          <span className="eyebrow" style={{ display: "block", marginBottom: 4 }}>
                            Monthly (£)
                          </span>
                          <input
                            type="number"
                            aria-label={`Monthly fee for ${a.name}`}
                            value={a.monthly}
                            onChange={(e) =>
                              update(a.id, { monthly: Number(e.target.value) || 0 })
                            }
                            style={field}
                          />
                        </label>
                        <label style={{ gridColumn: "1 / -1" }}>
                          <span className="eyebrow" style={{ display: "block", marginBottom: 4 }}>
                            Note
                          </span>
                          <input
                            aria-label={`Note for ${a.name}`}
                            value={a.note}
                            onChange={(e) => update(a.id, { note: e.target.value })}
                            placeholder="Ankle, return date TBC, share doc…"
                            style={field}
                          />
                        </label>
                        <div style={{ gridColumn: "1 / -1", display: "flex", gap: "var(--space-1)", flexWrap: "wrap" }}>
                          <button
                            type="button"
                            onClick={() => update(a.id, { paymentSet: !a.paymentSet })}
                            style={btn}
                          >
                            {a.paymentSet ? "Mark card missing" : "Mark card on file"}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditing(null);
                              remove(a.id);
                            }}
                            style={{ ...btn, color: "var(--danger)", borderColor: "var(--danger)" }}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}

      <p style={{ margin: 0, fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
        Saves to this browser. The seed is deliberately anonymous — this
        repository is public, so Ben&apos;s client list is not in it. Type the
        real names in and they stay on this machine. Weekly &quot;plan due&quot;
        emails need Resend connecting.
      </p>
    </div>
  );
}
