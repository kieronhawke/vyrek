import { Archivo } from "next/font/google";
import "@/app/control-tokens.css";

const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
});

/** No tab bar on sign-in: there is nowhere to navigate to yet. */
export default function SignInLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      data-surface="control"
      data-density="comfortable"
      className={archivo.variable}
      style={{ minHeight: "100svh", padding: "var(--space-3) var(--space-2)" }}
    >
      {children}
    </div>
  );
}
