import Link from "next/link";

/**
 * The "keep going" row at the foot of a page.
 *
 * Three pages had grown their own copy of this markup as a bare `<ul>` of text
 * links, and the adversarial sweep caught what that costs: each link was 17px
 * tall on a phone. The site's global 48px tap-target rule did not save them,
 * because `min-height` has no effect on a non-replaced **inline** element —
 * and a bare `<a>` is inline. The rule only ever worked on the links that
 * happened to be block, flex or inline-block already.
 *
 * So these are chips: `inline-flex` gives the rule something to apply to, and
 * a bordered target is easier to aim at than underlined text in a wrap-flow
 * list. It also reads better — a row of related destinations should look like
 * navigation rather than a sentence that happens to contain links.
 */
export function RelatedLinks({
  title = "Keep going",
  links,
}: {
  title?: string;
  links: { href: string; label: string }[];
}) {
  if (links.length === 0) return null;

  return (
    <nav className="mt-10 border-t border-suth-border-subtle pt-5" aria-label={title}>
      <h2 className="font-mono text-[11px] uppercase tracking-[0.18em] text-suth-text-tertiary">
        {title}
      </h2>
      <ul className="mt-3 flex flex-wrap gap-2">
        {links.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="inline-flex min-h-[44px] items-center rounded-sm border
                         border-suth-border-subtle bg-suth-elevated px-3.5 text-sm
                         text-suth-text-secondary transition-colors
                         hover:border-suth-accent/40 hover:text-suth-text
                         focus-visible:outline-2 focus-visible:outline-offset-2
                         focus-visible:outline-suth-accent"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
