"use client";

import { useState } from "react";

/**
 * The Suth Club waiting-list form. Four fields, one screen, built for a
 * phone. Success replaces the form entirely: the job is done and the
 * confirmation says exactly what was sent where.
 */
export function ClubWaitlistForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [goal, setGoal] = useState("");
  const [company, setCompany] = useState(""); // honeypot
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/club/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, phone, goal, company }),
      });
      const d = (await res.json()) as { ok: boolean; error?: string };
      if (!d.ok) {
        setError(d.error ?? "Something went wrong. Try again in a moment.");
        return;
      }
      setDone(true);
    } catch {
      setError("No connection. Try again when you are back online.");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-2xl border border-suth-border bg-suth-elevated p-8 text-center">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-suth-accent">
          [ You&apos;re on the waiting list ]
        </p>
        <h2 className="mt-4 text-2xl font-black tracking-[-0.03em] text-suth-text">
          See you at the front of the queue{name ? `, ${name.split(/\s+/)[0]}` : ""}.
        </h2>
        <p className="mt-4 text-base text-suth-text-secondary">
          Look out for a confirmation in your inbox
          {phone.trim() ? " (and a text)" : ""}. The moment Suth Club opens,
          you&apos;ll be the first to know.
        </p>
      </div>
    );
  }

  const inputCls =
    "h-13 w-full rounded-lg border border-suth-border bg-suth-base px-4 text-[16px] text-suth-text outline-none focus:border-suth-accent";
  const labelCls =
    "block font-mono text-[10px] uppercase tracking-[0.18em] text-suth-text-tertiary";

  return (
    <form onSubmit={submit} className="space-y-5">
      {/* Honeypot: positioned off-screen (not display:none, which bots detect)
          and hidden from assistive tech and tab order. */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          left: "-9999px",
          width: "1px",
          height: "1px",
          overflow: "hidden",
        }}
      >
        <label htmlFor="wl-company">Company (leave blank)</label>
        <input
          id="wl-company"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
        />
      </div>

      {error ? (
        <p role="alert" className="rounded-lg border border-suth-danger/40 bg-suth-danger/10 px-4 py-3 text-sm text-suth-text">
          {error}
        </p>
      ) : null}

      <div>
        <label htmlFor="wl-name" className={labelCls}>
          Your name
        </label>
        <input
          id="wl-name"
          autoComplete="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={`${inputCls} mt-2`}
          placeholder="Sam Reeves"
          required
        />
      </div>

      <div>
        <label htmlFor="wl-email" className={labelCls}>
          Email
        </label>
        <input
          id="wl-email"
          type="email"
          inputMode="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={`${inputCls} mt-2`}
          placeholder="you@example.com"
          required
        />
      </div>

      <div>
        <label htmlFor="wl-phone" className={labelCls}>
          Mobile
        </label>
        <input
          id="wl-phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className={`${inputCls} mt-2`}
          placeholder="07700 900000"
        />
        <p className="mt-1 text-xs text-suth-text-tertiary">
          Optional. We&apos;ll text you when the doors open.
        </p>
      </div>

      <div>
        <label htmlFor="wl-goal" className={labelCls}>
          What are you looking to achieve?
        </label>
        <textarea
          id="wl-goal"
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          rows={3}
          className="mt-2 w-full rounded-lg border border-suth-border bg-suth-base px-4 py-3 text-[16px] text-suth-text outline-none focus:border-suth-accent"
          placeholder="A structured plan I can run myself. First HYROX in the spring."
        />
      </div>

      <button
        type="submit"
        disabled={busy}
        className="inline-flex h-14 w-full items-center justify-center rounded-pill bg-suth-accent px-8 text-base font-semibold text-[#0A0A0A] transition-colors hover:bg-suth-accent-hover active:scale-[0.99] disabled:opacity-60"
      >
        {busy ? "Joining…" : "Join the waiting list"}
      </button>
    </form>
  );
}
