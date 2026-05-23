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
}: {
  disabled?: boolean;
  onClick: () => void;
  label?: string;
  loading?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      aria-disabled={disabled || loading}
      className={cn(
        "inline-flex h-14 w-full items-center justify-center gap-2 rounded-pill bg-vyrek-accent px-6 text-base font-medium tracking-tight text-[#0A0A0A] transition-[background,opacity,transform] duration-fast ease-out",
        "hover:bg-vyrek-accent-hover active:scale-[0.98]",
        "disabled:cursor-not-allowed disabled:opacity-40",
      )}
    >
      {loading ? "One moment..." : label}
    </button>
  );
}
