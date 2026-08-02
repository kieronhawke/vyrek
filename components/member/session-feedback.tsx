"use client";

import { useState } from "react";

/**
 * How the athlete answers back.
 *
 * The plan is a one-way object without this: Ben writes it, the athlete does
 * it, and the only signal that a session was too heavy is that it quietly
 * stops getting done. MarchOn puts a thumbs up/down on every block for the
 * same reason (teardown §3, "Workout preview → player").
 *
 * NOT CONNECTED YET. There is no messaging backend, so this holds the response
 * in component state and says so rather than implying it has been sent. The
 * shape of what it collects — a verdict, an optional note, and which session it
 * was about — is the thing worth agreeing now, because it is what the coach
 * side has to be built to read.
 */

type Verdict = "good" | "hard" | "easy";

const VERDICTS: { id: Verdict; label: string; hint: string }[] = [
  { id: "easy", label: "Too easy", hint: "I had more in the tank" },
  { id: "good", label: "About right", hint: "Hard but I finished it" },
  { id: "hard", label: "Too hard", hint: "I cut it short or scaled it" },
];

export function SessionFeedback({
  sessionTitle,
  compact = false,
}: {
  sessionTitle: string;
  compact?: boolean;
}) {
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [note, setNote] = useState("");
  const [sent, setSent] = useState(false);

  if (sent) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "var(--space-2)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-card)",
          background: "var(--surface-raised)",
          fontSize: "var(--text-sm)",
        }}
        role="status"
      >
        <span aria-hidden style={{ color: "var(--ok)", fontWeight: 700 }}>
          ✓
        </span>
        <span>
          Saved on this device. It reaches Ben once messaging is connected.
        </span>
      </div>
    );
  }

  return (
    <div
      style={{
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-card)",
        background: "var(--surface)",
        padding: "var(--space-2)",
      }}
    >
      <p className="eyebrow" style={{ margin: "0 0 var(--space-1)" }}>
        How did it go?
      </p>

      <div
        role="radiogroup"
        aria-label={`How did ${sessionTitle} go?`}
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(104px, 1fr))",
          gap: 6,
        }}
      >
        {VERDICTS.map((v) => {
          const active = verdict === v.id;
          return (
            <button
              key={v.id}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setVerdict(active ? null : v.id)}
              style={{
                minHeight: 48,
                padding: "8px 10px",
                borderRadius: "var(--radius-button)",
                border: `1px solid ${active ? "var(--accent)" : "var(--border)"}`,
                background: active ? "var(--accent-faint)" : "var(--surface)",
                color: active ? "var(--accent)" : "var(--text)",
                fontSize: "var(--text-sm)",
                fontWeight: 650,
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              {v.label}
              {!compact ? (
                <span
                  style={{
                    display: "block",
                    fontWeight: 400,
                    fontSize: "var(--text-xs)",
                    color: active ? "var(--accent)" : "var(--text-muted)",
                  }}
                >
                  {v.hint}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {verdict ? (
        <div style={{ marginTop: "var(--space-2)" }}>
          <label
            htmlFor="session-note"
            className="eyebrow"
            style={{ display: "block", marginBottom: 4 }}
          >
            Anything Ben should know? (optional)
          </label>
          <textarea
            id="session-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            placeholder="Left knee grumbled on the lunges, everything else fine."
            style={{
              width: "100%",
              padding: "10px 12px",
              borderRadius: "var(--radius-input)",
              border: "1px solid var(--border)",
              background: "var(--surface-raised)",
              color: "var(--text)",
              fontSize: "var(--text-sm)",
              fontFamily: "inherit",
              resize: "vertical",
            }}
          />
          <button
            type="button"
            onClick={() => setSent(true)}
            style={{
              marginTop: "var(--space-1)",
              minHeight: 48,
              width: "100%",
              borderRadius: 999,
              border: "none",
              background: "var(--accent)",
              color: "var(--accent-ink)",
              fontSize: "var(--text-base)",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Send to Ben
          </button>
        </div>
      ) : null}
    </div>
  );
}
