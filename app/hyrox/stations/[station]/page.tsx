import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MarketingNav } from "@/components/marketing/nav";
import { MarketingFooter } from "@/components/marketing/footer";
import { Container } from "@/components/shared/container";
import { Eyebrow } from "@/components/shared/eyebrow";
import { SplitHeading } from "@/components/shared/split-heading";
import { CtaButton } from "@/components/shared/cta-button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  STATIONS,
  getStation,
  listStationSlugs,
} from "@/lib/hyrox-stations";
import { siteUrl } from "@/lib/blog/urls";
import { listPostMeta } from "@/lib/blog/posts";
import { STATION_READING } from "@/lib/hyrox/station-reading";
import { clampDescription } from "@/lib/seo/description";
import { getResultsSource } from "@/lib/results";
import type { StationId } from "@/lib/results/model";
import { StationHistogram } from "@/components/results/tools/station-histogram";
import { StationRail, type RailSection } from "@/components/hyrox/station-rail";

/** Guide slug to the results engine's station id. Differs for two plurals. */
/**
 * The rail's contents list.
 *
 * ⚠️ TWO SECTIONS ARE CONDITIONAL, and a hard-coded list gets this wrong.
 *
 * "The field" renders only when the results engine has stored splits for this
 * station, and "Go deeper" only when there is published writing about it. A
 * static list of all ten advertised both on every page — so on a station with
 * no stored splits, two entries in the contents pointed at nothing. Tapping
 * them did exactly nothing, which is the worst kind of broken link because it
 * looks like the page is unresponsive rather than like the link is wrong.
 *
 * It was written as a static list first, and the e2e test that walks every
 * contents link and asserts its target exists is what caught it. That test is
 * the reason this signature takes the same booleans the JSX branches on:
 * anything that can hide a section has to be able to hide its rail entry.
 */
function railSections(opts: { hasField: boolean; hasReading: boolean }): RailSection[] {
  return [
    { id: "goal-splits", label: "Goal splits" },
    { id: "race-spec", label: "Race spec" },
    ...(opts.hasField ? [{ id: "the-field", label: "The field" }] : []),
    { id: "coaching-cues", label: "Coaching cues" },
    { id: "common-faults", label: "Common faults" },
    { id: "training-drills", label: "Training drills" },
    { id: "faq", label: "FAQ" },
    ...(opts.hasReading ? [{ id: "go-deeper", label: "Go deeper" }] : []),
    { id: "up-next", label: "Up next" },
    { id: "train-it", label: "Train it properly" },
  ];
}

const STATION_ID_BY_GUIDE_SLUG: Record<string, StationId | undefined> = {
  "ski-erg": "ski-erg",
  "sled-push": "sled-push",
  "sled-pull": "sled-pull",
  "burpee-broad-jumps": "burpee-broad-jump",
  rowing: "row",
  "farmers-carry": "farmers-carry",
  "sandbag-lunges": "sandbag-lunges",
  "wall-balls": "wall-balls",
};

/** The two boards deep enough for a distribution to mean anything. */
const DISTRIBUTION_DIVISIONS = [
  { division: "open-men", label: "open men's" },
  { division: "open-women", label: "open women's" },
] as const;

// Real photography from the July 2026 intake (docs/photo-library-2026-07.md),
// except sled pull, which nothing in the set covers and so keeps its AI
// illustration and the honest caption that goes with it.
const STATION_IMAGES: Record<
  string,
  { src: string; alt: string; illustration?: boolean }
> = {
  "ski-erg": {
    src: "/media/images/camp/camp-skierg-drive-dawn-wide.jpg",
    alt: "Ben Sutherland driving down through a SkiErg pull at a training camp",
  },
  "sled-push": {
    src: "/media/images/race/race-sled-push-wide.jpg",
    alt: "Ben Sutherland low behind the sled, driving it down the lane at a race",
  },
  "sled-pull": {
    src: "/media/images/guides/station-sled-pull.jpg",
    alt: "Illustration of the sled pull station",
    illustration: true,
  },
  "burpee-broad-jumps": {
    src: "/media/images/camp/camp-burpee-broad-jump-turf-wide.jpg",
    alt: "Hands down on the turf at the start of a burpee broad jump",
  },
  rowing: {
    src: "/media/images/camp/camp-row-erg-front-wide.jpg",
    alt: "Ben Sutherland mid-effort on the rower, seen across the flywheel",
  },
  "farmers-carry": {
    src: "/media/images/race/chicago-farmers-carry-wide.jpg",
    alt: "Two athletes carrying kettlebells down the farmers carry lane",
  },
  "sandbag-lunges": {
    src: "/media/images/race/race-sandbag-lunge-wide.jpg",
    alt: "Ben Sutherland lunging under a sandbag racked across his shoulders",
  },
  "wall-balls": {
    src: "/media/images/race/race-wall-ball-wide.jpg",
    alt: "Ben Sutherland in the bottom of a wall ball squat, eyes on the target",
  },
};

