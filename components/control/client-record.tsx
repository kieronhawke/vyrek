"use client";

import { useState } from "react";
import type { CoachClient } from "@/lib/control/fixtures";

/**
 * THE CLIENT RECORD — one screen, everything about one person.
 *
 * The admin could list clients and open a row that showed the same fields
 * again. What Ben actually does when he opens a client is decide one of four
 * things: do they need a plan, have they paid, are they in trouble, and what
 * did they last say. That is the order this screen is in.
 *
 * WHAT IS DELIBERATELY HERE
 * -------------------------
 *   - Flags in plain English at the top, because spec/14 §9 forbids showing a
 *     flag name and this is where they matter most.
 *   - The actions are on the record, not behind a menu. Writing a plan is the
 *     job; it should not take two clicks to reach from the person it is for.
 *   - An internal note box. Every coach keeps these somewhere, and if the tool
 *     has nowhere for them they end up in a phone note nobody else can read.
 *
 * NOT CONNECTED. Notes are held in component state and the actions say what
 * they would do. The point of the mock is to agree what a client record has
 * to hold before the schema is written.
 */

type Note = { id: string; when: string; body: string };

const SEED_NOTES: Note[] = [
  {
    id: "n1",
    when: "Sun 26 Jul",
    body: "Said the sled push is where she loses the most time. Building the block around it.",
  },
  {
    id: "n2",
    when: "Tue 8 Jul",
    body: "Back from a calf niggle. Keep run volume flat for a fortnight before adding.",
  },
];

const PAYMENT_TONE: Record<CoachClient["payment"], string> = {
  paid: "var(--ok)",
  due: "var(--text)",
  late: "var(--warn)",
  failed: "var(--danger)",
};

const TIER_LABEL: Record<CoachClient["tier"], string> = {
  hub: "Suth Club",
  programming: "Programming",
  coaching: "Coaching",
  elite: "Elite",
};

function Panel({
  title,
  right,
  children,
}: {
  title: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section
      style={{
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-card)",
        background: "var(--surface)",
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: "var(--space-2)",
          padding: "var(--space-2)",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <h2 className="eyebrow" style={{ margin: 0 }}>
          {title}
        </h2>
        {right}
      </header>
      <div style={{ padding: "var(--space-2)" }}>{children}</div>
    </section>
  );
}

function Stat({
  label,
  value,
  tone,
  sub,
  /** The mono face is for numbers. A tier name set in it wraps like code. */
  mono = true,
}: {
  label: string;
  value: string;
  tone?: string;
  sub?: string;
  mono?: boolean;
}) {
  return (
    <div
      style={{
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-card)",
        background: "var(--surface)",
        padding: "var(--space-2)",
        display: "grid",
        gap: 2,
        minWidth: 0,
      }}
    >
      <span className="eyebrow">{label}</span>
      <span
        className={mono ? "num" : undefined}
        style={{
          fontSize: mono ? "var(--text-xl)" : "var(--text-lg)",
          fontWeight: 700,
          letterSpacing: "-0.02em",
          lineHeight: 1.2,
          color: tone ?? "var(--text)",
        }}
      >
        {value}
      </span>
      {sub ? (
        <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
          {sub}
        </span>
      ) : null}
    </div>
  );
}

const actionStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 48,
  padding: "0 var(--space-3)",
  borderRadius: 999,
  border: "1px solid var(--border)",
  background: "var(--surface)",
  color: "var(--text)",
  fontSize: "var(--text-sm)",
  fontWeight: 650,
  textDecoration: "none",
  cursor: "pointer",
};

