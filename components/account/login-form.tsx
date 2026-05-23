"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";

export function CustomerLoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);

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
      router.push("/plan");
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Sign-in failed.");
      setBusy(false);
    }
  }

  async function onForgot() {
    if (!email.trim()) {
      setErr("Enter your email above first, then tap Forgot password.");
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const sb = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      );
      const { error } = await sb.auth.resetPasswordForEmail(email.trim(), {
        redirectTo:
          typeof window !== "undefined"
            ? `${window.location.origin}/login`
            : undefined,
      });
      if (error) {
        setErr(error.message);
      } else {
        setResetSent(true);
      }
    } finally {
      setBusy(false);
    }
  }

  if (resetSent) {
    return (
      <div
        role="status"
        className="mt-8 rounded-lg border border-vyrek-accent/40 bg-vyrek-elevated p-6"
      >
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-vyrek-accent">
          [ CHECK YOUR INBOX ]
        </p>
        <p className="mt-3 text-sm text-vyrek-text">
          If <span className="text-vyrek-accent">{email}</span> matches an
          account, a password reset link is on its way.
        </p>
      </div>
    );
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
        <p
          role="alert"
          className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300"
        >
          {err}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={busy}
        className="inline-flex h-12 w-full items-center justify-center rounded-pill bg-vyrek-accent px-5 text-base font-semibold text-[#0A0A0A] hover:bg-vyrek-accent-hover disabled:opacity-60"
      >
        {busy ? "Signing in..." : "Sign in →"}
      </button>
      <button
        type="button"
        onClick={onForgot}
        disabled={busy}
        className="block w-full text-center text-sm text-vyrek-text-secondary underline-offset-4 hover:text-vyrek-text hover:underline"
      >
        Forgot password
      </button>
    </form>
  );
}
