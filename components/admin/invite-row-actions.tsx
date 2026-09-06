"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * WHAT BEN CAN DO TO A LINK HE HAS ALREADY SENT.
 *
 * Two things, and both exist because the review step is not the last chance
 * to be wrong: the client rings back and the date moves, or the balance was
 * mistyped and only spotted in the sent list.
 *
 *   Cancel   removes the stored invite. The link stops resolving and tells
 *            the client to ask Ben for a new one. Nothing is charged by a
 *            link that no longer opens.
 *   Send again   pre-fills the form with everything from this row so the
 *            corrected link is one edit away rather than five fields away.
 *
 * Not offered once the person has signed up — there is nothing to cancel,
 * and their money lives under Customers now.
 */
export function InviteRowActions({
  id,
  name,
  email,
  phone,
  ratePence,
  dueTodayPence,
  startISO,
}: {
  id: string;
  name: string;
  email: string;
  phone: string;
  ratePence: number | null;
  dueTodayPence: number | null;
  startISO: string | null;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /**
   * Say it happened the moment it happens.
   *
   * The row itself is server-rendered, so it only disappears once
   * `router.refresh()` has re-fetched the page — and that is a full render of
   * the list plus a customer lookup. Ben pressed "Yes, cancel it" and watched
   * nothing change for a second or two, which reads as a button that did not
   * work and invites a second press. This says so immediately; the refresh
   * then takes the row away underneath it.
   */
  const [cancelled, setCancelled] = useState(false);

  const pounds = (pence: number) =>
    pence % 100 === 0 ? String(pence / 100) : (pence / 100).toFixed(2);

  const again = new URLSearchParams({
    ...(name ? { name } : {}),
    ...(email ? { email } : {}),
    ...(phone ? { phone } : {}),
    ...(ratePence ? { rate: pounds(ratePence) } : {}),
    ...(dueTodayPence ? { due: pounds(dueTodayPence) } : {}),
    ...(startISO ? { start: startISO } : {}),
  });

  async function cancel() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/onboarding/invite/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        setError("Could not cancel it. Try again in a moment.");
        return;
      }
      setCancelled(true);
      router.refresh();
    } catch {
      setError("Could not reach the server. The link is still live.");
    } finally {
      setBusy(false);
      setConfirming(false);
    }
  }

  const btn =
    "inline-flex h-9 items-center rounded-pill border border-suth-border px-3 text-xs text-suth-text-secondary hover:border-suth-border-strong hover:text-suth-text disabled:opacity-50";

  if (cancelled) {
    return (
      <p
        role="status"
        className="mt-3 text-xs text-suth-text-secondary"
      >
        Link cancelled. It will not open for them any more.
      </p>
    );
  }

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <Link href={`/admin/clients?${again.toString()}`} className={btn}>
        Send again
      </Link>
      {confirming ? (
        <>
          <span className="text-xs text-suth-text-secondary">
            Cancel this link? It stops working the moment you confirm.
          </span>
          <button
            type="button"
            onClick={cancel}
            disabled={busy}
            className="inline-flex h-9 items-center rounded-pill border border-red-500/40 bg-red-500/10 px-3 text-xs text-red-300 hover:bg-red-500/20 disabled:opacity-50"
          >
            {busy ? "Cancelling…" : "Yes, cancel it"}
          </button>
          <button
            type="button"
            onClick={() => setConfirming(false)}
            disabled={busy}
            className={btn}
          >
            Keep it
          </button>
        </>
      ) : (
        <button type="button" onClick={() => setConfirming(true)} className={btn}>
          Cancel link
        </button>
      )}
      {error ? (
        <p role="alert" className="w-full text-xs text-red-400">
          {error}
        </p>
      ) : null}
    </div>
  );
}
