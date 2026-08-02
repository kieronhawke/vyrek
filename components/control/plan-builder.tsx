"use client";

import { useMemo, useState } from "react";

/**
 * THE PLAN BUILDER — where Ben actually sets a week.
 *
 * The athlete side can now show a plan and answer back to it. Nothing could
 * write one. This is the other half of that loop, and it is deliberately built
 * around three things rather than around a form:
 *
 *   1. LAST WEEK'S FEEDBACK IS ON THE SAME SCREEN. The athlete's verdict on
 *      each session sits next to the session Ben is about to write. A coach
 *      who has to open a second screen to see "too hard" will not open it.
 *   2. THE COACH'S NOTE BLOCKS SENDING. HARD-RULES §3 already says a plan
 *      without a note cannot be sent; the Plans table surfaces it as a column
 *      rather than as a rule, and this enforces it at the button.
 *   3. COPY LAST WEEK IS THE DEFAULT ACTION. Real programming is mostly
 *      progression from what came before, not composition from nothing.
 *
 * NOT CONNECTED. There is no plans table, so this holds a week in component
 * state and says exactly what would happen on send. The shape below is the
 * thing worth agreeing now, because it is what the schema has to store.
 */

type SessionType = "rest" | "run" | "strength" | "intervals" | "simulation";

type Session = {
  day: string;
  type: SessionType;
  title: string;
  durationMin: number;
  detail: string;
  /** What the athlete said about the equivalent session last week. */
  lastWeek?: { verdict: "easy" | "good" | "hard"; note?: string };
};

const TYPES: SessionType[] = ["rest", "run", "strength", "intervals", "simulation"];

const VERDICT_LABEL = {
  easy: "Said too easy",
  good: "Said about right",
  hard: "Said too hard",
} as const;

const VERDICT_TONE = {
  easy: "var(--info)",
  good: "var(--ok)",
  hard: "var(--danger)",
} as const;

const SEED: Session[] = [
  { day: "Mon", type: "rest", title: "Rest", durationMin: 0, detail: "" },
  {
    day: "Tue", type: "intervals", title: "Hyrox hybrid: run + sled",
    durationMin: 60,
    detail: "6 rounds: 1 km run at threshold + 30 m sled push at 60% race weight + 90s easy",
    lastWeek: { verdict: "hard", note: "Sled turned into a grind by round 4." },
  },
  {
    day: "Wed", type: "strength", title: "Strength A: hinge + pull",
    durationMin: 55, detail: "Deadlift 4x5, weighted pull-up 4x6, farmers carry 4x40m",
    lastWeek: { verdict: "good" },
  },
  {
    day: "Thu", type: "run", title: "Easy aerobic, conversational pace",
    durationMin: 45, detail: "8 km, nose-breathing, stop if pace drifts",
    lastWeek: { verdict: "easy", note: "Could have gone another 20 minutes." },
  },
  { day: "Fri", type: "rest", title: "Rest or mobility", durationMin: 0, detail: "" },
  {
    day: "Sat", type: "simulation", title: "Race simulation, 4 stations + 4 km",
    durationMin: 70, detail: "Ski, sled push, burpee broad jump, wall balls. 1 km between each.",
    lastWeek: { verdict: "good" },
  },
  {
    day: "Sun", type: "run", title: "Long aerobic", durationMin: 80,
    detail: "14-16 km steady", lastWeek: { verdict: "good" },
  },
];

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label style={{ display: "block" }}>
      <span className="eyebrow" style={{ display: "block", marginBottom: 4 }}>
        {label}
      </span>
      {children}
    </label>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  minHeight: 44,
  padding: "8px 10px",
  borderRadius: "var(--radius-input)",
  border: "1px solid var(--border)",
  background: "var(--surface)",
  color: "var(--text)",
  fontSize: "var(--text-sm)",
  fontFamily: "inherit",
};

