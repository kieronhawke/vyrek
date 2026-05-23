import Link from "next/link";
import type { Metadata } from "next";
import { MarketingNav } from "@/components/marketing/nav";
import { MarketingFooter } from "@/components/marketing/footer";
import { Container } from "@/components/shared/container";
import { Eyebrow } from "@/components/shared/eyebrow";

export const metadata: Metadata = {
  title: "Lost lap. Page not found",
  description:
    "That page isn't here. Take the quiz, see your plan, or read the journal.",
  robots: { index: false, follow: true },
};

const TRAILS = [
  {
    label: "Take the quiz",
    href: "/quiz",
    note: "Three minutes. See your Week 1 before you pay.",
    eyebrow: "→ Start here",
  },
  {
    label: "Read the journal",
    href: "/blog",
    note: "Training plans, station technique, race-day pacing, recovery.",
    eyebrow: "→ Journal",
  },
  {
    label: "See the programmes",
    href: "/programmes",
    note: "First Race, Sub-90, Doubles, Pro. One pathway each.",
    eyebrow: "→ Programmes",
  },
  {
    label: "Pricing",
    href: "/pricing",
    note: "£8.99/month after the 7-day trial. Cancel anytime.",
    eyebrow: "→ Pricing",
  },
];

export default function NotFound() {
  return (
    <>
      <MarketingNav />
      <main className="pb-24 pt-28 md:pt-36">
        <Container>
          <div className="mx-auto max-w-3xl text-center">
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-vyrek-accent">
              [ 404 · LOST LAP ]
            </p>
            <h1 className="mt-4 text-balance text-4xl font-black leading-[1.05] tracking-[-0.04em] text-vyrek-text md:text-5xl lg:text-6xl">
              You took a wrong turn at the wall ball lane.
            </h1>
            <p className="mt-6 text-base leading-relaxed text-vyrek-text-secondary md:text-lg">
              The page you were after isn&apos;t here. Either we moved it, or
              the URL got mangled somewhere. Pick a fresh start below.
            </p>
          </div>

          <ul
            role="list"
            className="mx-auto mt-12 grid max-w-3xl gap-4 md:grid-cols-2"
          >
            {TRAILS.map((trail) => (
              <li key={trail.href}>
                <Link
                  href={trail.href}
                  className="group flex h-full flex-col gap-3 rounded-lg border border-vyrek-border-subtle bg-vyrek-elevated p-5 transition-[border,transform] duration-fast ease-out hover:-translate-y-0.5 hover:border-vyrek-border-strong active:scale-[0.995]"
                >
                  <Eyebrow>{trail.eyebrow}</Eyebrow>
                  <p className="text-lg font-bold leading-tight tracking-[-0.015em] text-vyrek-text md:text-xl">
                    {trail.label}
                  </p>
                  <p className="text-sm leading-relaxed text-vyrek-text-secondary">
                    {trail.note}
                  </p>
                </Link>
              </li>
            ))}
          </ul>

          <div className="mt-12 text-center">
            <Link
              href="/"
              className="inline-flex h-12 items-center justify-center rounded-pill bg-vyrek-accent px-6 text-base font-medium tracking-tight text-[#0A0A0A] transition-[background,transform] duration-fast ease-out hover:bg-vyrek-accent-hover active:scale-[0.98]"
            >
              Back to home →
            </Link>
          </div>
        </Container>
      </main>
      <MarketingFooter />
    </>
  );
}
