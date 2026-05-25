/**
 * Member feedback. Pre-launch: empty array. Component returns null when
 * the array is empty, so no section renders on the home page until we
 * have real, consented quotes. (Previous fabricated "Sarah / Marcus /
 * Alex" entries were removed before launch to avoid ASA/CAP 3.7 risk.)
 */

export type Testimonial = {
  id: string;
  quote: string;
  name: string;
  raceTime?: string;
  city?: string;
  programme?: string;
  image?: string;
  illustrative?: boolean;
};

export const TESTIMONIALS: Testimonial[] = [];
