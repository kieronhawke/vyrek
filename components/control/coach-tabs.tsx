"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Coach Mode bottom tab bar — docs/build-pack/spec/14 §6.
 *
 * 64px plus the safe-area inset, thumb-reachable, never a hamburger. Five
 * tabs and no more: spec/09 §0 is explicit that Coach Mode is five screens,
 * and that "if a feature cannot be expressed as a single sentence a coach
 * would say out loud, it does not belong in Coach Mode".
 *
 * Labels are what Ben would say, not what the system calls them.
 */

const TABS = [
  { href: "/coach", label: "Today", glyph: "◎" },
  { href: "/coach/clients", label: "Clients", glyph: "◍" },
  { href: "/coach/plans", label: "Plans", glyph: "▤" },
  { href: "/coach/messages", label: "Messages", glyph: "✉" },
  { href: "/coach/diary", label: "Diary", glyph: "▦" },
] as const;

export function CoachTabs() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Coach navigation"
      style={{
        position: "fixed",
        insetInline: 0,
        bottom: 0,
        zIndex: 40,
        display: "grid",
        gridTemplateColumns: `repeat(${TABS.length}, 1fr)`,
        background: "var(--surface)",
        borderTop: "1px solid var(--border)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      {TABS.map((tab) => {
        // /coach must not light up for every child route.
        const active =
          tab.href === "/coach"
            ? pathname === "/coach"
            : pathname.startsWith(tab.href);

        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            style={{
              // 44px is the floor; the bar itself is 64px so targets are
              // comfortably above it. spec/16 §3 gates this.
              minHeight: 64,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 2,
              textDecoration: "none",
              color: active ? "var(--accent)" : "var(--text-muted)",
            }}
          >
            <span aria-hidden style={{ fontSize: 18, lineHeight: 1 }}>
              {tab.glyph}
            </span>
            <span
              style={{
                // 12px, not the 11px eyebrow size: spec/16 §3 gates text
                // below 12px, and a nav label is not a table header. Also
                // simply more legible in a thumb-driven bar.
                fontSize: "var(--text-xs)",
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                fontWeight: 600,
              }}
            >
              {tab.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
