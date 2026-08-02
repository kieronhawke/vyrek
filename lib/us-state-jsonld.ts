import { siteUrl } from "@/lib/blog/urls";
import { stateCopy, type StateVariant } from "@/components/landing/us-state-page";
import { gymCount, type UsState } from "@/lib/us-states";

/**
 * Structured data for a US state page.
 *
 * `areaServed` is an AdministrativeArea rather than a City, because the page
 * is genuinely about the state and claiming otherwise would misdescribe it.
 * The FAQ mirrors what renders — emitting FAQPage markup for questions a
 * reader cannot see on the page is the thing Google's guidance singles out.
 */
export function stateServiceJsonLd(variant: StateVariant, s: UsState) {
  const base = variant === "hyrox" ? "/hyrox-training" : "/personal-trainer";
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name:
      variant === "hyrox"
        ? `Hyrox coaching in ${s.name}`
        : `Online personal training in ${s.name}`,
    serviceType: variant === "hyrox" ? "Hyrox coaching" : "Personal training",
    url: `${siteUrl()}${base}/state/${s.slug}`,
    areaServed: {
      "@type": "AdministrativeArea",
      name: s.name,
      containedInPlace: { "@type": "Country", name: "United States" },
    },
    provider: {
      "@type": "Organization",
      name: "Suth Performance",
      url: siteUrl(),
      founder: { "@type": "Person", name: "Ben Sutherland" },
    },
    availableChannel: {
      "@type": "ServiceChannel",
      serviceUrl: `${siteUrl()}/quiz`,
      availableLanguage: "en",
    },
  };
}

export function stateFaqJsonLd(variant: StateVariant, s: UsState) {
  const c = stateCopy(variant, s);
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

export function stateBreadcrumbJsonLd(variant: StateVariant, s: UsState) {
  const base = variant === "hyrox" ? "/hyrox-training" : "/personal-trainer";
  const label = variant === "hyrox" ? "Hyrox training" : "Personal training";
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: siteUrl() },
      { "@type": "ListItem", position: 2, name: label, item: `${siteUrl()}${base}` },
      {
        "@type": "ListItem",
        position: 3,
        name: "United States",
        item: `${siteUrl()}${base}/country/usa`,
      },
      {
        "@type": "ListItem",
        position: 4,
        name: s.name,
        item: `${siteUrl()}${base}/state/${s.slug}`,
      },
    ],
  };
}

/** Used in the meta description, which has to differ page to page. */
export function stateDescription(variant: StateVariant, s: UsState): string {
  const gyms = gymCount(s);
  const where = s.races.length
    ? `${s.name} hosts ${s.races.length === 1 ? "a HYROX race" : `${s.races.length} HYROX races`}`
    : s.nearestRace
      ? `Nearest race: ${s.nearestRace.city}, ${s.nearestRace.straightLineKm.toLocaleString("en-GB")} km away`
      : "";
  const kind = variant === "hyrox" ? "Hyrox training" : "Online personal training";
  return [
    `${kind} in ${s.name} from HYROX Elite 15 athlete Ben Sutherland.`,
    where ? `${where}.` : "",
    gyms ? `Built around any of the ${gyms} gyms we list across the state's biggest metros.` : "",
    "Free consultation, no commitment.",
  ]
    .filter(Boolean)
    .join(" ");
}
