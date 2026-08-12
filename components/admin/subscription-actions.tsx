"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ActionModal, ModalButton } from "@/components/admin/action-modal";
import {
  changeSubscriptionRate,
  pauseSubscription,
  resumeSubscription,
  cancelSubscriptionAtPeriodEnd,
  cancelSubscriptionImmediately,
  getRefundPreview,
  refundLastStripeInvoice,
} from "@/lib/admin/actions";

function gbp(pence: number): string {
  return pence % 100 === 0
    ? `£${pence / 100}`
    : `£${(pence / 100).toFixed(2)}`;
}

function fmtDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(d);
}

const PAUSE_REASONS = [
  "Money is tight right now",
  "Injury or recovery",
  "Holiday or travel",
  "Taking a break from training",
  "Other",
];

const PAUSE_DURATIONS: { label: string; months: number | null }[] = [
  { label: "1 month", months: 1 },
  { label: "2 months", months: 2 },
  { label: "3 months", months: 3 },
  { label: "Until we restart it", months: null },
];

type Flow = "rate" | "pause" | "cancel_end" | "cancel_now" | "refund" | null;

/**
 * EVERY MONEY ACTION ON A CLIENT, EACH IN ITS OWN FULL-SCREEN FLOW.
 *
 * One clear panel per action: what's about to happen, to whom, from when,
 * and one primary button that says it. Replaces the old row of buttons
 * wired to browser confirm() popups.
 */
