"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/admin/ui";
import {
  sendCustomerPasswordReset,
  refundLastStripeInvoice,
} from "@/lib/admin/actions";

function gbp(pence: number): string {
  return `£${(pence / 100).toLocaleString("en-GB", { minimumFractionDigits: 2 })}`;
}

export function CustomerActions({
  email,
  stripeSubscriptionId,
}: {
  email: string;
  stripeSubscriptionId: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  function passwordReset() {
    setErr(null);
    setMsg(null);
    startTransition(async () => {
      const r = await sendCustomerPasswordReset(email);
      if (!r.ok) setErr(r.error);
      else {
        setMsg(
          r.link
            ? "Password reset link generated. Share it manually if Supabase hasn't auto-emailed."
            : "Password reset link sent via email.",
        );
        router.refresh();
      }
    });
  }

  function refundLast() {
    if (!stripeSubscriptionId) return;
    if (
      !confirm(
        "Refund the most recent invoice on this subscription? This issues a real Stripe refund.",
      )
    ) {
      return;
    }
    setErr(null);
    setMsg(null);
    startTransition(async () => {
      const r = await refundLastStripeInvoice(stripeSubscriptionId);
      if (!r.ok) setErr(r.error);
      else {
        setMsg(
          `Refund queued (${gbp(r.amount_pence ?? 0)}). Stripe refund id: ${r.refundId}.`,
        );
        router.refresh();
      }
    });
  }

  return (
    <Card>
      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-vyrek-text-tertiary">
        Customer actions
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={passwordReset}
          disabled={pending}
          className="inline-flex h-10 items-center rounded-pill border border-vyrek-border bg-vyrek-elevated px-4 text-sm text-vyrek-text hover:border-vyrek-border-strong disabled:opacity-50"
        >
          Send password reset
        </button>
        {stripeSubscriptionId ? (
          <button
            type="button"
            onClick={refundLast}
            disabled={pending}
            className="inline-flex h-10 items-center rounded-pill border border-amber-500/40 bg-amber-500/10 px-4 text-sm text-amber-300 hover:bg-amber-500/20 disabled:opacity-50"
          >
            Refund last invoice
          </button>
        ) : null}
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
