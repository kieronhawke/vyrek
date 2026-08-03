import type { Metadata } from "next";
import "@/app/control-tokens.css";
import "@/app/member.css";
import { ThemeScript } from "@/components/control/theme-script";

/**
 * The member area's outermost layer: surface, font, nothing else.
 *
 * The navigation deliberately does NOT live here. It used to, which meant
 * /app/sign-in rendered the tab bar too — its own layout carries the comment
 * "No tab bar on sign-in: there is nowhere to navigate to yet", and that had
 * quietly stopped being true, because a nested layout composes with its parent
 * rather than replacing it. The tabbed pages now sit in the (member) route
 * group, which owns the shell; sign-in sits outside it.
 */
export const metadata: Metadata = {
  title: "Your training",
  robots: { index: false, follow: false },
};

export default function MemberRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      data-surface="control"
      // ThemeScript sets data-theme here before paint.
      suppressHydrationWarning
      data-density="comfortable"
      style={{ minHeight: "100svh" }}
    >
      <ThemeScript />
      {children}
    </div>
  );
}
