/**
 * Blog post authors. Stored in code (single source of truth) so author info
 * appears in JSON-LD Person schema with `sameAs` links to their externals.
 */

export type Author = {
  slug: string;
  name: string;
  role: string;
  bio: string;
  photo: string;
  sameAs: string[];
};

export const AUTHORS: Record<string, Author> = {
  "ben-sutherland": {
    slug: "ben-sutherland",
    name: "Ben Sutherland",
    role: "Founder · HYROX Elite 15 athlete",
    bio: "Ben races in the HYROX Elite 15, competing in Doubles with his brother Harry. Pro Doubles wins include Rotterdam and Glasgow. He coaches athletes from their first race to professional level.",
    // Crop from the team shoot; swap for a dedicated headshot if preferred.
    photo: "/media/images/track/coach-avatar-colour.jpg",
    sameAs: ["https://instagram.com/bennysuth95"],
  },
  "suth-team": {
    slug: "suth-team",
    name: "The Suth Performance team",
    role: "Coaches and editors",
    bio: "The Suth Performance programming team, led by HYROX Elite 15 athlete Ben Sutherland.",
    photo: "/media/images/track/trio-stride-colour.jpg",
    sameAs: [],
  },
};
