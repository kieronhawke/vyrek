import type { Metadata } from "next";
import { Archivo } from "next/font/google";
import "@/app/control-tokens.css";
import "@/app/member.css";

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

export default function MemberRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      data-surface="control"
      data-density="comfortable"
      className={archivo.variable}
      style={{ minHeight: "100svh" }}
    >
      {children}
    </div>
  );
}
