import Image from "next/image";
import Link from "next/link";
import { Container } from "@/components/shared/container";
import { CtaButton } from "@/components/shared/cta-button";
import { StickyMobileCta } from "@/components/marketing/sticky-mobile-cta";
import { MarketingNav } from "@/components/marketing/nav";
import { MarketingFooter } from "@/components/marketing/footer";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import type { UkLocation } from "@/lib/uk-locations";

/**
 * Shared geo landing template for the two programmatic funnels:
 *
 *   /hyrox-training/[location]   "Hyrox training in {Name}"
 *   /personal-trainer/[location] "Personal trainer in {Name}"
 *
 * Conversion-first: one job (get the visitor into /quiz), one primary
 * CTA repeated at hero, mid-page, and footer, plus the mobile sticky
 * bar. Mobile-first layout; desktop gets a split hero. All athlete
 * claims are from the verified list only.
 */

export type GeoVariant = "hyrox" | "pt";

type Benefit = { title: string; body: string; image: string; alt: string };
type Faq = { q: string; a: string };

export function variantCopy(variant: GeoVariant, loc: UkLocation) {
  const name = loc.name;
  if (variant === "hyrox") {
    return {
      eyebrow: `${name} · ${loc.region}`,
      h1: (
        <>
          Hyrox training in {name},
          <br className="hidden md:block" /> built around your race.
        </>
      ),
      sub: `A personalised 12-week Hyrox programme from HYROX Elite 15 athlete Ben Sutherland. Dated to your race, calibrated to your level and the kit you train with in ${name}. See your Week 1 before you decide anything.`,
      heroImage: "/media/images/track/pair-frontal-bw.jpg",
      heroAlt: "Two athletes running side by side on a sunlit track",
      cta: "Start the 3-minute quiz",
      benefits: [
        {
          title: "Built backwards from race day",
          body: "Eight stations, eight 1-km runs. Sled push and pull with explicit progression, wall balls scaled to your bodyweight, run intervals that match the race.",
          image: "/media/images/track/straight-elevated-colour.jpg",
          alt: "Elevated view of two athletes striding down the track straight",
        },
        {
          title: "Dated to your race, not week numbers",
          body: "Tell us your race date and every session lands on a calendar day. Miss a week and Sunday's rebuild absorbs it. The plan bends, the race date doesn't.",
          image: "/media/images/track/bend-lanes-bw.jpg",
          alt: "Numbered lanes on the track bend with two runners holding form",
        },
        {
          title: "An Elite 15 athlete behind the programming",
          body: "Ben races in the HYROX Elite 15 Doubles with his brother Harry. The programming you follow is the structure he uses, scaled to your level.",
          image: "/media/images/track/gym-coach-row-colour.jpg",
          alt: "Coach standing over an athlete mid rowing interval in the gym",
        },
      ] as Benefit[],
      priceHeading: `What Hyrox coaching costs in ${name}`,
      priceLocal: {
        label: `1:1 Hyrox coaching in ${name}`,
        price: "£60+",
        per: "per hour",
        points: ["Booked session by session", "Progress lives in the coach's head", "Limited to their availability"],
      },
      faqs: buildHyroxFaqs(loc),
      crossLink: {
        href: `/personal-trainer/${loc.slug}`,
        label: `Looking for general coaching instead? Personal training in ${name}`,
      },
      guideLink: {
        href: `/hyrox/${loc.slug}`,
        label: `Read the full Hyrox in ${name} guide`,
      },
    };
  }
  return {
    eyebrow: `${name} · ${loc.region}`,
    h1: (
      <>
        A personal trainer in {name},
        <br className="hidden md:block" /> without the hourly rate.
      </>
    ),
    sub: `Suth Performance is online personal training from HYROX Elite 15 athlete Ben Sutherland. A personalised programme, dated to your calendar, rebuilt every Sunday from what you actually logged. At your ${name} gym or at home.`,
    heroImage: "/media/images/track/gym-coach-row-colour.jpg",
    heroAlt: "Coach standing over an athlete mid rowing interval in the gym",
    cta: "Start the 3-minute quiz",
    benefits: [
      {
        title: "A programme written for you",
        body: "Your level, your equipment, your available days. The quiz takes three minutes and your first week appears before you decide anything.",
        image: "/media/images/track/solo-watch-bw.jpg",
        alt: "Athlete checking a training watch on the track between reps",
      },
      {
        title: "It adapts every single week",
        body: "Log your sessions and the plan recalibrates each Sunday. Strong week, next week pushes harder. Missed sessions, next week rebuilds with more recovery.",
        image: "/media/images/track/straight-elevated-colour.jpg",
        alt: "Elevated view of two athletes striding down the track straight",
      },
      {
        title: "A real athlete behind it",
        body: "Ben Sutherland competes in the HYROX Elite 15 and coaches athletes from their first session to professional level. Your questions get answered in the app.",
        image: "/media/images/track/pair-frontal-colour.jpg",
        alt: "Two athletes running side by side on a sunlit track",
      },
    ] as Benefit[],
    priceHeading: `What personal training costs in ${name}`,
    priceLocal: {
      label: `A personal trainer in ${name}`,
      price: "£40+",
      per: "per session",
      points: ["Two sessions a week adds up fast", "Progress stops when sessions stop", "Tied to one gym's floor"],
    },
    faqs: buildPtFaqs(loc),
    crossLink: {
      href: `/hyrox-training/${loc.slug}`,
      label: `Training for a Hyrox race? Hyrox training in ${name}`,
    },
    guideLink: null,
  };
}

