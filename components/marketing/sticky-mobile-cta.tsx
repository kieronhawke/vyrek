"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

/**
 * Mobile-only sticky bottom CTA. Appears once the user has scrolled
 * past the hero (so it doesn't compete with the hero CTA above-fold).
 * Hides on the way back up.
 *
 * This is the Whoop / Notion / Linear mobile pattern: a constant
 * thumb-zone "back to the action" affordance for users who scrolled
 * deep into the page and might otherwise need to scroll back up to
 * commit.
 *
 * Hidden on md+ where the desktop nav CTA fills the same role.
 * Hidden when prefers-reduced-motion is set OR when the user is on a
 * private flow (/quiz, /partners/apply, /admin/*, /welcome) where the
 * page already owns its own bottom CTA.
 */

const HIDE_ON = [
  "/quiz",
  "/partners/apply",
  "/partners/onboard",
  "/partners/dashboard",
  "/admin",
  "/welcome",
  "/login",
  "/plan",
];

export function StickyMobileCta({
  href = "/quiz",
  label = "See your Week 1 free",
}: {
  href?: string;
  label?: string;
}) {
  const [visible, setVisible] = useState(false);
  const [pathname, setPathname] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    // Sync pathname from window on mount. Set once, never re-runs.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPathname(window.location.pathname);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    // Suppress on focused-flow paths.
    if (HIDE_ON.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
      return;
    }
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        // Show once user has scrolled past ~75% of viewport height
        // (i.e. past the hero on a mobile portrait screen).
        const trigger = window.innerHeight * 0.75;
        setVisible(window.scrollY > trigger);
        ticking = false;
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [pathname]);

  if (HIDE_ON.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return null;
  }

  return (
    <div
      aria-hidden={!visible}
      className={`pointer-events-none fixed inset-x-0 bottom-0 z-40 md:hidden ${
        visible ? "opacity-100" : "opacity-0"
      } transition-opacity duration-300 ease-out`}
      style={{
        paddingBottom: "max(0.75rem, var(--safe-bottom))",
      }}
    >
      <div className="px-4">
        <div
          className={`pointer-events-auto rounded-pill border border-vyrek-border bg-vyrek-base/95 px-1 py-1 backdrop-blur-md shadow-[0_-8px_30px_-8px_rgba(0,0,0,0.6)] transition-transform duration-300 ease-out ${
            visible ? "translate-y-0" : "translate-y-4"
          }`}
        >
          <Link
            href={href}
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-pill bg-vyrek-accent px-6 text-base font-semibold uppercase tracking-wide text-[#0A0A0A] transition-colors hover:bg-vyrek-accent-hover active:scale-[0.98]"
          >
            {label} →
          </Link>
        </div>
      </div>
    </div>
  );
}
