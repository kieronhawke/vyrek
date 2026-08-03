"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { CommandPalette } from "@/components/control/command-palette";
import { Wordmark } from "@/components/shared/logo";
import { ThemeToggle } from "@/components/control/theme-toggle";

/**
 * OPERATOR MODE SHELL — docs/build-pack/spec/14 §5.
 *
 * Fixed 216px sidebar, 48px top bar, 1440px content, superscript count
 * badges on anything needing action. Collapsible to 56px icons.
 *
 * spec/09 §0: this is genuinely a different interface from Coach Mode, not
 * the same dashboard with a toggle. Dense, keyboard-driven, every number in
 * mono — "a timing system, not a CRM".
 *
 * Below 768px the sidebar becomes a horizontal scroller rather than a
 * hamburger: spec/09 says the admin must be *fully usable* on mobile, not
 * merely responsive, and hiding thirteen modules behind a menu on the device
 * Kieron is most likely to check things on would fail that.
 */

export type ModuleLink = {
  href: string;
  label: string;
  count?: number;
  group: "Work" | "Money" | "Growth" | "System";
};

export const MODULES: ModuleLink[] = [
  { href: "", label: "Dashboard", group: "Work" },
  { href: "/leads", label: "Leads", count: 4, group: "Work" },
  { href: "/tracker", label: "Coach tracker", count: 27, group: "Work" },
  { href: "/clients", label: "Clients", count: 6, group: "Work" },
  { href: "/plans", label: "Plans", count: 2, group: "Work" },
  { href: "/diary", label: "Diary", group: "Work" },
  { href: "/messages", label: "Messages", count: 3, group: "Work" },
  { href: "/payments", label: "Payments", count: 2, group: "Money" },
  { href: "/finance", label: "Finance", group: "Money" },
  { href: "/activity", label: "Activity", group: "Growth" },
  { href: "/seo", label: "SEO", group: "Growth" },
  { href: "/assets", label: "Assets", group: "Growth" },
  { href: "/settings", label: "Settings", group: "System" },
  { href: "/accounts", label: "Accounts", group: "System" },
];

const GROUPS: ModuleLink["group"][] = ["Work", "Money", "Growth", "System"];

export function AdminShell({
  base,
  title,
  action,
  children,
}: {
  /** Route prefix, so the same shell serves the preview and the real mount. */
  base: string;
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div style={{ minHeight: "100svh", display: "flex", flexDirection: "column" }}>
      {/* ── Top bar: palette, alerts, account. Nothing else. ─────────── */}
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 30,
          minHeight: "var(--topbar-h)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "var(--space-2)",
          padding: "0 var(--space-2)",
          paddingTop: "env(safe-area-inset-top)",
          background: "var(--bg)",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            whiteSpace: "nowrap",
          }}
        >
          {/* The admin rendered the company name as bold text. It has a
              wordmark; not using it is why the console did not read as the
              same product as the site. */}
          <Wordmark
            size="sm"
            accent="var(--accent)"
            className="text-[color:var(--text)]"
          />
        </span>
        <ThemeToggle compact />
        <CommandPalette />
      </header>

      <div className="admin-body">
        {/* ── Sidebar. Horizontal scroller below md. ────────────────── */}
        <nav
          aria-label="Modules"
          data-testid="admin-sidebar"
          style={{
            flexShrink: 0,
            borderRight: "1px solid var(--border)",
            background: "var(--surface)",
            padding: "var(--space-1)",
          }}
          className="admin-sidebar"
        >
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            style={{
              minHeight: 44,
              minWidth: 44,
              width: "100%",
              background: "transparent",
              border: "none",
              color: "var(--text-muted)",
              fontSize: "var(--text-xs)",
              cursor: "pointer",
              textAlign: "left",
              padding: "0 var(--space-1)",
            }}
          >
            {collapsed ? "»" : "« Collapse"}
          </button>

          {GROUPS.map((group) => (
            <div key={group} style={{ marginTop: "var(--space-1)" }}>
              {!collapsed ? (
                <p className="eyebrow" style={{ padding: "0 var(--space-1)" }}>
                  {group}
                </p>
              ) : null}
              <ul role="list" style={{ listStyle: "none", margin: 0, padding: 0 }}>
                {MODULES.filter((m) => m.group === group).map((m) => {
                  const href = `${base}${m.href}`;
                  const active = pathname === href;
                  return (
                    <li key={m.label}>
                      <Link
                        href={href}
                        aria-current={active ? "page" : undefined}
                        title={m.label}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: "var(--space-1)",
                          minHeight: 44,
                          padding: "0 var(--space-1)",
                          borderRadius: "var(--radius-button)",
                          background: active ? "var(--surface-raised)" : "transparent",
                          color: active ? "var(--text)" : "var(--text-muted)",
                          textDecoration: "none",
                          fontSize: "var(--text-sm)",
                          whiteSpace: "nowrap",
                        }}
                      >
                        <span>{collapsed ? m.label.slice(0, 2) : m.label}</span>
                        {m.count && !collapsed ? (
                          <sup
                            className="num"
                            style={{ color: "var(--accent-text)", fontSize: "var(--text-xs)" }}
                          >
                            {m.count}
                          </sup>
                        ) : null}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <main
          style={{
            flex: 1,
            minWidth: 0,
            padding: "var(--space-3) var(--space-2)",
            paddingBottom: "calc(env(safe-area-inset-bottom) + var(--space-4))",
          }}
        >
          <div style={{ maxWidth: "var(--content-max)", margin: "0 auto" }}>
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                justifyContent: "space-between",
                gap: "var(--space-2)",
                flexWrap: "wrap",
                marginBottom: "var(--space-3)",
              }}
            >
              <h1
                style={{
                  fontSize: "var(--text-xl)",
                  lineHeight: "var(--text-xl-lh)",
                  fontWeight: 800,
                  letterSpacing: "-0.02em",
                  margin: 0,
                }}
              >
                {title}
              </h1>
              {action}
            </div>
            {children}
          </div>
        </main>
      </div>

      {/* Sidebar responsiveness lives in a style tag rather than inline,
          because a media query cannot be expressed as an inline style. */}
      <style>{`
        .admin-body { display: flex; flex: 1; min-height: 0; }
        .admin-sidebar { width: var(--sidebar-w); overflow-y: auto; }
        @media (max-width: 767px) {
          /* Stack, or the sidebar and the content sit side by side and the
             page overflows horizontally — which the gate rightly rejects. */
          .admin-body { flex-direction: column; }
          .admin-sidebar { max-width: 100%; }
          .admin-sidebar {
            width: 100%;
            position: sticky;
            top: var(--topbar-h);
            z-index: 20;
            border-right: none;
            border-bottom: 1px solid var(--border);
            overflow-x: auto;
            display: flex;
            gap: var(--space-1);
          }
          .admin-sidebar > button { display: none; }
          .admin-sidebar > div { margin-top: 0 !important; display: flex; align-items: center; gap: 4px; }
          .admin-sidebar > div > p { display: none; }
          .admin-sidebar ul { display: flex; gap: 4px; }
        }
      `}</style>
    </div>
  );
}
