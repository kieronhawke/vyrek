import type { Metadata } from "next";
import { MarketingNav } from "@/components/marketing/nav";
import { MarketingFooter } from "@/components/marketing/footer";
import { Container } from "@/components/shared/container";
import { Eyebrow } from "@/components/shared/eyebrow";
import { SplitHeading } from "@/components/shared/split-heading";

export const metadata: Metadata = {
  title: "Press & media",
  description:
    "Vyrek press and media kit — logos, brand assets, media contact.",
};

const ASSETS = [
  {
    label: "Wordmark (SVG)",
    href: "/logo-primary.svg",
    note: "Primary wordmark, scales cleanly.",
    available: true,
  },
  {
    label: "Monogram (SVG)",
    href: "/logo-monogram.svg",
    note: "Square monogram for app icons.",
    available: true,
  },
  {
    label: "Logo pack (.zip)",
    href: "/press/vyrek-logos.zip",
    note: "Both logos plus PNG variants. Coming soon.",
    available: false,
  },
  {
    label: "Brand guidelines (PDF)",
    href: "#",
    note: "Voice, palette, typography. Coming soon.",
    available: false,
  },
];

export default function PressPage() {
  return (
    <>
      <MarketingNav />
      <main className="pb-24 pt-32 md:pt-40">
        <Container>
          <div className="mx-auto max-w-3xl">
            <Eyebrow>Press</Eyebrow>
            <SplitHeading
              as="h1"
              className="mt-4 text-3xl font-black leading-[1.05] tracking-[-0.04em] text-vyrek-text md:text-5xl"
            >
              Press &amp; media.
            </SplitHeading>
            <p className="mt-5 text-base text-vyrek-text-secondary md:text-lg">
              For media enquiries, partnerships, or athlete features.
            </p>

            <section className="mt-12">
              <Eyebrow>Contact</Eyebrow>
              <p className="mt-3 text-base text-vyrek-text md:text-lg">
                <a
                  href="mailto:press@vyrek.com"
                  className="underline underline-offset-4 hover:text-vyrek-accent"
                >
                  press@vyrek.com
                </a>
              </p>
              <p className="mt-2 text-sm text-vyrek-text-secondary md:text-base">
                We reply within 24 hours, Monday to Friday.
              </p>
            </section>

            <section className="mt-16 border-t border-vyrek-border-subtle pt-10">
              <Eyebrow>Brand assets</Eyebrow>
              <ul className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {ASSETS.map((asset) => (
                  <li key={asset.label}>
                    {asset.available ? (
                      <a
                        href={asset.href}
                        target="_blank"
                        rel="noreferrer"
                        download
                        className="group flex h-full flex-col gap-2 rounded-lg border border-vyrek-border bg-vyrek-elevated p-5 transition-[border,transform] duration-fast ease-out hover:border-vyrek-border-strong active:scale-[0.99]"
                      >
                        <span className="text-base font-bold text-vyrek-text">
                          {asset.label}
                        </span>
                        <span className="text-sm text-vyrek-text-secondary">
                          {asset.note}
                        </span>
                        <span className="mt-2 inline-flex items-center gap-1 text-sm text-vyrek-accent">
                          Download <span aria-hidden>↗</span>
                        </span>
                      </a>
                    ) : (
                      <div className="flex h-full flex-col gap-2 rounded-lg border border-dashed border-vyrek-border-subtle bg-vyrek-elevated/40 p-5">
                        <span className="text-base font-bold text-vyrek-text-tertiary">
                          {asset.label}
                        </span>
                        <span className="text-sm text-vyrek-text-secondary">
                          {asset.note}
                        </span>
                        <Eyebrow className="mt-2">Coming soon</Eyebrow>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </section>

            <section className="mt-16 border-t border-vyrek-border-subtle pt-10">
              <Eyebrow>Recent coverage</Eyebrow>
              <p className="mt-3 text-base text-vyrek-text-secondary md:text-lg">
                Coverage coming soon.
              </p>
            </section>

            <section className="mt-16 border-t border-vyrek-border-subtle pt-10">
              <Eyebrow>About Vyrek</Eyebrow>
              <p className="mt-4 text-base leading-relaxed text-vyrek-text-secondary md:text-lg">
                Vyrek is a UK-based Hyrox-first training platform. Members
                take a three-minute quiz and see a dated Week 1 before paying.
                Programmes are 12 weeks, designed by Elite 15 athletes,
                recalibrate every Sunday based on logged sessions. Founding
                coach: James Wright, top 50 at the 2025 World Championships.
                Subscription is £4.99 per month with a 7-day free trial.
              </p>
            </section>
          </div>
        </Container>
      </main>
      <MarketingFooter />
    </>
  );
}