function buildHyroxFaqs(loc: UkLocation): Faq[] {
  const venue = loc.nearestVenue;
  return [
    {
      q: `How do I start Hyrox training in ${loc.name}?`,
      a: `Take the three-minute quiz. It asks about your race date, experience, available days, and the equipment you can use in ${loc.name}. You see your full Week 1, dated and structured, before you decide anything.`,
    },
    {
      q: `What's the nearest Hyrox race to ${loc.name}?`,
      a: venue
        ? `${venue.name} in ${venue.city} is the closest major venue to ${loc.name} and hosts Hyrox race weekends annually. Your programme is built backwards from whichever race you enter.`
        : `${loc.name} athletes typically race at ExCeL London, Birmingham NEC, or Manchester Central, all of which host Hyrox weekends every year. Your programme is built backwards from whichever race you enter.`,
    },
    {
      q: "Do I need a Hyrox gym to follow the programme?",
      a: `No. The quiz asks what you train with, a full Hyrox gym, a standard commercial gym, or a home setup, and your plan only includes work you can actually do. Substitutions are built in for every station.`,
    },
    {
      q: "I've never done Hyrox. Is this for beginners?",
      a: "Yes. The First Race programme takes complete beginners to the finish line in 12 weeks. Ben coaches athletes from their first session to professional level, and the programming scales the same way.",
    },
    {
      q: "How much does it cost?",
      a: "Pricing is tailored to your goals and there is a cost-effective option for every budget. It starts with a free consultation with Ben, and you see your first week of training before you commit to anything.",
    },
  ];
}

function buildPtFaqs(loc: UkLocation): Faq[] {
  return [
    {
      q: `How is this different from hiring a personal trainer in ${loc.name}?`,
      a: `A local PT charges per session and progress lives in their notebook. Suth Performance gives you a full week-by-week programme, personalised to your equipment and schedule, that recalibrates every Sunday from what you logged. And because it is delivered online, it costs a fraction of what weekly sessions add up to in ${loc.name}.`,
    },
    {
      q: "Who writes the programming?",
      a: "Ben Sutherland, a HYROX Elite 15 athlete who races Doubles with his brother Harry and coaches athletes from beginner to professional level. The structure you follow is the structure he trains with, scaled to you.",
    },
    {
      q: "Do I need a gym membership?",
      a: `No. The quiz asks what you have access to, a full gym, a standard commercial gym, or home kit, and builds your plan from that. Plenty of members train entirely at home.`,
    },
    {
      q: "What if I miss sessions?",
      a: "The plan rebuilds every Sunday based on what you actually did. Missed sessions get absorbed with more recovery, strong weeks push on. It never assumes a perfect week.",
    },
    {
      q: "How much does it cost?",
      a: "Pricing is tailored to your goals and level, and it costs a fraction of weekly sessions with a local PT. It starts with a free consultation with Ben, no card and no commitment.",
    },
  ];
}

/* ─── Sections ──────────────────────────────────────────────────────── */

const VERIFIED_PROOF = [
  "HYROX Elite 15 athlete",
  "Multiple Pro Doubles wins",
  "Best Doubles 49-51 min",
  "Coaches beginner to pro",
];

const STEPS = [
  {
    n: "01",
    title: "Take the quiz",
    body: "Three minutes. Your race or goal, your level, your kit, your days.",
  },
  {
    n: "02",
    title: "See your Week 1",
    body: "Real dated workouts before you pay. No demo screens.",
  },
  {
    n: "03",
    title: "Train and adapt",
    body: "Log sessions. Every Sunday the plan recalibrates around you.",
  },
];

