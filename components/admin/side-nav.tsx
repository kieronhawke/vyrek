"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * The desktop sidebar, with a glyph per section and the current page lit.
 * Client component for exactly one reason: knowing where you are. Before
 * this, fourteen identical text links gave no sense of place.
 */

function Glyph({ name }: { name: string }) {
  const paths: Record<string, React.ReactNode> = {
    overview: (
      <>
        <rect x="3" y="3" width="7.5" height="7.5" rx="1.5" />
        <rect x="13.5" y="3" width="7.5" height="7.5" rx="1.5" />
        <rect x="3" y="13.5" width="7.5" height="7.5" rx="1.5" />
        <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.5" />
      </>
    ),
    enquiries: (
      <>
        <path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8A8.5 8.5 0 0 1 12.5 3a8.5 8.5 0 0 1 8.5 8.5z" />
      </>
    ),
    consultations: (
      <>
        <rect x="3" y="4.5" width="18" height="17" rx="2.5" />
        <path d="M3 9.5h18M8 2.5v4M16 2.5v4" />
      </>
    ),
    live: (
      <>
        <path d="M2 12h4l3-8 6 16 3-8h4" />
      </>
    ),
    results: (
      <>
        <ellipse cx="12" cy="5.5" rx="8" ry="2.8" />
        <path d="M4 5.5v13c0 1.5 3.6 2.8 8 2.8s8-1.3 8-2.8v-13M4 12c0 1.5 3.6 2.8 8 2.8s8-1.3 8-2.8" />
      </>
    ),
    clients: (
      <>
        <circle cx="9" cy="8" r="3.5" />
        <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M18 8v6M21 11h-6" />
      </>
    ),
    customers: (
      <>
        <circle cx="9" cy="8" r="3.5" />
        <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M16 4.6a3.5 3.5 0 0 1 0 6.8M21 20c0-2.6-1.7-4.9-4-5.7" />
      </>
    ),
    subscriptions: (
      <>
        <path d="M20 8.5a8 8 0 0 0-14.9-2M4 3.5v3h3M4 15.5a8 8 0 0 0 14.9 2M20 20.5v-3h-3" />
      </>
    ),
    payments: (
      <>
        <rect x="2.5" y="5.5" width="19" height="13" rx="2.5" />
        <path d="M2.5 10h19M6.5 14.5h4" />
      </>
    ),
    applications: (
      <>
        <path d="M14 3H6.5A1.5 1.5 0 0 0 5 4.5v15A1.5 1.5 0 0 0 6.5 21h11a1.5 1.5 0 0 0 1.5-1.5V8z" />
        <path d="M14 3v5h5M9 13h6M9 17h6" />
      </>
    ),
    partners: (
      <>
        <path d="M7 11l4.5 4.5c.8.8 2.2.8 3 0s.8-2.2 0-3L10 8" />
        <path d="M3 7l4-3 5 4M21 7l-4-3-4 3M7 11l-4 3M17 11l4 3" />
      </>
    ),
    payouts: (
      <>
        <path d="M3 9.5 12 4l9 5.5M5 10v8M9.5 10v8M14.5 10v8M19 10v8M3 20h18" />
      </>
    ),
    blog: (
      <>
        <path d="M17 3.5 20.5 7 8 19.5l-4.5 1 1-4.5z" />
        <path d="M14.5 6 18 9.5" />
      </>
    ),
    waitlist: (
      <>
        <path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01" />
      </>
    ),
    messaging: (
      <>
        <rect x="2.5" y="5" width="19" height="14" rx="2" />
        <path d="m3.5 6.5 8.5 6 8.5-6" />
      </>
    ),
    quiz: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M9.5 9.2a2.5 2.5 0 1 1 3.4 2.3c-.8.3-.9 1-1 1.7M12 16.8h.01" />
      </>
    ),
    plans: (
      <>
        <rect x="3" y="4" width="18" height="17" rx="2" />
        <path d="M3 9h18M8 2.5v3M16 2.5v3M7 13h5M7 17h8" />
      </>
    ),
    activity: (
      <>
        <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
      </>
    ),
    settings: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </>
    ),
  };
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="shrink-0"
    >
      {paths[name] ?? paths.overview}
    </svg>
  );
}

export type SideNavItem = {
  href: string;
  label: string;
  group: string;
  icon: string;
};

export function AdminSideNav({
  items,
  collapsed = false,
}: {
  items: SideNavItem[];
  collapsed?: boolean;
}) {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
  const groups = Array.from(new Set(items.map((n) => n.group)));

  return (
    <nav aria-label="Admin" className={collapsed ? "mt-5 space-y-3" : "mt-6 space-y-5"}>
      {groups.map((group) => (
        <div key={group}>
          {!collapsed ? (
            <p className="px-2 font-mono text-[10px] uppercase tracking-[0.22em] text-suth-text-tertiary">
              {group}
            </p>
          ) : (
            <div className="mx-2 border-t border-suth-border-subtle" aria-hidden />
          )}
          <ul className={collapsed ? "mt-1 space-y-1" : "mt-2 space-y-0.5"}>
            {items
              .filter((n) => n.group === group)
              .map((n) => {
                const active = isActive(n.href);
                return (
                  <li key={n.href}>
                    <Link
                      href={n.href}
                      aria-current={active ? "page" : undefined}
                      title={collapsed ? n.label : undefined}
                      className={`flex items-center rounded-md text-sm transition-colors ${
                        collapsed ? "justify-center px-0 py-2" : "gap-2.5 px-2 py-1.5"
                      } ${
                        active
                          ? "bg-suth-accent/10 font-medium text-suth-accent"
                          : "text-suth-text-secondary hover:bg-suth-elevated hover:text-suth-text"
                      }`}
                    >
                      <Glyph name={n.icon} />
                      {!collapsed ? n.label : null}
                    </Link>
                  </li>
                );
              })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
