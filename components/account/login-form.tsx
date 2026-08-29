"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";

function safeNext(next: string | null): string {
  if (!next) return "/app/today";
  // Allow only same-origin paths.
  if (!next.startsWith("/") || next.startsWith("//")) return "/app/today";
  return next;
}

/**
 * Two doors, sign-in link first.
 *
 * The link leads because it is one tap and nothing to remember. The password
 * form sits behind "Use a password instead" — and it is no longer the rare
 * path it was: invite onboarding used to refuse to ask for a password, and
 * now asks for one before the card, so an existing client set up by Ben has
 * one from the moment they pay.
 */
export function CustomerLoginForm() {
  const router = useRouter();
  const sp = useSearchParams();
  const next = safeNext(sp.get("next"));
  const arrivedFromExpiredLink = sp.get("link") === "expired";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [sent, setSent] = useState<"link" | "reset" | null>(null);

  async function onSendLink(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) {
      setErr("Enter your email first.");
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/account/magic-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      if (res.status === 429) {
        setErr("Too many requests — give it a few minutes and try again.");
      } else if (!res.ok) {
        setErr("That didn't work. Check the email address and try again.");
      } else {
        setSent("link");
      }
    } catch {
      setErr("That didn't work. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  async function onSubmitPassword(e: React.FormEvent) {
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
      router.push(next);
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
            ? `${window.location.origin}/auth/callback?next=${encodeURIComponent("/app/account")}`
            : undefined,
      });
      if (error) {
        setErr(error.message);
      } else {
        setSent("reset");
      }
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
          [ CHECK YOUR INBOX ]
        </p>
        <p className="mt-3 text-sm text-suth-text">
          If <span className="text-suth-accent">{email}</span> matches an
          account,{" "}
          {sent === "link"
            ? "a sign-in link is on its way. One tap and you're in."
            : "a password reset link is on its way."}
        </p>
      </div>
    );
  }

  return (
    <div className="mt-8">
      {arrivedFromExpiredLink ? (
        <p
          role="status"
          className="mb-4 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-300"
        >
          That sign-in link had expired — they only work for a short while.
          Pop your email in below and we&apos;ll send a fresh one.
        </p>
      ) : null}

      <form onSubmit={onSendLink} className="space-y-4" noValidate>
        <label className="block">
          <span className="block text-sm font-medium text-suth-text">
            Email
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

        {!showPassword ? (
          <>
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
              className="inline-flex h-12 w-full items-center justify-center rounded-pill bg-suth-accent px-5 text-base font-semibold text-[#0A0A0A] hover:bg-suth-accent-hover disabled:opacity-60"
            >
              {busy ? "Sending..." : "Email me a sign-in link →"}
            </button>
            <p className="text-center text-xs text-suth-text-tertiary">
              No password needed — the link signs you straight in.
            </p>
            <button
              type="button"
              onClick={() => {
                setErr(null);
                setShowPassword(true);
              }}
              className="block w-full text-center text-sm text-suth-text-secondary underline-offset-4 hover:text-suth-text hover:underline"
            >
              Use a password instead
            </button>
          </>
        ) : null}
      </form>

      {showPassword ? (
        <form onSubmit={onSubmitPassword} className="mt-4 space-y-4" noValidate>
          <label className="block">
            <span className="block text-sm font-medium text-suth-text">
              Password
            </span>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-2 block h-12 w-full rounded-md border border-suth-border bg-suth-elevated px-4 text-base text-suth-text outline-none focus:border-suth-accent"
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
            className="inline-flex h-12 w-full items-center justify-center rounded-pill bg-suth-accent px-5 text-base font-semibold text-[#0A0A0A] hover:bg-suth-accent-hover disabled:opacity-60"
          >
            {busy ? "Signing in..." : "Sign in →"}
          </button>
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                setErr(null);
                setShowPassword(false);
              }}
              className="text-sm text-suth-text-secondary underline-offset-4 hover:text-suth-text hover:underline"
            >
              ← Sign-in link instead
            </button>
            <button
              type="button"
              onClick={onForgot}
              disabled={busy}
              className="text-sm text-suth-text-secondary underline-offset-4 hover:text-suth-text hover:underline"
            >
              Forgot password
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
