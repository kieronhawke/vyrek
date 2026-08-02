/**
 * Hand-written local paragraphs, one per place.
 *
 * Everything else about a location is sourced (GeoNames for identity,
 * parkrun's feed for terrain, the event calendar for races). This is the part
 * no dataset supplies: what the training scene in a specific town is actually
 * like. Only places somebody has genuinely written about appear here.
 *
 * A place with no entry renders no paragraph. That is deliberate. The generic
 * fallback this replaced ran verbatim on 45 of 62 pages, and at 879 locations
 * a stand-in paragraph is exactly the duplicate content the geo programme has
 * to avoid.
 */
export const LOCATION_CONTEXT: Record<string, string> = {
  "london":
    "London is the centre of UK Hyrox. ExCeL hosts multiple race weekends a year, the largest affiliate-gym network in the country, and a deep pool of coaches working at every level from First Race to Pro.",
  "manchester":
    "Manchester is one of the UK's top three Hyrox cities. Manchester Central hosts an annual weekend, the Northern Quarter is dense with affiliate gyms, and the city's CrossFit and S&C scene has migrated heavily into Hyrox programming since 2024.",
  "birmingham":
    "Birmingham's NEC and Utilita Arena both host Hyrox weekends. Strong affiliate-gym coverage across the city centre, Solihull, and Edgbaston, easy commute from across the Midlands.",
  "glasgow":
    "Glasgow's OVO Hydro is the Scottish Hyrox flagship venue. Strong club scene in the West End and Southside, and the city is the natural training base for athletes from across central Scotland.",
  "edinburgh":
    "Edinburgh sits an hour from Glasgow's OVO Hydro race weekend, with a growing local Hyrox club scene across Leith, Newington, and the West End. Edinburgh Leisure venues now offer Hyrox-pattern classes at multiple sites.",
  "liverpool":
    "Liverpool athletes typically travel to Manchester Central for the nearest UK race weekend. Local Hyrox classes are spread across the city centre and Wirral; the M62 corridor connects to wider Merseyside training partners.",
  "leeds":
    "Leeds is Yorkshire's strongest Hyrox city. Multiple affiliate gyms across the city centre and Headingley, with a regular community of athletes travelling to Manchester Central for race weekends.",
  "sheffield":
    "Sheffield's Hyrox scene grew rapidly through 2025. Affiliate gyms cluster around the city centre and Kelham Island, with strong links to the surrounding Peak District for outdoor running volume.",
  "bristol":
    "Bristol is the South West hub for Hyrox. Strong affiliate-gym coverage from Clifton through to the harbour, and a regular contingent travelling to ExCeL or Birmingham NEC for race weekends.",
  "newcastle":
    "Newcastle is the North East's Hyrox base. Affiliate gyms cluster in the city centre and Jesmond; athletes typically travel to Manchester or Edinburgh for race weekends.",
  "nottingham":
    "Nottingham athletes have easy access to Birmingham NEC race weekends. Local Hyrox scene grew through 2024-2025 with the city centre and West Bridgford emerging as the strongest gym clusters.",
  "cardiff":
    "Cardiff has hosted Hyrox race weekends and supports a growing Welsh community of athletes. Affiliate gyms cluster around the city centre, Cardiff Bay, and Penarth.",
  "leicester":
    "Leicester is 45 minutes from Birmingham NEC, a natural training catchment for Midlands Hyrox racers. Affiliate gyms cluster in the city centre and surrounding suburbs.",
  "coventry":
    "Coventry's proximity to the NEC makes it one of the easiest UK cities to race from. Affiliate gyms supply a steady stream of Hyrox-pattern classes for the local catchment.",
  "bradford":
    "Belfast hosts the Northern Irish Hyrox community. Local affiliate gyms run regular Hyrox-pattern classes; race travel typically goes via Liverpool or Manchester.",
  "stoke-on-trent":
    "Southampton sits on the South Coast Hyrox corridor, strong local affiliate scene with a regular weekend commute to ExCeL races.",
  "warrington":
    "Brighton's Hyrox scene clusters around the seafront and Hove, a strong recreational running base and a steady weekend commute to ExCeL.",
};
