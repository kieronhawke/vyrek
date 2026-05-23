/**
 * UK Hyrox race events. Drives the /hyrox/events/[slug] programmatic pages
 * with full Event schema (a moat, competitors emit zero Event JSON-LD).
 *
 * Dates are placeholder approximations based on the 2024-26 calendar
 * cadence (each major UK venue typically gets one event per season).
 * Should be reviewed annually as Hyrox releases its real schedule.
 */

export type HyroxEvent = {
  slug: string;
  /** Display name, e.g. "Hyrox London. March 2026". */
  name: string;
  /** Short eyebrow, e.g. "London · ExCeL". */
  eyebrow: string;
  /** ISO date (start). */
  startDate: string;
  /** ISO date (end, usually one day later for two-day race weekend). */
  endDate: string;
  /** Venue identity. */
  venue: {
    name: string;
    addressLine: string;
    city: string;
    postcode: string;
    region: string;
    countryCode: "GB";
    googleMapsUrl?: string;
  };
  /** One paragraph venue intro. */
  about: string;
  /** Transport notes, tube/train/car, parking, hotels. */
  logistics: string[];
  /** Divisions running at this event. */
  divisions: string[];
  /** Suggested 12-week-prior prep period helper text. */
  prepWindow: string;
  /** Local FAQs. */
  faqs: { q: string; a: string }[];
  /** Marks past events, sets eventStatus and disables future-tense copy. */
  past?: boolean;
};

