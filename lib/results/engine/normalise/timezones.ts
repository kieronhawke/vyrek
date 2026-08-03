/**
 * Where and when a race actually starts, in real time rather than calendar time.
 *
 * Live self-arming compares *instants* (see `sync/live.ts`), so an event needs a
 * `start_datetime` in UTC. The source gives us a city and a date and nothing
 * else — "2026 Chiba", 6 August — and a date is not a moment. Chiba's 07:00 is
 * 22:00 UTC the previous day; Vancouver's is 15:00 UTC the same day. Arm on the
 * calendar date and you are seventeen hours out at the extremes.
 *
 * So: an explicit IANA zone per race city, and `Intl` to resolve the true offset
 * **for that date**, which is what makes it DST-correct. Guessing an offset from
 * longitude is within an hour most of the time and two hours across a DST
 * boundary, and two hours late is the first two hours of a race missed.
 *
 * The list is bounded and known — HYROX races in 96 cities — so it is written
 * out rather than computed. `scripts/check-race-timezones.mjs` fails if the
 * calendar gains a city this file does not know about.
 */

/** City → IANA zone, for every city on the HYROX calendar. */
export const RACE_CITY_TIMEZONES: Record<string, string> = {
  // Europe
  vienna: "Europe/Vienna",
  gent: "Europe/Brussels",
  copenhagen: "Europe/Copenhagen",
  helsinki: "Europe/Helsinki",
  bordeaux: "Europe/Paris",
  lyon: "Europe/Paris",
  nice: "Europe/Paris",
  paris: "Europe/Paris",
  toulouse: "Europe/Paris",
  cologne: "Europe/Berlin",
  "dusseldorf": "Europe/Berlin",
  frankfurt: "Europe/Berlin",
  hamburg: "Europe/Berlin",
  karlsruhe: "Europe/Berlin",
  athens: "Europe/Athens",
  budapest: "Europe/Budapest",
  dublin: "Europe/Dublin",
  bari: "Europe/Rome",
  milan: "Europe/Rome",
  rimini: "Europe/Rome",
  rome: "Europe/Rome",
  verona: "Europe/Rome",
  riga: "Europe/Riga",
  amsterdam: "Europe/Amsterdam",
  maastricht: "Europe/Amsterdam",
  utrecht: "Europe/Amsterdam",
  oslo: "Europe/Oslo",
  "gdansk": "Europe/Warsaw",
  katowice: "Europe/Warsaw",
  "krakow": "Europe/Warsaw",
  "poznan": "Europe/Warsaw",
  warsaw: "Europe/Warsaw",
  barcelona: "Europe/Madrid",
  bilbao: "Europe/Madrid",
  madrid: "Europe/Madrid",
  malaga: "Europe/Madrid",
  valencia: "Europe/Madrid",
  // The Canaries are an hour behind mainland Spain. The kind of detail that
  // makes a hand-written map worth more than a country lookup.
  tenerife: "Atlantic/Canary",
  stockholm: "Europe/Stockholm",
  basel: "Europe/Zurich",
  geneva: "Europe/Zurich",
  istanbul: "Europe/Istanbul",
  izmir: "Europe/Istanbul",
  birmingham: "Europe/London",
  cardiff: "Europe/London",
  glasgow: "Europe/London",
  london: "Europe/London",
  manchester: "Europe/London",

  // Americas
  "buenos aires": "America/Argentina/Buenos_Aires",
  "rio de janeiro": "America/Sao_Paulo",
  "sao paulo": "America/Sao_Paulo",
  ottawa: "America/Toronto",
  toronto: "America/Toronto",
  vancouver: "America/Vancouver",
  acapulco: "America/Mexico_City",
  "mexico city": "America/Mexico_City",
  anaheim: "America/Los_Angeles",
  "san diego": "America/Los_Angeles",
  portland: "America/Los_Angeles",
  "las vegas": "America/Los_Angeles",
  phoenix: "America/Phoenix", // no DST
  denver: "America/Denver",
  "salt lake city": "America/Denver",
  dallas: "America/Chicago",
  houston: "America/Chicago",
  nashville: "America/Chicago",
  chicago: "America/Chicago",
  atlanta: "America/New_York",
  boston: "America/New_York",
  miami: "America/New_York",
  "miami beach": "America/New_York",
  tampa: "America/New_York",
  "washington d.c.": "America/New_York",

  // Asia and Oceania
  beijing: "Asia/Shanghai",
  chengdu: "Asia/Shanghai",
  guangzhou: "Asia/Shanghai",
  sanya: "Asia/Shanghai",
  shanghai: "Asia/Shanghai",
  shenzhen: "Asia/Shanghai",
  "hong kong": "Asia/Hong_Kong",
  mumbai: "Asia/Kolkata",
  chiba: "Asia/Tokyo",
  nagoya: "Asia/Tokyo",
  osaka: "Asia/Tokyo",
  "kuala lumpur": "Asia/Kuala_Lumpur",
  singapore: "Asia/Singapore",
  incheon: "Asia/Seoul",
  seoul: "Asia/Seoul",
  taipei: "Asia/Taipei",
  bangkok: "Asia/Bangkok",
  brisbane: "Australia/Brisbane", // no DST, unlike the rest of the east coast
  melbourne: "Australia/Melbourne",
  perth: "Australia/Perth",
  auckland: "Pacific/Auckland",

  // Africa
  cairo: "Africa/Cairo",
  "cape town": "Africa/Johannesburg",
  johannesburg: "Africa/Johannesburg",
};

