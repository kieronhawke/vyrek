"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";

export function AdminLoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const sb = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      );
      const { error } = await sb.auth.signInWithPassword({ email, password });
      if (error) {
        setErr(error.message);
        setBusy(false);
        return;
      }
      router.push("/admin");
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Sign-in failed.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-8 space-y-4" noValidate>
      <label className="block">
        <span className="block text-sm font-medium text-vyrek-text">
          Email
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
      <label className="block">
        <span className="block text-sm font-medium text-vyrek-text">
          Password
        </span>
        <input
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-2 block h-12 w-full rounded-md border border-vyrek-border bg-vyrek-elevated px-4 text-base text-vyrek-text outline-none focus:border-vyrek-accent"
        />
      </label>
      {err ? (
        <p role="alert" className="text-sm text-red-400">
          {err}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={busy}
        className="inline-flex h-12 w-full items-center justify-center rounded-pill bg-vyrek-accent px-5 text-base font-semibold text-[#0A0A0A] transition-colors hover:bg-vyrek-accent-hover disabled:opacity-60"
      >
        {busy ? "Signing in..." : "Sign in →"}
      </button>
      <p className="text-center font-mono text-[10px] uppercase tracking-[0.22em] text-vyrek-text-tertiary">
        Phase 1 · Email allowlist
      </p>
    </form>
  );
}
