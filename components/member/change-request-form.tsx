"use client";

import { useState } from "react";

/**
 * The free-text half of subscription management. Cards, plan switches and
 * cancelling live in the Stripe portal; this is for everything that's
 * really a conversation with Ben. Sends to his inbox and the admin feed.
 */
export function ChangeRequestForm() {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (message.trim().length < 5) {
      setErr("Say a little more about what you'd like to change.");
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/member/request-change", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: message.trim() }),
      });
      if (res.status === 429) {
        setErr("Too many requests — give it a few minutes.");
      } else if (!res.ok) {
        setErr("That didn't send. Try again in a moment.");
      } else {
        setSent(true);
      }
    } catch {
      setErr("No connection. Try again when you're back online.");
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <div
        role="status"
        style={{
          borderRadius: "var(--radius-card)",
          border: "1px solid var(--border)",
          background: "var(--surface)",
          padding: "var(--space-3)",
        }}
      >
        <p style={{ margin: 0, fontSize: "var(--text-sm)", lineHeight: 1.55 }}>
          <strong>Sent to Ben.</strong>{" "}
          He&apos;ll come back to you directly — usually the same day.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit}>
      <label
        style={{
          display: "block",
          fontSize: "var(--text-sm)",
          color: "var(--text-muted)",
        }}
      >
        What would you like to change?
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={5}
          maxLength={2000}
          placeholder="e.g. Can we pause training over Christmas? / Can I move to monthly reviews?"
          style={{
            display: "block",
            width: "100%",
            marginTop: 8,
            borderRadius: "var(--radius-card)",
            border: "1px solid var(--border)",
            background: "var(--surface)",
            color: "var(--text)",
            padding: "var(--space-2)",
            fontSize: "var(--text-base)",
            lineHeight: 1.5,
            resize: "vertical",
          }}
        />
      </label>
      {err ? (
        <p
          role="alert"
          style={{
            margin: "var(--space-1) 0 0",
            fontSize: "var(--text-sm)",
            color: "var(--danger)",
          }}
        >
          {err}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={busy}
        style={{
          marginTop: "var(--space-2)",
          display: "inline-flex",
          alignItems: "center",
          height: 44,
          padding: "0 20px",
          borderRadius: 999,
          border: "none",
          background: "var(--accent)",
          color: "#0A0A0A",
          fontSize: "var(--text-sm)",
          fontWeight: 600,
          cursor: busy ? "default" : "pointer",
          opacity: busy ? 0.6 : 1,
        }}
      >
        {busy ? "Sending…" : "Send to Ben"}
      </button>
    </form>
  );
}
