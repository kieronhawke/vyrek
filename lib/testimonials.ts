/**
 * Member feedback.
 *
 * Empty by default. UK ASA / CAP code 3.7 prohibits invented endorsements
 * once a product is publicly marketed. Entries must be added only after the
 * member has given written consent (email + signed waiver) and any race
 * times referenced match an objectively verifiable result. The marketing
 * homepage `<Testimonials />` component hides itself when the array is empty,
 * so the build still ships cleanly.
 *
 * Schema kept so consented entries can be appended without re-wiring the UI.
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

export const TESTIMONIALS: Testimonial[] = [];
