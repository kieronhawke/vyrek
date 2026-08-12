"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { sendClientMessage } from "@/lib/coach/actions";

/**
 * One-tap messaging: pick a person, write, send. Email today (replies
 * come straight back to Ben's inbox); texts arrive once client mobile
 * numbers live on the customer record.
 */
export function CoachMessenger({
  clients,
  initialTo,
}: {
  clients: { customerId: string; name: string }[];
  initialTo?: string;
}) {
  const router = useRouter();
  const [to, setTo] = useState(
    initialTo && clients.some((c) => c.customerId === initialTo)
      ? initialTo
      : clients[0]?.customerId ?? "",
  );
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function onSend() {
    setBusy(true);
    setErr(null);
    setMsg(null);
    const r = await sendClientMessage({
      customerId: to,
      channel: "email",
      subject,
      body,
    });
    setBusy(false);
    if (!r.ok) {
      setErr(r.error);
      return;
    }
    const who = clients.find((c) => c.customerId === to)?.name ?? "them";
    setMsg(`Sent to ${who}. Replies come straight to your inbox.`);
    setBody("");
    setSubject("");
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

  return (
    <div style={{ display: "grid", gap: "var(--space-2)" }}>
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

      <select
        aria-label="Who to message"
        style={input}
        value={to}
        onChange={(e) => setTo(e.target.value)}
      >
        {clients.map((c) => (
          <option key={c.customerId} value={c.customerId}>
            {c.name}
          </option>
        ))}
      </select>

      <input
        aria-label="Subject"
        style={input}
        value={subject}
        onChange={(e) => setSubject(e.target.value)}
        placeholder="Subject (optional)"
      />

      <textarea
        aria-label="Message"
        style={{ ...input, minHeight: 120 }}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Write it like a text. It lands as a proper email from you."
      />

      <button
        type="button"
        disabled={busy || !to || !body.trim()}
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
          opacity: busy || !body.trim() ? 0.6 : 1,
        }}
      >
        {busy ? "Sending…" : "Send"}
      </button>
    </div>
  );
}
