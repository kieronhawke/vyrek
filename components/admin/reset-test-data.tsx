"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { resetTestData, type ResetResult } from "@/lib/admin/reset";

/**
 * The danger-zone control. Deliberately awkward to fire: you type RESET,
 * then confirm. It wipes every test customer, plan, lead, booking and
 * stat, and empties the Stripe sandbox, leaving a clean slate to test on.
 */
export function ResetTestData() {
  const router = useRouter();
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ResetResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const armed = typed.trim().toUpperCase() === "RESET";

  async function run() {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const r = await resetTestData();
      setResult(r);
      setTyped("");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Reset failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-suth-danger/40 bg-suth-danger/5 p-5">
      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-suth-danger">
        Danger zone
      </p>
      <h2 className="mt-2 text-lg font-black tracking-[-0.02em] text-suth-text">
        Reset all test data
      </h2>
      <p className="mt-2 text-sm text-suth-text-secondary">
        Deletes every customer, subscription, plan, message, enquiry, booking,
        waitlist entry and visitor stat, and empties the Stripe sandbox. Blog
        posts and your diary hours are kept. There is no undo. Use this to
        start a clean test run.
      </p>

      {result ? (
        <div className="mt-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-200">
          <p className="font-semibold">Done. Everything is back to zero.</p>
          <p className="mt-1">
            Stripe customers removed: {result.stripeCustomersDeleted}. Rows
            cleared:{" "}
            {Object.entries(result.cleared)
              .filter(([, n]) => n !== 0)
              .map(([t, n]) => `${t} ${n}`)
              .join(", ") || "none remained"}
            .
          </p>
        </div>
      ) : null}
      {error ? (
        <p className="mt-4 text-sm text-suth-danger" role="alert">
          {error}
        </p>
      ) : null}

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <label htmlFor="reset-confirm" className="sr-only">
          Type RESET to confirm
        </label>
        <input
          id="reset-confirm"
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          placeholder="Type RESET to confirm"
          className="h-12 w-full rounded-lg border border-suth-border bg-suth-base px-3 text-[16px] text-suth-text outline-none focus:border-suth-danger sm:w-64"
        />
        <button
          type="button"
          disabled={!armed || busy}
          onClick={run}
          className="inline-flex h-12 items-center justify-center rounded-pill bg-suth-danger px-6 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          {busy ? "Resetting…" : "Reset everything"}
        </button>
      </div>
    </div>
  );
}
