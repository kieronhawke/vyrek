"use client";

import { useState } from "react";
import Link from "next/link";
import { CLIENTS, type CoachClient } from "@/lib/control/fixtures";
import { newId, useCollection } from "@/lib/control/store";

/**
 * CLIENTS — actually editable.
 *
 * Every admin module rendered a table you could look at. This one you can
 * work: add a client, change their tier, mark a payment, move their
 * programmed-until date, write a flag, pause them, delete them. Changes
 * persist across reloads.
 *
 * They persist in this browser only, because there is still no datastore
 * credential. The banner says so rather than letting an operator believe Ben
 * can see what they just typed. Swapping to a shared database is one driver in
 * lib/control/store.ts.
 */

const TIERS: CoachClient["tier"][] = ["hub", "programming", "coaching", "elite"];
const PAYMENTS: CoachClient["payment"][] = ["paid", "due", "late", "failed"];

const TIER_LABEL: Record<CoachClient["tier"], string> = {
  hub: "Suth Club",
  programming: "Programming",
  coaching: "Coaching",
  elite: "Elite",
};

const PAYMENT_TONE: Record<CoachClient["payment"], string> = {
  paid: "var(--text)",
  due: "var(--text-muted)",
  late: "var(--warn)",
  failed: "var(--danger)",
};

const field: React.CSSProperties = {
  minHeight: 40,
  padding: "6px 8px",
  borderRadius: "var(--radius-input)",
  border: "1px solid var(--border-strong)",
  background: "var(--bg)",
  color: "var(--text)",
  fontSize: "var(--text-sm)",
  fontFamily: "inherit",
  width: "100%",
};

const button: React.CSSProperties = {
  minHeight: 44,
  padding: "0 16px",
  borderRadius: 999,
  border: "1px solid var(--border-strong)",
  background: "var(--surface)",
  color: "var(--text)",
  fontSize: "var(--text-sm)",
  fontWeight: 650,
  cursor: "pointer",
};

