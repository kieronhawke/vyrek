import Image from "next/image";
import Link from "next/link";
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
import { coachingSlugForRace } from "@/lib/geo-page";
import { venueLabel, venueStreet } from "@/lib/hyrox/races";
import {
  metroGyms,
  nearbyStates,
  nextRaceInState,
  stateChains,
  type UsState,
} from "@/lib/us-states";

/**
 * A US state page, for both funnels.
 *
 * The template is shared with nothing else on purpose. A state is not a town:
 * it has no centre worth writing about, no single parkrun, and a reader in
 * Texas is asking a different question from a reader in Bracknell. What a
 * state page can say that no other page can is where the races are, which
 * metros have what, and — for the 38 states with no race at all — how far the
 * nearest one actually is and from where.
 *
 * Every number here is sourced or computed. Populations are GeoNames, gyms are
 * OpenStreetMap, races and dates are HYROX's own event pages, distances are
 * straight-line and labelled as such.
 */

export type StateVariant = "pt" | "hyrox";

const fmtDate = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

export function stateCopy(variant: StateVariant, s: UsState) {
  const gyms = metroGyms(s);
  const gymTotal = gyms.reduce((n, m) => n + m.gyms.length, 0);
  const chains = stateChains(s);
  const race = nextRaceInState(s);

  /* The opening paragraph is assembled from this state's own numbers. Every
     clause drops out if the data behind it is missing, so a thin state gets a
     shorter paragraph rather than a padded one. */
  const bits: string[] = [];
  if (gymTotal && gyms.length) {
    bits.push(
      `There are ${gymTotal} named gyms and sports centres across ${listOf(gyms.map((g) => g.city))}` +
        (chains.length ? `, ${listOf(chains.slice(0, 2))} among them` : "") +
        `, and the programme is written around whichever one you use.`,
    );
  }
  if (race) {
    bits.push(
      `${s.name} hosts ${s.races.length === 1 ? "a HYROX" : `${s.races.length} HYROX races`}` +
        ` — ${venueLabel(race)}` +
        `, ${fmtDate(race.startDate)} — so every session is dated backwards from that weekend.`,
    );
  } else if (s.nearestRace) {
    bits.push(
      `There is no HYROX in ${s.name} yet. The nearest is ${s.nearestRace.city}, ` +
        `roughly ${s.nearestRace.straightLineKm.toLocaleString("en-GB")} km from ${s.nearestRace.fromCity} in a straight line, ` +
        `and the programme is dated backwards from whichever race you enter.`,
    );
  }
  bits.push(
    variant === "hyrox"
      ? `Built by HYROX Elite 15 athlete Ben Sutherland. See your Week 1 before you decide anything.`
      : `Online personal training from HYROX Elite 15 athlete Ben Sutherland, rebuilt every Sunday from what you logged.`,
  );

  return {
    eyebrow: `${s.name} · United States`,
    h1:
      variant === "hyrox" ? (
        <>
          Hyrox training in {s.name},
          <br className="hidden md:block" /> built around your race.
        </>
      ) : (
        <>
          A personal trainer in {s.name},
          <br className="hidden md:block" /> without the hourly rate.
        </>
      ),
    sub: bits.join(" "),
    faqs: buildFaqs(variant, s, gymTotal),
  };
}

