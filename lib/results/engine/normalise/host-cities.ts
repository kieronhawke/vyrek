/**
 * Where HYROX has raced, beyond the calendar it currently publishes.
 *
 * `data/hyrox/races.normalised.json` is the *upcoming* calendar — 113 races, 96
 * cities. Our results go back to 2017, and the cities of finished seasons have
 * simply dropped off it: Berlin, New York, Sydney, Rotterdam, Delhi and dozens
 * more appear in the archive and nowhere in the calendar. Joining on the
 * calendar alone left 208 of 223 events with no country, no region and no
 * timezone — so they could not be filtered by region, could not be sorted, and
 * had nothing to put in `SportsEvent` markup.
 *
 * This is the archive half of that lookup: host city to country and IANA zone.
 * It is geography, not race data — a city's country does not change between
 * seasons — so it is safe to state statically and needs no upkeep as the
 * calendar rotates.
 *
 * ⚠️ Country and zone only. **No dates.** A finished event's date is
 * year-specific and is not derivable from its city, so events with no calendar
 * match keep null dates rather than borrowing a plausible one. They are all
 * `final`, so nothing arms live off them.
 */

export type HostCity = { country: string; timeZone: string };

/** Keyed by the city as it is written; lookup normalises both sides. */
export const HOST_CITIES: Record<string, HostCity> = {
  // Germany — the home market, and the bulk of the early archive.
  Berlin: { country: "Germany", timeZone: "Europe/Berlin" },
  Hamburg: { country: "Germany", timeZone: "Europe/Berlin" },
  Munich: { country: "Germany", timeZone: "Europe/Berlin" },
  Cologne: { country: "Germany", timeZone: "Europe/Berlin" },
  Frankfurt: { country: "Germany", timeZone: "Europe/Berlin" },
  Stuttgart: { country: "Germany", timeZone: "Europe/Berlin" },
  Leipzig: { country: "Germany", timeZone: "Europe/Berlin" },
  Essen: { country: "Germany", timeZone: "Europe/Berlin" },
  Oberhausen: { country: "Germany", timeZone: "Europe/Berlin" },
  Hannover: { country: "Germany", timeZone: "Europe/Berlin" },
  Nuremberg: { country: "Germany", timeZone: "Europe/Berlin" },
  Dortmund: { country: "Germany", timeZone: "Europe/Berlin" },
  Dusseldorf: { country: "Germany", timeZone: "Europe/Berlin" },
  Karlsruhe: { country: "Germany", timeZone: "Europe/Berlin" },
  Bremen: { country: "Germany", timeZone: "Europe/Berlin" },
  Dresden: { country: "Germany", timeZone: "Europe/Berlin" },

  // Rest of Europe.
  Vienna: { country: "Austria", timeZone: "Europe/Vienna" },
  Salzburg: { country: "Austria", timeZone: "Europe/Vienna" },
  Zurich: { country: "Switzerland", timeZone: "Europe/Zurich" },
  Geneva: { country: "Switzerland", timeZone: "Europe/Zurich" },
  "St. Gallen": { country: "Switzerland", timeZone: "Europe/Zurich" },
  Basel: { country: "Switzerland", timeZone: "Europe/Zurich" },
  Rotterdam: { country: "Netherlands", timeZone: "Europe/Amsterdam" },
  Amsterdam: { country: "Netherlands", timeZone: "Europe/Amsterdam" },
  Maastricht: { country: "Netherlands", timeZone: "Europe/Amsterdam" },
  Heerenveen: { country: "Netherlands", timeZone: "Europe/Amsterdam" },
  Utrecht: { country: "Netherlands", timeZone: "Europe/Amsterdam" },
  Brussels: { country: "Belgium", timeZone: "Europe/Brussels" },
  Mechelen: { country: "Belgium", timeZone: "Europe/Brussels" },
  Antwerp: { country: "Belgium", timeZone: "Europe/Brussels" },
  Paris: { country: "France", timeZone: "Europe/Paris" },
  Nice: { country: "France", timeZone: "Europe/Paris" },
  Lyon: { country: "France", timeZone: "Europe/Paris" },
  Bordeaux: { country: "France", timeZone: "Europe/Paris" },
  Milan: { country: "Italy", timeZone: "Europe/Rome" },
  Turin: { country: "Italy", timeZone: "Europe/Rome" },
  Bologna: { country: "Italy", timeZone: "Europe/Rome" },
  Rome: { country: "Italy", timeZone: "Europe/Rome" },
  Madrid: { country: "Spain", timeZone: "Europe/Madrid" },
  Barcelona: { country: "Spain", timeZone: "Europe/Madrid" },
  Valencia: { country: "Spain", timeZone: "Europe/Madrid" },
  Seville: { country: "Spain", timeZone: "Europe/Madrid" },
  Malaga: { country: "Spain", timeZone: "Europe/Madrid" },
  Lisbon: { country: "Portugal", timeZone: "Europe/Lisbon" },
  Porto: { country: "Portugal", timeZone: "Europe/Lisbon" },
  Warsaw: { country: "Poland", timeZone: "Europe/Warsaw" },
  Krakow: { country: "Poland", timeZone: "Europe/Warsaw" },
  Prague: { country: "Czechia", timeZone: "Europe/Prague" },
  Budapest: { country: "Hungary", timeZone: "Europe/Budapest" },
  Bucharest: { country: "Romania", timeZone: "Europe/Bucharest" },
  Sofia: { country: "Bulgaria", timeZone: "Europe/Sofia" },
  Zagreb: { country: "Croatia", timeZone: "Europe/Zagreb" },
  Athens: { country: "Greece", timeZone: "Europe/Athens" },
  Stockholm: { country: "Sweden", timeZone: "Europe/Stockholm" },
  Malmo: { country: "Sweden", timeZone: "Europe/Stockholm" },
  Gothenburg: { country: "Sweden", timeZone: "Europe/Stockholm" },
  Oslo: { country: "Norway", timeZone: "Europe/Oslo" },
  Copenhagen: { country: "Denmark", timeZone: "Europe/Copenhagen" },
  Helsinki: { country: "Finland", timeZone: "Europe/Helsinki" },
  Dublin: { country: "Ireland", timeZone: "Europe/Dublin" },
  Istanbul: { country: "Türkiye", timeZone: "Europe/Istanbul" },

  // United Kingdom.
  London: { country: "United Kingdom", timeZone: "Europe/London" },
  Manchester: { country: "United Kingdom", timeZone: "Europe/London" },
  Birmingham: { country: "United Kingdom", timeZone: "Europe/London" },
  Glasgow: { country: "United Kingdom", timeZone: "Europe/London" },
  Cardiff: { country: "United Kingdom", timeZone: "Europe/London" },
  Leeds: { country: "United Kingdom", timeZone: "Europe/London" },
  Liverpool: { country: "United Kingdom", timeZone: "Europe/London" },
  Sheffield: { country: "United Kingdom", timeZone: "Europe/London" },
  Newcastle: { country: "United Kingdom", timeZone: "Europe/London" },
  Belfast: { country: "United Kingdom", timeZone: "Europe/London" },

  // North America.
  "New York": { country: "United States", timeZone: "America/New_York" },
  Miami: { country: "United States", timeZone: "America/New_York" },
  Washington: { country: "United States", timeZone: "America/New_York" },
  "Washington DC": { country: "United States", timeZone: "America/New_York" },
  "Fort Lauderdale": { country: "United States", timeZone: "America/New_York" },
  Orlando: { country: "United States", timeZone: "America/New_York" },
  Atlanta: { country: "United States", timeZone: "America/New_York" },
  Boston: { country: "United States", timeZone: "America/New_York" },
  Philadelphia: { country: "United States", timeZone: "America/New_York" },
  Chicago: { country: "United States", timeZone: "America/Chicago" },
  Dallas: { country: "United States", timeZone: "America/Chicago" },
  Houston: { country: "United States", timeZone: "America/Chicago" },
  Austin: { country: "United States", timeZone: "America/Chicago" },
  Nashville: { country: "United States", timeZone: "America/Chicago" },
  Denver: { country: "United States", timeZone: "America/Denver" },
  Phoenix: { country: "United States", timeZone: "America/Phoenix" },
  "Los Angeles": { country: "United States", timeZone: "America/Los_Angeles" },
  Anaheim: { country: "United States", timeZone: "America/Los_Angeles" },
  "San Francisco": { country: "United States", timeZone: "America/Los_Angeles" },
  "San Diego": { country: "United States", timeZone: "America/Los_Angeles" },
  Seattle: { country: "United States", timeZone: "America/Los_Angeles" },
  "Las Vegas": { country: "United States", timeZone: "America/Los_Angeles" },
  Toronto: { country: "Canada", timeZone: "America/Toronto" },
  Vancouver: { country: "Canada", timeZone: "America/Vancouver" },
  Montreal: { country: "Canada", timeZone: "America/Toronto" },
  "Mexico City": { country: "Mexico", timeZone: "America/Mexico_City" },
  Guadalajara: { country: "Mexico", timeZone: "America/Mexico_City" },
  Monterrey: { country: "Mexico", timeZone: "America/Monterrey" },
  Puebla: { country: "Mexico", timeZone: "America/Mexico_City" },
  Cancun: { country: "Mexico", timeZone: "America/Cancun" },

  // South America.
  "Sao Paulo": { country: "Brazil", timeZone: "America/Sao_Paulo" },
  "Rio de Janeiro": { country: "Brazil", timeZone: "America/Sao_Paulo" },
  Fortaleza: { country: "Brazil", timeZone: "America/Fortaleza" },
  "Belo Horizonte": { country: "Brazil", timeZone: "America/Sao_Paulo" },
  "Buenos Aires": { country: "Argentina", timeZone: "America/Argentina/Buenos_Aires" },
  Santiago: { country: "Chile", timeZone: "America/Santiago" },
  Bogota: { country: "Colombia", timeZone: "America/Bogota" },
  Lima: { country: "Peru", timeZone: "America/Lima" },

  // Middle East and Africa.
  Dubai: { country: "United Arab Emirates", timeZone: "Asia/Dubai" },
  "Abu Dhabi": { country: "United Arab Emirates", timeZone: "Asia/Dubai" },
  Sharjah: { country: "United Arab Emirates", timeZone: "Asia/Dubai" },
  Doha: { country: "Qatar", timeZone: "Asia/Qatar" },
  Riyadh: { country: "Saudi Arabia", timeZone: "Asia/Riyadh" },
  Jeddah: { country: "Saudi Arabia", timeZone: "Asia/Riyadh" },
  "Tel Aviv": { country: "Israel", timeZone: "Asia/Jerusalem" },
  "Cape Town": { country: "South Africa", timeZone: "Africa/Johannesburg" },
  Johannesburg: { country: "South Africa", timeZone: "Africa/Johannesburg" },
  Cairo: { country: "Egypt", timeZone: "Africa/Cairo" },

  // Asia-Pacific.
  Shanghai: { country: "China", timeZone: "Asia/Shanghai" },
  Beijing: { country: "China", timeZone: "Asia/Shanghai" },
  Hangzhou: { country: "China", timeZone: "Asia/Shanghai" },
  Wuhan: { country: "China", timeZone: "Asia/Shanghai" },
  Shenzhen: { country: "China", timeZone: "Asia/Shanghai" },
  Chengdu: { country: "China", timeZone: "Asia/Shanghai" },
  "Hong Kong": { country: "Hong Kong", timeZone: "Asia/Hong_Kong" },
  Singapore: { country: "Singapore", timeZone: "Asia/Singapore" },
  Tokyo: { country: "Japan", timeZone: "Asia/Tokyo" },
  Chiba: { country: "Japan", timeZone: "Asia/Tokyo" },
  Osaka: { country: "Japan", timeZone: "Asia/Tokyo" },
  Seoul: { country: "South Korea", timeZone: "Asia/Seoul" },
  Taipei: { country: "Taiwan", timeZone: "Asia/Taipei" },
  Bangkok: { country: "Thailand", timeZone: "Asia/Bangkok" },
  Jakarta: { country: "Indonesia", timeZone: "Asia/Jakarta" },
  "Kuala Lumpur": { country: "Malaysia", timeZone: "Asia/Kuala_Lumpur" },
  Manila: { country: "Philippines", timeZone: "Asia/Manila" },
  Delhi: { country: "India", timeZone: "Asia/Kolkata" },
  "New Delhi": { country: "India", timeZone: "Asia/Kolkata" },
  Mumbai: { country: "India", timeZone: "Asia/Kolkata" },
  Bengaluru: { country: "India", timeZone: "Asia/Kolkata" },
  Hyderabad: { country: "India", timeZone: "Asia/Kolkata" },
  Sydney: { country: "Australia", timeZone: "Australia/Sydney" },
  Melbourne: { country: "Australia", timeZone: "Australia/Melbourne" },
  Brisbane: { country: "Australia", timeZone: "Australia/Brisbane" },
  Perth: { country: "Australia", timeZone: "Australia/Perth" },
  Adelaide: { country: "Australia", timeZone: "Australia/Adelaide" },
  Auckland: { country: "New Zealand", timeZone: "Pacific/Auckland" },
};
