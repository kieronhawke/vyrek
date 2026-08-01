import { Container } from "@/components/shared/container";
import type { GeoSeo } from "@/lib/locations/seo";

/**
 * The part of a location page that is actually worth reading.
 *
 * Up to here the pages carried the offer, a gym list and a parkrun list. All
 * true, all local, but a searcher who types "personal trainer in Hexham" wants
 * to know what training there is actually like, and a list of names does not
 * tell them.
 *
 * This writes that, and it writes a different answer per town because the
 * facts differ. A town with thirty gyms and a race on its doorstep gets
 * different advice from one with four gyms and a two-hundred-kilometre trip.
 * The branching is on real thresholds, not on a random pick, so two towns with
 * the same profile legitimately read alike, and towns with different profiles
 * genuinely differ.
 *
 * Nothing here asserts a fact we have not got. It reasons from counts,
 * distances and names we hold, which is the difference between writing about a
 * place and padding a page about a place.
 */

type Section = { h: string; p: string[] };

/** "A, B and C" rather than "A, B". */
function list(items: string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

function equipmentSection(seo: GeoSeo, name: string): Section {
  const n = seo.gyms.length;
  const p: string[] = [];

  if (n >= 25) {
    p.push(
      `${name} has more places to train than most people will ever need, which changes the question from "where can I go" to "which one is worth the direct debit". At this density you can afford to be specific.`,
    );
  } else if (n >= 10) {
    p.push(
      `${n} gyms and sports centres sit within a few miles of the centre of ${name}. That is enough to choose on what the floor actually holds rather than on which is nearest.`,
    );
  } else if (n >= 3) {
    p.push(
      `${name} has ${n} places to train within reach. Not a wide field, and it means the sensible move is to build the programme around what one or two of them actually have rather than hunting for a perfect fit.`,
    );
  } else {
    p.push(
      `Training options in ${name} are thin on the ground, which matters far less than it sounds. Most of a Hyrox build is running, carrying and squatting, and almost all of it substitutes.`,
    );
  }

  // Name the actual places. Counts are shared by hundreds of towns; the names
  // are not, and they are what makes this paragraph about this town.
  const named = seo.gyms.slice(0, 3).map((g) => g.name);
  if (named.length >= 2) {
    p.push(
      `Closest to the centre you have ${list(named)}${typeof seo.gyms[0].distanceKm === "number" ? `, the nearest of them about ${seo.gyms[0].distanceKm} km out` : ""}. Ring before you join and ask two questions: is there floor space to push a sled, and can you throw a ball at a wall. Those answers decide more than any membership tier.`,
    );
  } else if (named.length === 1) {
    p.push(
      `${named[0]} is the closest${typeof seo.gyms[0].distanceKm === "number" ? `, roughly ${seo.gyms[0].distanceKm} km from the centre` : ""}. Worth ringing to ask whether there is floor space for a sled and a wall you can throw a ball at, because those two shape the programme more than anything on the price list.`,
    );
  }

  const sportsNames = seo.gyms
    .filter((g) => g.type === "sports-centre")
    .slice(0, 2)
    .map((g) => g.name);
  if (sportsNames.length) {
    // "Council-run" was an assertion we cannot support: OSM records the leisure
    // class, not the operator model. The useful, true point is about floor space.
    p.push(
      `${list(sportsNames)} ${sportsNames.length === 1 ? "is listed as a sports centre" : "are listed as sports centres"} rather than ${sportsNames.length === 1 ? "a gym" : "gyms"}. Multi-use sites are usually where the floor space is, which tends to be where the sled and carry work ends up happening.`,
    );
  }

  if (seo.chains.length) {
    p.push(
      `${list(seo.chains.slice(0, 3))} ${seo.chains.length === 1 ? "has a site" : "have sites"} here, so an existing membership may already cover you. If you are joining from scratch, a rolling monthly contract is worth the few extra pounds while you work out which sessions you actually turn up for.`,
    );
  }

  return { h: `Where to train in ${name}`, p };
}

function runningSection(seo: GeoSeo, name: string): Section {
  const p: string[] = [];
  const pk = seo.parkruns;

  if (pk.length >= 3) {
    const names = pk.slice(0, 3).map((x) => x.name);
    p.push(
      `You are well served for measured running around ${name}. ${pk.length} parkrun courses sit within reach: ${list(names)} are the closest three${typeof pk[0].distanceKm === "number" ? `, ${pk[0].name} being about ${pk[0].distanceKm} km out` : ""}. Use one as your fixed benchmark and run it in the same conditions each time, or the number tells you nothing.`,
    );
  } else if (pk.length) {
    p.push(
      `${pk[0].name}${typeof pk[0].distanceKm === "number" ? `, roughly ${pk[0].distanceKm} km from the centre of ${name},` : ""} is your nearest measured 5 km. Free, timed, every Saturday, and the single most useful benchmark you have access to.`,
    );
  } else {
    p.push(
      `There is no parkrun close to ${name}, so you will need to measure your own loop. Pick something flat you can repeat, run it every three or four weeks under the same conditions, and treat that time as your benchmark.`,
    );
  }

  p.push(
    `A Hyrox is eight kilometre runs with a station between each, which means the skill being tested is running on tired legs, not running fresh. Do at least one session a week where the running comes after the hard work rather than before it.`,
  );

  return { h: `Where to run around ${name}`, p };
}

function raceSection(seo: GeoSeo, name: string): Section | null {
  const race = seo.nearestRace;
  if (!race) return null;
  const p: string[] = [];
  const km = race.straightLineKm;

  if (seo.hostsRace) {
    p.push(
      `${name} hosts a race, which is a bigger advantage than most people use. You can walk the venue, you will train alongside people on the same start list, and you have no travel to plan on the morning.`,
    );
  } else if (km <= 60) {
    p.push(
      `${race.venue} is roughly ${km} km from ${name}, close enough to be a normal morning rather than a trip. That is the one to build towards for a first race: no hotel, no unfamiliar bed, no early train.`,
    );
  } else if (km <= 160) {
    p.push(
      `Your nearest race is ${race.venue}, about ${km} km away. Far enough that an early wave means going the night before, which is worth budgeting for at the point you enter rather than the week before.`,
    );
  } else {
    p.push(
      `${race.venue} is the nearest venue at roughly ${km} km, so racing means a weekend away. Enter early, book the room at the same time, and treat the travel as part of the plan rather than an afterthought.`,
    );
  }

  p.push(
    `Whichever race you enter, the date is what makes a programme a programme. Twelve weeks is the standard build, sixteen if you are starting from very little running, and every session lands on a calendar day rather than a week number.`,
  );

  return { h: `Racing from ${name}`, p };
}

export function GeoGuide({
  seo,
  name,
  variant,
}: {
  seo: GeoSeo;
  name: string;
  variant: "hyrox" | "pt";
}) {
  const sections = [
    equipmentSection(seo, name),
    runningSection(seo, name),
    variant === "hyrox" ? raceSection(seo, name) : null,
  ].filter(Boolean) as Section[];

  if (!sections.length) return null;

  return (
    <section
      aria-labelledby="geo-guide-heading"
      className="border-t border-suth-border-subtle py-16 md:py-24"
    >
      <Container>
        <div className="mx-auto max-w-2xl">
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-suth-accent">
            [ Training in {name} ]
          </p>
          <h2
            id="geo-guide-heading"
            className="mt-4 text-[28px] font-black leading-[1.1] tracking-[-0.03em] text-suth-text md:text-[36px]"
          >
            {variant === "hyrox"
              ? `What a Hyrox build looks like from ${name}.`
              : `What training in ${name} actually involves.`}
          </h2>

          <div className="mt-10 space-y-10">
            {sections.map((s) => (
              <div key={s.h}>
                <h3 className="text-lg font-black tracking-[-0.02em] text-suth-text md:text-xl">
                  {s.h}
                </h3>
                {s.p.map((para) => (
                  <p
                    key={para.slice(0, 40)}
                    className="mt-3 text-base leading-relaxed text-suth-text-secondary"
                  >
                    {para}
                  </p>
                ))}
              </div>
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}