/** Last resort when a city is unknown but its country is not. */
export const COUNTRY_TIMEZONES: Record<string, string> = {
  argentina: "America/Argentina/Buenos_Aires",
  australia: "Australia/Sydney",
  austria: "Europe/Vienna",
  belgium: "Europe/Brussels",
  brazil: "America/Sao_Paulo",
  canada: "America/Toronto",
  china: "Asia/Shanghai",
  denmark: "Europe/Copenhagen",
  egypt: "Africa/Cairo",
  finland: "Europe/Helsinki",
  france: "Europe/Paris",
  germany: "Europe/Berlin",
  greece: "Europe/Athens",
  "hong kong": "Asia/Hong_Kong",
  hungary: "Europe/Budapest",
  india: "Asia/Kolkata",
  ireland: "Europe/Dublin",
  italy: "Europe/Rome",
  japan: "Asia/Tokyo",
  latvia: "Europe/Riga",
  malaysia: "Asia/Kuala_Lumpur",
  mexico: "America/Mexico_City",
  netherlands: "Europe/Amsterdam",
  "new zealand": "Pacific/Auckland",
  norway: "Europe/Oslo",
  poland: "Europe/Warsaw",
  singapore: "Asia/Singapore",
  "south africa": "Africa/Johannesburg",
  "south korea": "Asia/Seoul",
  spain: "Europe/Madrid",
  sweden: "Europe/Stockholm",
  switzerland: "Europe/Zurich",
  taiwan: "Asia/Taipei",
  thailand: "Asia/Bangkok",
  "türkiye": "Europe/Istanbul",
  turkiye: "Europe/Istanbul",
  turkey: "Europe/Istanbul",
  "united kingdom": "Europe/London",
  "united states": "America/New_York",
};

/** Accents and case removed, so "Düsseldorf" and "dusseldorf" both resolve. */
export function normaliseKey(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function timeZoneFor(city: string, country?: string | null): string | null {
  const byCity = RACE_CITY_TIMEZONES[normaliseKey(city)];
  if (byCity) return byCity;
  if (country) {
    const byCountry = COUNTRY_TIMEZONES[normaliseKey(country)];
    if (byCountry) return byCountry;
  }
  return null;
}

/**
 * The zone's offset from UTC, in minutes, **at a given instant**.
 *
 * Formats the instant into the zone and compares it against the same wall-clock
 * read as UTC. Correct across DST because it asks for a specific moment rather
 * than a nominal rule.
 */
export function offsetMinutesAt(timeZone: string, at: Date): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(at);

  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  // Intl renders midnight as hour 24 in some locales.
  const hour = get("hour") % 24;

  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), hour, get("minute"), get("second"));
  return Math.round((asUtc - at.getTime()) / 60_000);
}

/**
 * A local date and hour into a real UTC instant.
 *
 * Resolved twice: the first pass uses the offset at a nominal guess, the second
 * re-reads the offset at the resulting instant. That second pass is what gets a
 * race starting on a clock-change morning right.
 */
