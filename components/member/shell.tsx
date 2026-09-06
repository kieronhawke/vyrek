import type { ReactNode } from "react";
import Link from "next/link";
import { MemberRailNav, MemberTabBar } from "@/components/member/nav";
import { Wordmark } from "@/components/shared/logo";
import { BlockProgress } from "@/components/member/block-progress";
import { Walkthrough } from "@/components/member/walkthrough";

/**
 * The member area frame. One shell for every member page.
 *
 * It exists because the width was previously each page's own problem, and four
 * of the seven pages forgot: Today, Nutrition and Analysis capped themselves at
 * 768px while Home, Plan, Progress and Account did not, so Account rendered
 * label-left / value-right across a whole monitor. A page can no longer get
 * this wrong, because it no longer decides.
 *
 * THE RAIL IS ONE ELEMENT NOW
 * ---------------------------
 * It used to be three: a fixed `.member-railhead` holding the wordmark, a
 * fixed `.member-railprogress` holding the week ring, and a fixed
 * `.member-rail` holding the links — each positioned independently and kept
 * from colliding by hand-tuned `top` offsets and a padding-top on the third.
 *
 * That arithmetic is why the logo, the week ring and the first link sat almost
 * on top of each other: nothing was spacing them, three magic numbers were.
 * One flow container spaces itself, so the logo can grow without anything
 * underneath it needing to be recalculated.
 */
export function MemberShell({
  base = "/app",
  initials,
  blockWeek,
  blockTotal,
  mode = "full",
  children,
}: {
  /** Route prefix, so the ungated preview mount reuses this verbatim. */
  base?: string;
  /** Shown in the avatar. Omitted on the preview mount, which has no user. */
  initials?: string;
  /** Weeks published to this member. 0 hides the block indicator entirely. */
  blockWeek?: number;
  blockTotal?: number;
  /**
   * Kept on the frame as `data-mode` for anything that wants to know, but it
   * no longer changes the chrome. It used to collapse the shell to a single
   * centred column with no rail and no tab bar, on the reasoning that a
   * payment-link client has one place to be. In practice that shipped them a
   * page which looked like an unstyled phone layout on a desktop and hid the
   * product entirely. They get the real frame; the sections they cannot use
   * yet say so on their own screens.
   */
  mode?: "billing" | "full";
  children: ReactNode;
}) {
  return (
    <div className="member-frame" data-mode={mode}>
      {/* ── Desktop: the rail, top to bottom, in one flow ─────────────── */}
      <aside className="member-rail" aria-label="Member navigation">
        <div className="member-rail__brand">
          <Link href={base} aria-label="Suth Performance">
            {/* One step up from `sm`. The rail is 264px wide; a 28px wordmark
                in it read as an afterthought rather than the top of the app. */}
            <Wordmark size="md" accent="var(--accent)" className="text-[color:var(--text)]" />
          </Link>
        </div>

        {/* Where they are in the block. Its own row, with room around it,
            rather than tucked against the wordmark. */}
        <div className="member-rail__progress">
          <BlockProgress current={blockWeek} total={blockTotal} />
        </div>

        <MemberRailNav base={base} />
      </aside>

      {/* ── Mobile: wordmark left, progress centre, account right ─────── */}
      <header className="member-topbar">
        <Link href={base} aria-label="Suth Performance">
          <Wordmark size="sm" accent="var(--accent)" className="text-[color:var(--text)]" />
        </Link>
        <BlockProgress compact current={blockWeek} total={blockTotal} />
        {initials ? (
          <Link
            href={`${base}/account`}
            aria-label="Account"
            className="member-avatar"
          >
            {initials}
          </Link>
        ) : null}
      </header>

      <MemberTabBar base={base} />

      <main className="member-main" data-mode={mode}>
        {children}
      </main>

      {/* Shown once, on the first visit after onboarding. */}
      {/* The five-step tour explains Today, the week strip and the session
          card. None of those exist yet for somebody still waiting on week
          one, so it was pointing at empty space and covering the screen that
          actually answers their question. It waits for a real block. */}
      {/* The tour points at a published block. A billing-only client has
          none, so blockWeek is 0 and it stays away on its own. */}
      {blockWeek !== 0 && <Walkthrough />}
    </div>
  );
}
