"use client";

import { cn } from "@/lib/utils";

export function PaywallCard({
  onStartTrial,
  variant = "card",
}: {
  onStartTrial: () => void;
  variant?: "card" | "sticky";
}) {
  return (
    <div
      className={cn(
        "rounded-lg border border-vyrek-border bg-vyrek-elevated p-6",
        variant === "card" && "text-center",
      )}
    >
      <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-vyrek-accent">
        [ MEMBERS ONLY ]
      </p>
      <h3 className="mt-3 text-2xl font-black leading-tight tracking-[-0.02em] text-vyrek-text">
        Unlock weeks 2-12
      </h3>
      <p className="mt-3 text-sm leading-relaxed text-vyrek-text-secondary">
        First week free. £8.99/mo after. Cancel anytime.
      </p>
      <button
        type="button"
        onClick={onStartTrial}
        className="mt-5 inline-flex h-12 w-full items-center justify-center rounded-pill bg-vyrek-accent px-6 text-base font-medium tracking-tight text-[#0A0A0A] transition-[background,transform] duration-fast ease-out hover:bg-vyrek-accent-hover active:scale-[0.98]"
      >
        Start training →
      </button>
      <div
        className={cn(
          "mt-4 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-vyrek-text-tertiary",
          variant === "card" ? "justify-center" : "justify-start",
        )}
      >
        <svg
          aria-hidden
          width="11"
          height="11"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="3" y="11" width="18" height="11" rx="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
        <span>Secure checkout via Stripe</span>
      </div>
    </div>
  );
}
