"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Member navigation. One component, two shapes.
 *
 * WHY IT IS ONE COMPONENT
 * -----------------------
 * There were two navigations before this: `components/client-app/tabs.tsx`,
 * which shipped, and `components/member/bottom-nav.tsx`, which was imported by
 * nothing. They disagreed about what the tabs even were — the live one carried
 * Home/Plan/Train/Progress/Account, the orphan carried the correct five — and
 * that disagreement is why /app/nutrition and /app/analysis had no route into
 * them at all. Two working sections were reachable only by typing the URL.
 *
 * MOBILE
 * ------
 * A floating pill, thumb-reachable, safe-area aware. The app is used one-handed
 * between sets; this is the whole navigation and there is never a hamburger.
 *
 * DESKTOP
 * -------
 * The same five items as a left rail. The old bar had no breakpoint at all, so
 * a mobile tab bar stretched the full width of a monitor with a glyph floating
 * in the middle of each 500px column. A rail is what the width is for.
 */

type Tab = {
  href: string;
  label: string;
  /** 24px grid, stroked. Filled when active. */
  path: React.ReactNode;
};

const TABS: Tab[] = [
  {
    href: "/app/today",
    label: "Today",
    path: (
      <>
        <rect x="3" y="4.5" width="18" height="17" rx="3" />
        <path d="M3 9.5h18M8 2.5v4M16 2.5v4" />
      </>
    ),
  },
  {
    href: "/app/plan",
    label: "Plan",
    path: (
      <>
        <path d="M4 19.5V5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v14.5" />
        <path d="M8 7.5h8M8 11.5h8M8 15.5h5M4 19.5h16" />
      </>
    ),
  },
  {
    href: "/app/nutrition",
    label: "Fuel",
    path: (
      <>
        <path d="M6 2.5a3.5 3.5 0 0 0-3.5 3.5v3A3.5 3.5 0 0 0 6 12.5h1.5v9" />
        <path d="M11 2.5v10M8.5 2.5v4M13.5 2.5v6.5c0 1.5 1 2.5 2.5 2.5h1v10" />
      </>
    ),
  },
  {
    href: "/app/progress",
    label: "Progress",
    path: (
      <>
        <path d="M3 3v18h18" />
        <path d="M7 14.5l4-4 4 4 6-6" />
      </>
    ),
  },
  {
    href: "/app/account",
    label: "Account",
    path: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21c0-4 4-7 8-7s8 3 8 7" />
      </>
    ),
  },
];

function Icon({ active, children }: { active: boolean; children: React.ReactNode }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={active ? 2.1 : 1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {children}
    </svg>
  );
}

function useActive(base: string) {
  const pathname = usePathname();
  return (href: string) => {
    const resolved = href.startsWith("/app/") ? base + href.slice(4) : href;
    if (resolved === base) return pathname === base;
    return pathname === resolved || pathname.startsWith(`${resolved}/`);
  };
}

/**
 * `base` exists so the same navigation serves the real, auth-gated mount at
 * /app and the ungated preview at /control-preview/app. Without it the
 * preview's tabs navigate into the gate and bounce to /login, which makes the
 * preview useless for looking at the thing it previews.
 */
export function MemberNav({ base = "/app" }: { base?: string }) {
  const isActive = useActive(base);
  const hrefFor = (href: string) =>
    href.startsWith("/app/") ? base + href.slice(4) : href;

  return (
    <>
      {/* ── Mobile: floating pill ─────────────────────────────────── */}
      <nav aria-label="Member sections" className="member-tabbar">
        <ul role="list" className="member-tabbar__list">
          {TABS.map((tab) => {
            const active = isActive(tab.href);
            return (
              <li key={tab.href}>
                <Link
                  href={hrefFor(tab.href)}
                  aria-current={active ? "page" : undefined}
                  className="member-tabbar__link"
                  data-active={active || undefined}
                >
                  <Icon active={active}>{tab.path}</Icon>
                  <span>{tab.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* ── Desktop: left rail ────────────────────────────────────── */}
      <nav aria-label="Member sections" className="member-rail">
        <ul role="list" className="member-rail__list">
          {TABS.map((tab) => {
            const active = isActive(tab.href);
            return (
              <li key={tab.href}>
                <Link
                  href={hrefFor(tab.href)}
                  aria-current={active ? "page" : undefined}
                  className="member-rail__link"
                  data-active={active || undefined}
                >
                  <Icon active={active}>{tab.path}</Icon>
                  <span>{tab.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