export function SubscriptionActions({
  stripeSubscriptionId,
  amountPence,
  paused,
  pauseResumesISO,
  periodEndISO,
  lastPaymentPence,
  lastPaymentISO,
  clientLabel,
}: {
  stripeSubscriptionId: string;
  amountPence: number | null;
  paused: boolean;
  pauseResumesISO: string | null;
  periodEndISO: string | null;
  lastPaymentPence?: number | null;
  lastPaymentISO?: string | null;
  clientLabel: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [flow, setFlow] = useState<Flow>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  // Rate flow state
  const [rate, setRate] = useState(
    amountPence
      ? String(amountPence % 100 === 0 ? amountPence / 100 : (amountPence / 100).toFixed(2))
      : "",
  );
  const newPence = Math.round(Number(rate.replace(/[£,\s]/g, "")) * 100);
  const rateValid = Number.isInteger(newPence) && newPence >= 100 && newPence <= 100_000;

  // Pause flow state
  const [pauseReason, setPauseReason] = useState<string | null>(null);
  const [pauseMonths, setPauseMonths] = useState<number | null | undefined>(undefined);

  // Refund flow state
  const [refundPreview, setRefundPreview] = useState<{
    amount_pence?: number;
    description?: string | null;
    paidOnISO?: string | null;
    alreadyRefunded?: boolean;
    error?: string;
  } | null>(null);
  const [refundDone, setRefundDone] = useState<number | null>(null);

  const endDate = fmtDate(periodEndISO);

  function close() {
    setFlow(null);
    setErr(null);
    setRefundPreview(null);
    setRefundDone(null);
  }

  function openRefund() {
    setMsg(null);
    setErr(null);
    setFlow("refund");
    startTransition(async () => {
      const p = await getRefundPreview(stripeSubscriptionId);
      setRefundPreview(p.ok ? p : { error: p.error });
    });
  }

  function run(fn: () => Promise<{ ok: boolean; error?: string }>, successMsg: string) {
    setErr(null);
    startTransition(async () => {
      const r = await fn();
      if (!r.ok) setErr(r.error ?? "That didn't work.");
      else {
        setMsg(successMsg);
        close();
        router.refresh();
      }
    });
  }

  const trigger =
    "inline-flex h-12 w-full items-center justify-center rounded-pill border border-suth-border px-4 text-sm text-suth-text hover:border-suth-border-strong disabled:opacity-50 sm:h-11 sm:w-auto";

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap">
        <button type="button" className={trigger} disabled={pending} onClick={() => { setMsg(null); setFlow("rate"); }}>
          Change rate{amountPence ? ` (now ${gbp(amountPence)}/mo)` : ""}
        </button>
        {paused ? (
          <button
            type="button"
            className={trigger}
            disabled={pending}
            onClick={() =>
              run(
                () => resumeSubscription(stripeSubscriptionId),
                "Payments resumed. They've been emailed.",
              )
            }
          >
            Resume collection
            {pauseResumesISO ? ` (auto ${fmtDate(pauseResumesISO)})` : ""}
          </button>
        ) : (
          <button type="button" className={trigger} disabled={pending} onClick={() => { setMsg(null); setPauseReason(null); setPauseMonths(undefined); setFlow("pause"); }}>
            Pause collection
          </button>
        )}
        <button type="button" className={trigger} disabled={pending} onClick={openRefund}>
          Refund last payment
        </button>
        <button
          type="button"
          className="inline-flex h-12 w-full items-center justify-center rounded-pill border border-amber-500/40 bg-amber-500/10 px-4 text-sm text-amber-300 hover:bg-amber-500/20 disabled:opacity-50 sm:h-11 sm:w-auto"
          disabled={pending}
          onClick={() => { setMsg(null); setFlow("cancel_end"); }}
        >
          Cancel at period end
        </button>
        <button
          type="button"
          className="inline-flex h-12 w-full items-center justify-center rounded-pill border border-red-500/40 bg-red-500/10 px-4 text-sm text-red-300 hover:bg-red-500/20 disabled:opacity-50 sm:h-11 sm:w-auto"
          disabled={pending}
          onClick={() => { setMsg(null); setFlow("cancel_now"); }}
        >
          Cancel now
        </button>
      </div>

      {msg ? <p className="text-xs text-emerald-300">{msg}</p> : null}
      {err && !flow ? (
        <p role="alert" className="text-xs text-red-400">
          {err}
        </p>
      ) : null}

      {/* ── Change rate ─────────────────────────────────────────── */}
      <ActionModal
        open={flow === "rate"}
        eyebrow="Change rate"
        title={`New monthly rate for ${clientLabel}`}
        onClose={close}
        footer={
          <>
            <ModalButton onClick={close}>Keep things as they are</ModalButton>
            <ModalButton
              variant="primary"
              disabled={pending || !rateValid}
              onClick={() =>
                run(
                  () => changeSubscriptionRate(stripeSubscriptionId, newPence),
                  `Rate changed to ${gbp(newPence)}/mo. They've been emailed the confirmation.`,
                )
              }
            >
              {pending ? "Saving…" : `Set rate to ${rateValid ? gbp(newPence) : "…"}`}
            </ModalButton>
          </>
        }
      >
        <p>
          They pay {amountPence ? <strong className="text-suth-text">{gbp(amountPence)} a month</strong> : "their current rate"} now.
          The new rate starts from their next payment{endDate ? ` on ${endDate}` : ""}; nothing is
          charged today and nothing is prorated.
        </p>
        <label className="flex items-center gap-2">
          <span className="text-base text-suth-text">£</span>
          <input
            inputMode="decimal"
            value={rate}
            onChange={(e) => setRate(e.target.value)}
            className="h-12 w-32 rounded-md border border-suth-border bg-suth-elevated px-3 text-base text-suth-text outline-none focus:border-suth-accent"
            aria-label="New monthly rate in pounds"
            autoFocus
          />
          <span className="text-sm text-suth-text-tertiary">a month</span>
        </label>
        <p className="text-xs text-suth-text-tertiary">
          They get an email confirming the new rate the moment you save. A
          reduction is announced as good news.
        </p>
        {err ? <p role="alert" className="text-xs text-red-400">{err}</p> : null}
      </ActionModal>

      {/* ── Pause ───────────────────────────────────────────────── */}
      <ActionModal
        open={flow === "pause"}
        eyebrow="Pause collection"
        title={`Pause payments for ${clientLabel}`}
        onClose={close}
        footer={
          <>
            <ModalButton onClick={close}>Not now</ModalButton>
            <ModalButton
              variant="primary"
              disabled={pending || pauseMonths === undefined}
              onClick={() => {
                const resumeISO =
                  typeof pauseMonths === "number"
                    ? new Date(Date.now() + pauseMonths * 30 * 86400_000).toISOString()
                    : undefined;
                run(
                  () => pauseSubscription(stripeSubscriptionId, resumeISO, pauseReason ?? undefined),
                  "Collection paused. They've been emailed.",
                );
              }}
            >
              {pending ? "Pausing…" : "Pause payments"}
            </ModalButton>
          </>
        }
      >
        <p>
          They keep their access and nothing is collected while paused. They
          get a supportive email saying exactly that.
        </p>
        <div>
          <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.22em] text-suth-text-tertiary">
            Why is it pausing?
          </p>
          <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap">
            {PAUSE_REASONS.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setPauseReason(r)}
                aria-pressed={pauseReason === r}
                className={`inline-flex h-10 items-center rounded-pill border px-3 text-xs transition-colors ${
                  pauseReason === r
                    ? "border-suth-accent bg-suth-accent/15 text-suth-accent"
                    : "border-suth-border text-suth-text-secondary hover:border-suth-border-strong"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.22em] text-suth-text-tertiary">
            For how long?
          </p>
          <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap">
            {PAUSE_DURATIONS.map((d) => (
              <button
                key={d.label}
                type="button"
                onClick={() => setPauseMonths(d.months)}
                aria-pressed={pauseMonths === d.months}
                className={`inline-flex h-10 items-center rounded-pill border px-3 text-xs transition-colors ${
                  pauseMonths === d.months
                    ? "border-suth-accent bg-suth-accent/15 text-suth-accent"
                    : "border-suth-border text-suth-text-secondary hover:border-suth-border-strong"
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-suth-text-tertiary">
            A timed pause restarts by itself; &quot;until we restart it&quot;
            waits for you.
          </p>
        </div>
        {err ? <p role="alert" className="text-xs text-red-400">{err}</p> : null}
      </ActionModal>

      {/* ── Cancel at period end ────────────────────────────────── */}
      <ActionModal
        open={flow === "cancel_end"}
        eyebrow="Cancel at period end"
        title={`End ${clientLabel}'s membership kindly`}
        onClose={close}
        footer={
          <>
            <ModalButton onClick={close}>Keep them going</ModalButton>
            <ModalButton
              variant="primary"
              disabled={pending}
              onClick={() =>
                run(
                  () => cancelSubscriptionAtPeriodEnd(stripeSubscriptionId),
                  "Cancellation scheduled. They've been emailed with the exact end date.",
                )
              }
            >
              {pending ? "Scheduling…" : endDate ? `Cancel on ${endDate}` : "Cancel at period end"}
            </ModalButton>
          </>
        }
      >
        <p>
          They keep full access until{" "}
          <strong className="text-suth-text">{endDate ?? "the end of the current period"}</strong>, then
          it stops and nothing more is charged. This is the kind way, and it is
          reversible until that date.
        </p>
        {lastPaymentPence != null ? (
          <p>
            Their last payment was{" "}
            <strong className="text-suth-text">{gbp(lastPaymentPence)}</strong>
            {lastPaymentISO ? ` on ${fmtDate(lastPaymentISO)}` : ""}.
          </p>
        ) : null}
        <p className="text-xs text-suth-text-tertiary">
          They get a supportive email confirming the date, with one tap to
          change their mind.
        </p>
        {err ? <p role="alert" className="text-xs text-red-400">{err}</p> : null}
      </ActionModal>

      {/* ── Cancel now ──────────────────────────────────────────── */}
      <ActionModal
        open={flow === "cancel_now"}
        eyebrow="Cancel immediately"
        title={`End ${clientLabel}'s membership right now`}
        onClose={close}
        tone="danger"
        footer={
          <>
            <ModalButton onClick={close}>Go back</ModalButton>
            <ModalButton
              variant="danger"
              disabled={pending}
              onClick={() =>
                run(
                  () => cancelSubscriptionImmediately(stripeSubscriptionId),
                  "Cancelled immediately. They've been emailed.",
                )
              }
            >
              {pending ? "Cancelling…" : "Cancel now, ending access today"}
            </ModalButton>
          </>
        }
      >
        <p>
          <strong className="text-red-300">Access ends today</strong>, not at the period end, and no
          further payments are taken. Nothing is refunded automatically; use
          Refund last payment as well if money should go back.
        </p>
        {lastPaymentPence != null ? (
          <p>
            Their last payment was{" "}
            <strong className="text-suth-text">{gbp(lastPaymentPence)}</strong>
            {lastPaymentISO ? ` on ${fmtDate(lastPaymentISO)}` : ""}.
          </p>
        ) : null}
        <p className="text-xs text-suth-text-tertiary">
          Use Cancel at period end unless there is a real reason not to.
        </p>
        {err ? <p role="alert" className="text-xs text-red-400">{err}</p> : null}
      </ActionModal>

      {/* ── Refund ──────────────────────────────────────────────── */}
      <ActionModal
        open={flow === "refund"}
        eyebrow="Refund"
        title={refundDone != null ? "Refund processed" : `Refund ${clientLabel}'s last payment`}
        onClose={close}
        footer={
          refundDone != null ? (
            <ModalButton variant="primary" onClick={close}>
              Done
            </ModalButton>
          ) : (
            <>
              <ModalButton onClick={close}>Keep the payment</ModalButton>
              <ModalButton
                variant="primary"
                disabled={
                  pending ||
                  !refundPreview ||
                  !!refundPreview.error ||
                  !!refundPreview.alreadyRefunded
                }
                onClick={() => {
                  setErr(null);
                  startTransition(async () => {
                    const r = await refundLastStripeInvoice(stripeSubscriptionId);
                    if (!r.ok) setErr(r.error ?? "The refund didn't go through.");
                    else {
                      setRefundDone(r.amount_pence ?? refundPreview?.amount_pence ?? 0);
                      router.refresh();
                    }
                  });
                }}
              >
                {pending
                  ? "Refunding…"
                  : refundPreview?.amount_pence != null
                    ? `Refund ${gbp(refundPreview.amount_pence)}`
                    : "Refund"}
              </ModalButton>
            </>
          )
        }
      >
        {refundDone != null ? (
          <p>
            <strong className="text-suth-text">{gbp(refundDone)}</strong> is on its way back to their
            payment method. They&apos;ve been emailed, and banks usually show it
            within 5 to 10 working days.
          </p>
        ) : refundPreview == null ? (
          <p>Checking the last payment…</p>
        ) : refundPreview.error ? (
          <p role="alert" className="text-red-400">
            {refundPreview.error}
          </p>
        ) : refundPreview.alreadyRefunded ? (
          <p>
            The last payment has <strong className="text-suth-text">already been refunded</strong>. There is
            nothing more to send back from this invoice.
          </p>
        ) : (
          <>
            <p>
              You&apos;re about to refund{" "}
              <strong className="text-suth-text">
                {refundPreview.amount_pence != null ? gbp(refundPreview.amount_pence) : "…"}
              </strong>
              {refundPreview.paidOnISO ? ` paid on ${fmtDate(refundPreview.paidOnISO)}` : ""}
              {refundPreview.description ? ` for ${refundPreview.description}` : ""}.
            </p>
            <p className="text-xs text-suth-text-tertiary">
              A real Stripe refund goes back to their payment method, and they
              get an email the moment it&apos;s processed. Their subscription
              itself is not changed.
            </p>
          </>
        )}
        {err ? <p role="alert" className="text-xs text-red-400">{err}</p> : null}
      </ActionModal>
    </div>
  );
}
