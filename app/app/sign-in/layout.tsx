import "@/app/control-tokens.css";
import { ThemeScript } from "@/components/control/theme-script";

/** No tab bar on sign-in: there is nowhere to navigate to yet. */
export default function SignInLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      data-surface="control"
      // ThemeScript sets data-theme here before paint.
      suppressHydrationWarning
      data-density="comfortable"
      style={{ minHeight: "100svh", padding: "var(--space-3) var(--space-2)" }}
    >
      <ThemeScript />
      {children}
    </div>
  );
}
