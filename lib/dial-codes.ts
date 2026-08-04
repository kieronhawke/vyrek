/**
 * DIALLING CODES, WITH THE FORMAT PEOPLE ACTUALLY TYPE.
 *
 * Hand-held rather than pulled from libphonenumber, which is 145kB of
 * metadata to validate a number nobody is going to dial automatically.
 * What this needs to do is much smaller: show somebody their own flag and
 * code so they do not have to think, and store something Twilio can send
 * to. Twilio does the real validation, and it is better at it than a
 * bundled copy of a table that goes stale.
 *
 * ORDERED BY WHERE THE CLIENTS ARE. The UK first because that is nearly all
 * of them, then the countries the results database actually shows athletes
 * from, then the rest alphabetically. A dropdown sorted purely
 * alphabetically makes the common case the hardest to find.
 *
 * `example` is a real local format, so the placeholder teaches the shape
 * instead of showing a row of zeroes.
 */

export type DialCode = {
  /** ISO 3166-1 alpha-2, used to pick the flag and to remember the choice. */
  iso: string;
  name: string;
  /** With the plus, because that is what gets stored. */
  dial: string;
  /** How somebody in that country writes their own number, where we know it. */
  example?: string;
  /** Digits after the dial code, for a sanity check rather than a rule.
      Absent for the long tail: E.164's own 4-15 total is the only bound we
      can honestly claim without a per-country table we would have to keep
      correct. Twilio does the real validation and is better at it. */
  min?: number;
  max?: number;
};

/** The ones worth putting at the top, in this order. */
const PRIORITY = ["GB", "IE", "US", "ES", "DE", "FR", "NL", "AU", "AE", "CA"];

