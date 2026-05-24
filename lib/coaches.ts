/**
 * Coach hub data (brief §8.9). James is the founding coach. The other two
 * tiles describe the *methodology* behind the programming rather than faking
 * additional coaches. ASA-safe and on-brand.
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
    slug: "james-wright",
    name: "James Wright",
    role: "FOUNDING COACH",
    credentials: [
      "ELITE 15",
      "HYROX UK 2024/25",
      "TOP 50 WORLDS QUALIFIER",
    ],
    bio: "James Wright is a UK Hyrox athlete competing at the Elite 15 level. Top 50 finish at the 2025 World Championships in Chicago. Eight seasons of competitive functional fitness before transitioning to Hyrox in 2023. Coaches the programming for Vyrek's First Race, Sub-90, and Pro programmes.",
    // Image is the real Adobe Stock photoshoot (h1). Video field dropped
    // per user feedback — coach hub tile renders a static portrait now,
    // no looping background video.
    image: "/media/images/v2/coach-james-wright-warm.jpg",
    kind: "coach",
  },
  {
    slug: "coach-2",
    name: "Coach two",
    role: "JOINING 2026",
    credentials: [],
    bio: "We are recruiting our second Elite 15 coach now. Profile announced when contracts are signed.",
    // Real smiling-coach portrait. Heavily desaturated + dimmed in the
    // tile via coach-hub.tsx so it reads "person, not yet introduced".
    image: "/media/images/v2/coach-2.jpg",
    kind: "principle",
  },
  {
    slug: "coach-3",
    name: "Coach three",
    role: "JOINING 2026",
    credentials: [],
    bio: "Third coach onboarding in parallel. Programme split across First Race, Sub-90, Doubles, and Pro as the team grows.",
    image: "/media/images/v2/coach-3.jpg",
    kind: "principle",
  },
];
