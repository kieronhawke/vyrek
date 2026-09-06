"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import { useAdoptTypedValue } from "@/lib/adopt-typed-value";



export function AdminLoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  useAdoptTypedValue(emailRef, email, setEmail);
  useAdoptTypedValue(passwordRef, password, setPassword);

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
        <span className="block text-sm font-medium text-suth-text">
          Email
        </span>
        <input
          ref={emailRef}
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-2 block h-12 w-full rounded-md border border-suth-border bg-suth-elevated px-4 text-base text-suth-text outline-none focus:border-suth-accent"
        />
      </label>
      <label className="block">
        <span className="block text-sm font-medium text-suth-text">
          Password
        </span>
        <input
          ref={passwordRef}
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-2 block h-12 w-full rounded-md border border-suth-border bg-suth-elevated px-4 text-base text-suth-text outline-none focus:border-suth-accent"
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
        className="inline-flex h-12 w-full items-center justify-center rounded-pill bg-suth-accent px-5 text-base font-semibold text-[#0A0A0A] transition-colors hover:bg-suth-accent-hover disabled:opacity-60"
      >
        {busy ? "Signing in..." : "Sign in →"}
      </button>
      {/* "Phase 1 · Email allowlist" was a note to the developers on the one
          screen the business owner sees most. It says who to ask now. */}
      <p className="text-center text-xs text-suth-text-tertiary">
        Trouble getting in? Ask Kieron to check the admin list.
      </p>
    </form>
  );
}
