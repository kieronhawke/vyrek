import Link from "next/link";
import { Eyebrow } from "@/components/shared/eyebrow";

export type RelatedItem = {
  href: string;
  eyebrow: string;
  title: string;
  body?: string;
};

/**
 * Cross-page internal-linking grid. Used at the bottom of programmatic
 * pages to push siblings + complementary content. HyroxInsider wins
 * partly by linking 4-6 siblings per post; we match it here.
 */
export function RelatedGrid({
  heading,
  items,
}: {
  heading: string;
  items: RelatedItem[];
}) {
  if (items.length === 0) return null;
  return (
    <section className="mx-auto mt-16 max-w-5xl border-t border-vyrek-border-subtle pt-10">
      <Eyebrow>{heading}</Eyebrow>
      <ul role="list" className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
        {items.map((it) => (
          <li key={it.href}>
            <Link
              href={it.href}
              className="lift-on-hover block h-full rounded-md border border-vyrek-border-subtle bg-vyrek-elevated p-4 transition-colors"
            >
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-vyrek-text-tertiary">
                {it.eyebrow}
              </p>
              <p className="mt-2 text-sm font-medium leading-snug text-vyrek-text">
                {it.title}
              </p>
              {it.body ? (
                <p className="mt-1 text-xs leading-relaxed text-vyrek-text-secondary">
                  {it.body}
                </p>
              ) : null}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