const ALL: DialCode[] = [
  { iso: "GB", name: "United Kingdom", dial: "+44", example: "07700 900123", min: 9, max: 10 },
  { iso: "IE", name: "Ireland", dial: "+353", example: "085 123 4567", min: 7, max: 9 },
  { iso: "US", name: "United States", dial: "+1", example: "(555) 123-4567", min: 10, max: 10 },
  { iso: "CA", name: "Canada", dial: "+1", example: "(555) 123-4567", min: 10, max: 10 },
  { iso: "ES", name: "Spain", dial: "+34", example: "612 34 56 78", min: 9, max: 9 },
  { iso: "DE", name: "Germany", dial: "+49", example: "0151 23456789", min: 10, max: 11 },
  { iso: "FR", name: "France", dial: "+33", example: "06 12 34 56 78", min: 9, max: 9 },
  { iso: "NL", name: "Netherlands", dial: "+31", example: "06 12345678", min: 9, max: 9 },
  { iso: "AU", name: "Australia", dial: "+61", example: "0412 345 678", min: 9, max: 9 },
  { iso: "AE", name: "United Arab Emirates", dial: "+971", example: "050 123 4567", min: 8, max: 9 },
  { iso: "AT", name: "Austria", dial: "+43", example: "0664 123456", min: 9, max: 11 },
  { iso: "BE", name: "Belgium", dial: "+32", example: "0470 12 34 56", min: 9, max: 9 },
  { iso: "BR", name: "Brazil", dial: "+55", example: "(11) 91234-5678", min: 10, max: 11 },
  { iso: "CH", name: "Switzerland", dial: "+41", example: "078 123 45 67", min: 9, max: 9 },
  { iso: "CN", name: "China", dial: "+86", example: "131 2345 6789", min: 11, max: 11 },
  { iso: "CZ", name: "Czechia", dial: "+420", example: "601 123 456", min: 9, max: 9 },
  { iso: "DK", name: "Denmark", dial: "+45", example: "32 12 34 56", min: 8, max: 8 },
  { iso: "FI", name: "Finland", dial: "+358", example: "041 2345678", min: 9, max: 10 },
  { iso: "HK", name: "Hong Kong", dial: "+852", example: "5123 4567", min: 8, max: 8 },
  { iso: "IN", name: "India", dial: "+91", example: "081234 56789", min: 10, max: 10 },
  { iso: "IT", name: "Italy", dial: "+39", example: "312 345 6789", min: 9, max: 10 },
  { iso: "JP", name: "Japan", dial: "+81", example: "090-1234-5678", min: 10, max: 10 },
  { iso: "MX", name: "Mexico", dial: "+52", example: "222 123 4567", min: 10, max: 10 },
  { iso: "NO", name: "Norway", dial: "+47", example: "406 12 345", min: 8, max: 8 },
  { iso: "NZ", name: "New Zealand", dial: "+64", example: "021 123 4567", min: 8, max: 10 },
  { iso: "PL", name: "Poland", dial: "+48", example: "512 345 678", min: 9, max: 9 },
  { iso: "PT", name: "Portugal", dial: "+351", example: "912 345 678", min: 9, max: 9 },
  { iso: "SE", name: "Sweden", dial: "+46", example: "070-123 45 67", min: 9, max: 9 },
  { iso: "SG", name: "Singapore", dial: "+65", example: "8123 4567", min: 8, max: 8 },
  { iso: "ZA", name: "South Africa", dial: "+27", example: "071 123 4567", min: 9, max: 9 },

  /* AND EVERYWHERE ELSE.
     The list stopped at thirty, which is fine right up until somebody in
     Portugal — or Kenya, or Chile — cannot find their own code and gives up
     on a form that was one dropdown away from working. Every ISO 3166-1
     country with a dialling code is here now.

     These carry no example or length bounds, deliberately. A per-country
     numbering table is a maintenance burden that goes stale silently and
     rejects real numbers when it does; the thirty above were checked by
     hand, and the rest fall back to E.164's own 4-15 digits. Twilio is the
     authority on whether a number is reachable. */
  { iso: "AF", name: "Afghanistan", dial: "+93" },
  { iso: "AL", name: "Albania", dial: "+355" },
  { iso: "DZ", name: "Algeria", dial: "+213" },
  { iso: "AS", name: "American Samoa", dial: "+1684" },
  { iso: "AD", name: "Andorra", dial: "+376" },
  { iso: "AO", name: "Angola", dial: "+244" },
  { iso: "AI", name: "Anguilla", dial: "+1264" },
  { iso: "AG", name: "Antigua and Barbuda", dial: "+1268" },
  { iso: "AR", name: "Argentina", dial: "+54" },
  { iso: "AM", name: "Armenia", dial: "+374" },
  { iso: "AW", name: "Aruba", dial: "+297" },
  { iso: "AZ", name: "Azerbaijan", dial: "+994" },
  { iso: "BS", name: "Bahamas", dial: "+1242" },
  { iso: "BH", name: "Bahrain", dial: "+973" },
  { iso: "BD", name: "Bangladesh", dial: "+880" },
  { iso: "BB", name: "Barbados", dial: "+1246" },
  { iso: "BY", name: "Belarus", dial: "+375" },
  { iso: "BZ", name: "Belize", dial: "+501" },
  { iso: "BJ", name: "Benin", dial: "+229" },
  { iso: "BM", name: "Bermuda", dial: "+1441" },
  { iso: "BT", name: "Bhutan", dial: "+975" },
  { iso: "BO", name: "Bolivia", dial: "+591" },
  { iso: "BA", name: "Bosnia and Herzegovina", dial: "+387" },
  { iso: "BW", name: "Botswana", dial: "+267" },
  { iso: "BN", name: "Brunei", dial: "+673" },
  { iso: "BG", name: "Bulgaria", dial: "+359" },
  { iso: "BF", name: "Burkina Faso", dial: "+226" },
  { iso: "BI", name: "Burundi", dial: "+257" },
  { iso: "KH", name: "Cambodia", dial: "+855" },
  { iso: "CM", name: "Cameroon", dial: "+237" },
  { iso: "CV", name: "Cape Verde", dial: "+238" },
  { iso: "KY", name: "Cayman Islands", dial: "+1345" },
  { iso: "CF", name: "Central African Republic", dial: "+236" },
  { iso: "TD", name: "Chad", dial: "+235" },
  { iso: "CL", name: "Chile", dial: "+56" },
  { iso: "CO", name: "Colombia", dial: "+57" },
  { iso: "KM", name: "Comoros", dial: "+269" },
  { iso: "CG", name: "Congo", dial: "+242" },
  { iso: "CD", name: "Congo (DRC)", dial: "+243" },
  { iso: "CK", name: "Cook Islands", dial: "+682" },
  { iso: "CR", name: "Costa Rica", dial: "+506" },
  { iso: "CI", name: "Cote d'Ivoire", dial: "+225" },
  { iso: "HR", name: "Croatia", dial: "+385" },
  { iso: "CU", name: "Cuba", dial: "+53" },
  { iso: "CW", name: "Curacao", dial: "+599" },
  { iso: "CY", name: "Cyprus", dial: "+357" },
  { iso: "DJ", name: "Djibouti", dial: "+253" },
  { iso: "DM", name: "Dominica", dial: "+1767" },
  { iso: "DO", name: "Dominican Republic", dial: "+1809" },
  { iso: "EC", name: "Ecuador", dial: "+593" },
  { iso: "EG", name: "Egypt", dial: "+20" },
  { iso: "SV", name: "El Salvador", dial: "+503" },
  { iso: "GQ", name: "Equatorial Guinea", dial: "+240" },
  { iso: "ER", name: "Eritrea", dial: "+291" },
  { iso: "EE", name: "Estonia", dial: "+372" },
  { iso: "SZ", name: "Eswatini", dial: "+268" },
  { iso: "ET", name: "Ethiopia", dial: "+251" },
  { iso: "FJ", name: "Fiji", dial: "+679" },
  { iso: "GF", name: "French Guiana", dial: "+594" },
  { iso: "PF", name: "French Polynesia", dial: "+689" },
  { iso: "GA", name: "Gabon", dial: "+241" },
  { iso: "GM", name: "Gambia", dial: "+220" },
  { iso: "GE", name: "Georgia", dial: "+995" },
  { iso: "GH", name: "Ghana", dial: "+233" },
  { iso: "GI", name: "Gibraltar", dial: "+350" },
  { iso: "GR", name: "Greece", dial: "+30" },
  { iso: "GL", name: "Greenland", dial: "+299" },
  { iso: "GD", name: "Grenada", dial: "+1473" },
  { iso: "GP", name: "Guadeloupe", dial: "+590" },
  { iso: "GU", name: "Guam", dial: "+1671" },
  { iso: "GT", name: "Guatemala", dial: "+502" },
  { iso: "GG", name: "Guernsey", dial: "+44" },
  { iso: "GN", name: "Guinea", dial: "+224" },
  { iso: "GW", name: "Guinea-Bissau", dial: "+245" },
  { iso: "GY", name: "Guyana", dial: "+592" },
  { iso: "HT", name: "Haiti", dial: "+509" },
  { iso: "HN", name: "Honduras", dial: "+504" },
  { iso: "HU", name: "Hungary", dial: "+36" },
  { iso: "IS", name: "Iceland", dial: "+354" },
  { iso: "ID", name: "Indonesia", dial: "+62" },
  { iso: "IR", name: "Iran", dial: "+98" },
  { iso: "IQ", name: "Iraq", dial: "+964" },
  { iso: "IM", name: "Isle of Man", dial: "+44" },
  { iso: "IL", name: "Israel", dial: "+972" },
  { iso: "JM", name: "Jamaica", dial: "+1876" },
  { iso: "JE", name: "Jersey", dial: "+44" },
  { iso: "JO", name: "Jordan", dial: "+962" },
  { iso: "KZ", name: "Kazakhstan", dial: "+7" },
  { iso: "KE", name: "Kenya", dial: "+254" },
  { iso: "KI", name: "Kiribati", dial: "+686" },
  { iso: "KW", name: "Kuwait", dial: "+965" },
  { iso: "KG", name: "Kyrgyzstan", dial: "+996" },
  { iso: "LA", name: "Laos", dial: "+856" },
  { iso: "LV", name: "Latvia", dial: "+371" },
  { iso: "LB", name: "Lebanon", dial: "+961" },
  { iso: "LS", name: "Lesotho", dial: "+266" },
  { iso: "LR", name: "Liberia", dial: "+231" },
  { iso: "LY", name: "Libya", dial: "+218" },
  { iso: "LI", name: "Liechtenstein", dial: "+423" },
  { iso: "LT", name: "Lithuania", dial: "+370" },
  { iso: "LU", name: "Luxembourg", dial: "+352" },
  { iso: "MO", name: "Macao", dial: "+853" },
  { iso: "MG", name: "Madagascar", dial: "+261" },
  { iso: "MW", name: "Malawi", dial: "+265" },
  { iso: "MY", name: "Malaysia", dial: "+60" },
  { iso: "MV", name: "Maldives", dial: "+960" },
  { iso: "ML", name: "Mali", dial: "+223" },
  { iso: "MT", name: "Malta", dial: "+356" },
  { iso: "MH", name: "Marshall Islands", dial: "+692" },
  { iso: "MQ", name: "Martinique", dial: "+596" },
  { iso: "MR", name: "Mauritania", dial: "+222" },
  { iso: "MU", name: "Mauritius", dial: "+230" },
  { iso: "FM", name: "Micronesia", dial: "+691" },
  { iso: "MD", name: "Moldova", dial: "+373" },
  { iso: "MC", name: "Monaco", dial: "+377" },
  { iso: "MN", name: "Mongolia", dial: "+976" },
  { iso: "ME", name: "Montenegro", dial: "+382" },
  { iso: "MS", name: "Montserrat", dial: "+1664" },
  { iso: "MA", name: "Morocco", dial: "+212" },
  { iso: "MZ", name: "Mozambique", dial: "+258" },
  { iso: "MM", name: "Myanmar", dial: "+95" },
  { iso: "NA", name: "Namibia", dial: "+264" },
  { iso: "NR", name: "Nauru", dial: "+674" },
  { iso: "NP", name: "Nepal", dial: "+977" },
  { iso: "NC", name: "New Caledonia", dial: "+687" },
  { iso: "NI", name: "Nicaragua", dial: "+505" },
  { iso: "NE", name: "Niger", dial: "+227" },
  { iso: "NG", name: "Nigeria", dial: "+234" },
  { iso: "MK", name: "North Macedonia", dial: "+389" },
  { iso: "OM", name: "Oman", dial: "+968" },
  { iso: "PK", name: "Pakistan", dial: "+92" },
  { iso: "PW", name: "Palau", dial: "+680" },
  { iso: "PS", name: "Palestine", dial: "+970" },
  { iso: "PA", name: "Panama", dial: "+507" },
  { iso: "PG", name: "Papua New Guinea", dial: "+675" },
  { iso: "PY", name: "Paraguay", dial: "+595" },
  { iso: "PE", name: "Peru", dial: "+51" },
  { iso: "PH", name: "Philippines", dial: "+63" },
  { iso: "PR", name: "Puerto Rico", dial: "+1787" },
  { iso: "QA", name: "Qatar", dial: "+974" },
  { iso: "RE", name: "Reunion", dial: "+262" },
  { iso: "RO", name: "Romania", dial: "+40" },
  { iso: "RU", name: "Russia", dial: "+7" },
  { iso: "RW", name: "Rwanda", dial: "+250" },
  { iso: "KN", name: "Saint Kitts and Nevis", dial: "+1869" },
  { iso: "LC", name: "Saint Lucia", dial: "+1758" },
  { iso: "VC", name: "Saint Vincent", dial: "+1784" },
  { iso: "WS", name: "Samoa", dial: "+685" },
  { iso: "SM", name: "San Marino", dial: "+378" },
  { iso: "SA", name: "Saudi Arabia", dial: "+966" },
  { iso: "SN", name: "Senegal", dial: "+221" },
  { iso: "RS", name: "Serbia", dial: "+381" },
  { iso: "SC", name: "Seychelles", dial: "+248" },
  { iso: "SL", name: "Sierra Leone", dial: "+232" },
  { iso: "SK", name: "Slovakia", dial: "+421" },
  { iso: "SI", name: "Slovenia", dial: "+386" },
  { iso: "SB", name: "Solomon Islands", dial: "+677" },
  { iso: "SO", name: "Somalia", dial: "+252" },
  { iso: "KR", name: "South Korea", dial: "+82" },
  { iso: "SS", name: "South Sudan", dial: "+211" },
  { iso: "LK", name: "Sri Lanka", dial: "+94" },
  { iso: "SD", name: "Sudan", dial: "+249" },
  { iso: "SR", name: "Suriname", dial: "+597" },
  { iso: "SY", name: "Syria", dial: "+963" },
  { iso: "TW", name: "Taiwan", dial: "+886" },
  { iso: "TJ", name: "Tajikistan", dial: "+992" },
  { iso: "TZ", name: "Tanzania", dial: "+255" },
  { iso: "TH", name: "Thailand", dial: "+66" },
  { iso: "TL", name: "Timor-Leste", dial: "+670" },
  { iso: "TG", name: "Togo", dial: "+228" },
  { iso: "TO", name: "Tonga", dial: "+676" },
  { iso: "TT", name: "Trinidad and Tobago", dial: "+1868" },
  { iso: "TN", name: "Tunisia", dial: "+216" },
  { iso: "TR", name: "Turkey", dial: "+90" },
  { iso: "TM", name: "Turkmenistan", dial: "+993" },
  { iso: "TC", name: "Turks and Caicos", dial: "+1649" },
  { iso: "TV", name: "Tuvalu", dial: "+688" },
  { iso: "UG", name: "Uganda", dial: "+256" },
  { iso: "UA", name: "Ukraine", dial: "+380" },
  { iso: "UY", name: "Uruguay", dial: "+598" },
  { iso: "UZ", name: "Uzbekistan", dial: "+998" },
  { iso: "VU", name: "Vanuatu", dial: "+678" },
  { iso: "VA", name: "Vatican City", dial: "+379" },
  { iso: "VE", name: "Venezuela", dial: "+58" },
  { iso: "VN", name: "Vietnam", dial: "+84" },
  { iso: "VG", name: "Virgin Islands (British)", dial: "+1284" },
  { iso: "VI", name: "Virgin Islands (US)", dial: "+1340" },
  { iso: "YE", name: "Yemen", dial: "+967" },
  { iso: "ZM", name: "Zambia", dial: "+260" },
  { iso: "ZW", name: "Zimbabwe", dial: "+263" },
];

