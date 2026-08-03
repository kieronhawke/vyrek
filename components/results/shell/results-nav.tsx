"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Search, CalendarDays, Trophy, SlidersHorizontal, Dumbbell, MapPin } from "lucide-react";

/**
 * Results sub-navigation.
 *
 * The reference site keeps a permanent left rail plus a header on every page,
 * which eats a third of the viewport on the deep pages where the data should
 * dominate. This is a single horizontal strip that scrolls away, grouped by
 * intent rather than by page type (REFS.md §1).
 *
 * On mobile it is replaced by the bottom tab bar, in the thumb zone.
 */

// Desktop only — the mobile bar below keeps its own five, because a sixth tab
// in the thumb zone makes every tap target too narrow to hit reliably.
const LINKS = [
  { href: "/results", label: "Results", icon: Trophy, exact: true },
  { href: "/events", label: "Events", icon: CalendarDays },
  { href: "/results/city", label: "Cities", icon: MapPin },
  { href: "/rankings", label: "Rankings", icon: Trophy },
  { href: "/simulator", label: "Simulator", icon: SlidersHorizontal },
  { href: "/hyrox/stations", label: "Stations", icon: Dumbbell },
];

export function ResultsNav({ onOpenSearch }: { onOpenSearch?: () => void }) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Results sections"
      className="sticky top-[var(--results-nav-offset)] z-30 hidden border-b
                 border-suth-border-subtle bg-suth-base/90 backdrop-blur-md md:block"
    >
      <div className="mx-auto flex h-12 max-w-[1400px] items-center gap-1 px-5">
        {LINKS.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "inline-flex items-center gap-2 rounded-sm px-3 py-1.5 text-sm transition-colors",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-suth-accent",
                active
                  ? "bg-suth-overlay text-suth-text"
                  : "text-suth-text-secondary hover:text-suth-text",
              )}
            >
              <Icon className="size-4" aria-hidden />
              {label}
            </Link>
          );
        })}

        <button
          type="button"
          onClick={onOpenSearch}
          className="ml-auto inline-flex items-center gap-2 rounded-sm border border-suth-border
                     bg-suth-elevated px-3 py-1.5 text-sm text-suth-text-secondary
                     transition-colors hover:text-suth-text
                     focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-suth-accent"
        >
          <Search className="size-4" aria-hidden />
          Search athletes and events
          <kbd className="results-num ml-2 rounded-sm border border-suth-border px-1.5 py-0.5 text-[10px] text-suth-text-tertiary">
            ⌘K
          </kbd>
        </button>
      </div>
    </nav>
  );
}

/**
 * Mobile bottom tab bar. Five destinations, 44px targets, sits above the
 * home indicator via safe-area padding.
 */
export function MobileTabBar({ onOpenSearch }: { onOpenSearch?: () => void }) {
  const pathname = usePathname();

  const tabs = [
    { href: "/results", label: "Results", icon: Trophy, exact: true },
    { href: "/events", label: "Events", icon: CalendarDays },
    { type: "search" as const, label: "Search", icon: Search },
    { href: "/simulator", label: "Tools", icon: SlidersHorizontal },
    { href: "/hyrox/stations", label: "Guides", icon: Dumbbell },
  ];

  return (
    <nav
      aria-label="Results"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-suth-border-subtle
                 bg-suth-base/95 pb-[var(--safe-bottom)] backdrop-blur-md md:hidden"
    >
      <ul className="flex items-stretch">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          if ("type" in tab && tab.type === "search") {
            return (
              <li key="search" className="flex-1">
                <button
                  type="button"
                  onClick={onOpenSearch}
                  className="flex min-h-[44px] w-full flex-col items-center justify-center gap-1 py-2
                             text-suth-text-secondary
                             focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-suth-accent"
                >
                  <Icon className="size-5" aria-hidden />
                  <span className="text-[10px] tracking-wide">{tab.label}</span>
                </button>
              </li>
            );
          }
          const href = tab.href!;
          const active = tab.exact ? pathname === href : pathname.startsWith(href);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-[44px] flex-col items-center justify-center gap-1 py-2 transition-colors",
                  "focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-suth-accent",
                  active ? "text-suth-accent" : "text-suth-text-secondary",
                )}
              >
                <Icon className="size-5" aria-hidden />
                <span className="text-[10px] tracking-wide">{tab.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