export function ClientsManager({ base }: { base: string }) {
  const { items, ready, update, add, remove, reset } = useCollection<CoachClient>(
    "clients",
    CLIENTS,
  );
  const [editing, setEditing] = useState<string | null>(null);
  const [newName, setNewName] = useState("");

  function addClient() {
    const name = newName.trim();
    if (!name) return;
    add({
      id: newId("c", items),
      name,
      programmedUntilDays: 0,
      programmingStatus: "due_soon",
      payment: "due",
      paymentLabel: "Not set",
      billingInDays: 30,
      flags: ["New client, no plan written yet"],
      tier: "programming",
    });
    setNewName("");
  }

  const overdue = items.filter((c) => c.programmedUntilDays < 0).length;
  const late = items.filter((c) => c.payment === "late" || c.payment === "failed").length;

  return (
    <div style={{ display: "grid", gap: "var(--space-3)" }}>
      <p
        style={{
          margin: 0,
          padding: "var(--space-2)",
          border: "1px solid var(--border)",
          borderInlineStart: "3px solid var(--accent)",
          borderRadius: "var(--radius-card)",
          background: "var(--surface)",
          fontSize: "var(--text-sm)",
          lineHeight: 1.55,
        }}
      >
        <strong>These edits are real and they save.</strong> They save to this
        browser only — there is no shared database yet, so Ben will not see
        changes made here. One datastore credential turns this into the real
        thing without touching this screen.
      </p>

      {/* ── Add ───────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", gap: "var(--space-1)", flexWrap: "wrap" }}>
        <label style={{ flex: "1 1 220px" }}>
          <span className="sr-only">New client name</span>
          <input
            aria-label="New client name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") addClient();
            }}
            placeholder="Add a client by name"
            style={{ ...field, minHeight: 44 }}
          />
        </label>
        <button
          type="button"
          onClick={addClient}
          disabled={!newName.trim()}
          style={{
            ...button,
            background: newName.trim() ? "var(--accent)" : "var(--surface)",
            color: newName.trim() ? "var(--accent-ink)" : "var(--text-faint)",
            border: "none",
            cursor: newName.trim() ? "pointer" : "not-allowed",
          }}
        >
          Add client
        </button>
        <button type="button" onClick={reset} style={button}>
          Reset to sample
        </button>
      </div>

      <p className="eyebrow" style={{ margin: 0 }}>
        {items.length} clients · {overdue} need a plan · {late} payment issues
        {ready ? "" : " · loading"}
      </p>

      {/* ── The list ──────────────────────────────────────────────────── */}
      <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: "var(--space-1)" }}>
        {items.map((c) => {
          const isEditing = editing === c.id;
          return (
            <li
              key={c.id}
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
                  justifyContent: "space-between",
                  gap: "var(--space-2)",
                  flexWrap: "wrap",
                }}
              >
                <Link
                  href={`${base}/clients/${c.id}`}
                  style={{
                    fontSize: "var(--text-base)",
                    fontWeight: 700,
                    color: "var(--accent-text)",
                    textDecoration: "none",
                    minHeight: 44,
                    display: "inline-flex",
                    alignItems: "center",
                  }}
                >
                  {c.name}
                </Link>

                <span style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <span className="eyebrow">{TIER_LABEL[c.tier]}</span>
                  <span
                    className="eyebrow"
                    style={{ color: PAYMENT_TONE[c.payment] }}
                  >
                    {c.paymentLabel}
                  </span>
                  <span
                    className="eyebrow"
                    style={{
                      color:
                        c.programmedUntilDays < 0 ? "var(--danger)" : "var(--text-muted)",
                    }}
                  >
                    {c.programmedUntilDays < 0
                      ? `${Math.abs(c.programmedUntilDays)}d overdue`
                      : `${c.programmedUntilDays}d left`}
                  </span>
                </span>

                <button
                  type="button"
                  onClick={() => setEditing(isEditing ? null : c.id)}
                  style={{ ...button, minHeight: 44 }}
                  aria-expanded={isEditing}
                >
                  {isEditing ? "Done" : "Edit"}
                </button>
              </div>

              {isEditing ? (
                <div
                  style={{
                    marginTop: "var(--space-2)",
                    paddingTop: "var(--space-2)",
                    borderTop: "1px solid var(--border)",
                    display: "grid",
                    gap: "var(--space-2)",
                    gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                  }}
                >
                  <label>
                    <span className="eyebrow" style={{ display: "block", marginBottom: 4 }}>
                      Name
                    </span>
                    <input
                      aria-label={`Name for ${c.name}`}
                      value={c.name}
                      onChange={(e) => update(c.id, { name: e.target.value })}
                      style={field}
                    />
                  </label>

                  <label>
                    <span className="eyebrow" style={{ display: "block", marginBottom: 4 }}>
                      Tier
                    </span>
                    <select
                      aria-label={`Tier for ${c.name}`}
                      value={c.tier}
                      onChange={(e) =>
                        update(c.id, { tier: e.target.value as CoachClient["tier"] })
                      }
                      style={field}
                    >
                      {TIERS.map((t) => (
                        <option key={t} value={t}>
                          {TIER_LABEL[t]}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    <span className="eyebrow" style={{ display: "block", marginBottom: 4 }}>
                      Payment
                    </span>
                    <select
                      aria-label={`Payment status for ${c.name}`}
                      value={c.payment}
                      onChange={(e) =>
                        update(c.id, {
                          payment: e.target.value as CoachClient["payment"],
                        })
                      }
                      style={field}
                    >
                      {PAYMENTS.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    <span className="eyebrow" style={{ display: "block", marginBottom: 4 }}>
                      Payment note
                    </span>
                    <input
                      aria-label={`Payment note for ${c.name}`}
                      value={c.paymentLabel}
                      onChange={(e) => update(c.id, { paymentLabel: e.target.value })}
                      style={field}
                    />
                  </label>

                  <label>
                    <span className="eyebrow" style={{ display: "block", marginBottom: 4 }}>
                      Days programmed
                    </span>
                    <input
                      type="number"
                      aria-label={`Days programmed for ${c.name}`}
                      value={c.programmedUntilDays}
                      onChange={(e) =>
                        update(c.id, {
                          programmedUntilDays: Number(e.target.value) || 0,
                        })
                      }
                      style={field}
                    />
                  </label>

                  <label style={{ gridColumn: "1 / -1" }}>
                    <span className="eyebrow" style={{ display: "block", marginBottom: 4 }}>
                      Flags — one per line, plain English
                    </span>
                    <textarea
                      aria-label={`Flags for ${c.name}`}
                      value={c.flags.join("\n")}
                      onChange={(e) =>
                        update(c.id, {
                          flags: e.target.value.split("\n").filter((l) => l.trim()),
                        })
                      }
                      rows={2}
                      style={{ ...field, resize: "vertical" }}
                    />
                  </label>

                  <div style={{ gridColumn: "1 / -1" }}>
                    <button
                      type="button"
                      onClick={() => {
                        if (editing === c.id) setEditing(null);
                        remove(c.id);
                      }}
                      style={{
                        ...button,
                        color: "var(--danger)",
                        borderColor: "var(--danger)",
                      }}
                    >
                      Remove {c.name}
                    </button>
                  </div>
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
