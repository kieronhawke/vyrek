import type { Metadata } from "next";
import { MarketingNav } from "@/components/marketing/nav";
import { MarketingFooter } from "@/components/marketing/footer";
import { Container } from "@/components/shared/container";
import { Eyebrow } from "@/components/shared/eyebrow";
import { SplitHeading } from "@/components/shared/split-heading";

export const metadata: Metadata = {
  title: "Press & media",
  description:
    "Vyrek press and media kit, logos, brand assets, media contact.",
  alternates: { canonical: "/press" },
};

const ASSETS = [
  {
    label: "Wordmark (SVG)",
    href: "/logo-primary.svg",
    note: "Primary wordmark. Scales cleanly to any size.",
    available: true,
  },
  {
    label: "Monogram (SVG)",
    href: "/logo-monogram.svg",
    note: "Square monogram. App icons, social avatars.",
    available: true,
  },
  {
    label: "App icon (PNG, 512px)",
    href: "/icon-512.png",
    note: "Bordered monogram for app stores and favicons.",
    available: true,
  },
  {
    label: "Brand guidelines",
    href: "/press/brand-guidelines",
    note: "Voice, palette, typography. Single-page reference.",
    available: true,
  },
  {
    label: "Founder bio (Markdown)",
    href: "/press/founder-bio.md",
    note: "James Wright biography. Racing record, background, contact.",
    available: true,
  },
  {
    label: "Product screenshots",
    href: "/press/screenshots",
    note: "Press-approved imagery from the app and marketing site.",
    available: true,
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
                We reply within 4 hours, Monday to Friday.
              </p>
            </section>

            <section className="mt-16 border-t border-vyrek-border-subtle pt-10">
              <Eyebrow>Brand assets</Eyebrow>
              <ul className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {ASSETS.map((asset) => {
                  const isPage = asset.href.startsWith("/press/");
                  return (
                    <li key={asset.label}>
                      <a
                        href={asset.href}
                        {...(isPage
                          ? {}: { target: "_blank", rel: "noreferrer", download: true })}
                        className="group flex h-full flex-col gap-2 rounded-lg border border-vyrek-border bg-vyrek-elevated p-5 transition-[border,transform] duration-fast ease-out hover:-translate-y-0.5 hover:border-vyrek-border-strong active:scale-[0.99]"
                      >
                        <span className="text-base font-bold text-vyrek-text">
                          {asset.label}
                        </span>
                        <span className="text-sm text-vyrek-text-secondary">
                          {asset.note}
                        </span>
                        <span className="mt-2 inline-flex items-center gap-1 text-sm text-vyrek-accent">
                          {isPage ? "Open →": "Download ↗"}
                        </span>
                      </a>
                    </li>
                  );
                })}
              </ul>
            </section>

            <section className="mt-16 border-t border-vyrek-border-subtle pt-10">
              <Eyebrow>What we&apos;ll talk about</Eyebrow>
              <p className="mt-3 max-w-2xl text-base leading-relaxed text-vyrek-text-secondary md:text-lg">
                Topics our coaches can speak to, with notice. We&apos;re happy
                to fact-check Hyrox claims for editors and provide quotes for
                fitness or endurance features.
              </p>
              <ul
                role="list"
                className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2"
              >
                {[
                  {
                    tag: "Sport",
                    title: "The growth of Hyrox in the UK",
                    body: "What the format is, why it&apos;s spreading, who&apos;s racing it.",
                  },
                  {
                    tag: "Method",
                    title: "Race-specific programming vs. generic functional fitness",
                    body: "Why station-based training beats CrossFit templates for Hyrox.",
                  },
                  {
                    tag: "Athletes",
                    title: "Coaching the everyday hybrid athlete",
                    body: "First-race nerves, plateau-breaking, returning after injury.",
                  },
                  {
                    tag: "Industry",
                    title: "Plan-before-pay onboarding in fitness apps",
                    body: "Why we show Week 1 dated before a card is asked for.",
                  },
                ].map((item) => (
                  <li
                    key={item.title}
                    className="flex flex-col gap-2 rounded-lg border border-vyrek-border bg-vyrek-elevated p-5"
                  >
                    <Eyebrow>{item.tag}</Eyebrow>
                    <h3 className="text-base font-bold leading-tight text-vyrek-text">
                      {item.title}
                    </h3>
                    <p
                      className="text-sm leading-relaxed text-vyrek-text-secondary"
                      // The strings above include `&apos;` for JSX safety;
                      // dangerouslySetInnerHTML would be overkill, the entity
                      // resolves at render. Plain text is fine.
                    >
                      {item.body.replace(/&apos;/g, "’")}
                    </p>
                  </li>
                ))}
              </ul>
            </section>

            <section className="mt-16 border-t border-vyrek-border-subtle pt-10">
              <Eyebrow>Recent coverage</Eyebrow>
              <p className="mt-4 text-base text-vyrek-text-secondary md:text-lg">
                Coverage coming soon. Vyrek launched in early 2026 and we are
                actively talking to UK fitness media. If you publish a piece
                that mentions us, email{" "}
                <a
                  href="mailto:press@vyrek.com"
                  className="underline underline-offset-4 hover:text-vyrek-accent"
                >
                  press@vyrek.com
                </a>{" "}
                and we will add it here.
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
              </p>
            </section>
          </div>
        </Container>
      </main>
      <MarketingFooter />
    </>
  );
}
