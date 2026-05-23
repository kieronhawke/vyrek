"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { markPayoutPaid, markPayoutFailed } from "@/lib/admin/actions";

export function MarkPayoutPaidButton({ payoutId }: { payoutId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [ref, setRef] = useState("");
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  function submit() {
    if (!ref.trim()) {
      setErr("Add the BACS reference so the partner can match it.");
      return;
    }
    setErr(null);
    startTransition(async () => {
      const res = await markPayoutPaid(payoutId, ref.trim());
      if (!res.ok) setErr(res.error);
      else {
        setOpen(false);
        setRef("");
        router.refresh();
      }
    });
  }

  function fail() {
    const reason = prompt("Why did the payment fail?");
    if (reason === null) return;
    startTransition(async () => {
      const res = await markPayoutFailed(payoutId, reason.trim());
      if (!res.ok) setErr(res.error);
      else router.refresh();
    });
  }

  if (!open) {
    return (
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setOpen(true)}
          disabled={pending}
          className="inline-flex h-9 items-center rounded-pill bg-vyrek-accent px-3 text-xs font-semibold text-[#0A0A0A] hover:bg-vyrek-accent-hover disabled:opacity-50"
        >
          Mark paid
        </button>
        <button
          type="button"
          onClick={fail}
          disabled={pending}
          className="inline-flex h-9 items-center rounded-pill border border-red-500/40 bg-red-500/10 px-3 text-xs font-medium text-red-300 hover:bg-red-500/20 disabled:opacity-50"
        >
          Failed
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <input
          type="text"
          value={ref}
          onChange={(e) => setRef(e.target.value)}
          placeholder="BACS reference"
          className="h-9 w-40 rounded-md border border-vyrek-border bg-vyrek-base px-2 text-xs text-vyrek-text outline-none focus:border-vyrek-accent"
        />
        <button
          type="button"
          onClick={submit}
          disabled={pending}
          className="inline-flex h-9 items-center rounded-pill bg-vyrek-accent px-3 text-xs font-semibold text-[#0A0A0A] hover:bg-vyrek-accent-hover disabled:opacity-50"
        >
          {pending ? "..." : "Save"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="inline-flex h-9 items-center rounded-pill border border-vyrek-border bg-vyrek-elevated px-3 text-xs text-vyrek-text-secondary"
        >
          Cancel
        </button>
      </div>
      {err ? (
        <p role="alert" className="text-xs text-red-400">
          {err}
        </p>
      ) : null}
    </div>
  );
}