export function GeoLanding({
  variant,
  loc,
}: {
  variant: GeoVariant;
  loc: UkLocation;
}) {
  const c = variantCopy(variant, loc);

  return (
    <>
      <MarketingNav />
      <main>
        {/* ── Hero ── */}
        <section
          aria-labelledby="geo-hero-heading"
          className="relative isolate overflow-hidden bg-suth-base"
        >
          <div aria-hidden className="absolute inset-0 -z-10">
            <Image
              src={c.heroImage}
              alt=""
              fill
              priority
              fetchPriority="high"
              sizes="100vw"
              className="object-cover opacity-60 grayscale"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-suth-base/70 via-suth-base/45 to-suth-base" />
          </div>
          <Container>
            <div className="flex min-h-[88svh] max-w-2xl flex-col justify-end pb-14 pt-32 md:min-h-[70vh] md:justify-center md:pb-20 md:pt-36 lg:max-w-3xl">
              <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-suth-accent">
                [ {c.eyebrow} ]
              </p>
              <h1
                id="geo-hero-heading"
                className="mt-4 text-balance text-[34px] font-black uppercase leading-[0.98] tracking-[-0.02em] text-suth-text md:text-[46px] lg:text-[54px]"
              >
                {c.h1}
              </h1>
              <p className="mt-5 max-w-xl text-base leading-relaxed text-suth-text-secondary md:text-lg">
                {c.sub}
              </p>
              <div className="mt-7 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:gap-5">
                <CtaButton href="/quiz" size="lg" className="w-full sm:w-auto sm:min-w-[15rem]">
                  {c.cta}
                </CtaButton>
                <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-suth-text-tertiary">
                  Free consultation with Ben · no card, no commitment
                </span>
              </div>
            </div>
          </Container>
        </section>

        {/* ── Verified proof strip ── */}
        <section
          aria-label="Coach credentials"
          className="border-y border-suth-border-subtle bg-suth-elevated/40"
        >
          <Container>
            <ul className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2 py-4 md:py-5">
              {VERIFIED_PROOF.map((p) => (
                <li
                  key={p}
                  className="font-mono text-[10px] uppercase tracking-[0.2em] text-suth-text-secondary md:text-[11px]"
                >
                  {p}
                </li>
              ))}
            </ul>
          </Container>
        </section>

        {/* ── Benefits ── */}
        <section
          aria-labelledby="geo-benefits-heading"
          className="py-16 md:py-24"
        >
          <Container>
            <h2
              id="geo-benefits-heading"
              className="mx-auto max-w-2xl text-center text-[28px] font-black leading-[1.1] tracking-[-0.03em] text-suth-text md:text-[36px]"
            >
              {variant === "hyrox"
                ? "Programming with a race at the end of it."
                : "Everything a PT does, minus the hourly rate."}
            </h2>
            <div className="mt-10 grid gap-4 md:mt-14 md:grid-cols-3 md:gap-5">
              {c.benefits.map((b) => (
                <article
                  key={b.title}
                  className="overflow-hidden rounded-lg border border-suth-border-subtle bg-suth-elevated"
                >
                  <div className="relative aspect-[16/10] overflow-hidden bg-suth-overlay">
                    <Image
                      src={b.image}
                      alt={b.alt}
                      fill
                      sizes="(min-width: 768px) 33vw, 100vw"
                      className="object-cover"
                    />
                  </div>
                  <div className="p-6">
                    <h3 className="text-lg font-black leading-tight tracking-[-0.02em] text-suth-text">
                      {b.title}
                    </h3>
                    <p className="mt-3 text-sm leading-relaxed text-suth-text-secondary">
                      {b.body}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </Container>
        </section>

        {/* ── Local context ── */}
        <section
          aria-labelledby="geo-local-heading"
          className="border-t border-suth-border-subtle bg-suth-elevated/30 py-16 md:py-20"
        >
          <Container>
            <div className="mx-auto grid max-w-5xl gap-10 md:grid-cols-[1fr_auto] md:items-start md:gap-16">
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-suth-accent">
                  [ {variant === "hyrox" ? "Hyrox" : "Training"} in {loc.name} ]
                </p>
                <h2
                  id="geo-local-heading"
                  className="mt-4 text-[26px] font-black leading-[1.12] tracking-[-0.025em] text-suth-text md:text-[30px]"
                >
                  Made for how you train in {loc.name}.
                </h2>
                <p className="mt-4 max-w-xl text-base leading-relaxed text-suth-text-secondary">
                  {loc.context ??
                    `${loc.name} has a growing functional-fitness scene, and Suth Performance slots straight into it. Whether you train at a full Hyrox affiliate, a standard commercial gym, or at home, your programme is built from the equipment you actually have.`}
                </p>
                {c.guideLink ? (
                  <Link
                    href={c.guideLink.href}
                    className="mt-5 inline-block text-sm font-medium text-suth-accent underline decoration-suth-accent/40 underline-offset-4 hover:decoration-suth-accent"
                  >
                    {c.guideLink.label} →
                  </Link>
                ) : null}
              </div>
              <dl className="grid shrink-0 grid-cols-2 gap-3 md:w-[340px]">
                {loc.nearestVenue ? (
                  <div className="rounded-lg border border-suth-border-subtle bg-suth-elevated px-4 py-3">
                    <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-suth-text-tertiary">
                      Nearest race venue
                    </dt>
                    <dd className="mt-1 text-sm font-semibold text-suth-text">
                      {loc.nearestVenue.name}
                    </dd>
                  </div>
                ) : null}
                <div className="rounded-lg border border-suth-border-subtle bg-suth-elevated px-4 py-3">
                  <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-suth-text-tertiary">
                    Region
                  </dt>
                  <dd className="mt-1 text-sm font-semibold text-suth-text">
                    {loc.region}
                  </dd>
                </div>
                <div className="rounded-lg border border-suth-border-subtle bg-suth-elevated px-4 py-3">
                  <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-suth-text-tertiary">
                    Programmes
                  </dt>
                  <dd className="mt-1 text-sm font-semibold text-suth-text">
                    First Race to Pro
                  </dd>
                </div>
                <div className="rounded-lg border border-suth-border-subtle bg-suth-elevated px-4 py-3">
                  <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-suth-text-tertiary">
                    First step
                  </dt>
                  <dd className="mt-1 text-sm font-semibold text-suth-text">
                    Free consultation
                  </dd>
                </div>
              </dl>
            </div>
          </Container>
        </section>

        {/* ── 3 steps ── */}
        <section
          aria-labelledby="geo-steps-heading"
          className="border-t border-suth-border-subtle py-16 md:py-24"
        >
          <Container>
            <h2
              id="geo-steps-heading"
              className="mx-auto max-w-2xl text-center text-[28px] font-black leading-[1.1] tracking-[-0.03em] text-suth-text md:text-[36px]"
            >
              Three minutes from now, you have a plan.
            </h2>
            <ol className="mx-auto mt-10 grid max-w-4xl gap-4 md:mt-14 md:grid-cols-3 md:gap-5">
              {STEPS.map((s) => (
                <li
                  key={s.n}
                  className="rounded-lg border border-suth-border-subtle bg-suth-elevated p-6"
                >
                  <p className="font-mono text-sm font-medium text-suth-accent">
                    [ {s.n} ]
                  </p>
                  <h3 className="mt-3 text-lg font-black tracking-[-0.02em] text-suth-text">
                    {s.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-suth-text-secondary">
                    {s.body}
                  </p>
                </li>
              ))}
            </ol>
            <div className="mt-10 text-center">
              <CtaButton href="/quiz" size="md">
                {c.cta} →
              </CtaButton>
            </div>
          </Container>
        </section>

        {/* ── Price comparison ── */}
        <section
          aria-labelledby="geo-price-heading"
          className="border-t border-suth-border-subtle py-16 md:py-24"
        >
          <Container>
            <h2
              id="geo-price-heading"
              className="mx-auto max-w-2xl text-center text-[28px] font-black leading-[1.1] tracking-[-0.03em] text-suth-text md:text-[36px]"
            >
              {c.priceHeading}
            </h2>
            <div className="mx-auto mt-10 grid max-w-3xl gap-4 md:mt-14 md:grid-cols-2 md:gap-5">
              <div className="rounded-lg border border-suth-border-subtle bg-suth-elevated p-7">
                <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-suth-text-tertiary">
                  {c.priceLocal.label}
                </p>
                <p className="mt-4 text-4xl font-black tracking-[-0.03em] text-suth-text-secondary">
                  {c.priceLocal.price}
                  <span className="ml-2 align-middle font-mono text-[11px] uppercase tracking-[0.18em] text-suth-text-tertiary">
                    {c.priceLocal.per}
                  </span>
                </p>
                <ul className="mt-5 space-y-2 text-sm leading-relaxed text-suth-text-secondary">
                  {c.priceLocal.points.map((p) => (
                    <li key={p} className="flex gap-2">
                      <span aria-hidden className="text-suth-text-tertiary">·</span>
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="relative rounded-lg border border-suth-accent/50 bg-suth-elevated p-7">
                <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-suth-accent">
                  Suth Performance
                </p>
                <p className="mt-4 text-4xl font-black tracking-[-0.03em] text-suth-text">
                  Tailored
                  <span className="ml-2 align-middle font-mono text-[11px] uppercase tracking-[0.18em] text-suth-text-tertiary">
                    to you
                  </span>
                </p>
                <ul className="mt-5 space-y-2 text-sm leading-relaxed text-suth-text-secondary">
                  <li className="flex gap-2">
                    <span aria-hidden className="text-suth-accent">·</span>
                    Full week-by-week personalised programme
                  </li>
                  <li className="flex gap-2">
                    <span aria-hidden className="text-suth-accent">·</span>
                    A fraction of what weekly PT sessions add up to
                  </li>
                  <li className="flex gap-2">
                    <span aria-hidden className="text-suth-accent">·</span>
                    Free consultation first, cancel anytime
                  </li>
                </ul>
              </div>
            </div>
            <p className="mx-auto mt-6 max-w-2xl text-center text-xs leading-relaxed text-suth-text-tertiary">
              Local rates vary; typical advertised prices, not quotes. Suth
              Performance is a programming platform, not a substitute for
              in-person supervision where you need it.
            </p>
          </Container>
        </section>

        {/* ── FAQ ── */}
        <section
          aria-labelledby="geo-faq-heading"
          className="border-t border-suth-border-subtle bg-suth-elevated/30 py-16 md:py-24"
        >
          <Container>
            <div className="mx-auto max-w-2xl">
              <h2
                id="geo-faq-heading"
                className="text-[28px] font-black leading-[1.1] tracking-[-0.03em] text-suth-text md:text-[36px]"
              >
                Common questions
              </h2>
              <div className="mt-8">
                <Accordion className="w-full">
                  {c.faqs.map((f, i) => (
                    <AccordionItem
                      key={f.q}
                      value={`faq-${i}`}
                      className="border-b border-suth-border-subtle last:border-b-0"
                    >
                      <AccordionTrigger className="text-left text-base font-semibold text-suth-text">
                        {f.q}
                      </AccordionTrigger>
                      <AccordionContent className="text-sm leading-relaxed text-suth-text-secondary">
                        {f.a}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            </div>
          </Container>
        </section>

        {/* ── Final CTA ── */}
        <section
          aria-labelledby="geo-final-heading"
          className="border-t border-suth-border-subtle py-20 md:py-28"
        >
          <Container>
            <div className="mx-auto flex max-w-2xl flex-col items-center text-center">
              <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-suth-accent">
                [ {loc.name} ]
              </p>
              <h2
                id="geo-final-heading"
                className="mt-4 text-balance text-[30px] font-black leading-[1.08] tracking-[-0.03em] text-suth-text md:text-[40px]"
              >
                {variant === "hyrox"
                  ? "Your race is coming either way. Train like it."
                  : "Start training with a plan that knows you."}
              </h2>
              <p className="mt-4 text-base text-suth-text-secondary md:text-lg">
                Three-minute quiz. Real Week 1 before you pay.
              </p>
              <div className="mt-8">
                <CtaButton href="/quiz" size="lg">
                  {c.cta} →
                </CtaButton>
              </div>
              <p className="mt-4 text-sm text-suth-text-tertiary">
                Free consultation first. Cancel anytime. Prefer to talk
                straight away?{" "}
                <Link
                  href="/free-consultation"
                  className="text-suth-accent underline decoration-suth-accent/40 underline-offset-4 hover:decoration-suth-accent"
                >
                  Book your free consultation
                </Link>
                .
              </p>
              <Link
                href={c.crossLink.href}
                className="mt-8 text-sm text-suth-text-secondary underline decoration-suth-border underline-offset-4 transition-colors hover:text-suth-text"
              >
                {c.crossLink.label} →
              </Link>
            </div>
          </Container>
        </section>
      </main>
      <MarketingFooter />
      <StickyMobileCta label={c.cta} />
    </>
  );
}

export function geoFaqJsonLd(variant: GeoVariant, loc: UkLocation) {
  const c = variantCopy(variant, loc);
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: c.faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
}
