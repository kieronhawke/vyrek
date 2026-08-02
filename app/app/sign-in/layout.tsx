import "@/app/control-tokens.css";

/** No tab bar on sign-in: there is nowhere to navigate to yet. */
export default function SignInLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      data-surface="control"
      data-density="comfortable"
      style={{ minHeight: "100svh", padding: "var(--space-3) var(--space-2)" }}
    >
      {children}
    </div>
  );
}
