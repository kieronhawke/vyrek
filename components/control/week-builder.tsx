"use client";

import { useMemo, useRef, useState } from "react";
import {
  SEED_WEEK,
  sessionCount,
  type PlanWeek,
  type Slot,
} from "@/lib/plan/model";
import {
  BLOCK_LIBRARY,
  CATEGORIES,
  CUSTOM_BLOCKS_KEY,
  appendBlock,
  type BlockCategory,
  type PlanBlock,
} from "@/lib/plan/blocks";
import { useCollection, useRecord } from "@/lib/control/store";
import { VoiceNote } from "@/components/control/voice-note";

/**
 * THE PLAN BUILDER.
 *
 * Built to the shape of "Haseeb Training.xlsx": seven day columns, AM and PM
 * rows, a note, a weekly running volume. Not homage — it is the layout Ben
 * already works in, and the only test that matters is whether this beats the
 * spreadsheet.
 *
 * THREE THINGS THIS ROUND
 *
 * 1. HIS OWN BLOCKS. The shipped library is what he already writes, but every
 *    coach has their own shorthand and a fixed list is stale the week after it
 *    is written. Any cell can be saved as a block, named, and reused.
 *
 * 2. TOUCH. Drag and drop does not exist on a phone — HTML5 drag events do not
 *    fire. So every block is also a tap: tap a cell to make it active, tap a
 *    block to append into it. That works identically with a mouse, so there is
 *    one interaction to learn rather than two.
 *
 * 3. ONE DAY AT A TIME ON A PHONE. Seven columns on a 390px screen is 50px a
 *    day. Below 900px this becomes a day switcher with the day full width,
 *    which is the only way the cells are big enough to type into.
 */

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

