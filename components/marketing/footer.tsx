import Link from "next/link";
import { Container } from "@/components/shared/container";
import { Eyebrow } from "@/components/shared/eyebrow";
import { Monogram } from "@/components/shared/logo";

const COLUMNS = [
  {
    heading: "Product",
    links: [
      { label: "Programmes", href: "/programmes" },
      { label: "How it works", href: "/how-it-works" },
      { label: "Refer & earn", href: "/account/refer" },
    ],
  },
  {
    heading: "Journal",
    links: [
      { label: "All guides", href: "/blog" },
      { label: "First race", href: "/blog/category/first-race" },
      { label: "Training", href: "/blog/category/training" },
      { label: "Technique", href: "/blog/category/technique" },
      { label: "RSS feed", href: "/blog/rss.xml" },
    ],
  },
  {
    heading: "Company",
    links: [
      { label: "About", href: "/about" },
      { label: "Contact", href: "/contact" },
      { label: "Press", href: "/press" },
    ],
  },
  {
    heading: "Legal",
    links: [
      { label: "Privacy", href: "/legal/privacy" },
      { label: "Terms", href: "/legal/terms" },
      { label: "Cookies", href: "/legal/cookies" },
      { label: "Refunds", href: "/legal/refunds" },
    ],
  },
];

export function MarketingFooter() {
  return (
    <footer className="border-t border-vyrek-border-subtle bg-vyrek-base pb-[max(2rem,calc(var(--safe-bottom)+2rem))] pt-16 md:pt-24">
      <Container>
        <div className="grid grid-cols-1 gap-10 md:grid-cols-4">
          {COLUMNS.map((col) => (
            <div key={col.heading}>
              <Eyebrow>{col.heading}</Eyebrow>
              <ul className="mt-4 space-y-3">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-base text-vyrek-text-secondary transition-colors hover:text-vyrek-text"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-16 flex flex-col items-start justify-between gap-6 border-t border-vyrek-border-subtle pt-8 md:flex-row md:items-center">
          <div className="flex items-center gap-3 text-vyrek-text">
            <Monogram size={32} />
            <Eyebrow bare>VYREK</Eyebrow>
            <Eyebrow bare className="text-vyrek-text-tertiary">
              FITNESS / 2026
            </Eyebrow>
            <Eyebrow bare className="text-vyrek-text-tertiary">
              MADE IN UK
            </Eyebrow>
          </div>
        </div>
      </Container>
    </footer>
  );
}
