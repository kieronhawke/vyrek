"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/admin/ui";
import { sendCustomerPasswordReset } from "@/lib/admin/actions";

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
            ? "Email delivery failed, so here is the link to share with them yourself."
            : "Sign-in link emailed to them. It lets them straight into their account, no password needed.",
        );
        router.refresh();
      }
    });
  }

  return (
    <Card>
      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-suth-text-tertiary">
        Customer actions
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={passwordReset}
          disabled={pending}
          className="inline-flex h-10 items-center rounded-pill border border-suth-border bg-suth-elevated px-4 text-sm text-suth-text hover:border-suth-border-strong disabled:opacity-50"
        >
          Email them a sign-in link
        </button>
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
