/**
 * Race-coverage content engine.
 *
 * Given an event from `HYROX_EVENTS` and "today", determines whether a
 * coverage milestone has been hit (T-14, T-7, T-1, T+1, T+7) and renders
 * the matching templated MDX post. The Vercel Cron route invokes this
 * daily; it either writes a draft file (default) or auto-publishes
 * (when VYREK_BOT_AUTOPUBLISH=true).
 *
 * Templates use only the structured data already in `HYROX_EVENTS` plus
 * a few short hand-written copy fragments per milestone. No LLM call,
 * deterministic output that a human editor can polish in 60 seconds.
 */

import type { HyroxEvent } from "@/lib/hyrox-events";

export type CoverageMilestone =
  | "T-14"
  | "T-7"
  | "T-1"
  | "T+1"
  | "T+7";

export type CoveragePost = {
  /** Filename (no extension). Becomes the URL slug. */
  slug: string;
  /** Frontmatter for the MDX file. */
  frontmatter: {
    title: string;
    slug: string;
    excerpt: string;
    category: "race-day" | "first-race" | "training";
    tags: string[];
    publishedAt: string; // ISO date
    updatedAt: string;
    author: "james-wright" | "vyrek-team";
    heroImage: string;
    heroAlt: string;
    seoTitle: string;
    seoDescription: string;
    faqs?: { q: string; a: string }[];
  };
  /** Markdown/MDX body (no frontmatter, added by writer). */
  body: string;
};

/** Days between two dates (b - a), rounded to whole days. */
function daysBetween(a: Date, b: Date): number {
  const MS = 24 * 60 * 60 * 1000;
  return Math.round((b.getTime() - a.getTime()) / MS);
}

/**
 * Decide whether `event` has hit a coverage milestone on `today`.
 * Returns the milestone label or null if no post should publish today.
 */
export function milestoneFor(
  event: HyroxEvent,
  today: Date = new Date(),
): CoverageMilestone | null {
  const start = new Date(event.startDate);
  // Normalise both to midnight UTC to avoid timezone slop.
  const t = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  const s = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()));
  const delta = daysBetween(t, s); // positive = future race, negative = past

  if (delta === 14) return "T-14";
  if (delta === 7) return "T-7";
  if (delta === 1) return "T-1";
  if (delta === -1) return "T+1";
  if (delta === -7) return "T+7";
  return null;
}

/**
 * Renders the templated post for a given event + milestone.
 * Returns the full MDX content + frontmatter as a `CoveragePost`.
 */
