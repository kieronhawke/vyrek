/**
 * Coach hub data. Ben Sutherland is the founder and head coach. The other
 * two tiles describe the *method* behind the programming rather than faking
 * additional coaches. All athlete claims are verified.
 */

export type CoachTile = {
  slug: string;
  name: string;
  role: string;
  credentials: string[];
  bio?: string;
  socials?: { instagram?: string; tiktok?: string };
  /** Looping background video (Pexels CDN) used on the public hub tile. */
  video?: { src: string; poster?: string };
  /** Static portrait image, preferred over video where available. */
  image?: string;
  /** Marks the tile as a methodology/principle card rather than a person. */
  kind?: "coach" | "principle";
};

// Backwards-compat alias, older components still import `Coach`.
export type Coach = CoachTile;

export const COACHES: CoachTile[] = [
  {
    slug: "ben-sutherland",
    name: "Ben Sutherland",
    role: "FOUNDER · HEAD COACH",
    credentials: ["HYROX ELITE 15", "PRO DOUBLES RACE WINNER", "BEGINNER TO PRO COACHING"],
    bio: "Ben Sutherland races in the HYROX Elite 15, competing in Doubles with his brother Harry. He qualified for the Elite 15 at Miami, has multiple Pro Doubles wins including Rotterdam and Glasgow, and his best Doubles times sit around the 49 to 51 minute mark. He coaches athletes from their first race to professional level.",
    socials: { instagram: "https://instagram.com/bennysuth95" },
    // PLACEHOLDER: replace with Ben's real portrait when supplied.
    image: "/media/images/ben/ben-portrait-placeholder.jpg",
    kind: "coach",
  },
  {
    slug: "the-method",
    name: "The method",
    role: "HOW THE PROGRAMMING WORKS",
    credentials: [],
    bio: "Structured, progressive blocks that work backwards from the eight stations and eight runs. Every week is dated to your race, rebuilt each Sunday from what you logged.",
    image: "/media/images/v2/coach-2.jpg",
    kind: "principle",
  },
  {
    slug: "the-standard",
    name: "The standard",
    role: "WHAT EVERY ATHLETE GETS",
    credentials: [],
    bio: "The same structure Ben uses to prepare for Elite 15 racing, scaled to your level. First-timer or pro, the programming principles do not change. The loading does.",
    image: "/media/images/v2/coach-3.jpg",
    kind: "principle",
  },
];
