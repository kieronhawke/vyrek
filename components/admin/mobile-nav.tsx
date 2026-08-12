"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * The phone version of the admin sidebar: a horizontal chip scroller.
 * Client component purely so the CURRENT section reads as selected —
 * fifteen identical chips gave no sense of place, which is most of what
 * makes a page feel like a website instead of an app.
 */
export function AdminMobileNav({
  items,
}: {
  items: { href: string; label: string }[];
}) {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);

  return (
    <nav
      aria-label="Admin sections"
      className="-mx-4 mb-6 flex gap-2 overflow-x-auto px-4 pb-1 md:hidden"
      style={{ WebkitOverflowScrolling: "touch", scrollbarWidth: "none" }}
    >
      {items.map((n) => {
        const active = isActive(n.href);
        return (
          <Link
            key={n.href}
            href={n.href}
            aria-current={active ? "page" : undefined}
            className={`inline-flex h-10 shrink-0 items-center rounded-pill border px-4 font-mono text-[11px] uppercase tracking-[0.18em] transition-colors ${
              active
                ? "border-suth-accent bg-suth-accent text-[#0A0A0A] font-semibold"
                : "border-suth-border-subtle bg-suth-elevated text-suth-text-secondary"
            }`}
          >
            {n.label}
          </Link>
        );
      })}
    </nav>
  );
}
