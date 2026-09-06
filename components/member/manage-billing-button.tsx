"use client";

import { useState } from "react";

const GENERIC = "Couldn't open the billing portal. Try again in a moment.";

/**
 * What actually went wrong, rather than "try again" for everything.
 *
 * Every failure used to read "Try again in a moment", including the two that
 * retrying can never fix. Signed in as somebody with no subscription — an
 * admin looking at the member area, most often — returns 404 for ever, and a
 * person told to wait will sit there clicking. Say which it is.
 */
function messageFor(status: number): string {
  if (status === 401) return "Your session has ended. Sign in again to manage billing.";
  if (status === 404) {
    return "This account has no subscription to manage. If you pay Suth Performance, sign in with the email address your payment link was sent to.";
  }
  return GENERIC;
}

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
        setError(messageFor(res.status));
        return;
      }
      const data = (await res.json()) as { url?: string };
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      setError(GENERIC);
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
        className="inline-flex h-10 items-center rounded-pill border border-[color:var(--border)] bg-[var(--bg)] px-4 text-sm text-[color:var(--text)] transition-colors hover:border-[color:var(--border-strong)] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "Opening Stripe…" : "Manage billing ↗"}
      </button>
      {error ? (
        <span role="alert" className="text-xs text-[color:var(--danger)]">
          {error}
        </span>
      ) : null}
    </div>
  );
}
