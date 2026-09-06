"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";


/**
 * KEEP WHAT THEY TYPED BEFORE REACT WOKE UP.
 *
 * These fields are controlled by React state that starts empty. The markup is
 * server-rendered and interactive to a person the moment it paints, but state
 * does not attach until hydration — so anything typed in between is thrown
 * away the instant React takes over, and the field goes blank on its own.
 *
 * On a fast connection the window is invisible. On a phone on mobile data it
 * is long enough to type an email address into, and the symptom is a login
 * form that clears itself and then complains the field is empty. It was caught
 * by a test that filled both boxes and found only the second one still had
 * anything in it.
 *
 * So on mount, whatever the DOM actually holds wins.
 */
function useAdoptTypedValue(
  ref: React.RefObject<HTMLInputElement | null>,
  value: string,
  set: (v: string) => void,
) {
  useEffect(() => {
    const typed = ref.current?.value ?? "";
    if (typed && typed !== value) set(typed);
    // Mount only: after hydration React is the source of truth again.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

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
