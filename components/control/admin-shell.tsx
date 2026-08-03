"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { CommandPalette } from "@/components/control/command-palette";
import { Wordmark } from "@/components/shared/logo";
import { ThemeToggle } from "@/components/control/theme-toggle";
import { MODULE_ICONS, IconMore } from "@/components/control/icons";

/**
 * OPERATOR MODE SHELL — docs/build-pack/spec/14 §5.
 *
 * TWO NAVIGATIONS, BECAUSE THERE ARE TWO JOBS
 *
 * At a desk Ben is *working* — writing a week, chasing a payment — and wants
 * every module one click away, so the rail shows all fourteen, grouped, with
 * counts. On a phone he is *checking* — between clients, in a car park — and
 * wants the four things he opens daily under his thumb. A fourteen-item
 * horizontal scroller, which is what this was, serves neither: it is a rail
 * lying on its side, most of it off-screen, none of it reachable one-handed.
 *
 * So below 900px the rail becomes a bottom tab bar of the four daily modules
 * plus More, which opens the full list as a sheet. That is the shape every app
 * on his phone already uses, which is the point — spec/09 says the admin must
 * be fully usable on mobile, not merely responsive.
 *
 * ICONS, NOT EMOJI. See components/control/icons.tsx for why.
 */

export type ModuleLink = {
  href: string;
  label: string;
  /** Shorter label for the bottom bar, where 64px is the whole column. */
  short?: string;
  count?: number;
  group: "Work" | "Money" | "Growth" | "System";
};

export const MODULES: ModuleLink[] = [
  { href: "", label: "Dashboard", short: "Today", group: "Work" },
  { href: "/leads", label: "Leads", count: 4, group: "Work" },
  { href: "/tracker", label: "Coach tracker", short: "Tracker", count: 27, group: "Work" },
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

/**
 * What goes under his thumb.
 *
 * Chosen from what the week actually is: the queue, who needs programming,
 * the plan he is writing, and anything a client has said. Payments matters
 * enormously and is checked weekly, not hourly — it lives in More.
 */
const TAB_BAR = ["", "/tracker", "/plans", "/messages"];

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
  const [sheet, setSheet] = useState(false);

  // Escape closes it. Anything modal that traps you is worse than no sheet.
  useEffect(() => {
    if (!sheet) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setSheet(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sheet]);

  const isActive = (href: string) => pathname === `${base}${href}`;
  const tabs = TAB_BAR.map((h) => MODULES.find((m) => m.href === h)!).filter(Boolean);
  /** Lights More when the page you are on is not one of the four tabs. */
  const inMore = !tabs.some((m) => isActive(m.href));

  return (
    <div className="ash" data-collapsed={collapsed || undefined}>
      {/* ── Top bar ───────────────────────────────────────────────────── */}
      <header className="ash-top">
        <span className="ash-top__mark">
          <Wordmark size="sm" accent="var(--accent)" className="text-[color:var(--text)]" />
        </span>
        {/* Grouped, or space-between strands the toggle in the middle of an
            otherwise empty bar. */}
        <span className="ash-top__tools">
          <ThemeToggle compact />
          <CommandPalette />
        </span>
      </header>

      <div className="ash-body">
        {/* ── Rail: every module, grouped. Desktop only. ──────────────── */}
        <nav aria-label="Modules" data-testid="admin-sidebar" className="ash-rail">
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="ash-collapse"
          >
            <span aria-hidden>{collapsed ? "»" : "«"}</span>
            {collapsed ? null : <span>Collapse</span>}
          </button>

          {GROUPS.map((group) => (
            <div key={group} className="ash-group">
              <p className="eyebrow ash-group__name">{group}</p>
              <ul role="list" className="ash-list">
                {MODULES.filter((m) => m.group === group).map((m) => (
                  <li key={m.label}>
                    <ModuleTile
                      module={m}
                      base={base}
                      active={isActive(m.href)}
                      collapsed={collapsed}
                    />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <main className="ash-main">
          <div className="ash-content">
            <div className="ash-head">
              <h1 className="ash-title">{title}</h1>
              {action}
            </div>
            {children}
          </div>
        </main>
      </div>

      {/* ── Bottom bar: four modules and everything else. Mobile only. ── */}
      <nav aria-label="Main" className="ash-tabs" data-testid="admin-tabbar">
        {tabs.map((m) => {
          const Icon = MODULE_ICONS[m.href];
          const active = isActive(m.href);
          return (
            <Link
              key={m.href}
              href={`${base}${m.href}`}
              className="ash-tab"
              data-on={active || undefined}
              aria-current={active ? "page" : undefined}
            >
              <span className="ash-tab__icon">
                <Icon size={22} />
                {m.count ? <span className="ash-tab__dot" /> : null}
              </span>
              <span className="ash-tab__label">{m.short ?? m.label}</span>
            </Link>
          );
        })}
        <button
          type="button"
          className="ash-tab"
          data-on={inMore || undefined}
          // The bar has to say where you are even when where you are is not a
          // tab. Without this, every page behind More reads as "nowhere".
          aria-current={inMore ? "page" : undefined}
          aria-expanded={sheet}
          onClick={() => setSheet((s) => !s)}
        >
          <span className="ash-tab__icon">
            <IconMore size={22} />
          </span>
          <span className="ash-tab__label">More</span>
        </button>
      </nav>

      {/* ── The More sheet ────────────────────────────────────────────── */}
      {sheet ? (
        <div className="ash-sheet" role="dialog" aria-modal="true" aria-label="All modules">
          <button
            type="button"
            className="ash-sheet__scrim"
            aria-label="Close"
            onClick={() => setSheet(false)}
          />
          <div className="ash-sheet__panel">
            <div className="ash-sheet__grip" aria-hidden />
            {GROUPS.map((group) => (
              <div key={group}>
                <p className="eyebrow ash-sheet__group">{group}</p>
                <ul role="list" className="ash-sheet__grid">
                  {MODULES.filter((m) => m.group === group).map((m) => {
                    const Icon = MODULE_ICONS[m.href];
                    return (
                      <li key={m.label}>
                        <Link
                          href={`${base}${m.href}`}
                          // Closed here rather than on a route change: a sheet
                          // that outlives the tap covers the page it just
                          // asked for.
                          onClick={() => setSheet(false)}
                          className="ash-sheet__item"
                          data-on={isActive(m.href) || undefined}
                        >
                          <Icon size={22} />
                          <span className="ash-sheet__label">{m.label}</span>
                          {m.count ? <span className="num ash-sheet__count">{m.count}</span> : null}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

/** One rail row. Collapsed, the label goes and the icon carries it alone. */
function ModuleTile({
  module: m,
  base,
  active,
  collapsed,
}: {
  module: ModuleLink;
  base: string;
  active: boolean;
  collapsed: boolean;
}) {
  const Icon = MODULE_ICONS[m.href];
  return (
    <Link
      href={`${base}${m.href}`}
      aria-current={active ? "page" : undefined}
      // The title is what makes a collapsed rail usable at all: without it the
      // icons are a guess for anyone who has not learned them yet.
      title={m.count ? `${m.label} — ${m.count}` : m.label}
      className="ash-item"
      data-on={active || undefined}
    >
      <Icon size={20} />
      {collapsed ? null : <span className="ash-item__label">{m.label}</span>}
      {m.count ? (
        <span className="num ash-item__count" aria-hidden={collapsed}>
          {m.count}
        </span>
      ) : null}
    </Link>
  );
}