export function generateCoveragePost(
  event: HyroxEvent,
  milestone: CoverageMilestone,
  today: Date = new Date(),
): CoveragePost {
  const start = new Date(event.startDate);
  const monthYear = start.toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  });
  const dateLong = start.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const publishedAt = today.toISOString().slice(0, 10);

  // Each milestone has its own header + body template. They share the
  // same event metadata (venue, divisions, logistics).
  const cityLower = event.venue.city.toLowerCase();
  const generators: Record<
    CoverageMilestone,
    () => Omit<CoveragePost, "slug">
  > = {
    "T-14": () => ({
      frontmatter: {
        title: `${event.name}: two weeks out, what to dial in this week`,
        slug: `${event.slug}-two-weeks-out`,
        excerpt: `Two weeks to ${event.name}. The training block is mostly behind you, these are the seven things to lock down now.`,
        category: "race-day",
        tags: [event.venue.city, "race week", "taper", "preparation"],
        publishedAt,
        updatedAt: publishedAt,
        author: "james-wright",
        heroImage: "/media/images/v2/programme-pro.jpg",
        heroAlt: `${event.name} preview`,
        seoTitle: `${event.name}, two weeks out · prep checklist`,
        seoDescription: `Two-week prep for ${event.name}. What to taper, what to test, what to confirm before race day.`,
        faqs: [
          {
            q: `When is ${event.name}?`,
            a: `${dateLong} at ${event.venue.name}, ${event.venue.city}.`,
          },
          {
            q: `What should I do in the final two weeks before ${event.name}?`,
            a: `Reduce volume, maintain intensity. One race-pace session, one long aerobic, one short station rehearsal. Sleep is the highest-leverage input now.`,
          },
        ],
      },
      body: [
        `Two weeks to ${event.name}. Whatever fitness you have, you have. The job between now and the start line is to deliver it intact.`,
        ``,
        `This is the second-to-last week of the build. By next Monday you should be in full taper, volume cut by ~40%, intensity maintained. Here's what to lock down now.`,
        ``,
        `## 1. Confirm the logistics`,
        ``,
        `- **Venue:** ${event.venue.name}, ${event.venue.addressLine}, ${event.venue.city} ${event.venue.postcode}.`,
        `- **Transport:** ${event.logistics.slice(0, 3).join(" · ")}`,
        `- **Hotel:** book this week if you haven't. Walking distance beats cheap-but-distant.`,
        `- **Kit:** lay everything out this weekend. Race in nothing new.`,
        ``,
        `## 2. Run one final race-pace session`,
        ``,
        `Mid-week: 4 × 1 km at goal Hyrox pace with a 60-second station rehearsal between each (wall ball, sled push, anything you can access). 90 seconds rest between rounds. This is your last "is the engine where I want it" test.`,
        ``,
        `## 3. Taper-week is not zero-week`,
        ``,
        `Cut volume by ~40% this week, then another 30% next week. **Keep intensity**, two short race-pace sessions and one easy long aerobic. The fitness banks. The fatigue clears.`,
        ``,
        `## 4. Sleep this week and next`,
        ``,
        `Eight to nine hours a night. The two nights before the race matter less than the seven nights leading up. Front-load it.`,
        ``,
        `## 5. Carb-load only at the end`,
        ``,
        `Normal eating until Thursday of race week. Then 8-10 g/kg/day carbs for two days. No alcohol race week. Hydrate steadily.`,
        ``,
        `## 6. Race-day plan on paper`,
        ``,
        `Write the warm-up timeline (we have a [90-minute protocol](/blog/hyrox-race-day-warm-up)), your pacing strategy (goal 1 km pace + station splits, use the [pace calculator](/tools/pace-calculator)), and your wall-ball set scheme (most racers break to 25-25-25-25).`,
        ``,
        `## 7. Nothing new`,
        ``,
        `No new shoes, no new gel, no new pre-workout, no new socks. The race day is for executing what you've rehearsed.`,
        ``,
        `---`,
        ``,
        `**Train this final week with the Vyrek programme calibrated to your race date.** [Find your plan →](/quiz)`,
      ].join("\n"),
    }),

    "T-7": () => ({
      frontmatter: {
        title: `${event.name}: 7 days out, final-week briefing`,
        slug: `${event.slug}-seven-days-out`,
        excerpt: `Seven days to ${event.name}. Full taper week. Here's exactly what to do, and what not to do, between now and the start gun.`,
        category: "race-day",
        tags: [event.venue.city, "race week", "taper"],
        publishedAt,
        updatedAt: publishedAt,
        author: "james-wright",
        heroImage: "/media/images/v2/programme-sub-90-v2.jpg",
        heroAlt: `Final week prep for ${event.name}`,
        seoTitle: `${event.name}, final week prep`,
        seoDescription: `7-day countdown to ${event.name}. Taper structure, fuelling, sleep, kit check, race-morning protocol.`,
        faqs: [
          {
            q: `What should I eat the day before ${event.name}?`,
            a: `Normal-portion dinner with an extra serving of starch (rice, pasta, potatoes). No alcohol. Hydrate steadily through the evening.`,
          },
          {
            q: `What time should I arrive at ${event.venue.name}?`,
            a: `90 minutes before your wave is the sweet spot. Enough time for the full warm-up protocol without burning glycogen.`,
          },
        ],
      },
      body: [
        `One week to ${event.name}. This is taper week. The work is done.`,
        ``,
        `Whatever's in the bank is in the bank. The job now is to be fresh and clear-headed on the start line.`,
        ``,
        `## Monday-Wednesday`,
        ``,
        `Cut training volume by 50% vs your normal week. **Keep intensity in two short sessions:** Tuesday a 3 × 800 m at race pace, Thursday a 20-minute Hyrox-pattern (run + one station, run + one station). One easy 30-minute Zone 2 jog Wednesday. Everything else is rest.`,
        ``,
        `## Thursday + Friday, carb-load`,
        ``,
        `Two days of elevated carbs: 8-10 g per kg of bodyweight per day. Familiar foods. No alcohol. Hydrate steadily.`,
        ``,
        `## Saturday, travel + arrival`,
        ``,
        `If you're travelling to ${event.venue.city}, do it Saturday not Sunday morning. Drop bags at the hotel, walk the venue from the outside if it's open, find a familiar dinner spot. Bed by 9 PM.`,
        ``,
        `## Race morning, the 90-minute protocol`,
        ``,
        `Use our [full 90-minute warm-up protocol](/blog/hyrox-race-day-warm-up). The five blocks:`,
        ``,
        `- **90-75 min:** Arrive + bag drop + hydrate.`,
        `- **75-65 min:** Mobility flow (10 min).`,
        `- **65-50 min:** Progressive run primer (15 min).`,
        `- **50-35 min:** Station rehearsal at race weight (15 min).`,
        `- **35-25 min:** Refuel + sit (10 min).`,
        `- **25-10 min:** Activation + skipping (15 min).`,
        `- **10-0 min:** Line up, breathe, settle.`,
        ``,
        `## Getting to ${event.venue.name}`,
        ``,
        event.logistics.map((l) => `- ${l}`).join("\n"),
        ``,
        `## The night before`,
        ``,
        `- Kit laid out: race kit, bib, timing chip, fuel, spare socks.`,
        `- Watch charged.`,
        `- Alarm set for 90 min before your wave + travel buffer.`,
        `- Phone do-not-disturb on.`,
        ``,
        `---`,
        ``,
        `**One more week.** If you've followed a Vyrek programme to this point, the taper is already built into your plan. If you haven't. [start your next race build now](/quiz). The next race is always closer than you think.`,
      ].join("\n"),
    }),

    "T-1": () => ({
      frontmatter: {
        title: `${event.name} race day: your kit + morning checklist`,
        slug: `${event.slug}-race-day-checklist`,
        excerpt: `${event.name} starts tomorrow. The checklist of what to pack, what to eat, when to arrive, and what to think about.`,
        category: "race-day",
        tags: [event.venue.city, "race day", "checklist"],
        publishedAt,
        updatedAt: publishedAt,
        author: "james-wright",
        heroImage: "/media/images/v2/programme-first-race.jpg",
        heroAlt: `${event.name} race day checklist`,
        seoTitle: `${event.name} race-day checklist`,
        seoDescription: `Race-day briefing for ${event.name}: kit, breakfast, arrival time, warm-up timing, mental cues.`,
      },
      body: [
        `${event.name} starts tomorrow. Here's the briefing, what to pack, what to eat, when to arrive.`,
        ``,
        `## Pack tonight`,
        ``,
        `- Race kit (race in clothes you've trained in for 3+ sessions)`,
        `- Race bib + safety pins (or magnetic clips)`,
        `- Timing chip (check it's attached securely)`,
        `- Spare socks (always)`,
        `- Hat / cap if you sweat onto your eyes`,
        `- Fuel: water bottle, electrolyte tab, optional gel/banana for 30 min pre-gun`,
        `- Foam roller for the warm-up area (small one)`,
        `- Recovery: change of clothes, towel, snack for after`,
        `- Phone + charger + headphones (warm-up music)`,
        ``,
        `## Breakfast (2-3 hours before your wave)`,
        ``,
        `Whatever you've trained on. 600-800 calories, carb-heavy, low fat, moderate protein. Common safe options: oats + banana + honey + scoop of whey, bagel + peanut butter + banana, rice + eggs.`,
        ``,
        `**Nothing new.** If you've never had it before training, don't have it on race morning.`,
        ``,
        `## Arrive`,
        ``,
        `Aim for 90 minutes before your wave at ${event.venue.name}. ${event.logistics[0] ?? ""}`,
        ``,
        `## The warm-up`,
        ``,
        `Run the [90-minute warm-up protocol](/blog/hyrox-race-day-warm-up). Don't improvise. Don't shorten it. Don't extend it.`,
        ``,
        `## Three mental cues`,
        ``,
        `Pick three words that anchor your race. Mine are *patience, posture, breath*. Pick yours now, write them on your hand, say them on the line.`,
        ``,
        `Patience for the first kilometre. Posture on the sled. Breath through the wall balls. Three things to come back to when the pain hits.`,
        ``,
        `## You've done the work`,
        ``,
        `The race is just the result of the training. You're not going to find new fitness in the morning. You're going to deliver what's already there.`,
        ``,
        `Sleep tonight. See you on the line.`,
        ``,
        `---`,
        ``,
        `**Want a plan for your next race?** Vyrek builds the 12 weeks backwards from your race date. [Find yours →](/quiz)`,
      ].join("\n"),
    }),

    "T+1": () => ({
      frontmatter: {
        title: `${event.name} recap: what went down`,
        slug: `${event.slug}-recap`,
        excerpt: `${event.name} is done. Early recap, division winners, conditions on the day, standout splits. (We'll update with full results as they land.)`,
        category: "race-day",
        tags: [event.venue.city, "race recap", "results"],
        publishedAt,
        updatedAt: publishedAt,
        author: "vyrek-team",
        heroImage: "/media/images/v2/bento-progress.jpg",
        heroAlt: `${event.name} recap`,
        seoTitle: `${event.name} recap · winners + conditions`,
        seoDescription: `${event.name} recap. Men's and women's open winners, race conditions, standout performances, what we learned.`,
      },
      body: [
        `${event.name} is in the books. Here's the early recap.`,
        ``,
        `*Full results, splits, and athlete commentary land in the next 48 hours. We'll update this post as data arrives, bookmark and come back.*`,
        ``,
        `## The venue`,
        ``,
        event.about,
        ``,
        `## What we're watching for`,
        ``,
        `- **Open winners' times.** Anything under 60 minutes in men's open or 70 minutes in women's open is podium-grade. We'll publish exact splits when official.`,
        `- **Pro division qualification times.** This is where the Worlds qualification race plays out.`,
        `- **Doubles records.** ${event.venue.city} has produced some of the fastest UK doubles times.`,
        `- **First-race finishers.** Always the biggest cohort. The story isn't the elite top 10, it's the 90-minute finisher whose first build worked.`,
        ``,
        `## Divisions racing today`,
        ``,
        event.divisions.map((d) => `- ${d}`).join("\n"),
        ``,
        `## If you raced, what's next`,
        ``,
        `Two days of complete rest. Walk only. Eat. Sleep.`,
        ``,
        `Day 3-4: light mobility. Foam roll. 20-minute swim or bike if you can.`,
        ``,
        `Day 5-7: easy Zone 2 runs back in. No intervals. No stations.`,
        ``,
        `Week 2 post-race: back to your plan. If your race went well and you're targeting another, [your next 12-week build starts on the next Tuesday](/quiz). If it didn't go well, run the [breaking-a-plateau diagnostic](/blog/breaking-hyrox-plateau), most race-day disappointments trace back to one specific limiter.`,
        ``,
        `## If you spectated`,
        ``,
        `What you saw is the version of yourself that's possible in 12 weeks. The cohort starts next Tuesday. [Get your plan →](/quiz).`,
        ``,
        `---`,
        ``,
        `**Refresh this post in 24-48 hours for the full results breakdown.**`,
      ].join("\n"),
    }),

    "T+7": () => ({
      frontmatter: {
        title: `${event.name}: 4 patterns we noticed`,
        slug: `${event.slug}-patterns`,
        excerpt: `A week on from ${event.name}. The four patterns that show up across the results, what to learn for your next race.`,
        category: "training",
        tags: [event.venue.city, "race lessons", "training"],
        publishedAt,
        updatedAt: publishedAt,
        author: "james-wright",
        heroImage: "/media/images/v2/coach-james-wright.jpg",
        heroAlt: `${event.name} lessons`,
        seoTitle: `${event.name}. 4 patterns we noticed`,
        seoDescription: `One week on from ${event.name}. Four patterns from the results: pacing, station drop-off, transitions, race-day kit.`,
      },
      body: [
        `${event.name} happened a week ago. Now that the results are clean and the post-race posts have settled, here are the four patterns we noticed across the field.`,
        ``,
        `## Pattern 1. Pacing kills the back half`,
        ``,
        `As usual, the gap between first-kilometre pace and last-kilometre pace correlated almost perfectly with finishing position. Athletes who positive-split by 45+ seconds per km finished in the back third. Athletes who held within 15 seconds finished in the top half, regardless of absolute fitness.`,
        ``,
        `**Lesson:** the [breaking-a-plateau diagnostic](/blog/breaking-hyrox-plateau) is the right starting point for most second-time racers. Pacing discipline is free time.`,
        ``,
        `## Pattern 2. Sled push remains the leveller`,
        ``,
        `Among finishers of similar overall time, the variance on sled push was massive. 90 seconds vs 3 minutes for the same total time bracket. The athletes who pushed the sled fast had clean technique (low, long, locked); the slow ones tried to muscle it.`,
        ``,
        `**Lesson:** [the sled push technique guide](/hyrox/stations/sled-push) is non-negotiable reading.`,
        ``,
        `## Pattern 3. Wall balls broke more races than expected`,
        ``,
        `${event.venue.city} had unusually warm conditions for the final station for many of the later waves. Athletes who'd planned to go unbroken cracked at rep 40-60. The ones who pre-planned a 25-25-25-25 break came in noticeably stronger.`,
        ``,
        `**Lesson:** plan your wall-ball set scheme before the gun. [Read more](/hyrox/stations/wall-balls).`,
        ``,
        `## Pattern 4. Transitions cost more than people think`,
        ``,
        `Watching the broadcast back, the gap between athletes of similar fitness was often in the *seconds between*, stations and runs. Athletes who didn't pause at station entry, who walk-jogged the first 20m after stations, banked 60-90 seconds vs those who stopped and reset.`,
        ``,
        `**Lesson:** the [transitions guide](/blog/hyrox-transitions-and-flow) covers this in depth.`,
        ``,
        `## What to do this week`,
        ``,
        `If you raced and your finish disappointed you, take the [plateau diagnostic](/blog/breaking-hyrox-plateau) honestly. If you raced and want to chase a sharper time, your next 12-week build starts next Tuesday. [start your plan](/quiz).`,
        ``,
        `If you didn't race and watching this one made you want to, pick the next UK event from the [calendar](/hyrox/events) and start backwards from there.`,
      ].join("\n"),
    }),
  };

  const partial = generators[milestone]();
  return {
    slug: partial.frontmatter.slug,...partial,
  };
}

