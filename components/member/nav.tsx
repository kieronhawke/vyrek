"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Member navigation. Two shapes, one source of truth for what the sections are.
 *
 * WHY IT IS ONE FILE
 * ------------------
 * There were two navigations before this: `components/client-app/tabs.tsx`,
 * which shipped, and `components/member/bottom-nav.tsx`, which was imported by
 * nothing. They disagreed about what the tabs even were, and that disagreement
 * is why /app/nutrition and /app/analysis had no route into them at all. Two
 * working sections were reachable only by typing the URL.
 *
 * MOBILE — a floating pill, thumb-reachable, safe-area aware. The app is used
 * one-handed between sets; this is the whole navigation and there is never a
 * hamburger. Five is the ceiling for a thumb bar, so it stays at five.
 *
 * DESKTOP — a left rail, and it is NOT the same five. A rail has vertical room
 * that a thumb bar does not, so it carries the sections the pill had to leave
 * out: Progress was reachable only from a link on Today, and Connections only
 * from inside Account. Both are real screens. Grouping them under headings is
 * what stops seven items reading as a list of undifferentiated words.
 */

type Item = {
  href: string;
  /** The rail has room for the real word. */
  label: string;
  /**
   * The mobile pill's abbreviation. Five columns on a 375px screen is ~67px
   * each, and "PROGRESS" at 12px ran into "ACCOUNT" so the two read as one
   * word. Shorter beats smaller: the type floor exists for a reason.
   */
  short: string;
  /** One line, in the rail, under the label. Skipped on narrow rails. */
  hint?: string;
  /** 24px grid, stroked. Thicker when active. */
  path: React.ReactNode;
};

const TODAY: Item = {
  href: "/app/today",
  label: "Today",
  short: "Today",
  hint: "Your session",
  path: (
    <>
      <rect x="3" y="4.5" width="18" height="17" rx="3" />
      <path d="M3 9.5h18M8 2.5v4M16 2.5v4" />
    </>
  ),
};

const PLAN: Item = {
  href: "/app/plan",
  label: "Plan",
  short: "Plan",
  hint: "The whole week",
  path: (
    <>
      <path d="M4 19.5V5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v14.5" />
      <path d="M8 7.5h8M8 11.5h8M8 15.5h5M4 19.5h16" />
    </>
  ),
};

const PROGRESS: Item = {
  href: "/app/progress",
  label: "Progress",
  short: "Stats",
  hint: "Volume and records",
  path: (
    <>
      <path d="M3 20.5h18" />
      <path d="M6 20.5v-6M11 20.5V8M16 20.5v-9M21 20.5V4" />
    </>
  ),
};

const FUEL: Item = {
  href: "/app/nutrition",
  label: "Fuel",
  short: "Fuel",
  hint: "Food and macros",
  path: (
    <>
      <path d="M6 2.5a3.5 3.5 0 0 0-3.5 3.5v3A3.5 3.5 0 0 0 6 12.5h1.5v9" />
      <path d="M11 2.5v10M8.5 2.5v4M13.5 2.5v6.5c0 1.5 1 2.5 2.5 2.5h1v10" />
    </>
  ),
};

const COACH: Item = {
  href: "/app/coach",
  label: "Coach",
  short: "Coach",
  hint: "Ask Ben",
  path: (
    <>
      <path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </>
  ),
};

const CONNECTIONS: Item = {
  href: "/app/connections",
  label: "Connections",
  short: "Apps",
  hint: "Watches and apps",
  path: (
    <>
      <path d="M9 15.5 15 9.5" />
      <path d="M11 6.5 13 4.5a4 4 0 0 1 5.7 5.7l-2 2" />
      <path d="M13 18.5l-2 2a4 4 0 0 1-5.7-5.7l2-2" />
    </>
  ),
};

const ACCOUNT: Item = {
  href: "/app/account",
  label: "Account",
  short: "You",
  hint: "Billing and data",
  path: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4 4-7 8-7s8 3 8 7" />
    </>
  ),
};

/** The thumb bar. Five, because a sixth column stops being tappable. */
const TABS: Item[] = [TODAY, PLAN, FUEL, COACH, ACCOUNT];

/**
 * The rail. Grouped, because seven links in one column is a list you read
 * rather than a structure you scan.
 *
 * Account sits in its own footer group rather than in this list: it is the
 * only one that is about the membership rather than the training, and putting
 * it at the bottom is the convention every app the athlete already uses.
 */
const RAIL_GROUPS: { label: string; items: Item[] }[] = [
  { label: "Training", items: [TODAY, PLAN, PROGRESS] },
  { label: "Support", items: [FUEL, COACH, CONNECTIONS] },
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
function useHref(base: string) {
  return (href: string) => (href.startsWith("/app/") ? base + href.slice(4) : href);
}

/** Mobile: the floating pill. */
export function MemberTabBar({ base = "/app" }: { base?: string }) {
  const isActive = useActive(base);
  const hrefFor = useHref(base);

  return (
    <nav aria-label="Member sections" className="member-tabbar">
      <ul role="list" className="member-tabbar__list">
        {TABS.map((tab) => {
          const active = isActive(tab.href);
          return (
            <li key={tab.href}>
              <Link
                href={hrefFor(tab.href)}
                aria-current={active ? "page" : undefined}
                /* Screen readers get the real word even though the pill shows
                   the abbreviation. */
                aria-label={tab.label}
                className="member-tabbar__link"
                data-active={active || undefined}
              >
                <Icon active={active}>{tab.path}</Icon>
                <span>{tab.short}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Desktop: the grouped links inside the rail. The rail itself is the shell's. */
export function MemberRailNav({ base = "/app" }: { base?: string }) {
  const isActive = useActive(base);
  const hrefFor = useHref(base);

  const link = (item: Item) => {
    const active = isActive(item.href);
    return (
      <li key={item.href}>
        <Link
          href={hrefFor(item.href)}
          aria-current={active ? "page" : undefined}
          className="member-rail__link"
          data-active={active || undefined}
        >
          <Icon active={active}>{item.path}</Icon>
          <span className="member-rail__text">
            <span className="member-rail__label">{item.label}</span>
            {item.hint ? (
              <span className="member-rail__hint">{item.hint}</span>
            ) : null}
          </span>
        </Link>
      </li>
    );
  };

  return (
    <>
      <div className="member-rail__groups">
        {RAIL_GROUPS.map((group) => (
          <div key={group.label} className="member-rail__group">
            <p className="member-rail__grouplabel">{group.label}</p>
            <ul role="list" className="member-rail__list">
              {group.items.map(link)}
            </ul>
          </div>
        ))}
      </div>

      {/* Account, pinned to the bottom. It is about the membership rather than
          the training, and the bottom is where every app the athlete already
          uses puts it. */}
      <div className="member-rail__foot">
        <ul role="list" className="member-rail__list">
          {link(ACCOUNT)}
        </ul>
      </div>
    </>
  );
}
