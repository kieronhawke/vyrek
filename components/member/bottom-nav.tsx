"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

/**
 * iOS-native-feel bottom tab bar. Five tabs. Safe-area aware.
 * Active tab shows accent + filled icon. Press feedback via active:scale.
 */

type Tab = {
  href: string;
  label: string;
  icon: (active: boolean) => React.ReactNode;
};

const TABS: Tab[] = [
  {
    href: "/app/today",
    label: "Today",
    icon: (active) => (
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill={active ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth={active ? 1.6 : 2}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <rect x="3" y="4" width="18" height="18" rx="3" />
        <path d="M3 9h18" />
        <path d="M8 2v4" />
        <path d="M16 2v4" />
      </svg>
    ),
  },
  {
    href: "/app/plan",
    label: "Plan",
    icon: (active) => (
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill={active ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth={active ? 1.6 : 2}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M4 19V5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v14" />
        <path d="M8 7h8" />
        <path d="M8 11h8" />
        <path d="M8 15h5" />
        <path d="M4 19h16" />
      </svg>
    ),
  },
  {
    href: "/app/nutrition",
    label: "Nutrition",
    icon: (active) => (
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill={active ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth={active ? 1.6 : 2}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M6 2a4 4 0 0 0-4 4v3a4 4 0 0 0 4 4h2v8h2v-8h2a4 4 0 0 0 4-4V6a4 4 0 0 0-4-4" />
        <path d="M18 2c-1.5 0-3 .5-3 3v6c0 1 .5 2 1.5 2.5L17 14v8h2v-8l.5-.5C20.5 13 21 12 21 11V5c0-2.5-1.5-3-3-3z" />
      </svg>
    ),
  },
  {
    href: "/app/analysis",
    label: "Analysis",
    icon: (active) => (
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill={active ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth={active ? 1.6 : 2}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M3 3v18h18" />
        <path d="M7 14l4-4 4 4 6-6" />
      </svg>
    ),
  },
  {
    href: "/app/account",
    label: "Account",
    icon: (active) => (
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill={active ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth={active ? 1.6 : 2}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21c0-4 4-7 8-7s8 3 8 7" />
      </svg>
    ),
  },
];

export function MemberBottomNav() {
  const pathname = usePathname();

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <nav
      aria-label="Member sections"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-vyrek-border-subtle bg-vyrek-base/95 backdrop-blur-md md:hidden"
      style={{ paddingBottom: "var(--safe-bottom)" }}
    >
      <ul role="list" className="grid grid-cols-5">
        {TABS.map((t) => {
          const active = isActive(t.href);
          return (
            <li key={t.href}>
              <Link
                href={t.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-16 flex-col items-center justify-center gap-1 transition-colors active:scale-[0.96]",
                  active
                    ? "text-vyrek-accent"
                    : "text-vyrek-text-tertiary hover:text-vyrek-text",
                )}
              >
                {t.icon(active)}
                <span className="text-[10px] font-medium uppercase tracking-[0.12em]">
                  {t.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
