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
        className="mt-8 rounded-lg border border-vyrek-accent/40 bg-vyrek-elevated p-6"
      >
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-vyrek-accent">
          [ CHECK YOUR EMAIL ]
        </p>
        <p className="mt-3 text-sm text-vyrek-text">
          If <span className="text-vyrek-accent">{email}</span> is on the
          partner programme, a sign-in link is on its way. It expires in 15
          minutes.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="mt-8 space-y-4" noValidate>
      <label className="block">
        <span className="block text-sm font-medium text-vyrek-text">
          Partner email
        </span>
        <input
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-2 block h-12 w-full rounded-md border border-vyrek-border bg-vyrek-elevated px-4 text-base text-vyrek-text outline-none focus:border-vyrek-accent"
        />
      </label>
      <button
        type="submit"
        disabled={busy}
        className="inline-flex h-12 w-full items-center justify-center rounded-pill bg-vyrek-accent px-5 text-base font-semibold text-[#0A0A0A] hover:bg-vyrek-accent-hover disabled:opacity-60"
      >
        {busy ? "Sending link..." : "Email me a sign-in link →"}
      </button>
    </form>
  );
}