function listOf(items: string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

function buildFaqs(variant: StateVariant, s: UsState, gymTotal: number) {
  const race = nextRaceInState(s);
  const gyms = metroGyms(s);
  const faqs: { q: string; a: string }[] = [];

  faqs.push({
    q: `Is there a HYROX race in ${s.name}?`,
    a: race
      ? `Yes. ${s.name} hosts ${s.races.length === 1 ? "one race on the current calendar" : `${s.races.length} races on the current calendar`}: ${s.races
          .map((r) => `${r.city}, ${fmtDate(r.startDate)}`)
          .join("; ")}. Dates and venues come from HYROX's own event pages, so check theirs before booking travel.`
      : s.nearestRace
        ? `Not on the current calendar. The nearest is ${s.nearestRace.city}, about ${s.nearestRace.straightLineKm.toLocaleString("en-GB")} km from ${s.nearestRace.fromCity} in a straight line — far enough to be a trip rather than a drive, which is worth knowing when you pick a race to build towards. HYROX adds cities regularly, so this changes.`
        : `Not on the current calendar.`,
  });

  faqs.push({
    q: `Where can I train for HYROX in ${s.name}?`,
    a: gymTotal
      ? `Anywhere with a rower, a sled lane and a wall. We have ${gymTotal} named gyms and sports centres across ${listOf(gyms.map((g) => g.city))} in the database, and the quiz asks what you can actually get to before it writes anything. A HYROX-affiliated gym is a nice-to-have, not a requirement — most of the eight stations have a substitute that trains the same quality.`
      : `Anywhere with a rower, a sled lane and a wall. The quiz asks what equipment you can get to and the plan only includes work you can actually do.`,
  });

  faqs.push({
    q:
      variant === "hyrox"
        ? `Does online coaching work if I am in ${s.name} and Ben is in the UK?`
        : `Can an online personal trainer in the UK coach me in ${s.name}?`,
    a: `Yes, and the time difference matters less than people expect. The programme is written to your calendar, not to a session slot, so nothing depends on both of us being awake at once. You log what you did, Sunday's rebuild responds to it, and questions get answered in the app. What you are buying is the programming and the adjustment, which is the part a local trainer charging by the hour cannot give you between sessions.`,
  });

  faqs.push({
    q: `What does it cost compared with a personal trainer in ${s.name}?`,
    // No invented figure. The no-pricing policy applies here as it does on the
    // UK pages: we do not publish a competitor's rate we cannot source, and we
    // do not publish our own.
    a: `In-person training in the US is charged by the hour and booked session by session, so the cost tracks how often you train and stops the moment you stop. This is a programme rather than a slot: it covers every session in the week, it adapts, and it does not double when you decide to train twice as often. Pricing is tailored and starts with a free consultation with Ben.`,
  });

  return faqs;
}

export function UsStatePage({
  variant,
  state,
}: {
  variant: StateVariant;
  state: UsState;
}) {
  const c = stateCopy(variant, state);
  const gyms = metroGyms(state);
  const base = variant === "hyrox" ? "/hyrox-training" : "/personal-trainer";
  const nearby = nearbyStates(state.slug, 6);

  return (
    <>
      <MarketingNav />
      <main>
        {/* The state pages shipped with no hero image while every other page
            family has one, so they read as unfinished next to a town page.
            Same treatment as GeoLanding: scrim left-to-right, near-opaque
            behind the text, open on the right where the photograph is. */}
        <section
          aria-labelledby="state-hero-heading"
          className="relative isolate overflow-hidden border-b border-suth-border-subtle"
        >
          <div aria-hidden className="absolute inset-0 -z-10">
            <Image
              src={
                variant === "hyrox"
                  ? "/media/images/track/pair-frontal-bw.jpg"
                  : "/media/images/track/solo-watch-bw.jpg"
              }
              alt=""
              fill
              priority
              fetchPriority="high"
              sizes="100vw"
              className="object-cover opacity-55 grayscale"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-suth-base from-0% via-suth-base/90 via-35% to-suth-base/30 to-100%" />
            <div className="absolute inset-0 bg-gradient-to-b from-suth-base/50 via-transparent via-35% to-suth-base" />
          </div>
          <Container>
            <div className="mx-auto max-w-3xl pb-14 pt-32 md:pb-20 md:pt-36">
              <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-suth-accent">
                [ {c.eyebrow} ]
              </p>
              <SplitHeading
                as="h1"
                id="state-hero-heading"
                className="mt-4 text-balance text-3xl font-black leading-[1.05] tracking-[-0.04em] text-suth-text md:text-[44px] lg:text-[52px]"
              >
                {c.h1}
              </SplitHeading>
              <p className="mt-6 text-base leading-relaxed text-suth-text-secondary md:text-lg">
                {c.sub}
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <CtaButton href="/quiz" size="md">
                  Start the 3-minute quiz
                </CtaButton>
                <Link
                  href="/free-consultation"
                  className="inline-flex h-12 items-center rounded-pill border border-suth-border bg-suth-elevated px-5 text-sm font-medium text-suth-text transition-colors hover:border-suth-border-strong"
                >
                  Talk to Ben, free
                </Link>
              </div>
            </div>
          </Container>
        </section>

        {/* ── Races ── */}
        {(state.races.length > 0 || state.nearestRace) && (
          <section
            aria-labelledby="state-races-heading"
            className="border-b border-suth-border-subtle py-14 md:py-20"
          >
            <Container>
              <div className="mx-auto max-w-3xl">
                <h2
                  id="state-races-heading"
                  className="font-mono text-[11px] uppercase tracking-[0.22em] text-suth-text-tertiary"
                >
                  [ {state.races.length ? `Racing in ${state.name}` : "Your nearest race"} ]
                </h2>
                {state.races.length ? (
                  <ul className="mt-6 space-y-5">
                    {state.races.map((r) => (
                      <li
                        key={r.slug}
                        className="rounded-lg border border-suth-border bg-suth-elevated p-5"
                      >
                        {/* The city is the heading, not the venue. Two Houston
                            races both headed "Venue to be announced" told a
                            reader nothing and repeated each other; Dallas read
                            "Dallas" above "DALLAS · 18 NOVEMBER 2026", saying
                            the same word twice in adjacent lines. The city is
                            what identifies a race to somebody scanning. */}
                        <p className="text-lg font-black tracking-[-0.02em] text-suth-text">
                          {r.city}
                        </p>
                        <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.18em] text-suth-text-tertiary">
                          {fmtDate(r.startDate)}
                        </p>
                        {r.venueAnnounced && venueLabel(r) !== r.city ? (
                          <p className="mt-2 text-sm text-suth-text-secondary">
                            {venueLabel(r)}
                          </p>
                        ) : !r.venueAnnounced ? (
                          <p className="mt-2 text-sm text-suth-text-tertiary">
                            Venue not yet announced by HYROX
                          </p>
                        ) : null}
                        {/* The street, where HYROX gave one. Shown under the
                            city rather than as the heading, because on most US
                            races the "venue name" IS the street. */}
                        {venueStreet(r) ? (
                          <p className="mt-2 text-sm text-suth-text-secondary">
                            {venueStreet(r)}
                          </p>
                        ) : null}
                        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2">
                          <Link
                            href={`/hyrox/events/${r.slug}`}
                            className="text-sm font-medium text-suth-accent underline decoration-suth-accent/40 underline-offset-4 hover:decoration-suth-accent"
                          >
                            Dates, venue and when to start →
                          </Link>
                          {/* citySlug holds the unqualified name — "houston"
                              — while the page is /houston-usa, so a slug lookup
                              silently dropped the link on every collision city.
                              coachingSlugForRace matches on name AND country,
                              which is what the qualification exists for. */}
                          {coachingSlugForRace({ city: r.city, country: "United States" }) ? (
                            <Link
                              href={`${base}/${coachingSlugForRace({ city: r.city, country: "United States" })}`}
                              className="text-sm font-medium text-suth-accent underline decoration-suth-accent/40 underline-offset-4 hover:decoration-suth-accent"
                            >
                              Training in {r.city} →
                            </Link>
                          ) : null}
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : state.nearestRace ? (
                  <div className="mt-6 rounded-lg border border-suth-border bg-suth-elevated p-5">
                    <p className="text-lg font-black tracking-[-0.02em] text-suth-text">
                      {state.nearestRace.city}
                    </p>
                    <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.18em] text-suth-text-tertiary">
                      {fmtDate(state.nearestRace.startDate)} ·{" "}
                      {state.nearestRace.straightLineKm.toLocaleString("en-GB")} km from{" "}
                      {state.nearestRace.fromCity}
                    </p>
                    <p className="mt-4 text-sm leading-relaxed text-suth-text-secondary">
                      Straight-line distance, so the drive is longer. Far enough
                      that a race is a weekend rather than a morning, which
                      changes the taper more than it changes the training — you
                      want to arrive with a day in hand rather than racing off a
                      flight.
                    </p>
                    <div className="mt-4">
                      <Link
                        href={`/hyrox/events/${state.nearestRace.slug}`}
                        className="text-sm font-medium text-suth-accent underline decoration-suth-accent/40 underline-offset-4 hover:decoration-suth-accent"
                      >
                        Dates, venue and when to start →
                      </Link>
                    </div>
                  </div>
                ) : null}
              </div>
            </Container>
          </section>
        )}

        {/* ── Gyms, by metro ── */}
        {gyms.length > 0 && (
          <section
            aria-labelledby="state-gyms-heading"
            className="border-b border-suth-border-subtle py-14 md:py-20"
          >
            <Container>
              <div className="mx-auto max-w-3xl">
                <h2
                  id="state-gyms-heading"
                  className="font-mono text-[11px] uppercase tracking-[0.22em] text-suth-text-tertiary"
                >
                  [ Where you can train in {state.name} ]
                </h2>
                <p className="mt-4 text-base leading-relaxed text-suth-text-secondary">
                  {variant === "hyrox"
                    ? `What to look for is not a HYROX sticker on the door. It is a sled lane long enough to push on, a spare wall for wall balls, and a rower nobody queues for at 6pm. These are the named sites in the state's largest metros.`
                    : `Across a state this size the gym that gets used is the one you pass anyway, not the best-equipped one two towns over. These are the named sites in the largest metros, and the programme is written around whichever you land on.`}
                </p>
                <div className="mt-8 space-y-7">
                  {gyms.map((m) => (
                    <div key={m.citySlug}>
                      <h3 className="text-sm font-semibold text-suth-text">
                        {m.city}
                      </h3>
                      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
                        {m.gyms.slice(0, 12).map((g) => (
                          <li
                            key={g.name}
                            className="text-sm text-suth-text-secondary"
                          >
                            {g.name}
                          </li>
                        ))}
                      </ul>
                      {m.gyms.length > 12 ? (
                        <p className="mt-2 text-xs text-suth-text-tertiary">
                          and {m.gyms.length - 12} more within reach of the centre
                        </p>
                      ) : null}
                    </div>
                  ))}
                </div>
                <p className="mt-8 text-[11px] leading-relaxed text-suth-text-tertiary">
                  Gym data from OpenStreetMap contributors, licensed ODbL. It
                  records that a site exists, not what equipment it holds, so
                  check the kit before you commit to a membership.
                </p>
              </div>
            </Container>
          </section>
        )}

        {/* ── Cities ── */}
        {state.cities.length > 1 && (
          <section
            aria-labelledby="state-cities-heading"
            className="border-b border-suth-border-subtle py-14 md:py-16"
          >
            <Container>
              <div className="mx-auto max-w-3xl">
                <h2
                  id="state-cities-heading"
                  className="font-mono text-[11px] uppercase tracking-[0.22em] text-suth-text-tertiary"
                >
                  [ {state.citiesTracked} cities and towns in {state.name} ]
                </h2>
                <p className="mt-4 text-base leading-relaxed text-suth-text-secondary">
                  {variant === "hyrox"
                    ? `Coaching is online, so where you are in the state changes the travel to a start line rather than whether the programme works. The largest:`
                    : `Coaching is online, so where you are in the state changes what equipment you can reach rather than whether this works. The largest:`}
                </p>
                <ul className="mt-5 flex flex-wrap gap-x-5 gap-y-2.5">
                  {state.cities.map((city) => (
                    <li key={city.slug} className="text-sm text-suth-text-secondary">
                      {city.name}
                    </li>
                  ))}
                </ul>
              </div>
            </Container>
          </section>
        )}

        {/* One section per family that the other does not carry. Without this
            the personal-trainer state page was a near-copy of the Hyrox one —
            measured at 88.6% shared eight-word sequences for Texas. */}
        <section
          aria-labelledby="state-angle-heading"
          className="border-b border-suth-border-subtle py-14 md:py-20"
        >
          <Container>
            <div className="mx-auto max-w-3xl">
              <h2
                id="state-angle-heading"
                className="font-mono text-[11px] uppercase tracking-[0.22em] text-suth-text-tertiary"
              >
                [ {variant === "hyrox" ? `Racing out of ${state.name}` : `Training around a ${state.name} week`} ]
              </h2>
              {variant === "hyrox" ? (
                <>
                  <p className="mt-4 text-base leading-relaxed text-suth-text-secondary">
                    {state.races.length
                      ? `Racing at home changes the taper more than it changes the training. No flight, no unfamiliar bed, and you can walk the floor the day before — which is worth more than any session you could have done instead.`
                      : `Every race is a trip from ${state.name}, so the calendar matters as much as the training. Enter early, book the room at the same time, and give yourself a day on the ground before you race rather than arriving off a flight.`}
                  </p>
                  <p className="mt-4 text-base leading-relaxed text-suth-text-secondary">
                    The eight stations are identical worldwide — same order,
                    same distances, same loads by division. What differs between
                    venues is floor surface, laps per kilometre and how long the
                    Roxzone runs, which is why comparing your time to a
                    friend&apos;s from another city is not comparing like with
                    like.
                  </p>
                </>
              ) : (
                <>
                  <p className="mt-4 text-base leading-relaxed text-suth-text-secondary">
                    Commutes across {state.name} are long enough that the
                    training which survives is the training that fits the day
                    you actually have. A programme that assumes ninety free
                    minutes gets abandoned in week three; one that knows you
                    have forty on a Tuesday does not.
                  </p>
                  <p className="mt-4 text-base leading-relaxed text-suth-text-secondary">
                    That is the part an hourly trainer cannot do. They can write
                    you a good session; they cannot rewrite the week when work
                    moves, and rewriting the week is most of what keeps people
                    training past the point where motivation runs out.
                  </p>
                </>
              )}
            </div>
          </Container>
        </section>

        {/* ── FAQ ── */}
        <section
          aria-labelledby="state-faq-heading"
          className="border-b border-suth-border-subtle py-14 md:py-20"
        >
          <Container>
            <div className="mx-auto max-w-3xl">
              <Eyebrow>Questions</Eyebrow>
              <h2
                id="state-faq-heading"
                className="mt-3 text-2xl font-black tracking-[-0.03em] text-suth-text md:text-3xl"
              >
                Training for Hyrox from {state.name}
              </h2>
              <Accordion className="mt-8 w-full">
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
          </Container>
        </section>

        {/* ── Nearby states ── */}
        {nearby.length > 0 && (
          <section
            aria-labelledby="state-nearby-heading"
            className="border-b border-suth-border-subtle py-14 md:py-16"
          >
            <Container>
              <div className="mx-auto max-w-3xl">
                <h2
                  id="state-nearby-heading"
                  className="font-mono text-[11px] uppercase tracking-[0.22em] text-suth-text-tertiary"
                >
                  [ Near {state.name} ]
                </h2>
                <p className="mt-4 text-base leading-relaxed text-suth-text-secondary">
                  Plenty of athletes cross a state line for a race. Distances
                  are between the largest city in each state.
                </p>
                <ul className="mt-5 flex flex-wrap gap-2.5">
                  {nearby.map((n) => (
                    <li key={n.slug}>
                      <Link
                        href={`${base}/state/${n.slug}`}
                        className="inline-flex h-10 items-center gap-2 rounded-pill border border-suth-border bg-suth-elevated px-4 text-sm font-medium text-suth-text transition-colors hover:border-suth-border-strong"
                      >
                        {n.name}
                        <span className="font-mono text-[10px] tabular-nums text-suth-text-tertiary">
                          {n.km.toLocaleString("en-GB")} km
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
                <div className="mt-6">
                  <Link
                    href={`${base}/country/usa`}
                    className="text-sm font-medium text-suth-accent underline decoration-suth-accent/40 underline-offset-4 hover:decoration-suth-accent"
                  >
                    Every US city and state we cover →
                  </Link>
                </div>
              </div>
            </Container>
          </section>
        )}

        {/* ── CTA ── */}
        <section className="py-16 md:py-24">
          <Container>
            <div className="mx-auto max-w-3xl text-center">
              <h2 className="text-2xl font-black tracking-[-0.03em] text-suth-text md:text-4xl">
                {state.races.length
                  ? `Your race is in ${state.name}. Build the twelve weeks before it.`
                  : `Pick a race. The plan works backwards from it.`}
              </h2>
              <p className="mt-4 text-base text-suth-text-secondary md:text-lg">
                Three-minute quiz. Real Week 1, free.
              </p>
              <div className="mt-8">
                <CtaButton href="/quiz" size="lg">
                  Build my plan
                </CtaButton>
              </div>
            </div>
          </Container>
        </section>
      </main>
      <MarketingFooter />
    </>
  );
}
