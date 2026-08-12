"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  changeSubscriptionRate,
  pauseSubscription,
  resumeSubscription,
} from "@/lib/admin/actions";

function gbp(pence: number): string {
  return pence % 100 === 0
    ? `£${pence / 100}`
    : `£${(pence / 100).toFixed(2)}`;
}

/**
 * The rate, the pause, and nothing hidden behind Stripe's dashboard. All
 * three actions land on the NEXT invoice — the page says so, because a
 * rate change that silently charged mid-month is a refund conversation.
 */
export function SubscriptionManage({
  stripeSubscriptionId,
  amountPence,
  paused,
  pauseResumesISO,
}: {
  stripeSubscriptionId: string;
  amountPence: number | null;
  paused: boolean;
  pauseResumesISO: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [rate, setRate] = useState(
    amountPence ? String(amountPence % 100 === 0 ? amountPence / 100 : (amountPence / 100).toFixed(2)) : "",
  );
  const [resumeDate, setResumeDate] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const newPence = Math.round(Number(rate.replace(/[£,\s]/g, "")) * 100);
  const rateValid = Number.isInteger(newPence) && newPence >= 100 && newPence <= 100_000;

  function saveRate() {
    if (!rateValid) return;
    if (
      !confirm(
        `Change this client's rate to ${gbp(newPence)} a month from the next invoice?`,
      )
    ) {
      return;
    }
    setErr(null);
    setMsg(null);
    startTransition(async () => {
      const r = await changeSubscriptionRate(stripeSubscriptionId, newPence);
      if (!r.ok) setErr(r.error);
      else {
        setMsg(`Rate changed to ${gbp(newPence)}/mo. It applies from the next invoice.`);
        setEditing(false);
        router.refresh();
      }
    });
  }

  function doPause() {
    if (
      !confirm(
        resumeDate
          ? `Pause collection until ${resumeDate}? They keep access; no invoices are charged until then.`
          : "Pause collection indefinitely? They keep access; nothing is charged until you resume.",
      )
    ) {
      return;
    }
    setErr(null);
    setMsg(null);
    startTransition(async () => {
      const r = await pauseSubscription(
        stripeSubscriptionId,
        resumeDate || undefined,
      );
      if (!r.ok) setErr(r.error);
      else {
        setMsg("Collection paused.");
        router.refresh();
      }
    });
  }

  function doResume() {
    setErr(null);
    setMsg(null);
    startTransition(async () => {
      const r = await resumeSubscription(stripeSubscriptionId);
      if (!r.ok) setErr(r.error);
      else {
        setMsg("Collection resumed. The next invoice charges as normal.");
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {editing ? (
          <>
            <label className="flex items-center gap-1.5">
              <span className="text-sm text-suth-text">£</span>
              <input
                inputMode="decimal"
                value={rate}
                onChange={(e) => setRate(e.target.value)}
                className="h-9 w-24 rounded-md border border-suth-border bg-suth-elevated px-3 text-sm text-suth-text outline-none focus:border-suth-accent"
                aria-label="New monthly rate in pounds"
              />
              <span className="text-xs text-suth-text-tertiary">a month</span>
            </label>
            <button
              type="button"
              onClick={saveRate}
              disabled={pending || !rateValid}
              className="inline-flex h-9 items-center rounded-pill bg-suth-accent px-4 text-xs font-semibold text-[#0A0A0A] hover:bg-suth-accent-hover disabled:opacity-50"
            >
              {pending ? "Saving…" : "Save new rate"}
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="inline-flex h-9 items-center rounded-pill border border-suth-border px-4 text-xs text-suth-text-secondary hover:border-suth-border-strong"
            >
              Cancel
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => setEditing(true)}
            disabled={pending}
            className="inline-flex h-9 items-center rounded-pill border border-suth-border px-4 text-xs text-suth-text hover:border-suth-border-strong disabled:opacity-50"
          >
            Change rate{amountPence ? ` (now ${gbp(amountPence)}/mo)` : ""}
          </button>
        )}

        {paused ? (
          <button
            type="button"
            onClick={doResume}
            disabled={pending}
            className="inline-flex h-9 items-center rounded-pill border border-emerald-500/40 bg-emerald-500/10 px-4 text-xs text-emerald-300 hover:bg-emerald-500/20 disabled:opacity-50"
          >
            Resume collection
            {pauseResumesISO
              ? ` (auto ${new Date(pauseResumesISO).toLocaleDateString("en-GB")})`
              : ""}
          </button>
        ) : (
          <span className="inline-flex items-center gap-1.5">
            <button
              type="button"
              onClick={doPause}
              disabled={pending}
              className="inline-flex h-9 items-center rounded-pill border border-suth-border px-4 text-xs text-suth-text hover:border-suth-border-strong disabled:opacity-50"
            >
              Pause collection
            </button>
            <input
              type="date"
              value={resumeDate}
              onChange={(e) => setResumeDate(e.target.value)}
              className="h-9 rounded-md border border-suth-border bg-suth-elevated px-2 text-xs text-suth-text-secondary outline-none focus:border-suth-accent"
              aria-label="Resume date (optional)"
            />
          </span>
        )}
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