export function PlanBuilder({ client }: { client: string }) {
  const [week, setWeek] = useState<Session[]>(SEED);
  const [note, setNote] = useState("");
  const [sent, setSent] = useState(false);

  const sessions = week.filter((s) => s.type !== "rest").length;
  const totalMin = week.reduce((a, s) => a + s.durationMin, 0);
  const canSend = note.trim().length >= 20 && !sent;

  const flagged = useMemo(
    () => week.filter((s) => s.lastWeek && s.lastWeek.verdict !== "good"),
    [week],
  );

  function update(i: number, patch: Partial<Session>) {
    setWeek((w) => w.map((s, j) => (j === i ? { ...s, ...patch } : s)));
    setSent(false);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
      {/* ── What the athlete said ─────────────────────────────────────── */}
      {flagged.length > 0 ? (
        <section
          style={{
            border: "1px solid var(--border)",
            borderLeft: "3px solid var(--accent)",
            borderRadius: "var(--radius-card)",
            background: "var(--surface)",
            padding: "var(--space-2)",
          }}
        >
          <p className="eyebrow" style={{ margin: "0 0 var(--space-1)" }}>
            {client} flagged {flagged.length} session
            {flagged.length === 1 ? "" : "s"} last week
          </p>
          <ul style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 6 }}>
            {flagged.map((s) => (
              <li key={s.day} style={{ fontSize: "var(--text-sm)" }}>
                <strong>{s.day}</strong> —{" "}
                <span style={{ color: VERDICT_TONE[s.lastWeek!.verdict] }}>
                  {VERDICT_LABEL[s.lastWeek!.verdict].toLowerCase()}
                </span>
                {s.lastWeek!.note ? (
                  <span style={{ color: "var(--text-muted)" }}> — “{s.lastWeek!.note}”</span>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* ── The week ──────────────────────────────────────────────────── */}
      <section style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
        {week.map((s, i) => (
          <div
            key={s.day}
            style={{
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-card)",
              background: s.type === "rest" ? "var(--surface-raised)" : "var(--surface)",
              padding: "var(--space-2)",
              display: "grid",
              gap: "var(--space-2)",
              gridTemplateColumns: "minmax(0, 1fr)",
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
              <strong style={{ fontSize: "var(--text-base)" }}>{s.day}</strong>
              {s.lastWeek ? (
                <span
                  style={{
                    fontSize: "var(--text-2xs)",
                    fontWeight: 650,
                    color: VERDICT_TONE[s.lastWeek.verdict],
                  }}
                >
                  {VERDICT_LABEL[s.lastWeek.verdict]}
                </span>
              ) : null}
            </div>

            <div
              style={{
                display: "grid",
                gap: "var(--space-2)",
                gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
              }}
            >
              <Field label="Type">
                <select
                  value={s.type}
                  onChange={(e) =>
                    update(i, { type: e.target.value as SessionType })
                  }
                  style={inputStyle}
                >
                  {TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Minutes">
                <input
                  type="number"
                  min={0}
                  max={240}
                  value={s.durationMin}
                  onChange={(e) =>
                    update(i, { durationMin: Number(e.target.value) || 0 })
                  }
                  style={inputStyle}
                />
              </Field>
            </div>

            <Field label="Title">
              <input
                type="text"
                value={s.title}
                onChange={(e) => update(i, { title: e.target.value })}
                style={inputStyle}
              />
            </Field>

            {s.type !== "rest" ? (
              <Field label="What they actually do">
                <textarea
                  value={s.detail}
                  onChange={(e) => update(i, { detail: e.target.value })}
                  rows={2}
                  style={{ ...inputStyle, resize: "vertical" }}
                />
              </Field>
            ) : null}
          </div>
        ))}
      </section>

      {/* ── The note that gates the send ──────────────────────────────── */}
      <section
        style={{
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-card)",
          background: "var(--surface)",
          padding: "var(--space-2)",
        }}
      >
        <Field label="Coach's note — sent at the top of their plan">
          <textarea
            value={note}
            onChange={(e) => {
              setNote(e.target.value);
              setSent(false);
            }}
            rows={4}
            placeholder="What this week is for, and what you want them to do differently."
            style={{ ...inputStyle, resize: "vertical" }}
          />
        </Field>
        <p
          style={{
            margin: "6px 0 0",
            fontSize: "var(--text-xs)",
            color: note.trim().length >= 20 ? "var(--text-muted)" : "var(--warn)",
          }}
        >
          {note.trim().length >= 20
            ? `${sessions} sessions · ${Math.round(totalMin / 60)}h ${totalMin % 60}m total`
            : "A plan without a note cannot be sent. Write at least a sentence."}
        </p>
      </section>

      {/* ── Send ──────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", gap: "var(--space-1)", flexWrap: "wrap" }}>
        <button
          type="button"
          disabled={!canSend}
          onClick={() => setSent(true)}
          style={{
            flex: "1 1 200px",
            minHeight: 48,
            borderRadius: 999,
            border: "none",
            background: canSend ? "var(--accent)" : "var(--surface-raised)",
            color: canSend ? "var(--accent-ink)" : "var(--text-faint)",
            fontSize: "var(--text-base)",
            fontWeight: 700,
            cursor: canSend ? "pointer" : "not-allowed",
          }}
        >
          Send to {client}
        </button>
        <button
          type="button"
          onClick={() => {
            setWeek(SEED);
            setSent(false);
          }}
          style={{
            flex: "0 1 auto",
            minHeight: 48,
            padding: "0 var(--space-3)",
            borderRadius: 999,
            border: "1px solid var(--border)",
            background: "var(--surface)",
            color: "var(--text)",
            fontSize: "var(--text-sm)",
            fontWeight: 650,
            cursor: "pointer",
          }}
        >
          Copy last week
        </button>
      </div>

      {sent ? (
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
          <strong>Not sent — nothing is connected yet.</strong> With a plans
          table and messaging wired, this would write the week to {client}
          &apos;s plan, push a notification, and start the delivery tracking the
          build pack asks for: first open, and a nudge if it is still unopened
          after 48 hours.
        </p>
      ) : null}
    </div>
  );
}
