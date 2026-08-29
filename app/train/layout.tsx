import type { Metadata } from "next";
import { Archivo } from "next/font/google";
import { RegisterTrainSW } from "@/components/client-app/register-sw";
import "@/app/control-tokens.css";
import "@/app/train.css";
import { ThemeScript } from "@/components/control/theme-script";

/**
 * The Train tab is a focused player: no chrome, no navigation, one exercise
 * at a time (spec/14 §7). Deliberately without the bottom tabs — leaving mid
 * set is not something to make easy.
 */
const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Train",
  robots: { index: false, follow: false },
};

export default function TrainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      data-surface="control"
      // ThemeScript sets data-theme here before paint.
      suppressHydrationWarning
      data-density="comfortable"
      className={archivo.variable}
      style={{ minHeight: "100svh" }}
    >
      <ThemeScript />
      <main
        style={{
          padding: "var(--space-3) var(--space-2)",
          paddingTop: "calc(env(safe-area-inset-top) + var(--space-3))",
          paddingBottom: "calc(env(safe-area-inset-bottom) + var(--space-4))",
        }}
      >
        <RegisterTrainSW />
        {children}
      </main>
    </div>
  );
}
