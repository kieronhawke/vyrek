"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useMagnetic } from "@/hooks/use-magnetic";
import { Wordmark } from "@/components/shared/logo";

const SCROLL_THRESHOLD = 100; // px past which the nav adopts its solid state

const LINKS = [
  { href: "/programmes", label: "programmes" },
  { href: "/how-it-works", label: "how it works" },
  { href: "/blog", label: "journal" },
];

export function MarketingNav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const ctaRef = useRef<HTMLAnchorElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > SCROLL_THRESHOLD);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close the drawer whenever the route changes. Canonical sync-from-route
  // pattern, pathname-driven, no external store to subscribe to.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOpen(false);
  }, [pathname]);

  // Lock body scroll while drawer is open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Close on Esc
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // Subtle magnetic pull on the CTA, fine pointers only
  useMagnetic(ctaRef, { strength: 0.18, radius: 80 });

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  // Context-aware primary CTA. On partner routes the page is for
  // creators / coaches, so "Start training" sends the wrong signal.
  // Swap to "Apply to join" pointing at the partner application.
  const onPartnerRoute = pathname.startsWith("/partners");
  const ctaHref = onPartnerRoute ? "/partners/apply" : "/quiz";
  const ctaLabel = onPartnerRoute ? "Apply to join" : "Start training";

  return (
    <header
      className={cn(
        // top:var(--vyrek-consent-h) keeps the nav docked below the
        // cookie strip when it's visible. Falls back to 0 (the CSS
        // variable default) the rest of the time.
        "fixed inset-x-0 z-50 transition-[colors,top] duration-base ease-out",
        "top-[var(--vyrek-consent-h,0px)] pt-[var(--safe-top)]",
      )}
    >
      <div
        className={cn(
          "h-16 transition-[background,backdrop-filter,border-color] duration-base ease-out",
          scrolled || open
            ? "border-b border-vyrek-border-subtle bg-vyrek-base/85 backdrop-blur-xl": "border-b border-transparent bg-transparent",
        )}
      >
        <div className="mx-auto flex h-full max-w-7xl items-center justify-between gap-3 px-5 md:px-8">
          <Link
            href="/"
            aria-label="Vyrek, home"
            className="inline-flex items-center"
          >
            <Wordmark size="md" />
          </Link>

          <nav
            className="hidden items-center gap-1 md:flex"
            aria-label="Primary"
          >
            {LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                aria-current={isActive(link.href) ? "page": undefined}
                className={cn(
                  "inline-flex h-10 items-center px-3 text-sm transition-colors",
                  isActive(link.href)
                    ? "text-vyrek-text": "text-vyrek-text-secondary hover:text-vyrek-text",
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="hidden h-10 items-center px-3 text-sm text-vyrek-text-secondary transition-colors hover:text-vyrek-text md:inline-flex"
            >
              sign in
            </Link>
            <Link
              ref={ctaRef}
              href={ctaHref}
              className="hidden h-10 items-center justify-center gap-2 rounded-pill bg-vyrek-accent px-4 text-sm font-semibold uppercase tracking-wide text-[#0A0A0A] transition-[background,opacity] duration-fast ease-out hover:bg-vyrek-accent-hover active:scale-[0.98] will-change-transform sm:inline-flex"
            >
              {ctaLabel}
            </Link>

            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              aria-controls="mobile-nav-drawer"
              aria-label={open ? "Close navigation": "Open navigation"}
              className="inline-flex size-11 items-center justify-center rounded-pill border border-vyrek-border bg-vyrek-elevated text-vyrek-text transition-colors hover:border-vyrek-border-strong md:hidden"
            >
              <span aria-hidden className="relative block size-4">
                <span
                  className={cn(
                    "absolute left-0 right-0 top-0.5 h-0.5 rounded-full bg-current transition-[transform,top] duration-fast",
                    open && "top-1.5 rotate-45",
                  )}
                />
                <span
                  className={cn(
                    "absolute left-0 right-0 top-1.5 h-0.5 rounded-full bg-current transition-opacity duration-fast",
                    open && "opacity-0",
                  )}
                />
                <span
                  className={cn(
                    "absolute bottom-0.5 left-0 right-0 h-0.5 rounded-full bg-current transition-[transform,bottom] duration-fast",
                    open && "bottom-1.5 -rotate-45",
                  )}
                />
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile drawer, slides down beneath the nav bar */}
      <div
        id="mobile-nav-drawer"
        aria-hidden={!open}
        // `inert` (when closed) prevents the focusable links inside
        // from being reachable by keyboard navigation while the drawer
        // is hidden. Without it, Lighthouse + screen readers flag
        // aria-hidden-focus violations. React 19 accepts the boolean
        // form; older variants needed "" which then warned. true is
        // safe.
        inert={!open}
        className={cn(
          "fixed inset-x-0 top-0 z-40 origin-top md:hidden",
          "pt-[calc(var(--safe-top)+4rem)]",
          "transition-[transform,opacity] duration-base ease-out",
          open ? "translate-y-0 opacity-100": "pointer-events-none -translate-y-2 opacity-0",
        )}
      >
        <div className="mx-5 mt-2 overflow-hidden rounded-2xl border border-vyrek-border bg-vyrek-elevated shadow-2xl">
          <nav aria-label="Mobile primary" className="flex flex-col px-2 py-2">
            {LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                aria-current={isActive(link.href) ? "page": undefined}
                className={cn(
                  "flex items-center justify-between rounded-md px-4 py-3 text-base transition-colors",
                  isActive(link.href)
                    ? "bg-vyrek-overlay text-vyrek-text": "text-vyrek-text-secondary hover:bg-vyrek-overlay hover:text-vyrek-text",
                )}
              >
                <span>{link.label}</span>
                <span
                  aria-hidden
                  className="font-mono text-xs uppercase tracking-[0.18em] text-vyrek-text-tertiary"
                >
                  →
                </span>
              </Link>
            ))}
            <Link
              href="/login"
              className="flex items-center justify-between rounded-md px-4 py-3 text-base text-vyrek-text-secondary transition-colors hover:bg-vyrek-overlay hover:text-vyrek-text"
            >
              <span>sign in</span>
              <span
                aria-hidden
                className="font-mono text-xs uppercase tracking-[0.18em] text-vyrek-text-tertiary"
              >
                →
              </span>
            </Link>
            <div className="mx-2 mt-2 border-t border-vyrek-border-subtle" />
            <Link
              href={ctaHref}
              className="m-2 inline-flex h-12 items-center justify-center rounded-pill bg-vyrek-accent px-5 text-base font-medium tracking-tight text-[#0A0A0A] transition-colors hover:bg-vyrek-accent-hover active:scale-[0.98]"
            >
              {ctaLabel} →
            </Link>
          </nav>
          <div className="border-t border-vyrek-border-subtle bg-vyrek-base/40 px-4 py-3 font-mono text-[10px] uppercase tracking-[0.22em] text-vyrek-text-tertiary">
            [ VYREK · FITNESS / 2026 ]
          </div>
        </div>
      </div>

      {/* Backdrop */}
      <button
        type="button"
        aria-hidden="true"
        tabIndex={-1}
        onClick={() => setOpen(false)}
        className={cn(
          "fixed inset-0 z-30 bg-black/40 backdrop-blur-sm transition-opacity duration-base md:hidden",
          open ? "opacity-100": "pointer-events-none opacity-0",
        )}
      />
    </header>
  );
}
