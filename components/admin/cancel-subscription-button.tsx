"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cancelSubscriptionImmediately } from "@/lib/admin/actions";

export function CancelSubscriptionButton({
  stripeSubscriptionId,
}: {
  stripeSubscriptionId: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  function onClick() {
    if (
      !confirm(
        "Cancel this subscription immediately in Stripe? The customer keeps access only until the end of the current period.",
      )
    ) {
      return;
    }
    setErr(null);
    startTransition(async () => {
      const res = await cancelSubscriptionImmediately(stripeSubscriptionId);
      if (!res.ok) setErr(res.error);
      else router.refresh();
    });
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        className="inline-flex h-10 items-center rounded-pill border border-red-500/40 bg-red-500/10 px-4 text-sm font-medium text-red-300 transition-colors hover:bg-red-500/20 disabled:opacity-50"
      >
        {pending ? "Cancelling..." : "Cancel subscription"}
      </button>
      {err ? (
        <p role="alert" className="text-xs text-red-400">
          {err}
        </p>
      ) : null}
    </div>
  );
}
