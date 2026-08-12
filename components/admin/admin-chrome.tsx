"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AdminSignOut } from "@/components/admin/sign-out";
import { AdminMobileNav } from "@/components/admin/mobile-nav";
import { AdminSideNav, type SideNavItem } from "@/components/admin/side-nav";

/**
 * THE MISSION CONTROL CHROME.
 *
 * One centralised admin: a collapsible left rail and the page beside it.
 * Collapsed, the rail is an icon strip and the content takes the full
 * width, which is what a data-dense console wants on a laptop. The choice
 * is remembered. On a phone the rail is gone entirely and the chip nav
 * takes over, so the same admin is usable one-handed.
 */

function Monogram({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 240 240" aria-hidden focusable="false" className={className}>
      <rect x="6" y="6" width="228" height="228" rx="24" stroke="currentColor" strokeWidth="8" fill="none" />
      <g transform="translate(74.51 189.57)">
        <path
          d="M47.3 2.06Q34.23 2.06 25.46 -2.58Q16.68 -7.22 12.21 -16.94Q7.74 -26.66 7.22 -42.14L33.54 -46.1Q33.71 -37.15 35.17 -31.65Q36.64 -26.14 39.3 -23.74Q41.97 -21.33 45.75 -21.33Q50.57 -21.33 52.03 -24.6Q53.49 -27.86 53.49 -31.48Q53.49 -40.08 49.36 -46.01Q45.24 -51.94 38.18 -57.96L26.14 -68.46Q18.23 -75.16 12.81 -83.68Q7.4 -92.19 7.4 -104.75Q7.4 -122.46 17.89 -131.84Q28.38 -141.21 46.44 -141.21Q57.62 -141.21 64.41 -137.43Q71.21 -133.64 74.73 -127.54Q78.26 -121.43 79.55 -114.64Q80.84 -107.84 81.01 -101.65L54.52 -98.38Q54.35 -104.58 53.75 -109.13Q53.15 -113.69 51.26 -116.19Q49.36 -118.68 45.41 -118.68Q41.11 -118.68 39.13 -115.07Q37.15 -111.46 37.15 -107.84Q37.15 -100.1 40.85 -95.2Q44.55 -90.3 50.57 -84.97L62.09 -74.82Q71.21 -67.08 77.49 -57.28Q83.76 -47.47 83.76 -33.02Q83.76 -23.22 79.29 -15.22Q74.82 -7.22 66.65 -2.58Q58.48 2.06 47.3 2.06Z"
          fill="currentColor"
        />
      </g>
    </svg>
  );
}

export function AdminChrome({
  items,
  userEmail,
  children,
}: {
  items: SideNavItem[];
  userEmail: string;
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [ready, setReady] = useState(false);
  const pathname = usePathname();

  // Remember the choice. Read after mount so the server render (expanded)
  // and the first client paint agree, then snap to the saved state.
  useEffect(() => {
    setCollapsed(localStorage.getItem("mc.sidebar.collapsed") === "1");
    setReady(true);
  }, []);

  function toggle() {
    setCollapsed((c) => {
      const next = !c;
      localStorage.setItem("mc.sidebar.collapsed", next ? "1" : "0");
      return next;
    });
  }

  return (
    <div className="min-h-svh bg-suth-base text-suth-text">
      <div className="mx-auto flex max-w-[1600px] gap-0 md:gap-6 px-0 md:px-6">
        <aside
          className={`hidden shrink-0 border-r border-suth-border-subtle py-6 md:block ${
            collapsed ? "w-[68px] pr-2" : "w-64 pr-5"
          } ${ready ? "transition-[width] duration-200" : ""}`}
        >
          <div className="flex items-center justify-between gap-1 px-2">
            <Link href="/admin" className="flex min-w-0 items-center gap-2.5">
              <Monogram className="size-8 shrink-0 text-suth-accent" />
              {!collapsed ? (
                <span className="min-w-0">
                  <span className="block font-mono text-[11px] uppercase tracking-[0.2em] text-suth-accent">
                    Mission Control
                  </span>
                  <span className="mt-0.5 block truncate font-mono text-[10px] uppercase tracking-[0.2em] text-suth-text-tertiary">
                    Suth Performance
                  </span>
                </span>
              ) : null}
            </Link>
          </div>

          <button
            type="button"
            onClick={toggle}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand" : "Collapse"}
            className="mt-4 flex w-full items-center justify-center rounded-md border border-suth-border-subtle py-1.5 text-suth-text-tertiary transition-colors hover:border-suth-border-strong hover:text-suth-text"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              {collapsed ? <path d="M9 6l6 6-6 6" /> : <path d="M15 6l-6 6 6 6" />}
            </svg>
          </button>

          <AdminSideNav items={items} collapsed={collapsed} />

          <div className={`mt-6 space-y-2 border-t border-suth-border-subtle pt-4 ${collapsed ? "px-0" : ""}`}>
            {!collapsed ? (
              <>
                <p className="px-2 font-mono text-[10px] uppercase tracking-[0.2em] text-suth-text-tertiary">
                  Signed in
                </p>
                <p className="mt-1 truncate px-2 text-xs text-suth-text">{userEmail}</p>
                <div className="mt-3 px-2">
                  <AdminSignOut />
                </div>
              </>
            ) : (
              <div className="flex justify-center">
                <AdminSignOut />
              </div>
            )}
          </div>
        </aside>

        <main className="min-w-0 flex-1 px-4 py-6 md:px-0 md:py-8">
          <Link href="/admin" className="mb-4 flex items-center gap-2.5 md:hidden">
            <Monogram className="size-7 shrink-0 text-suth-accent" />
            <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-suth-accent">
              Mission Control
            </span>
          </Link>
          <AdminMobileNav items={items.map(({ href, label }) => ({ href, label }))} />
          <div key={pathname}>{children}</div>
        </main>
      </div>
    </div>
  );
}
