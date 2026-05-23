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
  const [prefsOpen, setPrefsOpen] = useState(false);
  const [categories, setCategories] = useState<ConsentCategories>(
    DEFAULT_CONSENT.categories,
  );

  useEffect(() => {
    const state = readConsent();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
    if (state.decided) {
      setCategories(state.categories);
      return;
    }
    // Let the hero render first; show after 1.5s so it doesn't compete
    // with first-paint LCP.
    const timer = window.setTimeout(() => setVisible(true), 1500);
    return () => window.clearTimeout(timer);
  }, []);

  // Push page content down by the banner height while it's visible.
  // 48px works for both mobile + desktop with the current padding.
  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    if (mounted && visible) {
      root.style.setProperty("--vyrek-consent-h", "48px");
    } else {
      root.style.setProperty("--vyrek-consent-h", "0px");
    }
  }, [mounted, visible]);

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
        className="fixed inset-x-0 top-0 z-[60] pt-[var(--safe-top)]"
        style={{
          // Set the real measured height for the body push.
          // 48px on mobile, 52px on desktop after padding.
        }}
      >
        <div className="border-b border-vyrek-border-subtle bg-vyrek-base/95 backdrop-blur-md">
          <div className="mx-auto flex max-w-7xl items-center gap-2 px-4 py-2.5 md:gap-4 md:px-6 md:py-3">
            <p className="flex-1 min-w-0 truncate text-[13px] leading-snug text-vyrek-text-secondary md:text-sm">
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
                className="!min-h-0 text-vyrek-text-tertiary underline-offset-2 hover:text-vyrek-text hover:underline"
              >
                Manage
              </button>
            </p>
            <button
              type="button"
              onClick={rejectAll}
              className="!min-h-0 inline-flex h-8 shrink-0 items-center rounded-pill border border-vyrek-border bg-transparent px-3 text-xs font-medium text-vyrek-text-secondary transition-colors hover:text-vyrek-text active:scale-[0.97]"
            >
              Reject
            </button>
            <button
              type="button"
              onClick={acceptAll}
              className="!min-h-0 inline-flex h-8 shrink-0 items-center rounded-pill bg-vyrek-accent px-3.5 text-xs font-semibold text-[#0A0A0A] transition-colors hover:bg-vyrek-accent-hover active:scale-[0.97]"
            >
              Accept
            </button>
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
        disabled ? "opacity-60" : "hover:border-vyrek-border-default"
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
