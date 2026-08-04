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
  /** How somebody in that country writes their own number. */
  example: string;
  /** Digits after the dial code, for a sanity check rather than a rule. */
  min: number;
  max: number;
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
  if (digits.startsWith(bare) && digits.length > country.min) {
    digits = digits.slice(bare.length);
  }
  digits = digits.replace(/^0+/, "");
  if (digits.length < country.min || digits.length > country.max) return null;
  return `${country.dial}${digits}`;
}

/** Whether it is worth enabling the button yet. */
export function isPhoneValid(iso: string, local: string): boolean {
  return toE164(iso, local) !== null;
}
