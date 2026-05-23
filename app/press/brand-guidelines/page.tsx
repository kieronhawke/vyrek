import type { Metadata } from "next";
import Link from "next/link";
import { MarketingNav } from "@/components/marketing/nav";
import { MarketingFooter } from "@/components/marketing/footer";
import { Container } from "@/components/shared/container";
import { Eyebrow } from "@/components/shared/eyebrow";
import { SplitHeading } from "@/components/shared/split-heading";

export const metadata: Metadata = {
  title: "Brand guidelines",
  description:
    "Vyrek brand guidelines, wordmark, monogram, palette, typography, tone of voice.",
  robots: { index: true, follow: true },
};

const PALETTE = [
  { name: "Vyrek Base", hex: "#0A0A0A", note: "Page background. Pure near-black." },
  {
    name: "Vyrek Elevated",
    hex: "#141414",
    note: "Cards, panels, sheets, one notch up from base.",
  },
  {
    name: "Vyrek Accent",
    hex: "#FF5A1F",
    note: "Single warm accent. Used sparingly on CTAs, focus, highlights.",
  },
  {
    name: "Vyrek Text",
    hex: "#F5F5F3",
    note: "Primary text on dark backgrounds. Near-white, slightly warm.",
  },
  {
    name: "Vyrek Text Tertiary",
    hex: "#7A7A78",
    note: "Captions, eyebrow labels, technical marks.",
  },
];

const DOS = [
  "Use the accent orange for emphasis, not decoration. One accent per view.",
  "Set body type in Inter. Set display headings in Oswald 700.",
  "Keep generous negative space. Vyrek's voice is restrained, not crowded.",
  "Refer to athletes as athletes. Members as members. Programmes as programmes (UK spelling).",
];

const DONTS = [
  "Don't recolour the wordmark. The monogram is black or white only.",
  "Don't pair Vyrek with a second accent colour. Add a tint of the same orange instead.",
  "Don't soften the voice with marketing fluff. No 'unleash your potential', no 'crush your goals'.",
  "Don't claim outcomes Vyrek can't verify, finishing times, weight loss, transformations.",
];

