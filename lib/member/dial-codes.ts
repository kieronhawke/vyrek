/**
 * COUNTRY DIALLING CODES.
 *
 * The phone field was a bare text box with a "07…" placeholder, which quietly
 * assumes everybody is in the UK. Ben coaches remotely; an athlete in Dublin,
 * Sydney or Bangalore types their own number, it is stored without a country
 * code, and the first time anything tries to text them it fails — or worse,
 * reaches a different person on the UK number that string happens to match.
 *
 * Not the full ITU list. Every country Suth has an audience in — the markets
 * the geo pages already cover — plus the ones with large HYROX scenes. A
 * dropdown of 200 entries is worse than one of 40 when 39 of them are noise,
 * and the field accepts a typed code for anywhere not listed.
 */

export type DialCode = {
  /** ISO 3166-1 alpha-2, which is also how the flag emoji is derived. */
  iso: string;
  name: string;
  /** With the plus, because that is how it is written and sent. */
  dial: string;
};

/**
 * Flag from the country code.
 *
 * Regional indicator symbols: 'G','B' → 🇬🇧. Derived rather than stored, so a
 * new country cannot be added with the wrong flag against it.
 */
export function flagFor(iso: string): string {
  return iso
    .toUpperCase()
    .replace(/./g, (c) => String.fromCodePoint(127397 + c.charCodeAt(0)));
}

export const DIAL_CODES: DialCode[] = [
  { iso: "GB", name: "United Kingdom", dial: "+44" },
  { iso: "IE", name: "Ireland", dial: "+353" },
  { iso: "US", name: "United States", dial: "+1" },
  { iso: "CA", name: "Canada", dial: "+1" },
  { iso: "AU", name: "Australia", dial: "+61" },
  { iso: "NZ", name: "New Zealand", dial: "+64" },
  { iso: "ZA", name: "South Africa", dial: "+27" },
  { iso: "IN", name: "India", dial: "+91" },
  { iso: "AE", name: "United Arab Emirates", dial: "+971" },
  { iso: "SG", name: "Singapore", dial: "+65" },
  { iso: "HK", name: "Hong Kong", dial: "+852" },
  { iso: "DE", name: "Germany", dial: "+49" },
  { iso: "FR", name: "France", dial: "+33" },
  { iso: "ES", name: "Spain", dial: "+34" },
  { iso: "IT", name: "Italy", dial: "+39" },
  { iso: "NL", name: "Netherlands", dial: "+31" },
  { iso: "BE", name: "Belgium", dial: "+32" },
  { iso: "AT", name: "Austria", dial: "+43" },
  { iso: "CH", name: "Switzerland", dial: "+41" },
  { iso: "SE", name: "Sweden", dial: "+46" },
  { iso: "NO", name: "Norway", dial: "+47" },
  { iso: "DK", name: "Denmark", dial: "+45" },
  { iso: "FI", name: "Finland", dial: "+358" },
  { iso: "PL", name: "Poland", dial: "+48" },
  { iso: "PT", name: "Portugal", dial: "+351" },
];

export function dialByIso(iso: string): DialCode | undefined {
  return DIAL_CODES.find((d) => d.iso === iso.toUpperCase());
}

/**
 * Split a stored number back into a country and the rest.
 *
 * Longest dial code first, so +1 does not win against a number that is
 * actually +1-something-longer, and so +44 is not mistaken for +4.
 */
export function splitNumber(stored: string): { iso: string; rest: string } {
  const value = stored.trim();
  if (value.startsWith("+")) {
    const byLength = [...DIAL_CODES].sort((a, b) => b.dial.length - a.dial.length);
    for (const d of byLength) {
      if (value.startsWith(d.dial)) {
        return { iso: d.iso, rest: value.slice(d.dial.length).trim() };
      }
    }
  }
  /* No code, or one we do not list. A bare "07…" is almost certainly the UK
     given where the audience is, and guessing that beats losing the digits. */
  return { iso: "GB", rest: value.replace(/^0/, "") };
}

/**
 * Put one back together for storage.
 *
 * A leading zero is a national trunk prefix and is wrong once a country code
 * is in front of it: "+44 07398…" is not a number. Dropped here, in one
 * place, rather than hoped for from whoever typed it.
 */
export function joinNumber(iso: string, rest: string): string {
  const code = dialByIso(iso)?.dial ?? "";
  const digits = rest.replace(/[^\d]/g, "").replace(/^0+/, "");
  if (!digits) return "";
  return `${code}${digits}`;
}

/** Enough to send to. Deliberately loose — numbering plans vary widely. */
export function looksLikeNumber(iso: string, rest: string): boolean {
  const digits = rest.replace(/[^\d]/g, "").replace(/^0+/, "");
  return Boolean(dialByIso(iso)) && digits.length >= 6 && digits.length <= 14;
}