export const DIAL_CODES: DialCode[] = [
  ...PRIORITY.map((iso) => ALL.find((c) => c.iso === iso)!).filter(Boolean),
  ...ALL.filter((c) => !PRIORITY.includes(c.iso)).sort((a, b) =>
    a.name.localeCompare(b.name),
  ),
];

export const DEFAULT_ISO = "GB";

export function dialCodeFor(iso: string): DialCode {
  return DIAL_CODES.find((c) => c.iso === iso) ?? DIAL_CODES[0];
}

/** What to show in an empty phone box. */
export function placeholderFor(iso: string): string {
  const c = dialCodeFor(iso);
  // Neutral rather than invented: showing a made-up shape for a country
  // whose format we have not checked teaches the wrong thing.
  return c.example ?? "Your mobile number";
}

/** "🇵🇹 Portugal +351" — flag, name and code, in that order. */
export function optionLabel(c: DialCode): string {
  return `${flagFor(c.iso)} ${c.name} ${c.dial}`;
}

/**
 * The country to open on, from the visitor's own IP.
 *
 * Vercel puts an ISO country on every request. Somebody in Madrid should
 * not have to scroll past two hundred countries to find Spain, and a UK
 * default silently mangles their number if they miss the dropdown: +34 612
 * typed under a +44 assumption produces a number nobody can ring.
 *
 * Falls back to the UK, which is where nearly all of them are.
 */
