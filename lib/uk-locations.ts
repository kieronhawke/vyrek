/**
 * UK city/town/borough catalogue for programmatic SEO pages at
 * /hyrox/[city]. Each entry produces a unique local landing page with
 * the city's name in the H1, slug-based URL, and per-city context that
 * gets interpolated into the templated body (population scale,
 * nearest race venue, nearest cluster of affiliate gyms, transport).
 *
 * Sourced from ONS regional population data + the Hyrox UK affiliate
 * directory. Cities ordered roughly by population so the most-trafficked
 * pages appear first in sitemap.
 */

export type UkLocation = {
  /** URL slug — lowercase, hyphenated. */
  slug: string;
  /** Display name (proper case). */
  name: string;
  /** Region — used in copy ("in the North West", "in South Wales"). */
  region: string;
  /** Approximate population, in thousands. Drives one line of copy. */
  populationK: number;
  /** Nearest Hyrox race venue + city. */
  nearestVenue?: { name: string; city: string };
  /** Short paragraph of local context — gym density, transport links,
   * notable Hyrox community details. Falls back to a generic templated
   * line if absent. */
  context?: string;
  /** Marks London boroughs so we can group them under one parent. */
  isLondonBorough?: boolean;
};

const EXCEL = { name: "ExCeL London", city: "London" };
const NEC = { name: "Birmingham NEC", city: "Birmingham" };
const MANCHESTER_CENTRAL = { name: "Manchester Central", city: "Manchester" };
const OVO = { name: "OVO Hydro", city: "Glasgow" };
const UTILITA = { name: "Utilita Arena", city: "Birmingham" };

