"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Client app bottom tabs — docs/build-pack/spec/11 §4 and spec/14 §7.
 *
 * Five tabs, thumb-reachable, never a hamburger. The app is used one-handed
 * between sets, so this is the whole navigation.
 */
const TABS = [
  { href: "/app", label: "Home", glyph: "◎" },
  { href: "/app/plan", label: "Plan", glyph: "▤" },
  { href: "/train", label: "Train", glyph: "▶" },
  { href: "/app/progress", label: "Progress", glyph: "◫" },
  { href: "/app/account", label: "Account", glyph: "◍" },
] as const;

export function ClientTabs() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Main navigation"
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
        const active =
          tab.href === "/app" ? pathname === "/app" : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            style={{
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
