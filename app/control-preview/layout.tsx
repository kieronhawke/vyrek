import type { Metadata } from "next";
import { Archivo } from "next/font/google";
import "@/app/control-tokens.css";

/**
 * Layout for the control-centre surfaces.
 *
 * Archivo is loaded here rather than in the root layout so the marketing
 * site's typography is untouched (STACK.md §3.4). Self-hosted and subset by
 * next/font — no Google Fonts network request at runtime, per spec/14 §3.
 *
 * Geist Mono already comes from the root layout as --font-mono, which is
 * what --font-num points at.
 */
const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Design system · Control centre",
  // Internal reference surface. Never indexed.
  robots: { index: false, follow: false },
};

export default function ControlPreviewLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      data-surface="control"
      className={archivo.variable}
      style={{ minHeight: "100svh" }}
    >
      {children}
    </div>
  );
}
