"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AdminSignOut } from "@/components/admin/sign-out";
import { AdminMobileNav } from "@/components/admin/mobile-nav";
import { AdminSideNav, type SideNavItem } from "@/components/admin/side-nav";
import { Monogram, Wordmark } from "@/components/shared/logo";

/**
 * THE MISSION CONTROL CHROME.
 *
 * One centralised admin: a collapsible left rail and the page beside it.
 * Collapsed, the rail is an icon strip and the content takes the full
 * width, which is what a data-dense console wants on a laptop. The choice
 * is remembered. On a phone the rail is gone entirely and the chip nav
 * takes over, so the same admin is usable one-handed.
 */

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
            {/* THE BRAND FIRST, THE CONSOLE SECOND.
                This was the S monogram beside the words "Mission Control", with
                "Suth Performance" as the smaller line underneath — the product
                naming the tool above the business it belongs to. The real
                lockup goes here now and Mission Control is the label under it,
                which is the way round every other screen in the estate has it.
                Collapsed, the rail is 68px wide and only the monogram fits;
                that is the one place the mark stands in for the lockup. */}
            <Link
              href="/admin"
              aria-label="Suth Performance · Mission Control"
              className={`flex min-w-0 ${collapsed ? "justify-center" : "flex-col gap-1.5"}`}
            >
              {collapsed ? (
                <Monogram size={30} className="shrink-0 text-suth-accent" />
              ) : (
                <>
                  <Wordmark size="sm" className="w-auto text-suth-text" />
                  <span className="block font-mono text-[10px] uppercase tracking-[0.2em] text-suth-accent">
                    Mission Control
                  </span>
                </>
              )}
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
          <Link
            href="/admin"
            aria-label="Suth Performance · Mission Control"
            className="mb-4 flex items-center gap-3 md:hidden"
          >
            <Wordmark size="sm" className="h-6 w-auto shrink-0 text-suth-text" />
            <span className="border-l border-suth-border-subtle pl-3 font-mono text-[10px] uppercase tracking-[0.2em] text-suth-accent">
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
