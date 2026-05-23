"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  approvePartnerApplication,
  rejectPartnerApplication,
  requestApplicationInfo,
} from "@/lib/admin/actions";

export function ApplicationActions({ applicationId }: { applicationId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reason, setReason] = useState("");

  function approve() {
    if (!confirm("Approve this application and email the onboarding link?")) return;
    setError(null);
    setFeedback(null);
    startTransition(async () => {
      const res = await approvePartnerApplication(applicationId);
      if (!res.ok) {
        setError(res.error);
      } else {
        const emailLine = res.emailSent
          ? "Onboarding email sent."
          : `Onboarding email NOT sent (${res.emailReason ?? "unknown"}). Copy the link manually.`;
        const linkLine = res.onboardingUrl
          ? `Onboarding link: ${res.onboardingUrl}`
          : "";
        setFeedback(`Approved. ${emailLine} ${linkLine}`.trim());
        router.refresh();
      }
    });
  }

  function reject() {
    if (!reason.trim()) {
      setError("Add a short reason so the applicant has a useful reply.");
      return;
    }
    setError(null);
    setFeedback(null);
    startTransition(async () => {
      const res = await rejectPartnerApplication(applicationId, reason.trim());
      if (!res.ok) setError(res.error);
      else {
        setFeedback("Rejected. The application is now marked rejected.");
        router.refresh();
      }
    });
  }

  function needsInfo() {
    if (!reason.trim()) {
      setError("Add the question you want them to answer.");
      return;
    }
    setError(null);
    setFeedback(null);
    startTransition(async () => {
      const res = await requestApplicationInfo(applicationId, reason.trim());
      if (!res.ok) setError(res.error);
      else {
        setFeedback("Marked as needs info. Use the email queue to follow up.");
        router.refresh();
      }
    });
  }

  return (
    <div className="rounded-lg border border-vyrek-border-subtle bg-vyrek-elevated p-5">
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={approve}
          disabled={pending}
          className="inline-flex h-11 items-center rounded-pill bg-vyrek-accent px-5 text-sm font-semibold text-[#0A0A0A] transition-colors hover:bg-vyrek-accent-hover disabled:opacity-50"
        >
          {pending ? "Working..." : "Approve"}
        </button>
        <button
          type="button"
          onClick={needsInfo}
          disabled={pending}
          className="inline-flex h-11 items-center rounded-pill border border-amber-500/40 bg-amber-500/10 px-5 text-sm font-medium text-amber-300 transition-colors hover:bg-amber-500/20 disabled:opacity-50"
        >
          Request more info
        </button>
        <button
          type="button"
          onClick={reject}
          disabled={pending}
          className="inline-flex h-11 items-center rounded-pill border border-red-500/40 bg-red-500/10 px-5 text-sm font-medium text-red-300 transition-colors hover:bg-red-500/20 disabled:opacity-50"
        >
          Reject
        </button>
      </div>

      <label className="mt-5 block">
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-vyrek-text-tertiary">
          Reason (required for reject / needs info)
        </span>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          className="mt-2 block w-full rounded-md border border-vyrek-border bg-vyrek-base px-3 py-2 text-sm text-vyrek-text outline-none focus:border-vyrek-accent"
          placeholder="One or two sentences. Stays internal unless you copy it into the reply email."
        />
      </label>

      {feedback ? (
        <p className="mt-4 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
          {feedback}
        </p>
      ) : null}
      {error ? (
        <p
          role="alert"
          className="mt-4 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