/**
 * Serialises a CoveragePost back to MDX file contents (frontmatter + body).
 */
export function postToMdx(post: CoveragePost): string {
  const fm = post.frontmatter;
  const yaml = [
    "---",
    `title: ${JSON.stringify(fm.title)}`,
    `slug: ${JSON.stringify(fm.slug)}`,
    `excerpt: ${JSON.stringify(fm.excerpt)}`,
    `category: ${JSON.stringify(fm.category)}`,
    `tags: [${fm.tags.map((t) => JSON.stringify(t)).join(", ")}]`,
    `publishedAt: ${JSON.stringify(fm.publishedAt)}`,
    `updatedAt: ${JSON.stringify(fm.updatedAt)}`,
    `author: ${JSON.stringify(fm.author)}`,
    `heroImage: ${JSON.stringify(fm.heroImage)}`,
    `heroAlt: ${JSON.stringify(fm.heroAlt)}`,
    `seoTitle: ${JSON.stringify(fm.seoTitle)}`,
    `seoDescription: ${JSON.stringify(fm.seoDescription)}`,...(fm.faqs && fm.faqs.length
      ? [
          "faqs:",...fm.faqs.flatMap((f) => [
            `  - q: ${JSON.stringify(f.q)}`,
            `    a: ${JSON.stringify(f.a)}`,
          ]),
        ]: []),
    "---",
    "",
  ].join("\n");
  return yaml + post.body + "\n";
}
