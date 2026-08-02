import type { ReactNode } from "react";
import Link from "next/link";
import { MemberNav } from "@/components/member/nav";
import { Wordmark } from "@/components/shared/logo";
import { BlockProgress } from "@/components/member/block-progress";

/**
 * The member area frame. One shell for every member page.
 *
 * It exists because the width was previously each page's own problem, and four
 * of the seven pages forgot: Today, Nutrition and Analysis capped themselves at
 * 768px while Home, Plan, Progress and Account did not, so Account rendered
 * label-left / value-right across a whole monitor. A page can no longer get
 * this wrong, because it no longer decides.
 */
export function MemberShell({
  base = "/app",
  initials,
  children,
}: {
  /** Route prefix, so the ungated preview mount reuses this verbatim. */
  base?: string;
  /** Shown in the avatar. Omitted on the preview mount, which has no user. */
  initials?: string;
  children: ReactNode;
}) {
  return (
    <div className="member-frame">
      {/* Desktop: the wordmark sits above the rail. */}
      <div className="member-railhead">
        <Link href={base} aria-label="Suth Performance">
          <Wordmark size="sm" accent="var(--accent)" className="text-[color:var(--text)]" />
        </Link>
      </div>

      {/* Desktop: block progress sits under the wordmark, above the rail. */}
      <div className="member-railprogress">
        <BlockProgress />
      </div>

      {/* Mobile: wordmark left, account right. The rail replaces this above
          768px, so the avatar is not duplicated. */}
      <header className="member-topbar">
        <Link href={base} aria-label="Suth Performance">
          <Wordmark size="sm" accent="var(--accent)" className="text-[color:var(--text)]" />
        </Link>
        <BlockProgress compact />
        {initials ? (
          <Link
            href={`${base}/account`}
            aria-label="Account"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 34,
              height: 34,
              borderRadius: 999,
              border: "1px solid var(--border)",
              background: "var(--surface-raised)",
              color: "var(--text)",
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: "0.02em",
              textDecoration: "none",
            }}
          >
            {initials}
          </Link>
        ) : null}
      </header>

      <MemberNav base={base} />

      <main className="member-main">{children}</main>
    </div>
  );
}
