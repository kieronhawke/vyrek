/**
 * JSON-LD for the Results section.
 *
 * One module so every page emits consistent, valid structured data rather than
 * each template inventing its own shape. Google is strict about
 * `SportsEvent`, `Person` and `BreadcrumbList`; a malformed block is worse
 * than none, because it earns a Search Console error instead of a rich result.
 *
 * What each type buys us:
 *
 * - `BreadcrumbList` — the breadcrumb trail in the SERP instead of a raw URL.
 *   Cheap, universally supported, and it works on every page here.
 * - `SportsEvent` — event pages become eligible for the events treatment.
 * - `Person` — athlete pages become entities rather than strings, which is what
 *   lets a name search surface the profile.
 * - `Dataset` — ranking pages are genuinely datasets, and Google's dataset
 *   handling is a route to visibility almost nobody in this space uses.
 * - `FAQPage` — only where a real FAQ exists on the page.
 *
 * Every builder takes an absolute site URL, because relative `@id` values are
 * ignored and a wrong one silently poisons the graph.
 */

export type Breadcrumb = { name: string; path: string };

/** The trail. Always ends on the current page, which must not be a link. */
export function breadcrumbList(site: string, trail: Breadcrumb[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((crumb, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: crumb.name,
      // The last item carries no `item`: it is the page you are on, and
      // linking it to itself is what triggers "invalid item" warnings.
      ...(i < trail.length - 1 ? { item: `${site}${crumb.path}` } : {}),
    })),
  };
}

export function sportsEvent(site: string, event: {
  slug: string;
  name: string;
  city: string;
  country: string;
  venue: string;
  startDate: string;
  endDate: string;
  status: string;
  totalAthletes: number;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "SportsEvent",
    "@id": `${site}/event/${event.slug}#event`,
    name: event.name,
    url: `${site}/event/${event.slug}`,
    sport: "HYROX",
    // Omitted rather than sent empty: an empty startDate is a validation error,
    // and the ingested catalogue does not always carry one.
    ...(event.startDate ? { startDate: event.startDate } : {}),
    ...(event.endDate ? { endDate: event.endDate } : {}),
    eventStatus: event.status === "upcoming"
      ? "https://schema.org/EventScheduled"
      : "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    ...(event.venue || event.city
      ? {
          location: {
            "@type": "Place",
            name: event.venue || event.city,
            address: {
              "@type": "PostalAddress",
              ...(event.city ? { addressLocality: event.city } : {}),
              ...(event.country ? { addressCountry: event.country } : {}),
            },
          },
        }
      : {}),
    ...(event.totalAthletes > 0
      ? { maximumAttendeeCapacity: event.totalAthletes }
      : {}),
    organizer: { "@type": "Organization", name: "HYROX", url: "https://hyrox.com" },
  };
}

export function athletePerson(site: string, athlete: {
  slug: string;
  name: string;
  countryIso: string;
  races: number;
  pbSeconds: number | null;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    "@id": `${site}/athlete/${athlete.slug}#person`,
    name: athlete.name,
    url: `${site}/athlete/${athlete.slug}`,
    ...(athlete.countryIso ? { nationality: athlete.countryIso.toUpperCase() } : {}),
    // `subjectOf` ties the person to the page describing them, which is what
    // stops the entity floating free of its evidence.
    subjectOf: {
      "@type": "WebPage",
      "@id": `${site}/athlete/${athlete.slug}`,
      name: `${athlete.name}: HYROX results and race history`,
    },
  };
}

/**
 * A ranking is a dataset, and saying so is a genuine opportunity: dataset
 * results are a supported rich-result type and nobody in this space emits them.
 */
export function rankingDataset(site: string, ranking: {
  slug: string;
  eventName: string;
  divisionLabel: string;
  fieldSize: number;
  date: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Dataset",
    "@id": `${site}/ranking/${ranking.slug}#dataset`,
    name: `${ranking.eventName} ${ranking.divisionLabel.replace("HYROX ", "")} results`,
    description:
      `Full ${ranking.divisionLabel.replace("HYROX ", "")} results from ${ranking.eventName}: `
      + `${ranking.fieldSize.toLocaleString("en-GB")} finishers with finish times, `
      + `age-group ranks, gaps to the leader and station-by-station splits.`,
    url: `${site}/ranking/${ranking.slug}`,
    ...(ranking.date ? { temporalCoverage: ranking.date } : {}),
    creator: { "@type": "Organization", name: "Suth Performance", url: site },
    isAccessibleForFree: true,
    // The CSV the page actually offers. Claiming a distribution that does not
    // exist is the fastest way to lose dataset eligibility.
    distribution: {
      "@type": "DataDownload",
      encodingFormat: "text/csv",
      contentUrl: `${site}/ranking/${ranking.slug}`,
    },
  };
}

export function faqPage(faqs: { q: string; a: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.q,
      acceptedAnswer: { "@type": "Answer", text: faq.a },
    })),
  };
}

/** Serialises safely for a `<script type="application/ld+json">` block. */
export function jsonLd(data: unknown): string {
  // `<` is escaped so a name containing markup cannot break out of the script
  // element. Nothing here is attacker-controlled today, but athlete names come
  // from an external feed and will be one day.
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
