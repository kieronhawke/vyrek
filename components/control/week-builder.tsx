"use client";

import { useMemo, useState } from "react";
import {
  SEED_WEEK,
  sessionCount,
  type PlanWeek,
  type Slot,
} from "@/lib/plan/model";
import {
  BLOCK_LIBRARY,
  CATEGORIES,
  appendBlock,
  type BlockCategory,
  type PlanBlock,
} from "@/lib/plan/blocks";
import { useRecord } from "@/lib/control/store";

/**
 * THE PLAN BUILDER.
 *
 * Built to the shape of "Haseeb Training.xlsx": seven day columns, an AM row
 * and a PM row, a notes row, and a weekly running volume. That is not a
 * coincidence or a homage — it is the layout Ben already works in, and the
 * only test that matters is whether this is faster than the spreadsheet.
 *
 * So: free text in every cell, no required fields, no forms. The library on
 * the left is a shortcut, never a constraint — every block is written the way
 * he writes it, and dropping one appends rather than replaces, because a
 * session is usually two or three stacked and there is no undo yet.
 *
 * Autosaves on every keystroke. He is replacing a spreadsheet that saves
 * itself; a builder that can lose an evening's programming would not survive
 * first contact.
 */

const cellText: React.CSSProperties = {
  width: "100%",
  minHeight: 132,
  padding: "8px 10px",
  border: "1px solid var(--border)",
  borderRadius: 4,
  background: "var(--bg)",
  color: "var(--text)",
  fontSize: "var(--text-xs)",
  lineHeight: 1.5,
  fontFamily: "inherit",
  resize: "vertical",
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

export function WeekBuilder({ client }: { client: string }) {
  const storeKey = `plan.${client.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  const { value: week, save, reset } = useRecord<PlanWeek>(storeKey, SEED_WEEK);

  const [category, setCategory] = useState<BlockCategory>("HYROX");
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const blocks = useMemo(
    () => BLOCK_LIBRARY.filter((b) => b.category === category),
    [category],
  );

  function setCell(dayIndex: number, slot: Slot, text: string) {
    save({
      ...week,
      days: week.days.map((d, i) => (i === dayIndex ? { ...d, [slot]: text } : d)),
    });
    setSent(false);
  }

  function drop(dayIndex: number, slot: Slot, block: PlanBlock) {
    setCell(dayIndex, slot, appendBlock(week.days[dayIndex][slot], block));
  }

  /** Copy last week: everything shifts on by seven days, content intact. */
  function copyForward() {
    const shift = (iso: string) => {
      const d = new Date(`${iso}T00:00:00Z`);
      d.setUTCDate(d.getUTCDate() + 7);
      return d.toISOString().slice(0, 10);
    };
    save({
      ...week,
      id: `w_${shift(week.weekOf)}`,
      weekOf: shift(week.weekOf),
      label: `Week of ${shift(week.weekOf)}`,
      days: week.days.map((d) => ({ ...d, date: shift(d.date) })),
    });
    setSent(false);
  }

  function clearWeek() {
    save({
      ...week,
      days: week.days.map((d) => ({ ...d, am: "", pm: "" })),
      notes: "",
    });
    setSent(false);
  }

  /** POST the week rather than GET, because it lives in this browser. */
  async function downloadXlsx() {
    const slug = storeKey.replace("plan.", "");
    const res = await fetch(`/api/export/${slug}/xlsx`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ week }),
    });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `suth-${slug}-${week.weekOf}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const count = sessionCount(week);

  return (
    <div style={{ display: "grid", gap: "var(--space-2)" }}>
      {/* ── Toolbar ───────────────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          gap: "var(--space-1)",
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <span className="eyebrow" style={{ marginInlineEnd: "auto" }}>
          {week.label} · {count} sessions · saves as you type
        </span>
        <button type="button" onClick={copyForward} style={btn}>
          Copy to next week
        </button>
        <button type="button" onClick={clearWeek} style={btn}>
          Clear
        </button>
        <button type="button" onClick={reset} style={btn}>
          Reset
        </button>
        <a
          href={`/print/plan/${storeKey.replace("plan.", "")}`}
          target="_blank"
          rel="noreferrer"
          style={{ ...btn, display: "inline-flex", alignItems: "center", textDecoration: "none" }}
        >
          PDF
        </a>
        <button type="button" onClick={downloadXlsx} style={btn}>
          Excel
        </button>
      </div>

      <div
        style={{
          display: "grid",
          gap: "var(--space-2)",
          gridTemplateColumns: "minmax(0, 1fr)",
        }}
        className="builder-layout"
      >
        {/* ── Library ─────────────────────────────────────────────────── */}
        <aside
          style={{
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-card)",
            background: "var(--surface)",
            padding: "var(--space-2)",
            alignSelf: "start",
          }}
        >
          <h2 className="eyebrow" style={{ margin: "0 0 var(--space-1)" }}>
            Blocks — drag into a day
          </h2>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: "var(--space-1)" }}>
            {CATEGORIES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(c)}
                style={{
                  minHeight: 36,
                  padding: "0 10px",
                  borderRadius: 999,
                  border: "1px solid var(--border)",
                  background: c === category ? "var(--accent)" : "var(--surface-raised)",
                  color: c === category ? "var(--accent-ink)" : "var(--text-muted)",
                  fontSize: "var(--text-2xs)",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                {c}
              </button>
            ))}
          </div>

          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 6 }}>
            {blocks.map((b) => (
              <li key={b.id}>
                <div
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData("text/suth-block", b.id);
                    e.dataTransfer.effectAllowed = "copy";
                  }}
                  style={{
                    border: "1px solid var(--border-strong)",
                    borderRadius: 4,
                    padding: "8px 10px",
                    background: "var(--surface-raised)",
                    cursor: "grab",
                  }}
                >
                  <p style={{ margin: 0, fontSize: "var(--text-sm)", fontWeight: 650 }}>
                    {b.name}
                  </p>
                  <p
                    style={{
                      margin: "2px 0 0",
                      fontSize: "var(--text-2xs)",
                      color: "var(--text-muted)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {b.body.split("\n")[0]}
                  </p>
                </div>
              </li>
            ))}
          </ul>
          <p
            style={{
              margin: "var(--space-1) 0 0",
              fontSize: "var(--text-2xs)",
              color: "var(--text-muted)",
            }}
          >
            Dropping adds to a day rather than replacing it. On a phone, type
            straight into the cell.
          </p>
        </aside>

        {/* ── The week ────────────────────────────────────────────────── */}
        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              minWidth: 980,
              borderCollapse: "separate",
              borderSpacing: 4,
            }}
          >
            <caption className="sr-only">
              Training week for {client}, seven days by morning and afternoon
            </caption>
            <thead>
              <tr>
                <th style={{ width: 52 }} />
                {week.days.map((d) => (
                  <th key={d.date} scope="col" style={{ textAlign: "left" }}>
                    <span className="eyebrow">{d.dayName.slice(0, 3)}</span>
                    <span
                      className="num"
                      style={{
                        display: "block",
                        fontSize: "var(--text-sm)",
                        color: "var(--text-muted)",
                      }}
                    >
                      {d.date.slice(8)}/{d.date.slice(5, 7)}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(["am", "pm"] as Slot[]).map((slot) => (
                <tr key={slot}>
                  <th scope="row" style={{ verticalAlign: "top", paddingTop: 10 }}>
                    <span className="eyebrow">{slot}</span>
                  </th>
                  {week.days.map((d, i) => {
                    const key = `${i}-${slot}`;
                    return (
                      <td key={key} style={{ verticalAlign: "top", minWidth: 130 }}>
                        <textarea
                          aria-label={`${d.dayName} ${slot === "am" ? "morning" : "afternoon"}`}
                          value={d[slot]}
                          onChange={(e) => setCell(i, slot, e.target.value)}
                          onDragOver={(e) => {
                            if (e.dataTransfer.types.includes("text/suth-block")) {
                              e.preventDefault();
                              setDropTarget(key);
                            }
                          }}
                          onDragLeave={() => setDropTarget(null)}
                          onDrop={(e) => {
                            e.preventDefault();
                            setDropTarget(null);
                            const id = e.dataTransfer.getData("text/suth-block");
                            const block = BLOCK_LIBRARY.find((b) => b.id === id);
                            if (block) drop(i, slot, block);
                          }}
                          placeholder={slot === "am" ? "—" : ""}
                          style={{
                            ...cellText,
                            borderColor:
                              dropTarget === key ? "var(--accent)" : "var(--border)",
                            boxShadow:
                              dropTarget === key
                                ? "0 0 0 2px var(--accent-faint)"
                                : "none",
                          }}
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}

              <tr>
                <th scope="row" style={{ verticalAlign: "top", paddingTop: 10 }}>
                  <span className="eyebrow">Note</span>
                </th>
                <td colSpan={7}>
                  <textarea
                    aria-label="Note for the week"
                    value={week.notes}
                    onChange={(e) => {
                      save({ ...week, notes: e.target.value });
                      setSent(false);
                    }}
                    placeholder="What this week is for, and what to watch."
                    style={{ ...cellText, minHeight: 64 }}
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Send ──────────────────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          gap: "var(--space-1)",
          flexWrap: "wrap",
          alignItems: "center",
          borderTop: "1px solid var(--border)",
          paddingTop: "var(--space-2)",
        }}
      >
        <label style={{ display: "flex", alignItems: "center", gap: 8, marginInlineEnd: "auto" }}>
          <span className="eyebrow">Weekly running volume</span>
          <input
            aria-label="Weekly running volume"
            value={week.runningVolume}
            onChange={(e) => save({ ...week, runningVolume: e.target.value })}
            style={{
              width: 90,
              minHeight: 40,
              padding: "6px 8px",
              border: "1px solid var(--border-strong)",
              borderRadius: 4,
              background: "var(--bg)",
              color: "var(--text)",
              fontSize: "var(--text-sm)",
              fontFamily: "inherit",
            }}
          />
        </label>

        <button
          type="button"
          disabled={!week.notes.trim() || count === 0}
          onClick={() => setSent(true)}
          style={{
            ...btn,
            border: "none",
            background:
              week.notes.trim() && count ? "var(--accent)" : "var(--surface-raised)",
            color: week.notes.trim() && count ? "var(--accent-ink)" : "var(--text-faint)",
            cursor: week.notes.trim() && count ? "pointer" : "not-allowed",
          }}
        >
          Send to {client}
        </button>
      </div>

      {!week.notes.trim() ? (
        <p style={{ margin: 0, fontSize: "var(--text-xs)", color: "var(--warn)" }}>
          A plan without a note cannot be sent — HARD-RULES §3.
        </p>
      ) : null}

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
            lineHeight: 1.55,
          }}
        >
          <strong>Saved, not sent.</strong> The week is stored and {client} would
          see it in their account. Sending the SMS and the branded email, and
          attaching the PDF and Excel, needs Twilio and Resend connecting.
        </p>
      ) : null}
    </div>
  );
}