export default function BrandGuidelinesPage() {
  return (
    <>
      <MarketingNav />
      <main className="pb-24 pt-32 md:pt-40">
        <Container>
          <div className="mx-auto max-w-3xl">
            <Eyebrow>Press · Brand</Eyebrow>
            <SplitHeading
              as="h1"
              className="mt-4 text-3xl font-black leading-[1.05] tracking-[-0.04em] text-vyrek-text md:text-5xl"
            >
              Brand guidelines.
            </SplitHeading>
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-vyrek-text-secondary md:text-lg">
              The short version. Everything a journalist, partner, or
              collaborator needs to render Vyrek correctly. Full identity pack
              available on request, email{" "}
              <a
                href="mailto:press@vyrek.com"
                className="text-vyrek-text underline-offset-4 hover:underline"
              >
                press@vyrek.com
              </a>.
            </p>

            <section className="mt-16 border-t border-vyrek-border-subtle pt-10">
              <Eyebrow>Logo</Eyebrow>
              <h2 className="mt-3 text-2xl font-black tracking-[-0.04em] text-vyrek-text md:text-3xl">
                Wordmark and monogram.
              </h2>
              <p className="mt-4 text-base leading-relaxed text-vyrek-text-secondary md:text-lg">
                The wordmark spells VYREK in Oswald 700 with a , 2% letter-spacing
                adjustment. Use it on press articles, partner pages, and at
                widths above 96px. The monogram is the &ldquo;V&rdquo; mark on its own,
                use it for app icons, social avatars, favicons, and watermarks.
              </p>
              <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <a
                  href="/logo-primary.svg"
                  download
                  target="_blank"
                  rel="noreferrer"
                  className="flex h-32 items-center justify-center rounded-lg border border-vyrek-border bg-vyrek-elevated transition-[border] hover:border-vyrek-border-strong"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/logo-primary.svg"
                    alt="Vyrek wordmark"
                    className="h-8 w-auto"
                  />
                </a>
                <a
                  href="/logo-monogram.svg"
                  download
                  target="_blank"
                  rel="noreferrer"
                  className="flex h-32 items-center justify-center rounded-lg border border-vyrek-border bg-vyrek-elevated transition-[border] hover:border-vyrek-border-strong"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/logo-monogram.svg"
                    alt="Vyrek monogram"
                    className="h-12 w-auto"
                  />
                </a>
              </div>
              <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.18em] text-vyrek-text-tertiary">
                [ Click to download · SVG ]
              </p>
            </section>

            <section className="mt-16 border-t border-vyrek-border-subtle pt-10">
              <Eyebrow>Palette</Eyebrow>
              <h2 className="mt-3 text-2xl font-black tracking-[-0.04em] text-vyrek-text md:text-3xl">
                One accent. Mostly black and white.
              </h2>
              <p className="mt-4 text-base leading-relaxed text-vyrek-text-secondary md:text-lg">
                Vyrek is a dark interface with a single warm accent. We don&apos;t
                pair the orange with a second hue, secondary emphasis comes
                from value (lighter or darker) or from saturation tints of the
                same accent.
              </p>
              <ul role="list" className="mt-6 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {PALETTE.map((c) => (
                  <li
                    key={c.hex}
                    className="flex items-center gap-4 rounded-lg border border-vyrek-border bg-vyrek-elevated p-4"
                  >
                    <span
                      aria-hidden
                      className="block size-12 shrink-0 rounded border border-vyrek-border-subtle"
                      style={{ backgroundColor: c.hex }}
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-vyrek-text">
                        {c.name}
                      </p>
                      <p className="mt-0.5 font-mono text-[11px] uppercase tracking-[0.18em] text-vyrek-text-tertiary">
                        {c.hex}
                      </p>
                      <p className="mt-1 text-xs text-vyrek-text-secondary">
                        {c.note}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </section>

            <section className="mt-16 border-t border-vyrek-border-subtle pt-10">
              <Eyebrow>Typography</Eyebrow>
              <h2 className="mt-3 text-2xl font-black tracking-[-0.04em] text-vyrek-text md:text-3xl">
                Two faces. One mark.
              </h2>
              <dl className="mt-6 space-y-4">
                <div className="rounded-lg border border-vyrek-border bg-vyrek-elevated p-5">
                  <dt className="font-mono text-[11px] uppercase tracking-[0.18em] text-vyrek-text-tertiary">
                    Display. Oswald 700
                  </dt>
                  <dd className="mt-2 font-display text-3xl font-bold uppercase leading-[0.95] tracking-[-0.02em] text-vyrek-text md:text-4xl">
                    Train like a Hyrox athlete.
                  </dd>
                </div>
                <div className="rounded-lg border border-vyrek-border bg-vyrek-elevated p-5">
                  <dt className="font-mono text-[11px] uppercase tracking-[0.18em] text-vyrek-text-tertiary">
                    Body. Inter 400-700
                  </dt>
                  <dd className="mt-2 text-base leading-relaxed text-vyrek-text-secondary md:text-lg">
                    The workhorse for everything that isn&apos;t a heading. We
                    set body copy at 16/26 with measure capped at 65 characters
                    for readability.
                  </dd>
                </div>
                <div className="rounded-lg border border-vyrek-border bg-vyrek-elevated p-5">
                  <dt className="font-mono text-[11px] uppercase tracking-[0.18em] text-vyrek-text-tertiary">
                    Mono. Geist Mono 500
                  </dt>
                  <dd className="mt-2 font-mono text-sm uppercase tracking-[0.22em] text-vyrek-text">
                    [ TECHNICAL MARKS · LABELS · TAGS ]
                  </dd>
                </div>
              </dl>
            </section>

            <section className="mt-16 border-t border-vyrek-border-subtle pt-10">
              <Eyebrow>Voice</Eyebrow>
              <h2 className="mt-3 text-2xl font-black tracking-[-0.04em] text-vyrek-text md:text-3xl">
                Direct. UK English. No hype.
              </h2>
              <p className="mt-4 text-base leading-relaxed text-vyrek-text-secondary md:text-lg">
                Picture a coach&apos;s notebook, short lines, factual,
                slightly understated. Use specific numbers where they exist.
                Avoid superlatives. Spell things the British way (programme,
                colour, optimise).
              </p>
              <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-vyrek-border bg-vyrek-elevated p-5">
                  <Eyebrow>Do</Eyebrow>
                  <ul role="list" className="mt-3 space-y-2 text-sm text-vyrek-text-secondary">
                    {DOS.map((d) => (
                      <li key={d} className="flex gap-2">
                        <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-vyrek-accent" />
                        <span>{d}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-lg border border-vyrek-border bg-vyrek-elevated p-5">
                  <Eyebrow>Don&apos;t</Eyebrow>
                  <ul role="list" className="mt-3 space-y-2 text-sm text-vyrek-text-secondary">
                    {DONTS.map((d) => (
                      <li key={d} className="flex gap-2">
                        <span
                          aria-hidden
                          className="mt-2 size-1.5 shrink-0 rounded-full bg-vyrek-text-tertiary"
                        />
                        <span>{d}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </section>

            <section className="mt-16 border-t border-vyrek-border-subtle pt-10">
              <Eyebrow>Approval</Eyebrow>
              <p className="mt-4 text-base leading-relaxed text-vyrek-text-secondary md:text-lg">
                Email{" "}
                <a
                  href="mailto:press@vyrek.com"
                  className="text-vyrek-text underline-offset-4 hover:underline"
                >
                  press@vyrek.com
                </a>{" "}
                before publishing partner creative or co-branded assets. We
                turn around approvals within one working day.
              </p>
              <div className="mt-8">
                <Link
                  href="/press"
                  className="inline-flex h-11 items-center text-sm text-vyrek-text-secondary underline-offset-4 hover:underline"
                >
                  ← Back to press
                </Link>
              </div>
            </section>
          </div>
        </Container>
      </main>
      <MarketingFooter />
    </>
  );
}
