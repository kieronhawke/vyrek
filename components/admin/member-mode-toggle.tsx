"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setMemberMode } from "@/lib/admin/actions";

/**
 * The "switch their training space on" control. Billing-only clients see
 * their subscription portal and nothing else; flipping to full opens the
 * whole app for them. Reversible, no dialog — the button says what it
 * does and the row says what they have now.
 */
export function MemberModeToggle({
  customerId,
  mode,
}: {
  customerId: string;
  mode: "billing" | "full";
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  function flip() {
    setErr(null);
    startTransition(async () => {
      const next = mode === "billing" ? "full" : "billing";
      const r = await setMemberMode(customerId, next);
      if (!r.ok) setErr(r.error);
      else router.refresh();
    });
  }

  return (
    <div className="space-y-1">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-suth-text-tertiary">Portal</span>
        <span className="text-sm text-suth-text">
          {mode === "billing" ? "Billing only" : "Full training app"}
        </span>
        <button
          type="button"
          onClick={flip}
          disabled={pending}
          className="inline-flex h-8 items-center rounded-pill border border-suth-border px-3 text-xs text-suth-text hover:border-suth-border-strong disabled:opacity-50"
        >
          {pending
            ? "Switching…"
            : mode === "billing"
              ? "Enable training features"
              : "Back to billing only"}
        </button>
      </div>
      {mode === "billing" ? (
        <p className="text-xs text-suth-text-tertiary">
          They manage their subscription; training stays with Ben until this
          is switched on.
        </p>
      ) : null}
      {err ? (
        <p role="alert" className="text-xs text-red-400">
          {err}
        </p>
      ) : null}
    </div>
  );
}
