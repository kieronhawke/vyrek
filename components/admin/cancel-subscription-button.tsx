"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  cancelSubscriptionAtPeriodEnd,
  cancelSubscriptionImmediately,
} from "@/lib/admin/actions";

/**
 * Two cancel modes, honestly labelled. The default is end-of-period — the
 * client keeps what they paid for. Immediate cancel is the escalation and
 * says exactly what it does; the old single button cancelled immediately
 * while its confirm text promised end-of-period access.
 */
export function CancelSubscriptionButton({
  stripeSubscriptionId,
}: {
  stripeSubscriptionId: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  function run(mode: "period_end" | "now") {
    const prompt =
      mode === "period_end"
        ? "Cancel at the end of the current billing period? The client keeps access until then and is not charged again."
        : "Cancel immediately? Access ends NOW and no further charges are taken. Use the end-of-period cancel unless there is a reason not to.";
    if (!confirm(prompt)) return;
    setErr(null);
    setMsg(null);
    startTransition(async () => {
      const res =
        mode === "period_end"
          ? await cancelSubscriptionAtPeriodEnd(stripeSubscriptionId)
          : await cancelSubscriptionImmediately(stripeSubscriptionId);
      if (!res.ok) setErr(res.error);
      else {
        setMsg(
          mode === "period_end"
            ? "Will cancel at the end of the current period."
            : "Cancelled immediately.",
        );
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => run("period_end")}
          disabled={pending}
          className="inline-flex h-10 items-center rounded-pill border border-amber-500/40 bg-amber-500/10 px-4 text-sm font-medium text-amber-300 transition-colors hover:bg-amber-500/20 disabled:opacity-50"
        >
          {pending ? "Working..." : "Cancel at period end"}
        </button>
        <button
          type="button"
          onClick={() => run("now")}
          disabled={pending}
          className="inline-flex h-10 items-center rounded-pill border border-red-500/40 bg-red-500/10 px-4 text-sm font-medium text-red-300 transition-colors hover:bg-red-500/20 disabled:opacity-50"
        >
          {pending ? "Working..." : "Cancel now"}
        </button>
      </div>
      {msg ? <p className="text-xs text-emerald-300">{msg}</p> : null}
      {err ? (
        <p role="alert" className="text-xs text-red-400">
          {err}
        </p>
      ) : null}
    </div>
  );
}
