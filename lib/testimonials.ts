/**
 * Member feedback.
 *
 * ⚠️ PRE-LAUNCH ILLUSTRATIVE CONTENT. The entries below are *labelled as
 *    illustrative* in the UI (badge on each card + section disclaimer) so
 *    visitors are not misled into believing these are sworn endorsements
 *    from real members. This satisfies the spirit of UK ASA / CAP code 3.7
 *    while letting us ship a populated layout for design review.
 *
 *    Replace with consented real member quotes before paid acquisition.
 *    Remove the `illustrative: true` flag on each entry to drop the badge.
 */

export type Testimonial = {
  id: string;
  quote: string;
  name: string;
  raceTime?: string;
  city?: string;
  programme?: string;
  /** Portrait image path, referenced in components/marketing/testimonials.tsx */
  image?: string;
  /** Pre-launch illustrative flag. Renders a "Pre-launch · illustrative"
   * chip on the card so visitors don't mistake the quote for a real
   * endorsement. Drop this when the entry becomes a consented real quote. */
  illustrative?: boolean;
};

export const TESTIMONIALS: Testimonial[] = [
  {
    id: "illustrative-first-race",
    quote:
      "Vyrek got me to my first Hyrox finish feeling fresh. 92 minutes when I'd planned for 105. The structure made the difference.",
    name: "S.",
    raceTime: "92:11",
    city: "Bristol",
    programme: "First Race",
    // Local v2/ stock (was an external Unsplash URL that bypassed Vercel's
    // image optimisation pipeline). Same person-on-track shot, just hosted
    // ourselves so /_next/image can resize + convert to webp on the wire.
    image: "/media/images/v2/testimonial-sarah.jpg",
    illustrative: true,
  },
  {
    id: "illustrative-sub-90",
    quote:
      "Broke 85 minutes after three years stuck at 95. The Sub-90 programme actually delivers on the name.",
    name: "M.",
    raceTime: "84:42",
    city: "Manchester",
    programme: "Sub-90",
    image: "/media/images/v2/testimonial-marcus.jpg",
    illustrative: true,
  },
  {
    id: "illustrative-doubles",
    quote:
      "The Doubles programme is the only one that actually builds station handoff strategy. We knocked 11 minutes off our previous time.",
    name: "A. & J.",
    city: "Edinburgh",
    programme: "Doubles",
    image: "/media/images/v2/testimonial-doubles.jpg",
    illustrative: true,
  },
];
