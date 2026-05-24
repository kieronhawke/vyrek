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
    // Socials will be linked when verified accounts are published.
    //
    // Image + poster moved off the all-purpose Pexels coach shot to h1
    // (the real Adobe Stock photoshoot in /photos). Warmer register
    // suits the Coach hub tile; the Hero still uses the Pexels shot
    // for its colder cinematic backdrop.
    image: "/media/images/v2/coach-james-wright-warm.jpg",
    video: {
      src: "https://videos.pexels.com/video-files/6296583/6296583-uhd_2560_1080_25fps.mp4",
      poster: "/media/images/v2/coach-james-wright-warm.jpg",
    },
    kind: "coach",
  },
  {
    slug: "coach-2",
    name: "Coach two",
    role: "JOINING 2026",
    credentials: [],
    bio: "We are recruiting our second Elite 15 coach now. Profile announced when contracts are signed.",
    // Placeholder portrait. Heavily desaturated + dimmed in the tile so it
    // reads as "person, not yet introduced" without misrepresenting the
    // stock model as a real coach. Swap when contracts are signed.
    image: "/media/images/v2/diverse-1.jpg",
    kind: "principle",
  },
  {
    slug: "coach-3",
    name: "Coach three",
    role: "JOINING 2026",
    credentials: [],
    bio: "Third coach onboarding in parallel. Programme split across First Race, Sub-90, Doubles, and Pro as the team grows.",
    image: "/media/images/v2/diverse-2.jpg",
    kind: "principle",
  },
];
