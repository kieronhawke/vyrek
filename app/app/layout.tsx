import type { Metadata } from "next";
import { Archivo } from "next/font/google";
import { ClientTabs } from "@/components/client-app/tabs";
import { RegisterTrainSW } from "@/components/client-app/register-sw";
import "@/app/control-tokens.css";

/**
 * The member area. Five bottom tabs, app-like, thumb-reachable
 * (spec/11 §4, spec/14 §7).
 *
 * The header is sticky and translucent so content passes under it on scroll
 * — the small piece of motion the spec allows, and what makes a web app read
 * as native rather than as a page.
 */
const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Your training",
  robots: { index: false, follow: false },
};

export default function MemberLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      data-surface="control"
      data-density="comfortable"
      className={archivo.variable}
      style={{ minHeight: "100svh" }}
    >
      <RegisterTrainSW />
      <main
        style={{
          padding: "var(--space-3) var(--space-2)",
          paddingTop: "calc(env(safe-area-inset-top) + var(--space-3))",
          paddingBottom:
            "calc(var(--tabbar-h) + env(safe-area-inset-bottom) + var(--space-4))",
        }}
      >
        {children}
      </main>
      <ClientTabs />
    </div>
  );
}