export function ClientRecord({
  client,
  planHref,
}: {
  client: CoachClient;
  planHref: string;
}) {
  const [notes, setNotes] = useState<Note[]>(SEED_NOTES);
  const [draft, setDraft] = useState("");
  const [did, setDid] = useState<string | null>(null);

  const overdue = client.programmedUntilDays < 0;
  const programmed = overdue
    ? `${Math.abs(client.programmedUntilDays)}d overdue`
    : `${client.programmedUntilDays}d left`;

  function addNote() {
    const body = draft.trim();
    if (!body) return;
    setNotes((n) => [
      { id: `n${n.length + 1}`, when: "Just now", body },
      ...n,
    ]);
    setDraft("");
  }

  return (
    <div style={{ display: "grid", gap: "var(--space-3)" }}>
      {/* ── Needs attention ───────────────────────────────────────────── */}
      {client.flags.length > 0 ? (
        <section
          style={{
            border: "1px solid var(--border)",
            borderLeft: "3px solid var(--warn)",
            borderRadius: "var(--radius-card)",
            background: "var(--surface)",
            padding: "var(--space-2)",
          }}
        >
          <h2 className="eyebrow" style={{ margin: "0 0 6px" }}>
            Needs attention
          </h2>
          <ul style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 4 }}>
            {client.flags.map((f) => (
              <li key={f} style={{ fontSize: "var(--text-sm)" }}>
                {f}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* ── The four things ───────────────────────────────────────────── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
          gap: "var(--space-1)",
        }}
      >
        <Stat
          label="Programmed"
          value={programmed}
          tone={overdue ? "var(--danger)" : undefined}
          sub={overdue ? "write a plan now" : "until they run out"}
        />
        <Stat
          label="Payment"
          mono={false}
          value={client.paymentLabel}
          tone={PAYMENT_TONE[client.payment]}
          sub={`bills in ${client.billingInDays}d`}
        />
        <Stat
          label="Next race"
          value={client.nextRace ? `${client.nextRace.inDays}d` : "None"}
          sub={
            client.nextRace
              ? `${client.nextRace.name} · ${client.nextRace.priority} race`
              : "no race entered"
          }
        />
        <Stat label="Tier" value={TIER_LABEL[client.tier]} mono={false} />
      </div>

      {/* ── Actions ───────────────────────────────────────────────────── */}
      <div style={{ display: "flex", gap: "var(--space-1)", flexWrap: "wrap" }}>
        <a
          href={planHref}
          style={{
            ...actionStyle,
            background: "var(--accent)",
            color: "var(--accent-ink)",
            border: "none",
            flex: "1 1 180px",
          }}
        >
          Write next plan
        </a>
        {[
          ["Message", "open a thread with them"],
          ["Log a call", "record that you spoke"],
          ["Pause", "stop billing and programming"],
        ].map(([label, what]) => (
          <button
            key={label}
            type="button"
            onClick={() => setDid(what)}
            style={actionStyle}
          >
            {label}
          </button>
        ))}
      </div>

      {did ? (
        <p
          role="status"
          style={{
            margin: 0,
            padding: "var(--space-2)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-card)",
            background: "var(--surface-raised)",
            fontSize: "var(--text-sm)",
          }}
        >
          Not connected — this would {did}.
        </p>
      ) : null}

      {/* ── What they last said ───────────────────────────────────────── */}
      <Panel title="Their feedback" right={<span className="eyebrow">Last week</span>}>
        <ul style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 6 }}>
          <li style={{ fontSize: "var(--text-sm)" }}>
            <strong>Tue</strong> —{" "}
            <span style={{ color: "var(--danger)" }}>said too hard</span> —{" "}
            <span style={{ color: "var(--text-muted)" }}>
              “Sled turned into a grind by round 4.”
            </span>
          </li>
          <li style={{ fontSize: "var(--text-sm)" }}>
            <strong>Thu</strong> —{" "}
            <span style={{ color: "var(--info)" }}>said too easy</span> —{" "}
            <span style={{ color: "var(--text-muted)" }}>
              “Could have gone another 20 minutes.”
            </span>
          </li>
        </ul>
      </Panel>

      {/* ── Internal notes ────────────────────────────────────────────── */}
      <Panel
        title="Coach notes"
        right={<span className="eyebrow">Not shown to them</span>}
      >
        <label style={{ display: "block", marginBottom: "var(--space-1)" }}>
          <span className="sr-only">Add a note about {client.name}</span>
          <textarea
            aria-label={`Add a note about ${client.name}`}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={2}
            placeholder="Something you want to remember next time you write their plan."
            style={{
              width: "100%",
              padding: "8px 10px",
              borderRadius: "var(--radius-input)",
              border: "1px solid var(--border)",
              background: "var(--surface-raised)",
              color: "var(--text)",
              fontSize: "var(--text-sm)",
              fontFamily: "inherit",
              resize: "vertical",
            }}
          />
        </label>
        <button
          type="button"
          onClick={addNote}
          disabled={!draft.trim()}
          style={{
            ...actionStyle,
            width: "100%",
            opacity: draft.trim() ? 1 : 0.5,
            cursor: draft.trim() ? "pointer" : "not-allowed",
          }}
        >
          Add note
        </button>

        <ul style={{ listStyle: "none", margin: "var(--space-2) 0 0", padding: 0, display: "grid", gap: "var(--space-1)" }}>
          {notes.map((n) => (
            <li
              key={n.id}
              style={{
                borderTop: "1px solid var(--border)",
                paddingTop: "var(--space-1)",
              }}
            >
              <p className="eyebrow" style={{ margin: "0 0 2px" }}>
                {n.when}
              </p>
              <p style={{ margin: 0, fontSize: "var(--text-sm)", lineHeight: 1.5 }}>
                {n.body}
              </p>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}