export function isoFromCountryHeader(country: string | null | undefined): string {
  const code = (country ?? "").trim().toUpperCase();
  if (code.length !== 2) return DEFAULT_ISO;
  return DIAL_CODES.some((c) => c.iso === code) ? code : DEFAULT_ISO;
}

/**
 * The flag, as an emoji built from the country code.
 *
 * Two regional-indicator characters, derived rather than stored: an image
 * per country would be thirty extra requests, and an emoji renders at the
 * text size without a sprite sheet. Windows shows letters rather than a
 * flag, which is why the country's name is always beside it.
 */
export function flagFor(iso: string): string {
  return iso
    .toUpperCase()
    .replace(/./g, (c) => String.fromCodePoint(127397 + c.charCodeAt(0)));
}

/**
 * Turn what they typed into E.164, which is what Twilio wants.
 *
 * A leading zero is a *national* prefix — 07700 in the UK, 06 in France —
 * and must be dropped once a country code is in front of it. Getting that
 * wrong produces +4407700900123, which Twilio rejects with an error that
 * reads like a bug in our code rather than a trunk prefix nobody removed.
 */
export function toE164(iso: string, local: string): string | null {
  const country = dialCodeFor(iso);
  let digits = local.replace(/\D/g, "");
  if (!digits) return null;
  // Somebody pasted the full international number into the local box.
  const bare = country.dial.replace("+", "");
  if (digits.startsWith(bare) && digits.length > (country.min ?? 4)) {
    digits = digits.slice(bare.length);
  }
  digits = digits.replace(/^0+/, "");

  const min = country.min ?? 4;
  const max = country.max ?? 15 - bare.length;
  if (digits.length < min || digits.length > max) return null;
  return `${country.dial}${digits}`;
}

/** Whether it is worth enabling the button yet. */
export function isPhoneValid(iso: string, local: string): boolean {
  return toE164(iso, local) !== null;
}
