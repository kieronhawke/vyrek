"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  saveTrainingPlan,
  sendTrainingPlan,
  type PlanInput,
} from "@/lib/coach/actions";
import type { TrainingPlan, TrainingPlanDay } from "@/lib/coach/data";

/**
 * THE PLAN, WRITTEN THE WAY BEN TALKS.
 *
 * One card per day: a short focus line and the session underneath, in
 * his own words. Save keeps a draft; Send emails it to the client and
 * locks it — a sent plan is a record of what the client received, so
 * changes mean a new plan, not a quiet edit.
 */

const WEEK: string[] = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

function nextMonday(): string {
  const d = new Date();
  const day = d.getDay();
  const add = day === 1 ? 0 : (8 - day) % 7;
  d.setDate(d.getDate() + add);
  return d.toISOString().slice(0, 10);
}

function emptyWeek(): TrainingPlanDay[] {
  return WEEK.map((day) => ({ day, focus: "", detail: "" }));
}

export function PlanEditor({
  customerId,
  clientName,
  draft,
  template,
}: {
  customerId: string;
  clientName: string;
  /** An existing unsent draft to continue, if there is one. */
  draft: TrainingPlan | null;
  /** The last sent plan, used to pre-fill a fresh week. */
  template: TrainingPlan | null;
}) {
  const router = useRouter();
  const seed = draft ?? null;
  const [planId, setPlanId] = useState<string | null>(seed?.id ?? null);
  const [title, setTitle] = useState(seed?.title ?? "");
  const [weekStart, setWeekStart] = useState(seed?.weekStart ?? nextMonday());
  const [note, setNote] = useState(seed?.note ?? "");
  const [content, setContent] = useState<TrainingPlanDay[]>(() => {
    if (seed && seed.content.length > 0) return seed.content;
    if (template && template.content.length > 0) {
      return template.content.map((d) => ({ ...d }));
    }
    return emptyWeek();
  });
  const [busy, setBusy] = useState<"save" | "send" | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const setDay = (i: number, patch: Partial<TrainingPlanDay>) =>
    setContent((c) => c.map((d, j) => (j === i ? { ...d, ...patch } : d)));

  function payload(): PlanInput {
    return {
      id: planId ?? undefined,
      customerId,
      title,
      weekStart,
      note,
      content,
    };
  }

  async function save(): Promise<string | null> {
    const r = await saveTrainingPlan(payload());
    if (!r.ok) {
      setErr(r.error);
      return null;
    }
    if (r.id) setPlanId(r.id);
    return r.id ?? planId;
  }

  async function onSave() {
    setBusy("save");
    setErr(null);
    setMsg(null);
    const id = await save();
    setBusy(null);
    if (id) {
      setMsg("Draft saved. Nothing has been sent.");
      router.refresh();
    }
  }

  async function onSend() {
    setBusy("send");
    setErr(null);
    setMsg(null);
    const id = await save();
    if (!id) {
      setBusy(null);
      return;
    }
    const r = await sendTrainingPlan(id);
    setBusy(null);
    if (!r.ok) {
      setErr(r.error);
      return;
    }
    setMsg(`Sent. ${clientName} has it by email and in their account.`);
    setPlanId(null);
    router.refresh();
  }

  const input: React.CSSProperties = {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 10,
    border: "1px solid var(--border-strong)",
    background: "var(--bg)",
    color: "var(--text)",
    font: "inherit",
    fontSize: 16,
  };
  const label: React.CSSProperties = {
    display: "block",
    fontSize: "var(--text-sm)",
    color: "var(--text-muted)",
    margin: "0 0 4px",
  };

  return (
    <div style={{ display: "grid", gap: "var(--space-3)" }}>
      {msg ? (
        <p role="status" style={{ margin: 0, color: "var(--accent)", fontWeight: 600 }}>
          {msg}
        </p>
      ) : null}
      {err ? (
        <p role="alert" style={{ margin: 0, color: "var(--danger)", fontWeight: 600 }}>
          {err}
        </p>
      ) : null}

      <div>
        <label style={label} htmlFor="plan-title">
          What this week is about
        </label>
        <input
          id="plan-title"
          style={input}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Sled week. We build the legs."
        />
      </div>

      <div>
        <label style={label} htmlFor="plan-week">
          Week starting
        </label>
        <input
          id="plan-week"
          type="date"
          style={{ ...input, maxWidth: 220 }}
          value={weekStart}
          onChange={(e) => setWeekStart(e.target.value)}
        />
      </div>

      <div>
        <label style={label} htmlFor="plan-note">
          Your note on top
        </label>
        <textarea
          id="plan-note"
          style={{ ...input, minHeight: 70 }}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Big week. Keep the runs honest and tell me how the calf feels after Tuesday."
        />
      </div>

      {content.map((d, i) => (
        <div
          key={d.day}
          style={{
            padding: "var(--space-2)",
            border: "1px solid var(--border)",
            borderRadius: 12,
            background: "var(--surface)",
            display: "grid",
            gap: 8,
          }}
        >
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span style={{ fontWeight: 800, width: 96, flexShrink: 0 }}>{d.day}</span>
            <input
              style={{ ...input, fontSize: 14 }}
              value={d.focus}
              onChange={(e) => setDay(i, { focus: e.target.value })}
              placeholder="Focus (optional): Intervals, Strength, Rest…"
              aria-label={`${d.day} focus`}
            />
          </div>
          <textarea
            style={{ ...input, minHeight: 64, fontSize: 14 }}
            value={d.detail}
            onChange={(e) => setDay(i, { detail: e.target.value })}
            placeholder="The session, in your words. Leave empty for a rest day."
            aria-label={`${d.day} session`}
          />
        </div>
      ))}

      <div
        style={{
          position: "sticky",
          bottom: "calc(var(--tabbar-h) + env(safe-area-inset-bottom))",
          display: "grid",
          gap: 8,
          gridTemplateColumns: "1fr 1fr",
          padding: "var(--space-2) 0",
          background: "var(--bg)",
        }}
      >
        <button
          type="button"
          disabled={busy !== null}
          onClick={onSave}
          style={{
            padding: "14px 0",
            borderRadius: 999,
            border: "1px solid var(--border-strong)",
            background: "var(--surface)",
            color: "var(--text)",
            fontWeight: 700,
            fontSize: 15,
            cursor: "pointer",
            opacity: busy ? 0.6 : 1,
          }}
        >
          {busy === "save" ? "Saving…" : "Save draft"}
        </button>
        <button
          type="button"
          disabled={busy !== null}
          onClick={onSend}
          style={{
            padding: "14px 0",
            borderRadius: 999,
            border: 0,
            background: "var(--accent)",
            color: "#0A0A0A",
            fontWeight: 800,
            fontSize: 15,
            cursor: "pointer",
            opacity: busy ? 0.6 : 1,
          }}
        >
          {busy === "send" ? "Sending…" : `Send to ${clientName.split(/\s+/)[0]}`}
        </button>
      </div>
    </div>
  );
}
