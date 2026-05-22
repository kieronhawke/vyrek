import type { Metadata } from "next";
import { MarketingNav } from "@/components/marketing/nav";
import { MarketingFooter } from "@/components/marketing/footer";
import { Container } from "@/components/shared/container";
import { Eyebrow } from "@/components/shared/eyebrow";
import { SplitHeading } from "@/components/shared/split-heading";
import { CtaButton } from "@/components/shared/cta-button";

export const metadata: Metadata = {
  title: "Programmes",
  description:
    "Four 12-week Hyrox programmes: First Race, Sub-90, Doubles, Pro. Pick where you are. We'll meet you there.",
};

type ProgrammeDetail = {
  slug: "first-race" | "sub-90" | "doubles" | "pro";
  name: string;
  tag: string;
  audience: string;
  image: string;
  who: string[];
  doing: string[];
};

const PROGRAMMES: ProgrammeDetail[] = [
  {
    slug: "first-race",
    name: "First Race",
    tag: "BEGINNER / 12 WEEKS",
    audience:
      "For athletes who have never raced a Hyrox. Twelve weeks to your first finish line, built so the work compounds without breaking you.",
    image: "/media/images/programme-first-race.jpg",
    who: [
      "You have never raced a Hyrox.",
      "You have a base of running or gym fitness, even if patchy.",
      "Your goal is to finish, feeling strong.",
      "You can commit 3 to 5 days a week to training.",
    ],
    doing: [
      "Easy aerobic runs that build the engine without breaking the legs.",
      "Hyrox-specific intervals — short bouts of station work between runs.",
      "Full-body strength, biased to push, pull, and grip endurance.",
      "Weekly race-format simulation that rehearses the day.",
    ],
  },
  {
    slug: "sub-90",
    name: "Sub-90",
    tag: "INTERMEDIATE / 12 WEEKS",
    audience:
      "For athletes who have completed at least one Hyrox and want to break the 90-minute barrier. Higher volume, sharper intensity, targeted pacing work.",
    image: "/media/images/programme-sub-90.jpg",
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
  },
  {
    slug: "doubles",
    name: "Doubles",
    tag: "PARTNER / 12 WEEKS",
    audience:
      "Train with a partner. Race together. One plan that synchronises two athletes through the same 12 weeks, with shared and split sessions.",
    image: "/media/images/programme-doubles.jpg",
    who: [
      "You have a training partner committed to the same race.",
      "You can train together at least 1 to 2 days a week.",
      "You both want to finish on the same pace plan.",
      "Either of you can complete a Hyrox solo.",
    ],
    doing: [
      "Handoff drills — clean transitions between partner work.",
      "Split-station strategy practised across the 12-week block.",
      "Solo sessions that match each partner&apos;s strength gaps.",
      "Partner race simulations every third week.",
    ],
  },
  {
    slug: "pro",
    name: "Pro",
    tag: "ADVANCED / 12 WEEKS",
    audience:
      "For sub-75 athletes chasing podiums. Designed alongside the programming our founding coach uses for his own Elite 15 race blocks.",
    image: "/media/images/programme-pro.jpg",
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
  },
];

const courseListLd = {
  "@context": "https://schema.org",
  "@type": "ItemList",
  itemListElement: PROGRAMMES.map((p, i) => ({
    "@type": "ListItem",
    position: i + 1,
    item: {
      "@type": "Course",
      name: `Vyrek ${p.name} Hyrox programme`,
      description: p.audience,
      provider: {
        "@type": "Organization",
        name: "Vyrek",
        url: "https://vyrek.com",
      },
      hasCourseInstance: {
        "@type": "CourseInstance",
        courseMode: "online",
        courseWorkload: "PT4H",
        duration: "P12W",
      },
      offers: {
        "@type": "Offer",
        price: "4.99",
        priceCurrency: "GBP",
        availability: "https://schema.org/InStock",
      },
    },
  })),
};

export default function ProgrammesPage() {
  return (
    <>
      <script
        type="application/ld+json"
         
        dangerouslySetInnerHTML={{ __html: JSON.stringify(courseListLd) }}
      />
      <MarketingNav />
      <main>
        <section className="pb-12 pt-32 md:pt-40">
          <Container>
            <div className="mx-auto max-w-3xl">
              <Eyebrow>Programmes</Eyebrow>
              <SplitHeading
                as="h1"
                className="mt-4 text-3xl font-black leading-[1.05] tracking-[-0.04em] text-vyrek-text md:text-5xl"
              >
                Four programmes. One pathway.
              </SplitHeading>
              <p className="mt-5 text-base text-vyrek-text-secondary md:text-lg">
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
            className="border-t border-vyrek-border-subtle py-20 md:py-28"
          >
            <Container>
              <div
                className={`mx-auto grid max-w-6xl items-start gap-10 md:grid-cols-2 md:gap-16 ${
                  i % 2 === 1 ? "md:[&>*:first-child]:order-2" : ""
                }`}
              >
                <div>
                  <Eyebrow>{p.tag}</Eyebrow>
                  <h2
                    id={`${p.slug}-heading`}
                    className="mt-4 text-3xl font-black leading-[1.05] tracking-[-0.04em] text-vyrek-text md:text-4xl"
                  >
                    {p.name}
                  </h2>
                  <p className="mt-4 text-base leading-relaxed text-vyrek-text-secondary md:text-lg">
                    {p.audience}
                  </p>

                  <div className="mt-8">
                    <Eyebrow>Who this is for</Eyebrow>
                    <ul className="mt-3 space-y-2 text-base text-vyrek-text-secondary md:text-lg">
                      {p.who.map((line) => (
                        <li key={line} className="flex items-start gap-3">
                          <span
                            aria-hidden
                            className="mt-2.5 size-1 shrink-0 rounded-full bg-vyrek-accent"
                          />
                          <span>{line}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-8">
                    <Eyebrow>What you&apos;ll do</Eyebrow>
                    <ul className="mt-3 space-y-2 text-base text-vyrek-text-secondary md:text-lg">
                      {p.doing.map((line) => (
                        <li key={line} className="flex items-start gap-3">
                          <span
                            aria-hidden
                            className="mt-2.5 size-1 shrink-0 rounded-full bg-vyrek-accent"
                          />
                          <span>{line}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <p className="mt-6 font-mono text-xs uppercase tracking-[0.18em] text-vyrek-text-tertiary">
                    12 weeks · Recalibrates every Sunday
                  </p>

                  <div className="mt-8">
                    <CtaButton href={`/quiz?program=${p.slug}`} size="lg">
                      Start this programme →
                    </CtaButton>
                  </div>
                </div>

                <div className="relative aspect-[4/5] overflow-hidden rounded-lg border border-vyrek-border bg-vyrek-elevated md:sticky md:top-32">
                  <img
                    src={p.image}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover grayscale"
                    loading={i === 0 ? "eager" : "lazy"}
                    decoding="async"
                  />
                  <div
                    aria-hidden
                    className="absolute inset-0 bg-gradient-to-t from-vyrek-base/80 via-vyrek-base/20 to-transparent"
                  />
                  <p className="absolute bottom-6 left-6 font-mono text-xs font-medium uppercase tracking-[0.18em] text-vyrek-text">
                    [ {p.tag} ]
                  </p>
                </div>
              </div>
            </Container>
          </section>
        ))}
      </main>
      <MarketingFooter />
    </>
  );
}