export const HYROX_EVENTS: HyroxEvent[] = [
  {
    slug: "london-excel-march-2026",
    name: "Hyrox London. March 2026",
    eyebrow: "London · ExCeL",
    startDate: "2026-03-21",
    endDate: "2026-03-22",
    venue: {
      name: "ExCeL London",
      addressLine: "Royal Victoria Dock, 1 Western Gateway",
      city: "London",
      postcode: "E16 1XL",
      region: "Greater London",
      countryCode: "GB",
      googleMapsUrl: "https://maps.google.com/?q=ExCeL+London",
    },
    about:
      "Hyrox London at ExCeL is the UK's flagship event. The DLR drops you at Custom House for ExCeL, two minutes from the entrance. Expect 4,000-6,000 athletes across the weekend.",
    logistics: [
      "DLR: Custom House for ExCeL or Prince Regent are both 2-3 min walk.",
      "Elizabeth Line: Custom House station is direct from central London.",
      "Parking: ExCeL has paid parking on-site (book ahead, sells out for race weekends).",
      "Hotels: Aloft, Crowne Plaza, and Sunborn are walking distance. Hotels in Canary Wharf are 10 min by DLR.",
      "Bag drop opens 90 min before your wave; warm-up area is upstairs from check-in.",
    ],
    divisions: [
      "Open (men's / women's)",
      "Pro (men's / women's)",
      "Doubles (men's / women's / mixed)",
      "Relay (mixed 4)",
      "Masters (40-44, 45-49, 50-54, 55-59, 60+)",
    ],
    prepWindow:
      "12-week race build starts the week of 28 December 2025. Vyrek programmes auto-calibrate to this date.",
    faqs: [
      {
        q: "How do I get to ExCeL for Hyrox London?",
        a: "The DLR (Custom House or Prince Regent) is the fastest route from central London, both stations are a 2-3 minute walk from the venue entrance. The Elizabeth Line also stops at Custom House. Driving is possible but parking sells out for race weekends.",
      },
      {
        q: "What hotels are near Hyrox London ExCeL?",
        a: "The Aloft London ExCeL, Crowne Plaza Docklands, and Sunborn Yacht Hotel are all walking distance from the venue. Hotels in Canary Wharf are 10-15 minutes by DLR and often cheaper.",
      },
      {
        q: "When should I start training for Hyrox London March 2026?",
        a: "A 12-week build means starting the week of 28 December 2025. A 16-week build for total beginners means starting late November. Vyrek programmes auto-calibrate to your chosen race date.",
      },
    ],
  },
  {
    slug: "manchester-central-april-2026",
    name: "Hyrox Manchester. April 2026",
    eyebrow: "Manchester · Central",
    startDate: "2026-04-18",
    endDate: "2026-04-19",
    venue: {
      name: "Manchester Central",
      addressLine: "Petersfield",
      city: "Manchester",
      postcode: "M2 3GX",
      region: "North West",
      countryCode: "GB",
      googleMapsUrl: "https://maps.google.com/?q=Manchester+Central",
    },
    about:
      "Manchester Central is the Northern Hyrox flagship. 5 minutes from Piccadilly station, walking distance from most city-centre hotels. Strong local community of athletes from Manchester, Leeds, Liverpool, and surrounding areas.",
    logistics: [
      "Train: Manchester Piccadilly is 10 min walk; Oxford Road is 5 min.",
      "Tram: St Peter's Square is the closest stop, 3 min walk.",
      "Parking: Multiple NCP car parks within 5 min walk (book ahead).",
      "Hotels: Premier Inn Deansgate, Hilton Deansgate, and Crowne Plaza are walking distance.",
      "Easy weekend trip from Liverpool, Leeds, Sheffield, Birmingham via the M62/M6.",
    ],
    divisions: [
      "Open (men's / women's)",
      "Pro (men's / women's)",
      "Doubles (men's / women's / mixed)",
      "Masters (40+)",
    ],
    prepWindow: "12-week build starts the week of 25 January 2026.",
    faqs: [
      {
        q: "How do I get to Manchester Central for Hyrox?",
        a: "Manchester Piccadilly is a 10-minute walk; the Metrolink stops at St Peter's Square (3-min walk). Driving is fine but parking on race weekend sells fast, book an NCP space ahead.",
      },
      {
        q: "Is Hyrox Manchester busier than London?",
        a: "Smaller field but identical race standards. Manchester typically runs 2,500-3,500 athletes vs ExCeL's 4,000-6,000. The vibe is more local-club, less corporate-event.",
      },
    ],
  },
  {
    slug: "birmingham-nec-october-2026",
    name: "Hyrox Birmingham. October 2026",
    eyebrow: "Birmingham · NEC",
    startDate: "2026-10-17",
    endDate: "2026-10-18",
    venue: {
      name: "NEC Birmingham",
      addressLine: "North Avenue, Marston Green",
      city: "Birmingham",
      postcode: "B40 1NT",
      region: "West Midlands",
      countryCode: "GB",
      googleMapsUrl: "https://maps.google.com/?q=NEC+Birmingham",
    },
    about:
      "The NEC is the Midlands Hyrox home. Easy train access via Birmingham International (5 min walk from the NEC), and a 90-minute drive from anywhere in the Midlands corridor. Strong catchment from Coventry, Leicester, Nottingham, Derby, Wolverhampton.",
    logistics: [
      "Train: Birmingham International station is a 5-minute walk; direct trains from London Euston (~75 min).",
      "Driving: 5 min off the M42, then the dedicated NEC slip road.",
      "Parking: Huge on-site car parks; book in advance via the NEC site.",
      "Hotels: Hilton Birmingham Metropole, Crowne Plaza NEC, and Premier Inn NEC are walking distance.",
      "Birmingham Airport is across the road if you're flying in.",
    ],
    divisions: [
      "Open (men's / women's)",
      "Pro (men's / women's)",
      "Doubles (men's / women's / mixed)",
      "Relay",
    ],
    prepWindow: "12-week build starts the week of 26 July 2026.",
    faqs: [
      {
        q: "Is the NEC easy to get to for Hyrox?",
        a: "Yes. Birmingham International rail station is a 5-min walk from the venue (direct trains from London Euston in ~75 min), and the M42 is right outside. Parking is plentiful but book ahead.",
      },
    ],
  },
  {
    slug: "glasgow-ovo-november-2026",
    name: "Hyrox Glasgow. November 2026",
    eyebrow: "Glasgow · OVO Hydro",
    startDate: "2026-11-14",
    endDate: "2026-11-15",
    venue: {
      name: "OVO Hydro",
      addressLine: "Exhibition Way",
      city: "Glasgow",
      postcode: "G3 8YW",
      region: "Scotland",
      countryCode: "GB",
      googleMapsUrl: "https://maps.google.com/?q=OVO+Hydro+Glasgow",
    },
    about:
      "The OVO Hydro is the Scottish Hyrox flagship, a 12,500-capacity arena right on the Clyde, 10 min from Glasgow Central. Natural home for Scottish athletes plus a strong contingent travelling up from Newcastle, Edinburgh, and the Borders.",
    logistics: [
      "Train: Glasgow Exhibition Centre station is on-site (5 min walk).",
      "Glasgow Central is 15 min walk along the Clyde or a short taxi.",
      "Parking: SECC car parks on-site.",
      "Hotels: Crowne Plaza Glasgow and Radisson RED are walking distance.",
      "Easy from Edinburgh (50 min by train) and Stirling/Perth.",
    ],
    divisions: [
      "Open (men's / women's)",
      "Pro (men's / women's)",
      "Doubles (men's / women's / mixed)",
    ],
    prepWindow: "12-week build starts the week of 23 August 2026.",
    faqs: [
      {
        q: "When is Hyrox Glasgow 2026?",
        a: "The expected race weekend is 14-15 November 2026 at the OVO Hydro. Hyrox typically confirms dates 6-9 months in advance, check the official Hyrox calendar for final confirmation.",
      },
    ],
  },
];

export function getEvent(slug: string): HyroxEvent | undefined {
  return HYROX_EVENTS.find((e) => e.slug === slug);
}

export function listEventSlugs(): string[] {
  return HYROX_EVENTS.map((e) => e.slug);
}
