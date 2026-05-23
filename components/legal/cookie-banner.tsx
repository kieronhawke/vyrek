"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Eyebrow } from "@/components/shared/eyebrow";
import {
  DEFAULT_CONSENT,
  readConsent,
  writeConsent,
  type ConsentCategories,
} from "@/lib/consent";

export function CookieBanner() {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [prefsOpen, setPrefsOpen] = useState(false);
  const [categories, setCategories] = useState<ConsentCategories>(
    DEFAULT_CONSENT.categories,
  );

  useEffect(() => {
    const state = readConsent();
    // One-shot hydration from localStorage. Cookie-consent state lives outside
    // React; this effect reflects it into local state once on mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
    if (state.decided) {
      setCategories(state.categories);
      return;
    }
    // Let the visitor see the hero first. UK GDPR doesn't require the
    // banner to fire on first paint, just before any non-essential cookie.
    const timer = window.setTimeout(() => setVisible(true), 1500);
    return () => window.clearTimeout(timer);
  }, []);

  const decide = (next: ConsentCategories) => {
    writeConsent({
      decided: true,
      categories: next,
      decidedAt: new Date().toISOString(),
    });
    setCategories(next);
    setVisible(false);
    setPrefsOpen(false);
  };

  const acceptAll = () =>
    decide({ necessary: true, analytics: true, marketing: true });
  const rejectAll = () =>
    decide({ necessary: true, analytics: false, marketing: false });
  const saveCustom = () => decide(categories);

  if (!mounted || !visible) return null;

  return (
    <>
      <div
        role="dialog"
        aria-label="Cookie preferences"
        className="fixed inset-x-0 bottom-0 z-[60] pb-[max(0.5rem,calc(var(--safe-bottom)+0.5rem))] md:pb-[max(1rem,calc(var(--safe-bottom)+1rem))]"
      >
        <div className="mx-auto max-w-3xl px-3 md:px-4">
          <div className="rounded-lg border border-vyrek-border bg-vyrek-elevated px-3 py-3 shadow-[0_-12px_60px_-12px_rgba(0,0,0,0.6)] md:px-6 md:py-5">
            {/* Mobile: ultra-compact single-row layout. Desktop: original
                three-button card with eyebrow + paragraph. */}
            <div className="flex items-center gap-2 md:hidden">
              <p className="flex-1 text-[13px] leading-snug text-vyrek-text">
                We use cookies.{" "}
                <button
                  type="button"
                  onClick={() => setPrefsOpen(true)}
                  className="!min-h-0 text-vyrek-text-secondary underline-offset-2 hover:underline"
                >
                  Choose
                </button>
              </p>
              <button
                type="button"
                onClick={rejectAll}
                className="!min-h-0 h-9 shrink-0 rounded-pill border border-vyrek-border bg-transparent px-3 text-xs font-medium text-vyrek-text-secondary transition-colors hover:text-vyrek-text active:scale-[0.97]"
              >
                Reject
              </button>
              <button
                type="button"
                onClick={acceptAll}
                className="!min-h-0 h-9 shrink-0 rounded-pill bg-vyrek-accent px-4 text-xs font-semibold text-[#0A0A0A] transition-colors hover:bg-vyrek-accent-hover active:scale-[0.97]"
              >
                Accept
              </button>
            </div>

            <div className="hidden md:block">
              <Eyebrow>Cookies</Eyebrow>
              <p className="mt-3 text-sm leading-relaxed text-vyrek-text md:text-base">
                We use cookies to run the site and, with your permission, to
                understand usage. Analytics and marketing are off until you say
                otherwise.
              </p>
              <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
                <button
                  type="button"
                  onClick={() => setPrefsOpen(true)}
                  className="h-11 rounded-pill px-4 text-sm text-vyrek-text-secondary transition-colors hover:text-vyrek-text"
                >
                  Manage preferences
                </button>
                <button
                  type="button"
                  onClick={rejectAll}
                  className="h-11 rounded-pill border border-vyrek-border bg-transparent px-5 text-sm font-medium text-vyrek-text transition-colors hover:bg-vyrek-overlay active:scale-[0.98]"
                >
                  Reject all
                </button>
                <button
                  type="button"
                  onClick={acceptAll}
                  className="h-11 rounded-pill bg-vyrek-accent px-5 text-sm font-medium text-[#0A0A0A] transition-colors hover:bg-vyrek-accent-hover active:scale-[0.98]"
                >
                  Accept all
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={prefsOpen} onOpenChange={setPrefsOpen}>
        <DialogContent className="bg-vyrek-elevated">
          <DialogHeader>
            <DialogTitle className="text-xl font-black tracking-[-0.02em]">
              Cookie preferences
            </DialogTitle>
            <DialogDescription className="text-vyrek-text-secondary">
              Necessary cookies are always on. The rest is up to you.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1">
            <PrefRow
              title="Necessary"
              description="Required for the site to load and basic functions like consent itself."
              checked
              disabled
              onToggle={() => undefined}
            />
            <PrefRow
              title="Analytics + session replay"
              description="PostHog: anonymous page-view tracking, click heatmaps, and session replay (input fields are masked, no passwords or emails recorded). Helps us spot where people get stuck so we can fix it."
              checked={categories.analytics}
              onToggle={(v) =>
                setCategories({ ...categories, analytics: v })
              }
            />
            <PrefRow
              title="Marketing"
              description="Used for measuring ad performance, if we ever run ads."
              checked={categories.marketing}
              onToggle={(v) =>
                setCategories({ ...categories, marketing: v })
              }
            />
          </div>
          <DialogFooter className="gap-2">
            <button
              type="button"
              onClick={rejectAll}
              className="h-11 rounded-pill border border-vyrek-border px-5 text-sm font-medium text-vyrek-text transition-colors hover:bg-vyrek-overlay"
            >
              Reject all
            </button>
            <button
              type="button"
              onClick={saveCustom}
              className="h-11 rounded-pill bg-vyrek-accent px-5 text-sm font-medium text-[#0A0A0A] transition-colors hover:bg-vyrek-accent-hover"
            >
              Save preferences
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function PrefRow({
  title,
  description,
  checked,
  disabled,
  onToggle,
}: {
  title: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onToggle: (next: boolean) => void;
}) {
  return (
    <label
      className={`flex cursor-pointer items-start justify-between gap-4 rounded-md border border-vyrek-border-subtle px-4 py-3 ${
        disabled ? "opacity-60": "hover:border-vyrek-border-default"
      }`}
    >
      <span className="flex-1">
        <span className="block text-sm font-medium text-vyrek-text">
          {title}
        </span>
        <span className="mt-1 block text-xs leading-relaxed text-vyrek-text-secondary">
          {description}
        </span>
      </span>
      <input
        type="checkbox"
        className="mt-1 size-4 accent-vyrek-accent"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onToggle(e.target.checked)}
      />
    </label>
  );
}
