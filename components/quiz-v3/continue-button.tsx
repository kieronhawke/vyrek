"use client";

import { cn } from "@/lib/utils";

/**
 * The standardised Continue button used on every question screen. Full-width
 * minus shell padding, 56px tall, medium haptic via the caller.
 */
export function ContinueButton({
  disabled,
  onClick,
  label = "Continue →",
  loading = false,
  ariaLabel,
}: {
  disabled?: boolean;
  onClick: () => void;
  label?: string;
  loading?: boolean;
  /**
   * Overrides the accessible name where two buttons share visible text but
   * do different things. Must still contain the visible label so voice
   * control ("click send my plan to Ben") keeps working.
   */
  ariaLabel?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      disabled={disabled || loading}
      aria-disabled={disabled || loading}
      className={cn(
        "inline-flex h-14 w-full items-center justify-center gap-2 rounded-pill bg-suth-accent px-6 text-base font-medium tracking-tight text-[#0A0A0A] transition-[background,opacity,transform] duration-fast ease-out",
        "hover:bg-suth-accent-hover active:scale-[0.98]",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-suth-text",
        "disabled:cursor-not-allowed disabled:opacity-50",
      )}
    >
      {loading ? "One moment..." : label}
    </button>
  );
}
