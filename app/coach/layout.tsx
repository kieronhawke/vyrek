import type { Metadata } from "next";
import { Archivo } from "next/font/google";
import { CoachTabs } from "@/components/control/coach-tabs";
import { CommandPalette } from "@/components/control/command-palette";
import "@/app/control-tokens.css";

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

export default function CoachLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      data-surface="control"
      data-density="comfortable"
      className={archivo.variable}
      style={{ minHeight: "100svh", display: "flex", flexDirection: "column" }}
    >
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
        <CommandPalette />
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
