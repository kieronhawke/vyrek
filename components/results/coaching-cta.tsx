import Link from "next/link";
import { cn } from "@/lib/utils";
import { MicroLabel } from "./ui/primitives";

/**
 * The one contextual coaching CTA a page is allowed (brief §6.5).
 *
 * Always tied to what the visitor is actually looking at — this course, this
 * weakest station, this goal time — never a generic banner. The reference site
 * has no coaching layer at all, which is the largest gap we can fill
 * (REFS.md §2.4), so the temptation is to over-use this. One per page.
 *
 * Quiet by construction: bordered, not filled. The data is the point; this is
 * a door, not a shout.
 */
export function CoachingCta({
  headline, body, href = "/plans", cta = "See coaching options", className,
}: {
  headline: string;
  body: string;
  href?: string;
  cta?: string;
  className?: string;
}) {
  return (
    <aside
      className={cn(
        "rounded-md border border-suth-accent/25 bg-suth-accent/[0.04] p-5",
        className,
      )}
    >
      <MicroLabel className="text-suth-accent">[ COACHING ]</MicroLabel>
      <h2 className="mt-2 text-base font-semibold text-suth-text md:text-lg">{headline}</h2>
      <p className="mt-1.5 max-w-xl text-sm text-suth-text-secondary">{body}</p>
      <Link
        href={href}
        className="mt-4 inline-flex min-h-[44px] items-center rounded-sm bg-suth-accent px-5
                   text-sm font-semibold text-suth-base transition-colors hover:bg-suth-accent-hover
                   focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-suth-accent"
      >
        {cta}
      </Link>
    </aside>
  );
}
