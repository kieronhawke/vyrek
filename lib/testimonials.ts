/**
 * Testimonials.
 *
 * ⚠️ DEMO CONTENT — placeholder names with realistic quotes for the layout.
 *    UK ASA (CAP code 3.7) prohibits invented endorsements once a product is
 *    publicly marketed. These entries must be replaced with consented, real
 *    member quotes before launch. Phase G migrates this to Sanity.
 */

export type Testimonial = {
  id: string;
  quote: string;
  name: string;
  raceTime?: string;
  city?: string;
  programme?: string;
  /** Portrait image path — referenced in components/marketing/testimonials.tsx */
  image?: string;
};

export const TESTIMONIALS: Testimonial[] = [
  {
    id: "demo-first-race",
    quote:
      "Vyrek got me to my first Hyrox finish feeling fresh. 92 minutes when I'd planned for 105. The structure made the difference.",
    name: "Sarah",
    raceTime: "92:11",
    city: "Bristol",
    programme: "First Race",
    image: "/media/images/testimonial-1.jpg",
  },
  {
    id: "demo-sub-90",
    quote:
      "Broke 85 minutes after three years stuck at 95. The Sub-90 programme actually delivers on the name.",
    name: "Marcus",
    raceTime: "84:42",
    city: "Manchester",
    programme: "Sub-90",
    image: "/media/images/testimonial-2.jpg",
  },
  {
    id: "demo-doubles",
    quote:
      "The Doubles programme is the only one I've found that builds station handoff strategy. We knocked 11 minutes off our previous time.",
    name: "Alex & Jamie",
    city: "Edinburgh",
    programme: "Doubles",
    image: "/media/images/coach-james-wright.jpg",
  },
];
