import Link from "next/link";
import { Wordmark } from "@/components/shared/logo";

export function MemberTopBar({ email }: { email: string }) {
  const initials = email
    .replace(/@.*/, "")
    .split(/[\W_]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("") || "V";

  return (
    <header
      className="sticky top-[var(--suth-consent-h,0px)] z-30 border-b border-suth-border-subtle bg-suth-base/95 backdrop-blur-md"
      style={{ paddingTop: "var(--safe-top)" }}
    >
      <div className="mx-auto flex h-14 max-w-3xl items-center justify-between gap-3 px-4">
        <Link href="/app/today" aria-label="Suth Performance" className="inline-flex items-center">
          <Wordmark size="sm" />
        </Link>
        <Link
          href="/app/account"
          aria-label="Account"
          className="inline-flex size-9 items-center justify-center rounded-full border border-suth-border bg-suth-elevated text-sm font-semibold uppercase tracking-wide text-suth-text"
        >
          {initials}
        </Link>
      </div>
    </header>
  );
}