const DAY_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function WeekBuilder({ client }: { client: string }) {
  const storeKey = `plan.${client.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  const { value: week, save, reset } = useRecord<PlanWeek>(storeKey, SEED_WEEK);
  const custom = useCollection<PlanBlock>(CUSTOM_BLOCKS_KEY, []);

  const [category, setCategory] = useState<BlockCategory>("HYROX");
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const [activeCell, setActiveCell] = useState<{ day: number; slot: Slot }>({
    day: 0,
    slot: "am",
  });
  const [mobileDay, setMobileDay] = useState(0);
  const [sent, setSent] = useState(false);
  const [saving, setSaving] = useState<{ day: number; slot: Slot } | null>(null);
  const [blockName, setBlockName] = useState("");
  const nameInput = useRef<HTMLInputElement>(null);

  const allBlocks = useMemo(
    () => [...BLOCK_LIBRARY, ...custom.items],
    [custom.items],
  );
  const shown = useMemo(
    () => allBlocks.filter((b) => b.category === category),
    [allBlocks, category],
  );

  function setCell(dayIndex: number, slot: Slot, text: string) {
    save({
      ...week,
      days: week.days.map((d, i) => (i === dayIndex ? { ...d, [slot]: text } : d)),
    });
    setSent(false);
  }

  /** Tap or drop: both land here, so the two paths cannot diverge. */
  function insert(block: PlanBlock, at = activeCell) {
    setCell(at.day, at.slot, appendBlock(week.days[at.day][at.slot], block));
  }

  function saveAsBlock() {
    if (!saving) return;
    const body = week.days[saving.day][saving.slot].trim();
    const name = blockName.trim();
    if (!body || !name) return;
    custom.add({
      id: `custom-${custom.items.length + 1}-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
      name,
      category: "Saved",
      body,
      custom: true,
    });
    setSaving(null);
    setBlockName("");
    setCategory("Saved");
  }

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
  const slug = storeKey.replace("plan.", "");

  /** One cell, in whichever layout is live. */
  function cell(dayIndex: number, slot: Slot) {
    const day = week.days[dayIndex];
    return (
      <Cell
        key={`${dayIndex}-${slot}`}
        dayName={day.dayName}
        text={day[slot]}
        slot={slot}
        active={activeCell.day === dayIndex && activeCell.slot === slot}
        dropping={dropTarget === `${dayIndex}-${slot}`}
        onChange={(text) => setCell(dayIndex, slot, text)}
        onFocus={() => setActiveCell({ day: dayIndex, slot })}
        onDropTarget={(on) => setDropTarget(on ? `${dayIndex}-${slot}` : null)}
        onDropBlock={(id) => {
          const block = allBlocks.find((b) => b.id === id);
          if (block) insert(block, { day: dayIndex, slot });
        }}
        onSaveAsBlock={() => {
          setSaving({ day: dayIndex, slot });
          setBlockName("");
          setTimeout(() => nameInput.current?.focus(), 30);
        }}
      />
    );
  }

  return (
    <div className="pb">
      {/* ── Toolbar ───────────────────────────────────────────────────── */}
      <div className="pb-toolbar">
        <span className="eyebrow pb-toolbar__status">
          {week.label} · {count} sessions · saves as you type
        </span>
        <button type="button" onClick={copyForward} style={btn}>
          Copy to next week
        </button>
        <button
          type="button"
          onClick={() =>
            save({
              ...week,
              days: week.days.map((d) => ({ ...d, am: "", pm: "" })),
              notes: "",
            })
          }
          style={btn}
        >
          Clear
        </button>
        <button type="button" onClick={reset} style={btn}>
          Reset
        </button>
        <a
          href={`/print/plan/${slug}`}
          target="_blank"
          rel="noreferrer"
          style={{
            ...btn,
            display: "inline-flex",
            alignItems: "center",
            textDecoration: "none",
          }}
        >
          PDF
        </a>
        <button type="button" onClick={downloadXlsx} style={btn}>
          Excel
        </button>
      </div>

      {/* ── Save-as-block prompt ──────────────────────────────────────── */}
      {saving ? (
        <div className="pb-saveblock" role="group" aria-label="Save this session as a block">
          <label htmlFor="pb-blockname" className="eyebrow">
            Name this block
          </label>
          <input
            id="pb-blockname"
            ref={nameInput}
            value={blockName}
            onChange={(e) => setBlockName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") saveAsBlock();
              if (e.key === "Escape") setSaving(null);
            }}
            placeholder="Race-pace intervals"
            className="pb-input"
          />
          <button
            type="button"
            onClick={saveAsBlock}
            disabled={!blockName.trim()}
            style={{
              ...btn,
              border: "none",
              background: blockName.trim() ? "var(--accent)" : "var(--surface-raised)",
              color: blockName.trim() ? "var(--accent-ink)" : "var(--text-faint)",
            }}
          >
            Save
          </button>
          <button type="button" onClick={() => setSaving(null)} style={btn}>
            Cancel
          </button>
        </div>
      ) : null}

      <div className="pb-layout">
        {/* ── Library ─────────────────────────────────────────────────── */}
        <aside className="pb-library">
          <h2 className="eyebrow" style={{ margin: "0 0 var(--space-1)" }}>
            Blocks — tap to add, or drag
          </h2>

          <div className="pb-cats">
            {CATEGORIES.map((c) => {
              const n = allBlocks.filter((b) => b.category === c).length;
              if (c === "Saved" && n === 0) return null;
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategory(c)}
                  className="pb-cat"
                  data-on={c === category || undefined}
                >
                  {c}
                  {c === "Saved" ? ` ${n}` : ""}
                </button>
              );
            })}
          </div>

          <p className="pb-target">
            Adding to{" "}
            <b>
              {week.days[activeCell.day].dayName} {activeCell.slot.toUpperCase()}
            </b>
          </p>

          <ul className="pb-blocks">
            {shown.map((b) => (
              <li key={b.id}>
                <div
                  className="pb-block"
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData("text/suth-block", b.id);
                    e.dataTransfer.effectAllowed = "copy";
                  }}
                >
                  <button
                    type="button"
                    className="pb-block__add"
                    onClick={() => insert(b)}
                    aria-label={`Add ${b.name} to ${week.days[activeCell.day].dayName} ${activeCell.slot}`}
                  >
                    <span className="pb-block__name">{b.name}</span>
                    <span className="pb-block__peek">{b.body.split("\n")[0]}</span>
                  </button>
                  {b.custom ? (
                    <button
                      type="button"
                      className="pb-block__del"
                      onClick={() => {
                        custom.remove(b.id);
                        // Deleting the last saved block hides the Saved tab
                        // itself, which would leave the library on a category
                        // that no longer exists — an empty panel and no lit
                        // tab. Step back to where he started.
                        if (custom.items.length <= 1) setCategory("HYROX");
                      }}
                      aria-label={`Delete saved block ${b.name}`}
                    >
                      ×
                    </button>
                  ) : null}
                </div>
              </li>
            ))}
            {shown.length === 0 ? (
              <li className="pb-empty">
                Nothing saved yet. Write a session, then press <b>Save as block</b>.
              </li>
            ) : null}
          </ul>
        </aside>

        {/* ── The week ────────────────────────────────────────────────── */}
        <div className="pb-week">
          {/* Mobile: one day at a time. Seven columns on a phone is 50px a day. */}
          <div className="pb-dayswitch" role="tablist" aria-label="Day">
            {week.days.map((d, i) => {
              const filled = Boolean(d.am.trim() || d.pm.trim());
              return (
                <button
                  key={d.date}
                  role="tab"
                  aria-selected={i === mobileDay}
                  type="button"
                  className="pb-dayswitch__btn"
                  data-on={i === mobileDay || undefined}
                  onClick={() => {
                    setMobileDay(i);
                    setActiveCell({ day: i, slot: "am" });
                  }}
                >
                  {DAY_SHORT[i]}
                  <span className="pb-dayswitch__dot" data-filled={filled || undefined} />
                </button>
              );
            })}
          </div>

          <div className="pb-mobileday">
            <h3 className="pb-mobileday__head">
              {week.days[mobileDay].dayName}{" "}
              <span className="num">
                {week.days[mobileDay].date.slice(8)}/
                {week.days[mobileDay].date.slice(5, 7)}
              </span>
            </h3>
            {(["am", "pm"] as Slot[]).map((slot) => (
              <div key={slot}>
                <p className="eyebrow" style={{ margin: "var(--space-1) 0 4px" }}>
                  {slot}
                </p>
                {cell(mobileDay, slot)}
              </div>
            ))}
          </div>

          {/* Desktop: the whole week, as the spreadsheet. */}
          <table className="pb-grid">
            <caption className="sr-only">
              Training week for {client}, seven days by morning and afternoon
            </caption>
            <thead>
              <tr>
                <th style={{ width: 46 }} />
                {week.days.map((d) => (
                  <th key={d.date} scope="col">
                    <span className="eyebrow">{d.dayName.slice(0, 3)}</span>
                    <span className="num pb-grid__date">
                      {d.date.slice(8)}/{d.date.slice(5, 7)}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(["am", "pm"] as Slot[]).map((slot) => (
                <tr key={slot}>
                  <th scope="row">
                    <span className="eyebrow">{slot}</span>
                  </th>
                  {week.days.map((_, i) => (
                    <td key={`${i}-${slot}`}>
                      {cell(i, slot)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>

          {/* ── Note ─────────────────────────────────────────────────── */}
          <div className="pb-note">
            <label htmlFor="pb-note" className="eyebrow">
              Note for the week
            </label>
            <textarea
              id="pb-note"
              value={week.notes}
              onChange={(e) => {
                save({ ...week, notes: e.target.value });
                setSent(false);
              }}
              placeholder="What this week is for, and what to watch."
              className="pb-textarea"
              style={{ minHeight: 72 }}
            />
            <div style={{ marginTop: "var(--space-1)" }}>
              <VoiceNote subject={week.id} />
            </div>
          </div>
        </div>
      </div>

      {/* ── Send ──────────────────────────────────────────────────────── */}
      <div className="pb-send">
        <label className="pb-volume">
          <span className="eyebrow">Weekly running volume</span>
          <input
            aria-label="Weekly running volume"
            value={week.runningVolume}
            onChange={(e) => save({ ...week, runningVolume: e.target.value })}
            className="pb-input"
            style={{ width: 96 }}
          />
        </label>
        <button
          type="button"
          disabled={!week.notes.trim() || count === 0}
          onClick={() => setSent(true)}
          style={{
            ...btn,
            border: "none",
            flex: "1 1 200px",
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
        <p role="status" className="pb-sent">
          <strong>Saved, not sent.</strong> The week is stored and {client} would
          see it in their account. The SMS, the branded email and the attached
          PDF and Excel need Twilio and Resend connecting.
        </p>
      ) : null}
    </div>
  );
}

/**
 * ONE CELL — a session slot.
 *
 * Module level, deliberately. It was originally declared inside WeekBuilder,
 * which meant every render produced a new component *type*: React unmounted
 * and remounted the textarea rather than updating it. Focusing a cell sets the
 * active cell, that re-rendered, the textarea was replaced, focus was lost, and
 * every keystroke after it went to a node no longer in the document. Ben could
 * drop blocks in but could not type a word. Nothing about the markup was wrong
 * and nothing threw — which is why it took a test to find it.
 */
function Cell({
  dayName,
  slot,
  text,
  active,
  dropping,
  onChange,
  onFocus,
  onDropTarget,
  onDropBlock,
  onSaveAsBlock,
}: {
  dayName: string;
  slot: Slot;
  text: string;
  active: boolean;
  dropping: boolean;
  onChange: (text: string) => void;
  onFocus: () => void;
  onDropTarget: (on: boolean) => void;
  onDropBlock: (id: string) => void;
  onSaveAsBlock: () => void;
}) {
  return (
    <div className="pb-cell" data-active={active || undefined}>
      <textarea
        aria-label={`${dayName} ${slot === "am" ? "morning" : "afternoon"}`}
        value={text}
        onChange={(e) => onChange(e.target.value)}
        onFocus={onFocus}
        onDragOver={(e) => {
          if (e.dataTransfer.types.includes("text/suth-block")) {
            e.preventDefault();
            onDropTarget(true);
          }
        }}
        onDragLeave={() => onDropTarget(false)}
        onDrop={(e) => {
          e.preventDefault();
          onDropTarget(false);
          onDropBlock(e.dataTransfer.getData("text/suth-block"));
        }}
        placeholder={slot === "am" ? "—" : ""}
        className="pb-textarea"
        data-drop={dropping || undefined}
      />
      {text.trim() ? (
        <button type="button" className="pb-save" onClick={onSaveAsBlock}>
          Save as block
        </button>
      ) : null}
    </div>
  );
}
