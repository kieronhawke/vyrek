"use client";

import { useState } from "react";

/**
 * Client-side trigger for the Stripe Billing Portal. Posts to
 * `/api/stripe/create-portal-session` (server creates the portal session
 * against the user's real Stripe customer id) and follows the returned
 * URL. Replaces the previously hardcoded test-mode portal link.
 */
export function ManageBillingButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onClick = async () => {
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/stripe/create-portal-session", {
        method: "POST",
      });
      if (!res.ok) {
        setError("Couldn't open the billing portal. Try again in a moment.");
        return;
      }
      const data = (await res.json()) as { url?: string };
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      setError("Couldn't open the billing portal. Try again in a moment.");
    } catch {
      setError("Couldn't reach Stripe. Check your connection and retry.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="inline-flex flex-col gap-1">
      <button
        type="button"
        onClick={onClick}
        disabled={loading}
        className="inline-flex h-10 items-center rounded-pill border border-vyrek-border bg-vyrek-base px-4 text-sm text-vyrek-text transition-colors hover:border-vyrek-border-strong disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "Opening Stripe…" : "Manage billing ↗"}
      </button>
      {error ? (
        <span role="alert" className="text-xs text-vyrek-danger">
          {error}
        </span>
      ) : null}
    </div>
  );
}
