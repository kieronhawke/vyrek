import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { MarketingNav } from "@/components/marketing/nav";
import { MarketingFooter } from "@/components/marketing/footer";
import { Container } from "@/components/shared/container";
import { Eyebrow } from "@/components/shared/eyebrow";
import { SplitHeading } from "@/components/shared/split-heading";
import { CtaButton } from "@/components/shared/cta-button";
import { RevealOnView } from "@/components/shared/reveal-on-view";
import { siteUrl } from "@/lib/site-url";

export const metadata: Metadata = {
  /* The root layout appends " \u00b7 Suth Performance" to every child title.
     Naming the brand here printed it twice. */
  title: "Hyrox programmes: four 12-week plans",
  description:
    "Four 12-week Hyrox programmes: First Race, Sub-90, Doubles, Pro. Pick where you are, we'll meet you there. Built by an Elite 15 coach.",
  alternates: { canonical: "/programmes" },
  openGraph: {
    title: "Hyrox programmes, 12-week plans by an Elite 15 coach",
    description:
      "Four 12-week paths to Hyrox race-ready: First Race, Sub-90, Doubles, Pro.",
    url: "/programmes",
    type: "website",
    images: [
      {
        url: "/media/images/track/programme-pro.jpg",
        width: 1200,
        height: 630,
        alt: "Hyrox athlete mid-station",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Hyrox programmes, 12-week plans by an Elite 15 coach",
    description:
      "Four 12-week paths: First Race, Sub-90, Doubles, Pro.",
    images: ["/media/images/track/programme-pro.jpg"],
  },
};

type SampleDay = {
  day: string;
  type: string;
  duration: string;
};

type ProgrammeDetail = {
  slug: "first-race" | "sub-90" | "doubles" | "pro";
  name: string;
  tag: string;
  audience: string;
  image: string;
  who: string[];
  doing: string[];
  sampleWeek: SampleDay[];
  outcome: string;
};

const PROGRAMMES: ProgrammeDetail[] = [
  {
    slug: "first-race",
    name: "First Race",
    tag: "BEGINNER / 12 WEEKS",
    audience:
      "For athletes who have never raced a Hyrox. Twelve weeks to your first finish line, built so the work compounds without breaking you.",
    image: "/media/images/track/programme-first-race.jpg",
    who: [
      "You have never raced a Hyrox.",
      "You have a base of running or gym fitness, even if patchy.",
      "Your goal is to finish, feeling strong.",
      "You can commit 3 to 5 days a week to training.",
    ],
    doing: [
      "Easy aerobic runs that build the engine without breaking the legs.",
      "Hyrox-specific intervals, short bouts of station work between runs.",
      "Full-body strength, biased to push, pull, and grip endurance.",
      "Weekly race-format simulation that rehearses the day.",
    ],
    sampleWeek: [
      { day: "Mon", type: "Aerobic run", duration: "45 min" },
      { day: "Tue", type: "Hyrox intervals", duration: "55 min" },
      { day: "Wed", type: "Rest", duration: "" },
      { day: "Thu", type: "Strength", duration: "60 min" },
      { day: "Fri", type: "Easy run", duration: "30 min" },
      { day: "Sat", type: "Race simulation", duration: "70 min" },
      { day: "Sun", type: "Rest", duration: "" },
    ],
    outcome:
      "You cross your first Hyrox finish line in week 12, with a known plan, paced splits, and the confidence that comes from rehearsing the race every Saturday for three months.",
  },
  {
    slug: "sub-90",
    name: "Sub-90",
    tag: "INTERMEDIATE / 12 WEEKS",
    audience:
      "For athletes who have completed at least one Hyrox and want to break the 90-minute barrier. Higher volume, sharper intensity, targeted pacing work.",
    image: "/media/images/track/programme-sub-90.jpg",
    who: [
      "You have raced one or more Hyrox events.",
      "Your current PB is between 90 and 105 minutes.",
      "You have access to a sled or can compromise on equivalents.",
      "You can commit 4 to 5 days a week.",
    ],
    doing: [
      "Threshold runs and race-pace intervals on track or treadmill.",
      "Heavy sled push and pull blocks at competition weights.",
      "Wall ball and burpee broad jump pacing under fatigue.",
      "Race-pace 2km and 4km simulations every other week.",
    ],
    sampleWeek: [
      { day: "Mon", type: "Threshold run", duration: "55 min" },
      { day: "Tue", type: "Heavy sled block", duration: "65 min" },
      { day: "Wed", type: "Easy run", duration: "40 min" },
      { day: "Thu", type: "Strength + wall ball", duration: "70 min" },
      { day: "Fri", type: "Rest", duration: "" },
      { day: "Sat", type: "2km race pace", duration: "75 min" },
      { day: "Sun", type: "Recovery run", duration: "35 min" },
    ],
    outcome:
      "You walk off race day having held your target pace through the burpees, with a finish time inside 90 minutes and a clear read on which stations to attack next block.",
  },
  {
    slug: "doubles",
    name: "Doubles",
    tag: "PARTNER / 12 WEEKS",
    audience:
      "Train with a partner. Race together. One plan that synchronises two athletes through the same 12 weeks, with shared and split sessions.",
    image: "/media/images/track/programme-doubles.jpg",
    who: [
      "You have a training partner committed to the same race.",
      "You can train together at least 1 to 2 days a week.",
      "You both want to finish on the same pace plan.",
      "Either of you can complete a Hyrox solo.",
    ],
    doing: [
      "Handoff drills, clean transitions between partner work.",
      "Split-station strategy practised across the 12-week block.",
      "Solo sessions that match each partner's strength gaps.",
      "Partner race simulations every third week.",
    ],
    sampleWeek: [
      { day: "Mon", type: "Solo aerobic run", duration: "45 min" },
      { day: "Tue", type: "Partner handoff drills", duration: "60 min" },
      { day: "Wed", type: "Rest", duration: "" },
      { day: "Thu", type: "Solo strength", duration: "60 min" },
      { day: "Fri", type: "Partner intervals", duration: "55 min" },
      { day: "Sat", type: "Race format with partner", duration: "85 min" },
      { day: "Sun", type: "Rest", duration: "" },
    ],
    outcome:
      "You arrive on race day with a partner you've already raced six times in training. Handoffs are sharp, splits are agreed, and the day feels like a rehearsal rather than a first take.",
  },
  {
    slug: "pro",
    name: "Pro",
    tag: "ADVANCED / 12 WEEKS",
    audience:
      "For sub-75 athletes chasing podiums. Designed alongside the programming Ben Sutherland uses for his own Elite 15 race blocks.",
    image: "/media/images/track/programme-pro.jpg",
    who: [
      "Your current Hyrox PB is under 75 minutes.",
      "You can train 5 to 6 days a week.",
      "You have full Hyrox kit access (sled, ski erg, rower, wall balls).",
      "You are training for podium or qualifier results.",
    ],
    doing: [
      "Race-pace work as the centre of the week, not the edge.",
      "Heavy sled pulls and pushes at and above competition load.",
      "Specific station strength: wall ball volume, burpee speed.",
      "Tuned recovery blocks so the volume sticks instead of breaking you.",
    ],
    sampleWeek: [
      { day: "Mon", type: "Race-pace intervals", duration: "70 min" },
      { day: "Tue", type: "Heavy sled + ski erg", duration: "75 min" },
      { day: "Wed", type: "Aerobic run", duration: "50 min" },
      { day: "Thu", type: "Strength + wall ball", duration: "80 min" },
      { day: "Fri", type: "Recovery", duration: "40 min" },
      { day: "Sat", type: "Full race simulation", duration: "90 min" },
      { day: "Sun", type: "Easy run", duration: "45 min" },
    ],
    outcome:
      "You line up at a qualifier with a sharpened taper, podium-grade pacing, and a body that has absorbed the volume rather than been broken by it.",
  },
];

/**
 * Which level each programme is pitched at.
 *
 * Schema.org's `educationalLevel` is free text, but the three values below are
 * the ones a search engine can actually do something with, and they are the
 * same words already printed on each card's tag — so the markup and the page
 * cannot drift apart into two different claims about the same programme.
 */
const LEVEL: Record<ProgrammeDetail["slug"], string> = {
  "first-race": "Beginner",
  "sub-90": "Intermediate",
  doubles: "Intermediate",
  pro: "Advanced",
};

/**
 * Course markup for the four programmes.
 *
 * Deliberately *not* carrying an `offers` block. Google gives Course Info rich
 * results to pages that declare a price, which is a real reason to add one —
 * but pricing here is set on a consultation, so any number in the markup would
 * be a number nobody is actually charged. Structured data that contradicts the
 * page is worse than structured data that is merely incomplete: it is the kind
 * of thing that gets a site's rich results pulled entirely.
 *
 * Everything below is checkable against the page itself.
 */
const courseListLd = {
  "@context": "https://schema.org",
  "@type": "ItemList",
  itemListElement: PROGRAMMES.map((p, i) => ({
    "@type": "ListItem",
    position: i + 1,
    item: {
      "@type": "Course",
      name: `Suth Performance ${p.name} Hyrox programme`,
      description: p.audience,
      url: `${siteUrl()}/programmes#${p.slug}`,
      educationalLevel: LEVEL[p.slug],
      timeRequired: "P12W",
      inLanguage: "en-GB",
      // The station and running work the plan actually contains, taken from
      // the copy rendered on the card rather than written twice.
      teaches: p.doing,
      about: [
        { "@type": "Thing", name: "HYROX" },
        { "@type": "Thing", name: "Hybrid fitness racing" },
      ],
      provider: {
        "@type": "Organization",
        name: "Suth Performance",
        url: siteUrl(),
      },
      hasCourseInstance: {
        "@type": "CourseInstance",
        courseMode: "online",
        courseWorkload: "PT4H",
        duration: "P12W",
        instructor: {
          "@type": "Person",
          name: "Ben Sutherland",
          jobTitle: "Head coach",
          description:
            "HYROX Elite 15 athlete and coach, with multiple Pro Doubles wins.",
        },
      },
    },
  })),
};

/**
 * Programme FAQs.
 *
 * These are the questions that decide whether somebody starts, and they were
 * not answered anywhere on the page — which one to pick, what happens if the
 * race is sooner than twelve weeks, whether it works around an existing gym
 * routine. Rendered as `FAQPage` markup as well as visible copy, so the same
 * answers are eligible as rich results against queries people genuinely type.
 */
const PROGRAMME_FAQS = [
  {
    q: "Which programme should I pick?",
    a: "If you have never raced, First Race. If you have finished one and want "
      + "to go faster, Sub-90. If you are racing with a partner, Doubles. Pro is "
      + "for athletes chasing a podium or a qualifier. If you are between two of "
      + "them, Ben will tell you which on the consultation — it is a five-minute "
      + "conversation, not a sales call.",
  },
  {
    q: "What if my race is in less than 12 weeks?",
    a: "The plan compresses rather than dropping phases: you get less time at "
      + "base and go into race-pace work sooner, with the taper protected. Tell "
      + "Ben the date and he will say honestly whether the time is there — "
      + "sometimes the right answer is to target the race after it.",
  },
  {
    q: "How many days a week does a programme need?",
    a: "Between three and five, and it is built to the number you actually "
      + "have. Three sessions you complete beats five you skip, and every Sunday "
      + "the next week is rebuilt from what you logged rather than what was "
      + "prescribed.",
  },
  {
    q: "Do I need a full gym?",
    a: "No. The plan adapts to what you can reach — full gym, home setup or "
      + "bodyweight. Sled push and pull are the hardest to replicate, so where "
      + "there is no sled the programme substitutes work that trains the same "
      + "quality.",
  },
  {
    q: "Can I keep my current training alongside it?",
    a: "Tell Ben what you want to keep and the plan is written around it. What "
      + "does not work is running a Suth programme on top of a full separate "
      + "schedule — the volume stops adding up and both get worse.",
  },
  {
    q: "What happens after the 12 weeks?",
    a: "You race, and then the next block is written from what the race "
      + "actually showed. Most athletes go straight into another twelve weeks "
      + "with a different target.",
  },
  {
    q: "Is a programme a PDF or a real plan?",
    a: "A real plan. Every week is dated to your race, you log sessions in the "
      + "app, you message Ben inside it, and Sunday's recalibration changes what "
      + "next week looks like.",
  },
];

const faqLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: PROGRAMME_FAQS.map((f) => ({
    "@type": "Question",
    name: f.q,
    acceptedAnswer: { "@type": "Answer", text: f.a },
  })),
};

export default function ProgrammesPage() {
  return (
    <>
      <script
        type="application/ld+json"

        dangerouslySetInnerHTML={{ __html: JSON.stringify(courseListLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
      />
      <MarketingNav />
      <main>
        <section className="pb-12 pt-32 md:pt-40">
          <Container>
            <div className="mx-auto max-w-3xl">
              <Eyebrow>Programmes</Eyebrow>
              <SplitHeading
                as="h1"
                className="mt-4 text-3xl font-black leading-[1.05] tracking-[-0.04em] text-suth-text md:text-[46px]"
              >
                Four programmes. One pathway.
              </SplitHeading>
              <p className="mt-5 text-base text-suth-text-secondary md:text-lg">
                Pick where you are. We&apos;ll meet you there.
              </p>
            </div>
          </Container>
        </section>

        {PROGRAMMES.map((p, i) => (
          <section
            key={p.slug}
            id={p.slug}
            aria-labelledby={`${p.slug}-heading`}
            className="border-t border-suth-border-subtle py-20 md:py-28"
          >
            <Container>
              {/* Above-the-fold: hero image full-bleed on mobile, side-by-side on desktop */}
              <div
                /*
                  `items-center` rather than `items-start`.

                  The image is a 4:5 portrait and the copy beside it is a
                  heading, three lines and a button — roughly half its height.
                  Aligned to the top, the text finished a third of the way down
                  and left a 400px void beneath it on every one of the four
                  programmes, which read as a page that had failed to load
                  something. Centring costs nothing and the column reads as
                  deliberate.
                */
                className={`mx-auto grid max-w-6xl items-center gap-10 md:grid-cols-2 md:gap-16 ${
                  i % 2 === 1 ? "md:[&>*:first-child]:order-2" : ""
                }`}
              >
                <RevealOnView>
                  <Eyebrow>{p.tag}</Eyebrow>
                  <h2
                    id={`${p.slug}-heading`}
                    className="mt-4 text-3xl font-black leading-[1.05] tracking-[-0.04em] text-suth-text md:text-[46px]"
                  >
                    {p.name}
                  </h2>
                  <p className="mt-4 text-base leading-relaxed text-suth-text-secondary md:text-lg">
                    {p.audience}
                  </p>

                  <div className="mt-8">
                    <CtaButton href={`/quiz?program=${p.slug}`} size="lg">
                      Start this programme →
                    </CtaButton>
                  </div>
                </RevealOnView>

                <RevealOnView delay={0.08}>
                  <div className="relative aspect-[4/5] overflow-hidden rounded-lg border border-suth-border bg-suth-elevated md:sticky md:top-32">
                    <Image
                      src={p.image}
                      alt={`${p.name} programme imagery, ${p.audience}`}
                      fill
                      sizes="(min-width: 768px) 40vw, 100vw"
                      priority={i === 0}
                      className="object-cover grayscale"
                    />
                    <div
                      aria-hidden
                      className="absolute inset-0 bg-gradient-to-t from-suth-base/80 via-suth-base/20 to-transparent"
                    />
                    <p className="absolute bottom-6 left-6 font-mono text-xs font-medium uppercase tracking-[0.18em] text-suth-text">
                      [ {p.tag} ]
                    </p>
                  </div>
                </RevealOnView>
              </div>

              {/* Below-the-fold: who / doing in two columns, sample week, outcome */}
              <div className="mx-auto mt-16 max-w-6xl">
                <div className="grid gap-10 md:grid-cols-2 md:gap-16">
                  <RevealOnView delay={0.16}>
                    <Eyebrow>Who this is for</Eyebrow>
                    <ul className="mt-4 space-y-2 text-base text-suth-text-secondary md:text-lg">
                      {p.who.map((line) => (
                        <li key={line} className="flex items-start gap-3">
                          <span
                            aria-hidden
                            className="mt-2.5 size-1 shrink-0 rounded-full bg-suth-accent"
                          />
                          <span>{line}</span>
                        </li>
                      ))}
                    </ul>
                  </RevealOnView>

                  <RevealOnView delay={0.24}>
                    <Eyebrow>What you&apos;ll do</Eyebrow>
                    <ul className="mt-4 space-y-2 text-base text-suth-text-secondary md:text-lg">
                      {p.doing.map((line) => (
                        <li key={line} className="flex items-start gap-3">
                          <span
                            aria-hidden
                            className="mt-2.5 size-1 shrink-0 rounded-full bg-suth-accent"
                          />
                          <span>{line}</span>
                        </li>
                      ))}
                    </ul>
                  </RevealOnView>
                </div>

                {/* Sample week mini-grid */}
                <RevealOnView delay={0.32}>
                  <div className="mt-12">
                    <Eyebrow>Sample week</Eyebrow>
                    <ol
                      role="list"
                      className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 md:grid-cols-7"
                    >
                      {p.sampleWeek.map((d) => (
                        <li
                          key={d.day}
                          className="flex flex-col gap-1 rounded-md border border-suth-border-subtle bg-suth-elevated p-3"
                        >
                          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-suth-accent">
                            {d.day}
                          </span>
                          <span className="text-sm font-medium leading-tight text-suth-text">
                            {d.type}
                          </span>
                          {d.duration ? (
                            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-suth-text-tertiary tabular-nums">
                              {d.duration}
                            </span>
                          ) : null}
                        </li>
                      ))}
                    </ol>
                  </div>
                </RevealOnView>

                {/* Outcome */}
                <RevealOnView delay={0.4}>
                  <div className="mt-12 max-w-2xl">
                    <Eyebrow>Outcome</Eyebrow>
                    <p className="mt-4 text-base leading-relaxed text-suth-text-secondary md:text-lg">
                      {p.outcome}
                    </p>
                  </div>
                </RevealOnView>

                {/* Secondary CTA at bottom */}
                <RevealOnView delay={0.48}>
                  <div className="mt-10 flex flex-wrap items-center gap-4">
                    <CtaButton href={`/quiz?program=${p.slug}`} size="md">
                      Start this programme →
                    </CtaButton>
                    <p className="font-mono text-xs uppercase tracking-[0.18em] text-suth-text-tertiary">
                      12 weeks · Recalibrates every Sunday
                    </p>
                  </div>
                </RevealOnView>
              </div>
            </Container>
          </section>
        ))}

        {/*
          The questions that decide whether somebody starts.

          The page described four programmes well and answered none of the
          things a reader is actually weighing — which one am I, what if my race
          is sooner than twelve weeks, does this work around the training I
          already do. Those were being answered on consultations one at a time.
        */}
        <section
          aria-labelledby="programme-faq-heading"
          className="border-t border-suth-border-subtle py-20 md:py-28"
        >
          <Container>
            <div className="mx-auto max-w-3xl">
              <Eyebrow>Before you pick</Eyebrow>
              <SplitHeading
                as="h2"
                id="programme-faq-heading"
                className="mt-4 text-2xl font-black leading-[1.05] tracking-[-0.04em] text-suth-text md:text-4xl"
              >
                Common questions
              </SplitHeading>

              <dl className="mt-10 divide-y divide-suth-border-subtle border-t border-suth-border-subtle">
                {PROGRAMME_FAQS.map((f) => (
                  <div key={f.q} className="py-6">
                    <dt className="text-base font-bold text-suth-text md:text-lg">
                      {f.q}
                    </dt>
                    <dd className="mt-2 text-sm leading-relaxed text-suth-text-secondary md:text-base">
                      {f.a}
                    </dd>
                  </div>
                ))}
              </dl>

              <p className="mt-10 text-sm text-suth-text-secondary">
                Still not sure which one?{" "}
                <Link href="/quiz" className="text-suth-accent hover:underline">
                  Take the three-minute quiz
                </Link>{" "}
                and Ben will tell you on a free consultation.
              </p>
            </div>
          </Container>
        </section>
      </main>
      <MarketingFooter />
    </>
  );
}
