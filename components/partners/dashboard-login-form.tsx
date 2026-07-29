"use client";

import { useState } from "react";

export function PartnerLoginForm() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    try {
      await fetch("/api/partners/dashboard/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setSent(true);
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <div
        role="status"
        className="mt-8 rounded-lg border border-suth-accent/40 bg-suth-elevated p-6"
      >
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-suth-accent">
          [ CHECK YOUR EMAIL ]
        </p>
        <p className="mt-3 text-sm text-suth-text">
          If <span className="text-suth-accent">{email}</span> is on the
          partner programme, a sign-in link is on its way. It expires in 15
          minutes.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="mt-8 space-y-4" noValidate>
      <label className="block">
        <span className="block text-sm font-medium text-suth-text">
          Partner email
        </span>
        <input
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-2 block h-12 w-full rounded-md border border-suth-border bg-suth-elevated px-4 text-base text-suth-text outline-none focus:border-suth-accent"
        />
      </label>
      <button
        type="submit"
        disabled={busy}
        className="inline-flex h-12 w-full items-center justify-center rounded-pill bg-suth-accent px-5 text-base font-semibold text-[#0A0A0A] hover:bg-suth-accent-hover disabled:opacity-60"
      >
        {busy ? "Sending link..." : "Email me a sign-in link →"}
      </button>
    </form>
  );
}