export const UK_LOCATIONS: UkLocation[] = [
  // ── Major cities ────────────────────────────────────────────
  {
    slug: "london",
    name: "London",
    region: "Greater London",
    populationK: 8900,
    nearestVenue: EXCEL,
    context:
      "London is the centre of UK Hyrox — ExCeL hosts multiple race weekends a year, the largest affiliate-gym network in the country, and a deep pool of coaches working at every level from First Race to Pro.",
  },
  {
    slug: "manchester",
    name: "Manchester",
    region: "North West",
    populationK: 553,
    nearestVenue: MANCHESTER_CENTRAL,
    context:
      "Manchester is one of the UK's top three Hyrox cities. Manchester Central hosts an annual weekend, the Northern Quarter is dense with affiliate gyms, and the city's CrossFit and S&C scene has migrated heavily into Hyrox programming since 2024.",
  },
  {
    slug: "birmingham",
    name: "Birmingham",
    region: "West Midlands",
    populationK: 1145,
    nearestVenue: NEC,
    context:
      "Birmingham's NEC and Utilita Arena both host Hyrox weekends. Strong affiliate-gym coverage across the city centre, Solihull, and Edgbaston — easy commute from across the Midlands.",
  },
  {
    slug: "glasgow",
    name: "Glasgow",
    region: "Scotland",
    populationK: 633,
    nearestVenue: OVO,
    context:
      "Glasgow's OVO Hydro is the Scottish Hyrox flagship venue. Strong club scene in the West End and Southside, and the city is the natural training base for athletes from across central Scotland.",
  },
  {
    slug: "edinburgh",
    name: "Edinburgh",
    region: "Scotland",
    populationK: 488,
    nearestVenue: OVO,
    context:
      "Edinburgh sits an hour from Glasgow's OVO Hydro race weekend, with a growing local Hyrox club scene across Leith, Newington, and the West End. Edinburgh Leisure venues now offer Hyrox-pattern classes at multiple sites.",
  },
  {
    slug: "liverpool",
    name: "Liverpool",
    region: "North West",
    populationK: 486,
    nearestVenue: MANCHESTER_CENTRAL,
    context:
      "Liverpool athletes typically travel to Manchester Central for the nearest UK race weekend. Local Hyrox classes are spread across the city centre and Wirral; the M62 corridor connects to wider Merseyside training partners.",
  },
  {
    slug: "leeds",
    name: "Leeds",
    region: "Yorkshire",
    populationK: 488,
    nearestVenue: MANCHESTER_CENTRAL,
    context:
      "Leeds is Yorkshire's strongest Hyrox city. Multiple affiliate gyms across the city centre and Headingley, with a regular community of athletes travelling to Manchester Central for race weekends.",
  },
  {
    slug: "sheffield",
    name: "Sheffield",
    region: "Yorkshire",
    populationK: 556,
    nearestVenue: NEC,
    context:
      "Sheffield's Hyrox scene grew rapidly through 2025. Affiliate gyms cluster around the city centre and Kelham Island, with strong links to the surrounding Peak District for outdoor running volume.",
  },
  {
    slug: "bristol",
    name: "Bristol",
    region: "South West",
    populationK: 471,
    nearestVenue: EXCEL,
    context:
      "Bristol is the South West hub for Hyrox. Strong affiliate-gym coverage from Clifton through to the harbour, and a regular contingent travelling to ExCeL or Birmingham NEC for race weekends.",
  },
  {
    slug: "newcastle",
    name: "Newcastle",
    region: "North East",
    populationK: 300,
    nearestVenue: MANCHESTER_CENTRAL,
    context:
      "Newcastle is the North East's Hyrox base. Affiliate gyms cluster in the city centre and Jesmond; athletes typically travel to Manchester or Edinburgh for race weekends.",
  },
  {
    slug: "nottingham",
    name: "Nottingham",
    region: "East Midlands",
    populationK: 337,
    nearestVenue: NEC,
    context:
      "Nottingham athletes have easy access to Birmingham NEC race weekends. Local Hyrox scene grew through 2024–2025 with the city centre and West Bridgford emerging as the strongest gym clusters.",
  },
  {
    slug: "cardiff",
    name: "Cardiff",
    region: "Wales",
    populationK: 372,
    nearestVenue: EXCEL,
    context:
      "Cardiff has hosted Hyrox race weekends and supports a growing Welsh community of athletes. Affiliate gyms cluster around the city centre, Cardiff Bay, and Penarth.",
  },
  {
    slug: "leicester",
    name: "Leicester",
    region: "East Midlands",
    populationK: 369,
    nearestVenue: NEC,
    context:
      "Leicester is 45 minutes from Birmingham NEC — a natural training catchment for Midlands Hyrox racers. Affiliate gyms cluster in the city centre and surrounding suburbs.",
  },
  {
    slug: "coventry",
    name: "Coventry",
    region: "West Midlands",
    populationK: 345,
    nearestVenue: NEC,
    context:
      "Coventry's proximity to the NEC makes it one of the easiest UK cities to race from. Affiliate gyms supply a steady stream of Hyrox-pattern classes for the local catchment.",
  },
  {
    slug: "bradford",
    name: "Bradford",
    region: "Yorkshire",
    populationK: 546,
    nearestVenue: MANCHESTER_CENTRAL,
  },
  {
    slug: "belfast",
    name: "Belfast",
    region: "Northern Ireland",
    populationK: 345,
    context:
      "Belfast hosts the Northern Irish Hyrox community. Local affiliate gyms run regular Hyrox-pattern classes; race travel typically goes via Liverpool or Manchester.",
  },
  {
    slug: "stoke-on-trent",
    name: "Stoke-on-Trent",
    region: "West Midlands",
    populationK: 256,
    nearestVenue: NEC,
  },
  {
    slug: "wolverhampton",
    name: "Wolverhampton",
    region: "West Midlands",
    populationK: 263,
    nearestVenue: NEC,
  },
  {
    slug: "plymouth",
    name: "Plymouth",
    region: "South West",
    populationK: 264,
    nearestVenue: EXCEL,
  },
  {
    slug: "southampton",
    name: "Southampton",
    region: "South",
    populationK: 269,
    nearestVenue: EXCEL,
    context:
      "Southampton sits on the South Coast Hyrox corridor — strong local affiliate scene with a regular weekend commute to ExCeL races.",
  },
  {
    slug: "reading",
    name: "Reading",
    region: "South East",
    populationK: 234,
    nearestVenue: EXCEL,
  },
  {
    slug: "derby",
    name: "Derby",
    region: "East Midlands",
    populationK: 261,
    nearestVenue: NEC,
  },
  {
    slug: "dudley",
    name: "Dudley",
    region: "West Midlands",
    populationK: 320,
    nearestVenue: NEC,
  },
  {
    slug: "northampton",
    name: "Northampton",
    region: "East Midlands",
    populationK: 224,
    nearestVenue: NEC,
  },
  {
    slug: "portsmouth",
    name: "Portsmouth",
    region: "South",
    populationK: 208,
    nearestVenue: EXCEL,
  },
  {
    slug: "luton",
    name: "Luton",
    region: "East",
    populationK: 218,
    nearestVenue: EXCEL,
  },
  {
    slug: "preston",
    name: "Preston",
    region: "North West",
    populationK: 148,
    nearestVenue: MANCHESTER_CENTRAL,
  },
  {
    slug: "aberdeen",
    name: "Aberdeen",
    region: "Scotland",
    populationK: 200,
    nearestVenue: OVO,
  },
  {
    slug: "dundee",
    name: "Dundee",
    region: "Scotland",
    populationK: 148,
    nearestVenue: OVO,
  },
  {
    slug: "swansea",
    name: "Swansea",
    region: "Wales",
    populationK: 247,
    nearestVenue: EXCEL,
  },
  {
    slug: "york",
    name: "York",
    region: "Yorkshire",
    populationK: 153,
    nearestVenue: MANCHESTER_CENTRAL,
  },
  {
    slug: "milton-keynes",
    name: "Milton Keynes",
    region: "East",
    populationK: 230,
    nearestVenue: EXCEL,
  },
  {
    slug: "norwich",
    name: "Norwich",
    region: "East",
    populationK: 144,
    nearestVenue: EXCEL,
  },
  {
    slug: "swindon",
    name: "Swindon",
    region: "South West",
    populationK: 184,
    nearestVenue: EXCEL,
  },
  {
    slug: "exeter",
    name: "Exeter",
    region: "South West",
    populationK: 130,
    nearestVenue: EXCEL,
  },
  {
    slug: "warrington",
    name: "Warrington",
    region: "North West",
    populationK: 211,
    nearestVenue: MANCHESTER_CENTRAL,
  },
  {
    slug: "oxford",
    name: "Oxford",
    region: "South East",
    populationK: 152,
    nearestVenue: EXCEL,
  },
  {
    slug: "cambridge",
    name: "Cambridge",
    region: "East",
    populationK: 145,
    nearestVenue: EXCEL,
  },
  {
    slug: "brighton",
    name: "Brighton",
    region: "South East",
    populationK: 277,
    nearestVenue: EXCEL,
    context:
      "Brighton's Hyrox scene clusters around the seafront and Hove — a strong recreational running base and a steady weekend commute to ExCeL.",
  },
  {
    slug: "hove",
    name: "Hove",
    region: "South East",
    populationK: 92,
    nearestVenue: EXCEL,
  },
  {
    slug: "ipswich",
    name: "Ipswich",
    region: "East",
    populationK: 145,
    nearestVenue: EXCEL,
  },
  {
    slug: "huddersfield",
    name: "Huddersfield",
    region: "Yorkshire",
    populationK: 162,
    nearestVenue: MANCHESTER_CENTRAL,
  },
  {
    slug: "wakefield",
    name: "Wakefield",
    region: "Yorkshire",
    populationK: 109,
    nearestVenue: MANCHESTER_CENTRAL,
  },
  {
    slug: "blackpool",
    name: "Blackpool",
    region: "North West",
    populationK: 139,
    nearestVenue: MANCHESTER_CENTRAL,
  },
  {
    slug: "middlesbrough",
    name: "Middlesbrough",
    region: "North East",
    populationK: 174,
    nearestVenue: MANCHESTER_CENTRAL,
  },
  {
    slug: "bournemouth",
    name: "Bournemouth",
    region: "South",
    populationK: 198,
    nearestVenue: EXCEL,
  },
  {
    slug: "poole",
    name: "Poole",
    region: "South",
    populationK: 152,
    nearestVenue: EXCEL,
  },
  {
    slug: "rotherham",
    name: "Rotherham",
    region: "Yorkshire",
    populationK: 109,
    nearestVenue: NEC,
  },
  {
    slug: "telford",
    name: "Telford",
    region: "West Midlands",
    populationK: 142,
    nearestVenue: NEC,
  },
  {
    slug: "watford",
    name: "Watford",
    region: "East",
    populationK: 132,
    nearestVenue: EXCEL,
  },
  {
    slug: "slough",
    name: "Slough",
    region: "South East",
    populationK: 164,
    nearestVenue: EXCEL,
  },
  {
    slug: "basingstoke",
    name: "Basingstoke",
    region: "South",
    populationK: 113,
    nearestVenue: EXCEL,
  },
  {
    slug: "guildford",
    name: "Guildford",
    region: "South East",
    populationK: 78,
    nearestVenue: EXCEL,
  },
  {
    slug: "chester",
    name: "Chester",
    region: "North West",
    populationK: 90,
    nearestVenue: MANCHESTER_CENTRAL,
  },
  {
    slug: "stirling",
    name: "Stirling",
    region: "Scotland",
    populationK: 37,
    nearestVenue: OVO,
  },
  {
    slug: "inverness",
    name: "Inverness",
    region: "Scotland",
    populationK: 47,
    nearestVenue: OVO,
  },
  {
    slug: "lincoln",
    name: "Lincoln",
    region: "East Midlands",
    populationK: 104,
    nearestVenue: NEC,
  },
  {
    slug: "bath",
    name: "Bath",
    region: "South West",
    populationK: 95,
    nearestVenue: EXCEL,
  },
  {
    slug: "canterbury",
    name: "Canterbury",
    region: "South East",
    populationK: 57,
    nearestVenue: EXCEL,
  },
  {
    slug: "st-albans",
    name: "St Albans",
    region: "East",
    populationK: 87,
    nearestVenue: EXCEL,
  },
  {
    slug: "winchester",
    name: "Winchester",
    region: "South",
    populationK: 45,
    nearestVenue: EXCEL,
  },
  {
    slug: "salisbury",
    name: "Salisbury",
    region: "South",
    populationK: 45,
    nearestVenue: EXCEL,
  },

  // ── London boroughs ─────────────────────────────────────────
  ...[
    "Camden",
    "Hackney",
    "Islington",
    "Shoreditch",
    "Westminster",
    "Kensington",
    "Chelsea",
    "Fulham",
    "Hammersmith",
    "Wandsworth",
    "Clapham",
    "Brixton",
    "Battersea",
    "Wimbledon",
    "Putney",
    "Greenwich",
    "Lewisham",
    "Bermondsey",
    "Southwark",
    "Tower Hamlets",
    "Canary Wharf",
    "Stratford",
    "Walthamstow",
    "Highbury",
    "Holloway",
    "Notting Hill",
    "Paddington",
    "Mayfair",
    "Soho",
    "Pimlico",
    "Vauxhall",
    "Marylebone",
  ].map<UkLocation>((name) => ({
    slug: name.toLowerCase().replace(/\s+/g, "-"),
    name,
    region: "London",
    populationK: 0,
    nearestVenue: EXCEL,
    isLondonBorough: true,
  })),
];

export function getLocationBySlug(slug: string): UkLocation | undefined {
  return UK_LOCATIONS.find((l) => l.slug === slug);
}

export function listLocationSlugs(): string[] {
  return UK_LOCATIONS.map((l) => l.slug);
}

/**
 * Group locations by region for the directory page (/hyrox/cities).
 */
export function groupLocationsByRegion(): Record<string, UkLocation[]> {
  const out: Record<string, UkLocation[]> = {};
  for (const l of UK_LOCATIONS) {
    if (!out[l.region]) out[l.region] = [];
    out[l.region].push(l);
  }
  // Sort each region by population desc.
  for (const k of Object.keys(out)) {
    out[k].sort((a, b) => b.populationK - a.populationK);
  }
  return out;
}