export const revalidate = 86400;
export const dynamicParams = false;

export async function generateStaticParams() {
  return listStationSlugs().map((station) => ({ station }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ station: string }>;
}): Promise<Metadata> {
  const { station } = await params;
  const s = getStation(station);
  if (!s) return { title: "Not found" };
  const url = `${siteUrl()}/hyrox/stations/${s.slug}`;
  /* "technique, splits, and training drills" put all eight station pages
     between 71 and 83 characters once the brand suffix was added. The
     shorter phrase keeps the two terms people actually search for. */
  const title = `Hyrox ${s.name}: technique and drills`;
  /* The trailing "Coaching cues, common faults, goal splits, and training
     drills for the Hyrox X station" was generic keyword filler that pushed
     every station page to 220-233 characters, so the summary — the only
     part specific to this station — was the bit Google cut. */
  const description = clampDescription(s.summary);
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: "Suth Performance",
      type: "article",
      locale: "en_GB",
      // The station's own photograph where there is one, so a shared guide
      // shows the movement it is about; the general race image otherwise.
      images: [{
        url: STATION_IMAGES[s.slug]?.src ?? "/media/images/track/og-default.jpg",
        width: 1200,
        height: 630,
        alt: `HYROX ${s.name}`,
      }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [STATION_IMAGES[s.slug]?.src ?? "/media/images/track/og-default.jpg"],
    },
    robots: { index: true, follow: true },
  };
}

