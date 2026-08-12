"use client";

import { useEffect } from "react";

/**
 * THE FULL-SCREEN CONFIRMATION EVERY MONEY ACTION USES.
 *
 * Browser confirm() dialogs ran these before: unstyled, unreadable, and
 * they froze automated testing. This is the app-like replacement — a
 * dimmed backdrop, one clear panel, the action named in the title, the
 * consequences in plain words, and a primary button that says exactly
 * what it does. Escape or the backdrop closes it without doing anything.
 */
export function ActionModal({
  open,
  eyebrow,
  title,
  onClose,
  children,
  footer,
  tone = "default",
}: {
  open: boolean;
  eyebrow: string;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  /** The action row: primary + secondary buttons supplied by the flow. */
  footer: React.ReactNode;
  tone?: "default" | "danger";
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-t-2xl border border-suth-border bg-suth-base p-6 shadow-2xl sm:rounded-2xl"
      >
        <p
          className={`font-mono text-[10px] uppercase tracking-[0.22em] ${
            tone === "danger" ? "text-red-400" : "text-suth-accent"
          }`}
        >
          {eyebrow}
        </p>
        <h2 className="mt-2 text-2xl font-black tracking-[-0.02em] text-suth-text">
          {title}
        </h2>
        <div className="mt-4 space-y-4 text-sm text-suth-text-secondary">
          {children}
        </div>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          {footer}
        </div>
      </div>
    </div>
  );
}

/** Standard buttons for the modal footer, sized for thumbs. */
export function ModalButton({
  children,
  onClick,
  disabled,
  variant = "secondary",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: "primary" | "secondary" | "danger";
}) {
  const styles =
    variant === "primary"
      ? "bg-suth-accent text-[#0A0A0A] hover:bg-suth-accent-hover font-semibold"
      : variant === "danger"
        ? "border border-red-500/40 bg-red-500/10 text-red-300 hover:bg-red-500/20 font-semibold"
        : "border border-suth-border text-suth-text-secondary hover:border-suth-border-strong";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex h-12 items-center justify-center rounded-pill px-6 text-base transition-colors disabled:opacity-50 ${styles}`}
    >
      {children}
    </button>
  );
}
