import Link from "next/link";
import { Container } from "@/components/shared/container";
import { Eyebrow } from "@/components/shared/eyebrow";
import { Monogram } from "@/components/shared/logo";
import { FooterLocations } from "./footer-locations";

/**
 * Whole sections of the site were missing from here.
 *
 * The footer carried Product, Journal, Company and Legal. It did not carry
 * /hyrox, /hyrox/events, /hyrox/stations, /results, /plans, /tools, /compare
 * or /topics — several thousand pages with no route in from anywhere except
 * the nav's four links. Locations are handled separately, in FooterLocations.
 */
const COLUMNS = [
  {
    heading: "Product",
    links: [
      { label: "Programmes", href: "/programmes" },
      { label: "Suth Club", href: "/club" },
      { label: "How it works", href: "/how-it-works" },
      { label: "Training plans", href: "/plans" },
      { label: "Partner programme", href: "/partners" },
    ],
  },
  {
    heading: "Hyrox",
    links: [
      { label: "Race calendar", href: "/hyrox/events" },
      { label: "The eight stations", href: "/hyrox/stations" },
      { label: "Results and rankings", href: "/results" },
      { label: "Gear guides", href: "/hyrox/gear" },
      { label: "Hyrox compared", href: "/compare" },
    ],
  },
  {
    heading: "Journal",
    links: [
      { label: "All guides", href: "/blog" },
      { label: "First race", href: "/blog/category/first-race" },
      { label: "Training", href: "/blog/category/training" },
      { label: "Topic hubs", href: "/topics" },
      { label: "Free tools", href: "/tools" },
    ],
  },
  {
    heading: "Company",
    links: [
      { label: "About", href: "/about" },
      { label: "Contact", href: "/contact" },
      { label: "Press", href: "/press" },
      { label: "Privacy", href: "/legal/privacy" },
      { label: "Terms", href: "/legal/terms" },
      { label: "Cookies", href: "/legal/cookies" },
      /* The refunds page existed and nothing linked to it. On a site that
         takes a recurring payment, the cancellation and refund terms are
         the ones a customer goes looking for under pressure, and a page
         only reachable by typing the URL is not published in any sense
         that helps them. */
      { label: "Refunds", href: "/legal/refunds" },
    ],
  },
];

export function MarketingFooter() {
  return (
    <footer className="border-t border-suth-border-subtle bg-suth-base pb-[max(2rem,calc(var(--safe-bottom)+2rem))] pt-16 md:pt-24">
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
                      /* py-1 takes each link from 20px to 28px tall. WCAG 2.5.8 asks
                         for 24px minimum, and the inline-in-a-sentence exception
                         does not apply to a stacked list of navigation links. */
                      className="inline-block py-1 text-base text-suth-text-secondary transition-colors hover:text-suth-text"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <FooterLocations />

        <div className="mt-16 flex flex-col items-start justify-between gap-6 border-t border-suth-border-subtle pt-8 md:flex-row md:items-center">
          <div className="flex items-center gap-3 text-suth-text">
            <Monogram size={32} />
            <Eyebrow bare>SUTH PERFORMANCE</Eyebrow>
            <Eyebrow bare className="text-suth-text-tertiary">
              MADE IN UK
            </Eyebrow>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <a
              href="https://instagram.com/bennysuth95"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-10 items-center rounded-pill border border-suth-border bg-suth-elevated px-4 text-sm text-suth-text-secondary transition-colors hover:border-suth-border-strong hover:text-suth-text"
            >
              @bennysuth95
            </a>
            <a
              href="mailto:hello@suthperformance.com"
              className="inline-flex h-10 items-center rounded-pill border border-suth-border bg-suth-elevated px-4 text-sm text-suth-text-secondary transition-colors hover:border-suth-border-strong hover:text-suth-text"
            >
              hello@suthperformance.com
            </a>
            <Link
              href="/login"
              className="inline-flex h-10 items-center rounded-pill border border-suth-border bg-suth-elevated px-4 text-sm text-suth-text-secondary transition-colors hover:border-suth-border-strong hover:text-suth-text"
            >
              Member sign in →
            </Link>
          </div>
        </div>

        {/*
          The bracketed "[REGISTERED COMPANY NAME TO BE CONFIRMED]" line that
          used to sit here is gone at the owner's request.

          Worth knowing if it ever comes back: UK company law only requires
          those details in the footer once the business actually trades as a
          limited company, and then they belong on every page. As a sole trader
          there is nothing to disclose, so this is correct as it stands.
        */}
        <div className="mt-8">
          <p className="text-xs text-suth-text-tertiary">
            © 2026 Suth Performance. All rights reserved.
          </p>
        </div>
      </Container>
    </footer>
  );
}
