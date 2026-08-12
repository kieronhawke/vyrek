import type { Metadata } from "next";
import Link from "next/link";
import { Archivo } from "next/font/google";
import { assertAdmin } from "@/lib/admin/auth";
import { CoachTabs } from "@/components/control/coach-tabs";
import { CommandPalette } from "@/components/control/command-palette";
import "@/app/control-tokens.css";
import { ThemeScript } from "@/components/control/theme-script";

/**
 * COACH MODE — docs/build-pack/spec/09 §0.
 *
 * Deliberately a separate interface from /admin, not a "simple view" toggle:
 * "If the admin is built as one dashboard with a simple-view toggle, Ben will
 * not use it." Mobile-first, five screens, no financial detail, no jargon.
 *
 * `data-density="comfortable"` steps the base size to 15px — this is read
 * one-handed in a gym, not at a desk.
 */
const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Coach",
  robots: { index: false, follow: false },
};

export default async function CoachLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Same login as Mission Control: one identity, two views. The
  // middleware bounces anonymous visits at the edge; this is the
  // canonical page-level check behind it.
  await assertAdmin();

  return (
    <div
      data-surface="control"
      // ThemeScript sets data-theme here before paint.
      suppressHydrationWarning
      data-density="comfortable"
      className={archivo.variable}
      style={{ minHeight: "100svh", display: "flex", flexDirection: "column" }}
    >
      <ThemeScript />
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 30,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "var(--space-2)",
          minHeight: 56,
          padding: "0 var(--space-2)",
          paddingTop: "env(safe-area-inset-top)",
          background: "var(--bg)",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <span
          style={{
            fontWeight: 800,
            letterSpacing: "-0.02em",
            fontSize: "var(--text-lg)",
          }}
        >
          Coach
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
          <Link
            href="/admin"
            style={{
              fontSize: "var(--text-sm)",
              color: "var(--text-muted)",
              textDecoration: "none",
              border: "1px solid var(--border)",
              borderRadius: 999,
              padding: "6px 12px",
            }}
          >
            Mission Control →
          </Link>
          <CommandPalette />
        </span>
      </header>

      {/* Bottom padding clears the fixed tab bar plus the home indicator. */}
      <main
        style={{
          flex: 1,
          padding: "var(--space-3) var(--space-2)",
          paddingBottom: "calc(var(--tabbar-h) + env(safe-area-inset-bottom) + var(--space-4))",
        }}
      >
        {children}
      </main>

      <CoachTabs />
    </div>
  );
}
