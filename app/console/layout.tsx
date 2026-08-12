import type { Metadata } from "next";
import { Archivo } from "next/font/google";
import { assertAdmin } from "@/lib/admin/auth";
import "@/app/control-tokens.css";
import { ThemeScript } from "@/components/control/theme-script";

/**
 * THE COACHING CONSOLE — the desktop operator surface.
 *
 * The richer, desktop-first half of the admin: the plan/quote builder, the
 * diary, client records, comms and the tracker, in the AdminShell the whole
 * console was designed around. Mission Control (/admin) owns the money and
 * the business numbers; this owns the coaching workflow. Same login for
 * both — this is gated by assertAdmin exactly like /admin, and cross-linked
 * from it.
 *
 * Archivo + control-tokens.css are loaded here, not in the root layout, so
 * the marketing site's typography is untouched.
 */
const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Coaching console · Suth Performance",
  robots: { index: false, follow: false },
};

export default async function ConsoleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Same gate as Mission Control. Middleware bounces anonymous visits at the
  // edge; this is the canonical page-level check behind it.
  await assertAdmin();

  return (
    <div
      data-surface="control"
      suppressHydrationWarning
      className={archivo.variable}
      style={{ minHeight: "100svh" }}
    >
      <ThemeScript />
      {children}
    </div>
  );
}
