"use client";

import { cn } from "@/lib/utils";

/**
 * Paywall card on /plan.
 *
 * Stripped per Fix 3: was 4 lines of copy + a lock-icon Stripe trust badge.
 * Now: headline + chartreuse CTA + 1-line subtext. The value section
 * (Fix 4) lands ABOVE this card so users see what they get before they
 * see the unlock prompt — this card no longer needs to do that work
 * itself.
 */
export function PaywallCard({
  onStartTrial,
  loading = false,
  variant = "card",
}: {
  onStartTrial: () => void;
  loading?: boolean;
  variant?: "card" | "sticky";
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-vyrek-border bg-vyrek-elevated p-7",
        variant === "card" && "text-center",
      )}
    >
      <h3 className="text-2xl font-black leading-tight tracking-[-0.02em] text-vyrek-text md:text-3xl">
        Unlock weeks 2-12
      </h3>
      <button
        type="button"
        onClick={onStartTrial}
        disabled={loading}
        className="mt-6 inline-flex h-14 w-full items-center justify-center rounded-pill bg-vyrek-accent px-6 text-base font-semibold tracking-tight text-[#0A0A0A] transition-[background,transform,opacity] duration-fast ease-out hover:bg-vyrek-accent-hover active:scale-[0.98] disabled:opacity-60"
      >
        {loading ? "Opening checkout…" : "Unlock my plan"}
      </button>
      <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.22em] text-vyrek-text-tertiary">
        No charge for 7 days
      </p>
    </div>
  );
}
