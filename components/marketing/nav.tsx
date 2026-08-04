"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useMagnetic } from "@/hooks/use-magnetic";
import { Wordmark } from "@/components/shared/logo";

const SCROLL_THRESHOLD = 100; // px past which the nav adopts its solid state

const LINKS = [
  { href: "/programmes", label: "programmes" },
  { href: "/how-it-works", label: "how it works" },
  { href: "/blog", label: "journal" },
  { href: "/results", label: "results" },
];

export function MarketingNav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  /* The nav renders more than once per document: a page renders it, and so
     does the loading skeleton that stands in for that page, so a hardcoded
     drawer id appeared two or three times on every blog route. Duplicate ids
     are invalid HTML and aria-controls resolves to the first match, so the
     second toggle pointed at the first drawer. */
  const drawerId = useId();
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
  // The primary path is the free consultation, not the quiz.
  //
  // Both routes exist and both are wanted, but only one can be the button
  // in the nav, and they ask for very different things. "Build my plan"
  // starts a fifteen-screen questionnaire that ends in a price. "Book a
  // free call" costs half an hour and nothing else, and it is the step Ben
  // actually converts on — he speaks to them, then sends the account link.
  // The quiz stays as the secondary route for people who would rather not
  // talk to anybody yet.
  const ctaHref = onPartnerRoute ? "/partners/apply" : "/book";
  /* ONE CTA, AND IT NAMES THE THING.
     "Book a free call" describes the mechanism; "Free assessment" describes
     what they get, which is what the rest of the funnel now promises end to
     end — the quiz opens on it, the booking page confirms it, and the top
     right of every page should say the same words rather than a third
     variation of them. */
  const ctaLabel = onPartnerRoute ? "Apply to join" : "Free assessment";

  return (
    <header
      className={cn(
        // top:var(--suth-consent-h) keeps the nav docked below the
        // cookie strip when it's visible. Falls back to 0 (the CSS
        // variable default) the rest of the time.
        "fixed inset-x-0 z-50 transition-[colors,top] duration-base ease-out",
        "top-[var(--suth-consent-h,0px)] pt-[var(--safe-top)]",
      )}
    >
      <div
        className={cn(
          "h-16 transition-[background,backdrop-filter,border-color] duration-base ease-out",
          scrolled || open
            ? "border-b border-suth-border-subtle bg-suth-base/85 backdrop-blur-xl": "border-b border-transparent bg-transparent",
        )}
      >
        <div className="mx-auto flex h-full max-w-7xl items-center justify-between gap-3 px-5 md:px-8">
          <Link
            href="/"
            aria-label="Suth Performance, home"
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
                    ? "text-suth-text": "text-suth-text-secondary hover:text-suth-text",
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <Link
              href="/login"
              prefetch={false}
              className="hidden h-10 items-center px-3 text-sm text-suth-text-secondary transition-colors hover:text-suth-text md:inline-flex"
            >
              sign in
            </Link>
            <Link
              ref={ctaRef}
              href={ctaHref}
              className="hidden h-10 items-center justify-center gap-2 rounded-pill bg-suth-accent px-4 text-sm font-semibold uppercase tracking-wide text-[#0A0A0A] transition-[background,opacity] duration-fast ease-out hover:bg-suth-accent-hover active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-suth-text will-change-transform sm:inline-flex"
            >
              {ctaLabel}
            </Link>

            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              aria-controls={drawerId}
              aria-label={open ? "Close navigation": "Open navigation"}
              className="inline-flex size-11 items-center justify-center rounded-pill border border-suth-border bg-suth-elevated text-suth-text transition-colors hover:border-suth-border-strong md:hidden"
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

      {/* Mobile drawer, slides down beneath the nav bar. Padding-top
          accounts for: cookie banner height (--suth-consent-h, 0 when
          dismissed) + iOS safe-top inset + 4rem nav bar height. Pre-fix
          the cookie-banner offset was missing, so when the cookie strip
          was visible the drawer card slid up over the nav bar and hid
          the logo + close-button hamburger. */}
      <div
        id={drawerId}
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
          "pt-[calc(var(--suth-consent-h,0px)+var(--safe-top)+4rem)]",
          "transition-[transform,opacity] duration-base ease-out",
          open ? "translate-y-0 opacity-100": "pointer-events-none -translate-y-2 opacity-0",
        )}
      >
        <div className="mx-5 mt-2 overflow-hidden rounded-2xl border border-suth-border bg-suth-elevated shadow-2xl">
          <nav aria-label="Mobile primary" className="flex flex-col px-2 py-2">
            {LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                aria-current={isActive(link.href) ? "page": undefined}
                className={cn(
                  "flex items-center justify-between rounded-md px-4 py-3 text-base transition-colors",
                  isActive(link.href)
                    ? "bg-suth-overlay text-suth-text": "text-suth-text-secondary hover:bg-suth-overlay hover:text-suth-text",
                )}
              >
                <span>{link.label}</span>
                <span
                  aria-hidden
                  className="font-mono text-xs uppercase tracking-[0.18em] text-suth-text-tertiary"
                >
                  →
                </span>
              </Link>
            ))}
            <Link
              href="/login"
              prefetch={false}
              className="flex items-center justify-between rounded-md px-4 py-3 text-base text-suth-text-secondary transition-colors hover:bg-suth-overlay hover:text-suth-text"
            >
              <span>sign in</span>
              <span
                aria-hidden
                className="font-mono text-xs uppercase tracking-[0.18em] text-suth-text-tertiary"
              >
                →
              </span>
            </Link>
            <div className="mx-2 mt-2 border-t border-suth-border-subtle" />
            <Link
              href={ctaHref}
              className="m-2 inline-flex h-12 items-center justify-center rounded-pill bg-suth-accent px-5 text-base font-medium tracking-tight text-[#0A0A0A] transition-colors hover:bg-suth-accent-hover active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-suth-text"
            >
              {ctaLabel} →
            </Link>
          </nav>
          <div className="border-t border-suth-border-subtle bg-suth-base/40 px-4 py-3 font-mono text-[10px] uppercase tracking-[0.22em] text-suth-text-tertiary">
            [ SUTH PERFORMANCE · FITNESS / 2026 ]
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
