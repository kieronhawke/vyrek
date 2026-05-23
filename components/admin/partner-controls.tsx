"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/admin/ui";
import {
  suspendPartner,
  unsuspendPartner,
  setPartnerTier,
  createPayoutForPartner,
} from "@/lib/admin/actions";

type Tier = "starter" | "growth" | "elite";

function gbp(pence: number): string {
  return `£${(pence / 100).toLocaleString("en-GB", { minimumFractionDigits: 2 })}`;
}

export function PartnerControls({
  partnerId,
  tier,
  suspended,
  pendingPayoutPence,
}: {
  partnerId: string;
  tier: Tier;
  suspended: boolean;
  pendingPayoutPence: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  function run(fn: () => Promise<{ ok: true } | { ok: false; error: string }>, success: string) {
    setErr(null);
    setMsg(null);
    startTransition(async () => {
      const res = await fn();
      if (!res.ok) setErr(res.error);
      else {
        setMsg(success);
        router.refresh();
      }
    });
  }

  function onSuspend() {
    const reason = prompt("Reason for suspending (visible internally):");
    if (reason === null) return;
    run(() => suspendPartner(partnerId, reason.trim()), "Suspended.");
  }

  function onUnsuspend() {
    run(() => unsuspendPartner(partnerId), "Reinstated.");
  }

  function onSetTier(next: Tier) {
    if (next === tier) return;
    if (!confirm(`Set tier to ${next}? Auto-promotion will recompute on the next paid invoice.`)) {
      return;
    }
    run(() => setPartnerTier(partnerId, next), `Tier set to ${next}.`);
  }

  function onQueuePayout() {
    if (pendingPayoutPence < 5000) {
      setErr(
        `Pending balance ${gbp(pendingPayoutPence)} is below the £50 minimum.`,
      );
      return;
    }
    if (!confirm(`Queue a BACS payout for ${gbp(pendingPayoutPence)}?`)) return;
    run(async () => {
      const r = await createPayoutForPartner(partnerId);
      if (!r.ok) return r;
      return { ok: true };
    }, `Payout queued for ${gbp(pendingPayoutPence)}.`);
  }

  return (
    <Card>
      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-vyrek-text-tertiary">
        Admin controls
      </p>

      <div className="mt-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-vyrek-text-tertiary">
          Tier
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {(["starter", "growth", "elite"] as Tier[]).map((t) => {
            const active = t === tier;
            return (
              <button
                key={t}
                type="button"
                onClick={() => onSetTier(t)}
                disabled={pending}
                className={
                  active
                    ? "inline-flex h-9 items-center rounded-pill border border-vyrek-accent bg-vyrek-accent/10 px-3 font-mono text-[11px] uppercase tracking-[0.18em] text-vyrek-accent"
                    : "inline-flex h-9 items-center rounded-pill border border-vyrek-border bg-vyrek-elevated px-3 font-mono text-[11px] uppercase tracking-[0.18em] text-vyrek-text-secondary hover:text-vyrek-text disabled:opacity-50"
                }
              >
                {t}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-6 border-t border-vyrek-border-subtle pt-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-vyrek-text-tertiary">
          Payouts
        </p>
        <p className="mt-2 text-sm text-vyrek-text-secondary">
          Pending balance: <span className="text-vyrek-text tabular-nums">{gbp(pendingPayoutPence)}</span>
        </p>
        <button
          type="button"
          onClick={onQueuePayout}
          disabled={pending || pendingPayoutPence < 5000}
          className="mt-3 inline-flex h-10 items-center rounded-pill bg-vyrek-accent px-4 text-sm font-semibold text-[#0A0A0A] hover:bg-vyrek-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pendingPayoutPence < 5000
            ? "Below £50 minimum"
            : `Queue payout for ${gbp(pendingPayoutPence)}`}
        </button>
      </div>

      <div className="mt-6 border-t border-vyrek-border-subtle pt-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-vyrek-text-tertiary">
          Account
        </p>
        {suspended ? (
          <button
            type="button"
            onClick={onUnsuspend}
            disabled={pending}
            className="mt-3 inline-flex h-10 items-center rounded-pill border border-emerald-500/40 bg-emerald-500/10 px-4 text-sm text-emerald-300 hover:bg-emerald-500/20 disabled:opacity-50"
          >
            Reinstate
          </button>
        ) : (
          <button
            type="button"
            onClick={onSuspend}
            disabled={pending}
            className="mt-3 inline-flex h-10 items-center rounded-pill border border-red-500/40 bg-red-500/10 px-4 text-sm text-red-300 hover:bg-red-500/20 disabled:opacity-50"
          >
            Suspend
          </button>
        )}
      </div>

      {msg ? (
        <p className="mt-4 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">
          {msg}
        </p>
      ) : null}
      {err ? (
        <p
          role="alert"
          className="mt-4 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300"
        >
          {err}
        </p>
      ) : null}
    </Card>
  );
}