export default async function StationPage({
  params,
}: {
  params: Promise<{ station: string }>;
}) {
  const { station } = await params;
  const s = getStation(station);
  if (!s) notFound();

  const url = `${siteUrl()}/hyrox/stations/${s.slug}`;

  // The guide slugs and the results engine's station ids agree on six of eight;
  // "burpee-broad-jumps" and "rowing" are the guide's plurals.
  const stationId = STATION_ID_BY_GUIDE_SLUG[s.slug];
  const distributions = stationId
    ? await Promise.all(
        DISTRIBUTION_DIVISIONS.map(async (d) => ({
          ...d,
          // A station with no splits stored yet is normal early in a season, and
          // a guide page must not 500 because of it.
          //
          // ⚠️ Bounded, because this page is prerendered. The histogram is an
          // enhancement — the guide is complete without it — but the build
          // gives each page 60 seconds and this query got slow enough under
          // build-time concurrency to blow that, failing the whole deployment.
          // A nice-to-have must never be able to stop a release.
          distribution: await Promise.race([
            getResultsSource().getStationDistribution(stationId, d.division),
            new Promise<null>((resolve) => setTimeout(() => resolve(null), 8_000)),
          ]).catch(() => null),
        })),
      )
    : [];
  const withData = distributions.filter((d) => (d.distribution?.count ?? 0) > 0);

  // Resolve this station's reading list against what is actually published.
  const allPosts = await listPostMeta();
  const bySlug = new Map(allPosts.map((p) => [p.slug, p]));
  const reading = (STATION_READING[s.slug] ?? [])
    .map((slug) => bySlug.get(slug))
    .filter((p): p is NonNullable<typeof p> => Boolean(p));

  // BreadcrumbList
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: siteUrl() },
      {
        "@type": "ListItem",
        position: 2,
        name: "Hyrox stations",
        item: `${siteUrl()}/hyrox/stations`,
      },
      { "@type": "ListItem", position: 3, name: s.name, item: url },
    ],
  };

  // HowTo schema, the technique cues become steps.
  const howToLd = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: `How to perform the Hyrox ${s.name}`,
    description: s.oneLiner,
    totalTime: "PT5M",
    supply: [
      {
        "@type": "HowToSupply",
        name: `Race weight: ${s.spec.mensOpen} (men's open) · ${s.spec.womensOpen} (women's open)`,
      },
    ],
    step: s.cues.map((cue, i) => ({
      "@type": "HowToStep",
      position: i + 1,
      name: `Step ${i + 1}`,
      text: cue,
    })),
  };

  // FAQPage schema
  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: s.faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
         
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      <script
        type="application/ld+json"
         
        dangerouslySetInnerHTML={{ __html: JSON.stringify(howToLd) }}
      />
      <script
        type="application/ld+json"
         
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
      />

      <MarketingNav />
      <main className="pb-24 pt-28 md:pt-36">
        <Container>
          <nav
            aria-label="Breadcrumb"
            className="mb-8 font-mono text-[11px] uppercase tracking-[0.18em] text-suth-text-tertiary"
          >
            <Link href="/" className="hover:text-suth-text">
              Home
            </Link>
            <span aria-hidden className="mx-2">/</span>
            <Link href="/hyrox/stations" className="hover:text-suth-text">
              Stations
            </Link>
            <span aria-hidden className="mx-2">/</span>
            <span className="text-suth-text">{s.name}</span>
          </nav>

          <div className="max-w-3xl">
            <Eyebrow>Station {String(s.order).padStart(2, "0")} · {s.spec.distance ?? s.spec.reps}</Eyebrow>
            <SplitHeading
              as="h1"
              className="mt-4 text-balance text-3xl font-black leading-[1.05] tracking-[-0.04em] text-suth-text md:text-[46px]"
            >
              Hyrox {s.name}
            </SplitHeading>
            <p className="mt-5 text-base leading-relaxed text-suth-text-secondary md:text-lg">
              {s.oneLiner}
            </p>

            <div className="mt-6 inline-flex flex-wrap items-center gap-2">
              <span className="rounded-pill border border-suth-accent/40 bg-suth-accent/10 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.18em] text-suth-accent">
                Men&apos;s open: {s.spec.mensOpen}
              </span>
              <span className="rounded-pill border border-suth-border bg-suth-elevated px-3 py-1 font-mono text-[11px] uppercase tracking-[0.18em] text-suth-text-secondary">
                Women&apos;s open: {s.spec.womensOpen}
              </span>
            </div>

            {STATION_IMAGES[s.slug] ? (
              <figure className="-mx-4 mt-8 overflow-hidden rounded-2xl md:mx-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={STATION_IMAGES[s.slug].src}
                  alt={STATION_IMAGES[s.slug].alt}
                  className="aspect-[16/9] w-full object-cover"
                  /* Below the fold: this sits under the spec list, so eager
                     loading only delays what is above it. It also leaked —
                     every page linking to a station guide preloaded this image
                     via route prefetch, putting 436KB of never-rendered
                     photography on the simulator and every result page. */
                  loading="lazy"
                  decoding="async"
                />
                <figcaption className="mt-2 font-mono text-[10px] uppercase tracking-[0.18em] text-suth-text-tertiary">
                  {STATION_IMAGES[s.slug].illustration
                    ? "Illustration, not race footage"
                    : "Our own photography"}
                </figcaption>
              </figure>
            ) : null}
          </div>

          {/*
            * DESKTOP LAYOUT.
            *
            * Everything below the hero was ten stacked `max-w-3xl` blocks, so a
            * 1440px screen showed a 768px ribbon with a third of the page empty
            * on each side. The reading column stays about the same width — a
            * longer measure is harder to read, not easier — and the recovered
            * space becomes a sticky reference rail instead.
            *
            * `minmax(0, 1fr)` rather than `1fr`: grid items default to
            * `min-width: auto`, and the histogram and tables inside would
            * otherwise refuse to shrink and push the rail off the page.
            */}
          <div className="mt-4 lg:grid lg:grid-cols-[minmax(0,1fr)_260px] lg:items-start lg:gap-14 xl:grid-cols-[minmax(0,1fr)_300px]">
            <div className="min-w-0">

          {/* Goal splits */}
          <section
            id="goal-splits"
            /* `scroll-mt` keeps the heading clear of the fixed nav when the
               rail jump-links land here — without it the target sits under
               the header and looks like the link went to the wrong place. */
            className="mt-16 scroll-mt-28 border-t border-suth-border-subtle pt-10">
            <Eyebrow>Goal splits</Eyebrow>
            <h2 className="mt-3 text-2xl font-black tracking-[-0.04em] text-suth-text md:text-3xl">
              What good looks like.
            </h2>
            <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                ["Sub-60", s.goalSplits.sub60, "Elite"],
                ["Sub-75", s.goalSplits.sub75, "Strong age-group"],
                ["Sub-90", s.goalSplits.sub90, "Solid age-group"],
                ["Finish your first", s.goalSplits.finishFirst, "First-time"],
              ].map(([label, split, sub]) => (
                <div
                  key={label}
                  className="rounded-md border border-suth-border-subtle bg-suth-elevated p-4"
                >
                  <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-suth-text-tertiary">
                    {label}
                  </dt>
                  <dd className="mt-2 text-2xl font-black tracking-[-0.04em] text-suth-text">
                    {split}
                  </dd>
                  <dd className="mt-1 text-xs text-suth-text-secondary">
                    {sub}
                  </dd>
                </div>
              ))}
            </dl>
          </section>

          {/* Race spec, as a table rather than prose: it is reference material,
              and people arrive at these pages to look one number up. */}
          <section
            id="race-spec"
            /* `scroll-mt` keeps the heading clear of the fixed nav when the
               rail jump-links land here — without it the target sits under
               the header and looks like the link went to the wrong place. */
            className="mt-16 scroll-mt-28 border-t border-suth-border-subtle pt-10">
            <Eyebrow>Race spec</Eyebrow>
            <h2 className="mt-3 text-2xl font-black tracking-[-0.04em] text-suth-text md:text-3xl">
              What you actually face.
            </h2>
            <div className="mt-6 overflow-x-auto">
              <table className="w-full min-w-[26rem] border-collapse text-left text-sm">
                <caption className="sr-only">
                  {s.name} distances, reps and loads by division
                </caption>
                <thead>
                  <tr className="border-b border-suth-border">
                    <th scope="col" className="py-2 pr-4 font-mono text-[10px] uppercase tracking-[0.18em] text-suth-text-tertiary">
                      Division
                    </th>
                    <th scope="col" className="py-2 pr-4 font-mono text-[10px] uppercase tracking-[0.18em] text-suth-text-tertiary">
                      {s.spec.reps ? "Reps" : "Distance"}
                    </th>
                    <th scope="col" className="py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-suth-text-tertiary">
                      Load
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["Men's Open", s.spec.mensOpen],
                    ["Women's Open", s.spec.womensOpen],
                    // ⚠️ Pro loads are not in the station data. They are real
                    // published standards, but the ones held here disagree with
                    // some public sources, and a guide that quotes a weight
                    // wrong is worse than one that stays quiet. The row appears
                    // the moment `spec.mensPro` is filled in — see REPORT.md.
                    ...(s.spec.mensPro ? [["Men's Pro", s.spec.mensPro]] : []),
                    ...(s.spec.womensPro ? [["Women's Pro", s.spec.womensPro]] : []),
                  ].map(([division, load]) => (
                    <tr key={division} className="border-b border-suth-border-subtle">
                      <th scope="row" className="py-3 pr-4 font-medium text-suth-text">
                        {division}
                      </th>
                      <td className="py-3 pr-4 text-suth-text-secondary">
                        {s.spec.reps ?? s.spec.distance ?? "—"}
                      </td>
                      <td className="py-3 font-mono text-suth-text">{load}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* The distribution behind the goal splits above. Renders only when
              there are splits stored — an empty axis reads as breakage. */}
          {withData.length > 0 ? (
            <section
            id="the-field"
            /* `scroll-mt` keeps the heading clear of the fixed nav when the
               rail jump-links land here — without it the target sits under
               the header and looks like the link went to the wrong place. */
            className="mt-16 scroll-mt-28 border-t border-suth-border-subtle pt-10">
              <Eyebrow>The field</Eyebrow>
              <h2 className="mt-3 text-2xl font-black tracking-[-0.04em] text-suth-text md:text-3xl">
                How long it takes everyone else.
              </h2>
              <p className="mt-3 text-sm text-suth-text-secondary">
                A goal split means nothing without the shape behind it. This is every
                stored {s.name.toLowerCase()} time, so you can see where yours sits rather
                than guess.
              </p>
              {withData.map((d) => (
                <div key={d.division} className="mt-8">
                  <h3 className="font-mono text-[11px] uppercase tracking-[0.18em] text-suth-text-tertiary">
                    {d.label}
                  </h3>
                  <StationHistogram
                    distribution={d.distribution!}
                    stationName={s.name}
                    divisionLabel={d.label}
                  />
                </div>
              ))}
              <p className="mt-6 text-sm text-suth-text-secondary">
                <Link href="/tools/good-hyrox-time" className="text-suth-accent underline">
                  Work out what percentile your time is
                </Link>
                {" · "}
                <Link href="/simulator" className="text-suth-accent underline">
                  Model a full race around it
                </Link>
              </p>
            </section>
          ) : null}

          {/* Cues */}
          <section
            id="coaching-cues"
            /* `scroll-mt` keeps the heading clear of the fixed nav when the
               rail jump-links land here — without it the target sits under
               the header and looks like the link went to the wrong place. */
            className="mt-16 scroll-mt-28 border-t border-suth-border-subtle pt-10">
            <Eyebrow>Coaching cues</Eyebrow>
            <h2 className="mt-3 text-2xl font-black tracking-[-0.04em] text-suth-text md:text-3xl">
              What to think about during the {s.name.toLowerCase()}.
            </h2>
            <ol role="list" className="mt-6 space-y-3">
              {s.cues.map((cue, i) => (
                <li
                  key={i}
                  className="flex gap-4 rounded-lg border border-suth-border-subtle bg-suth-elevated p-5"
                >
                  <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-suth-accent">
                    0{i + 1}
                  </span>
                  <p className="flex-1 text-base leading-relaxed text-suth-text">
                    {cue}
                  </p>
                </li>
              ))}
            </ol>
          </section>

          {/* Faults */}
          <section
            id="common-faults"
            /* `scroll-mt` keeps the heading clear of the fixed nav when the
               rail jump-links land here — without it the target sits under
               the header and looks like the link went to the wrong place. */
            className="mt-16 scroll-mt-28 border-t border-suth-border-subtle pt-10">
            <Eyebrow>Common faults</Eyebrow>
            <h2 className="mt-3 text-2xl font-black tracking-[-0.04em] text-suth-text md:text-3xl">
              What costs time.
            </h2>
            <ul role="list" className="mt-6 space-y-2 text-base leading-relaxed text-suth-text-secondary">
              {s.faults.map((f) => (
                <li key={f} className="flex gap-3">
                  <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-suth-danger" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* Drills */}
          <section
            id="training-drills"
            /* `scroll-mt` keeps the heading clear of the fixed nav when the
               rail jump-links land here — without it the target sits under
               the header and looks like the link went to the wrong place. */
            className="mt-16 scroll-mt-28 border-t border-suth-border-subtle pt-10">
            <Eyebrow>Training drills</Eyebrow>
            <h2 className="mt-3 text-2xl font-black tracking-[-0.04em] text-suth-text md:text-3xl">
              What to train this week.
            </h2>
            <ul role="list" className="mt-6 space-y-4">
              {s.drills.map((d) => (
                <li
                  key={d.name}
                  className="rounded-lg border border-suth-border-subtle bg-suth-elevated p-5"
                >
                  <p className="text-base font-bold text-suth-text">
                    {d.name}
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-suth-text-secondary">
                    {d.detail}
                  </p>
                </li>
              ))}
            </ul>
          </section>

          {/* FAQ */}
          <section
            id="faq"
            /* `scroll-mt` keeps the heading clear of the fixed nav when the
               rail jump-links land here — without it the target sits under
               the header and looks like the link went to the wrong place. */
            className="mt-16 scroll-mt-28 border-t border-suth-border-subtle pt-10">
            <Eyebrow>FAQ</Eyebrow>
            <h2 className="mt-3 text-2xl font-black tracking-[-0.04em] text-suth-text md:text-3xl">
              {s.name} questions.
            </h2>
            <div className="mt-6">
              <Accordion>
                {s.faqs.map((f, i) => (
                  <AccordionItem
                    key={i}
                    value={`q-${i}`}
                    className="border-b border-suth-border-subtle last:border-b-0"
                  >
                    <AccordionTrigger className="py-5 text-left text-base font-medium text-suth-text hover:no-underline md:text-lg">
                      {f.q}
                    </AccordionTrigger>
                    <AccordionContent className="pb-5 text-base leading-relaxed text-suth-text-secondary">
                      {f.a}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </section>

          {/* Go deeper: the writing that belongs to this station. Any slug in
              STATION_READING that is not live is dropped above, so this
              section disappears entirely rather than rendering a dead row. */}
          {reading.length > 0 && (
            <section
            id="go-deeper"
            /* `scroll-mt` keeps the heading clear of the fixed nav when the
               rail jump-links land here — without it the target sits under
               the header and looks like the link went to the wrong place. */
            className="mt-16 scroll-mt-28 border-t border-suth-border-subtle pt-10">
              <Eyebrow>Go deeper</Eyebrow>
              <h2 className="mt-3 text-2xl font-black tracking-[-0.04em] text-suth-text md:text-3xl">
                More on the {s.name.toLowerCase()}
              </h2>
              <ul className="mt-6 space-y-3">
                {reading.map((p) => (
                  <li key={p.slug}>
                    <Link
                      href={`/blog/${p.slug}`}
                      className="block rounded-lg border border-suth-border-subtle p-4 transition-colors hover:border-suth-text"
                    >
                      <span className="block font-bold text-suth-text">
                        {p.title}
                      </span>
                      {p.excerpt && (
                        <span className="mt-1 block text-sm text-suth-text-muted">
                          {p.excerpt}
                        </span>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Next station */}
          <section
            id="up-next"
            /* `scroll-mt` keeps the heading clear of the fixed nav when the
               rail jump-links land here — without it the target sits under
               the header and looks like the link went to the wrong place. */
            className="mt-16 scroll-mt-28 border-t border-suth-border-subtle pt-10">
            <Eyebrow>Up next</Eyebrow>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {(() => {
                const idx = STATIONS.findIndex((x) => x.slug === s.slug);
                const prev = idx > 0 ? STATIONS[idx - 1]: null;
                const next = idx < STATIONS.length - 1 ? STATIONS[idx + 1]: null;
                return (
                  <>
                    {prev ? (
                      <Link
                        href={`/hyrox/stations/${prev.slug}`}
                        className="lift-on-hover rounded-lg border border-suth-border-subtle bg-suth-elevated p-5"
                      >
                        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-suth-text-tertiary">
                          ← Previous station
                        </p>
                        <p className="mt-2 text-base font-bold text-suth-text">
                          {prev.name}
                        </p>
                      </Link>
                    ): (
                      <span />
                    )}
                    {next ? (
                      <Link
                        href={`/hyrox/stations/${next.slug}`}
                        className="lift-on-hover rounded-lg border border-suth-border-subtle bg-suth-elevated p-5 text-right"
                      >
                        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-suth-text-tertiary">
                          Next station →
                        </p>
                        <p className="mt-2 text-base font-bold text-suth-text">
                          {next.name}
                        </p>
                      </Link>
                    ): null}
                  </>
                );
              })()}
            </div>
          </section>

          {/* CTA */}
          <section
            id="train-it"
            /* `scroll-mt` keeps the heading clear of the fixed nav when the
               rail jump-links land here — without it the target sits under
               the header and looks like the link went to the wrong place. */
            className="mt-16 scroll-mt-28 border-t border-suth-border-subtle pt-10 text-center">
            <Eyebrow>Train it properly</Eyebrow>
            <h2 className="mt-3 text-3xl font-black tracking-[-0.04em] text-suth-text md:text-4xl">
              Build the {s.name.toLowerCase()} into your plan.
            </h2>
            <p className="mt-4 text-base text-suth-text-secondary">
              Suth Performance programmes include station-specific drills in every week.
              Three-minute quiz, dated Week 1 for free.
            </p>
            <div className="mt-6">
              <CtaButton href="/quiz" size="lg">
                Find your plan →
              </CtaButton>
            </div>
          </section>
            </div>

            <StationRail
              station={s}
              sections={railSections({
                hasField: withData.length > 0,
                hasReading: reading.length > 0,
              })}
            />
          </div>
        </Container>
      </main>
      <MarketingFooter />
    </>
  );
}
