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
import {
  DEFAULT_CONSENT,
  readConsent,
  writeConsent,
  type ConsentCategories,
} from "@/lib/consent";

/**
 * Non-overlapping cookie consent strip.
 *
 * Renders fixed at the very top of the viewport (or just inside the
 * safe-area inset on iOS) and pushes page content down via a body
 * padding token. This means it never covers a CTA, never blocks the
 * mobile drawer, and works the same on /pricing / /login / /quiz /
 * /partners/apply without any per-path suppression logic.
 *
 * Stripe + Linear + Vercel use this top-strip pattern for the same
 * reason. Bottom banners overlap content; top strips push it.
 */
export function CookieBanner() {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  /** null until the stored decision has been read. */
  const [decided, setDecided] = useState<boolean | null>(null);
  const [prefsOpen, setPrefsOpen] = useState(false);
  const [categories, setCategories] = useState<ConsentCategories>(
    DEFAULT_CONSENT.categories,
  );

  useEffect(() => {
    const state = readConsent();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDecided(state.decided);
    if (state.decided) {
      setCategories(state.categories);
      return;
    }
    // The strip's space is already reserved before first paint (see the inline
    // script in app/layout.tsx), so revealing it costs no layout shift. A short
    // fade keeps it from competing with the hero for attention; the old 1.5s
    // hold existed to protect LCP and is no longer needed now that nothing
    // moves when it appears.
    const timer = window.setTimeout(() => setVisible(true), 250);
    return () => window.clearTimeout(timer);
  }, []);

  /**
   * Owns the reserved strip height.
   *
   * Critically it does NOT zero the variable while the decision is still
   * unknown: the inline script in app/layout.tsx has already reserved 48px
   * before first paint, and clearing it here would collapse the page and then
   * push it back down — two layout shifts instead of none. That was ~0.108 CLS
   * on every page of the site.
   *
   * Space is released only once a decision exists.
   */
  useEffect(() => {
    if (typeof document === "undefined" || decided === null) return;
    document.documentElement.style.setProperty(
      "--suth-consent-h",
      decided ? "0px" : "48px",
    );
  }, [decided]);

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
        role="region"
        aria-label="Cookie preferences"
        data-print-hide
        className="fixed inset-x-0 top-0 z-[60] pt-[var(--safe-top)]"
        style={{
          // Set the real measured height for the body push.
          // 48px on mobile, 52px on desktop after padding.
        }}
      >
        <div className="border-b border-suth-border-subtle bg-suth-base/95 backdrop-blur-md">
          <div className="mx-auto flex max-w-7xl items-center gap-2 px-4 py-2.5 md:gap-4 md:px-6 md:py-3">
            <p className="flex-1 min-w-0 truncate text-[13px] leading-snug text-suth-text-secondary md:text-sm">
              <span className="hidden md:inline">
                We use cookies for analytics + session replay. Off until
                you accept.
              </span>
              <span className="md:hidden">
                Cookies: analytics + session replay.
              </span>{" "}
              <button
                type="button"
                onClick={() => setPrefsOpen(true)}
                className="!min-h-0 text-suth-text-tertiary underline-offset-2 hover:text-suth-text hover:underline"
              >
                Manage
              </button>
            </p>
            <button
              type="button"
              onClick={rejectAll}
              className="!min-h-0 inline-flex h-8 shrink-0 items-center rounded-pill border border-suth-border bg-transparent px-3 text-xs font-medium text-suth-text-secondary transition-colors hover:text-suth-text active:scale-[0.97]"
            >
              Reject
            </button>
            <button
              type="button"
              onClick={acceptAll}
              className="!min-h-0 inline-flex h-8 shrink-0 items-center rounded-pill bg-suth-accent px-3.5 text-xs font-semibold text-[#0A0A0A] transition-colors hover:bg-suth-accent-hover active:scale-[0.97]"
            >
              Accept
            </button>
          </div>
        </div>
      </div>

      <Dialog open={prefsOpen} onOpenChange={setPrefsOpen}>
        <DialogContent className="bg-suth-elevated">
          <DialogHeader>
            <DialogTitle className="text-xl font-black tracking-[-0.02em]">
              Cookie preferences
            </DialogTitle>
            <DialogDescription className="text-suth-text-secondary">
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
              className="h-11 rounded-pill border border-suth-border px-5 text-sm font-medium text-suth-text transition-colors hover:bg-suth-overlay"
            >
              Reject all
            </button>
            <button
              type="button"
              onClick={saveCustom}
              className="h-11 rounded-pill bg-suth-accent px-5 text-sm font-medium text-[#0A0A0A] transition-colors hover:bg-suth-accent-hover"
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
      className={`flex cursor-pointer items-start justify-between gap-4 rounded-md border border-suth-border-subtle px-4 py-3 ${
        disabled ? "opacity-60" : "hover:border-suth-border-default"
      }`}
    >
      <span className="flex-1">
        <span className="block text-sm font-medium text-suth-text">
          {title}
        </span>
        <span className="mt-1 block text-xs leading-relaxed text-suth-text-secondary">
          {description}
        </span>
      </span>
      <input
        type="checkbox"
        className="mt-1 size-4 accent-suth-accent"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onToggle(e.target.checked)}
      />
    </label>
  );
}