export function localStartToUtc(
  dateIso: string,
  timeZone: string,
  localHour = 7,
): { utc: string; offsetMinutes: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateIso.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  const nominal = Date.UTC(year, month - 1, day, localHour);
  let offset = offsetMinutesAt(timeZone, new Date(nominal));
  let instant = nominal - offset * 60_000;
  offset = offsetMinutesAt(timeZone, new Date(instant));
  instant = nominal - offset * 60_000;

  return { utc: new Date(instant).toISOString(), offsetMinutes: offset };
}

/** Our region buckets. `UK` is separate because backfill prioritises it. */
export function regionFor(country: string | null | undefined): string {
  if (!country) return "";
  const key = normaliseKey(country);
  if (key === "united kingdom") return "UK";
  if (
    [
      "ireland", "france", "germany", "spain", "italy", "netherlands", "belgium",
      "austria", "switzerland", "poland", "sweden", "norway", "denmark", "finland",
      "greece", "hungary", "latvia", "turkiye", "türkiye", "turkey",
      "portugal", "czechia", "czech republic", "romania", "bulgaria", "croatia",
      "slovenia", "slovakia", "estonia", "lithuania", "iceland", "luxembourg",
    ].includes(key)
  ) {
    return "Europe";
  }
  if (
    ["united states", "canada", "mexico", "brazil", "argentina", "chile", "colombia",
      "peru", "uruguay", "ecuador", "panama", "costa rica"].includes(key)
  ) {
    return "Americas";
  }
  if (
    ["china", "japan", "south korea", "taiwan", "thailand", "malaysia", "singapore",
      "hong kong", "india", "indonesia", "philippines", "vietnam", "macau",
      // Western Asia. The existing facet set has no Middle East, and the UN
      // scheme puts these in Asia — so they go there rather than growing a
      // seventh region that no filter, sitemap or calendar renders yet.
      "united arab emirates", "qatar", "saudi arabia", "israel", "bahrain",
      "kuwait", "oman", "jordan", "lebanon"].includes(key)
  ) {
    return "Asia";
  }
  if (["australia", "new zealand"].includes(key)) return "Oceania";
  if (["south africa", "egypt", "morocco", "kenya", "nigeria", "tunisia"].includes(key)) {
    return "Africa";
  }
  return "";
}

/** ISO-3166 alpha-2, for flags and metadata. */
export const COUNTRY_ISO: Record<string, string> = {
  argentina: "AR", australia: "AU", austria: "AT", belgium: "BE", brazil: "BR",
  canada: "CA", china: "CN", denmark: "DK", egypt: "EG", finland: "FI",
  france: "FR", germany: "DE", greece: "GR", "hong kong": "HK", hungary: "HU",
  india: "IN", ireland: "IE", italy: "IT", japan: "JP", latvia: "LV",
  malaysia: "MY", mexico: "MX", netherlands: "NL", "new zealand": "NZ",
  norway: "NO", poland: "PL", singapore: "SG", "south africa": "ZA",
  "south korea": "KR", spain: "ES", sweden: "SE", switzerland: "CH",
  taiwan: "TW", thailand: "TH", "türkiye": "TR", turkiye: "TR", turkey: "TR",
  "united kingdom": "GB", "united states": "US",
  portugal: "PT", czechia: "CZ", "czech republic": "CZ", romania: "RO",
  bulgaria: "BG", croatia: "HR", slovenia: "SI", slovakia: "SK", estonia: "EE",
  lithuania: "LT", iceland: "IS", luxembourg: "LU",
  chile: "CL", colombia: "CO", peru: "PE", uruguay: "UY", ecuador: "EC",
  indonesia: "ID", philippines: "PH", vietnam: "VN", macau: "MO",
  "united arab emirates": "AE", qatar: "QA", "saudi arabia": "SA", israel: "IL",
  bahrain: "BH", kuwait: "KW", oman: "OM", jordan: "JO", lebanon: "LB",
  morocco: "MA", kenya: "KE", nigeria: "NG", tunisia: "TN",
};

export function countryIsoFor(country: string | null | undefined): string {
  return country ? (COUNTRY_ISO[normaliseKey(country)] ?? "") : "";
}
