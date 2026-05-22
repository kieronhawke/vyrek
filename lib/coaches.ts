/**
 * Coach hub data (brief §8.9). James is the founding coach. The other two
 * tiles describe the *methodology* behind the programming rather than faking
 * additional coaches — ASA-safe and on-brand.
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
  /** Static portrait image — preferred over video where available. */
  image?: string;
  /** Marks the tile as a methodology/principle card rather than a person. */
  kind?: "coach" | "principle";
};

// Backwards-compat alias — older components still import `Coach`.
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
    image: "/media/images/coach-james-wright.jpg",
    video: {
      src: "https://videos.pexels.com/video-files/6296583/6296583-uhd_2560_1080_25fps.mp4",
      poster: "/posters/6296583.jpg",
    },
    kind: "coach",
  },
  {
    slug: "built-in-house",
    name: "Built in-house",
    role: "PROGRAMMING",
    credentials: ["WRITTEN WEEKLY", "NO OUTSOURCED TEMPLATES"],
    bio: "Every Vyrek workout is written and reviewed by our coaching team each week. We don't sell a generic template library and call it personalised — your plan is regenerated whenever the inputs change (logged sessions, race date, injury status). When new evidence lands from a major race weekend, the next Sunday's recalibration carries it.",
    kind: "principle",
  },
  {
    slug: "race-day-tested",
    name: "Race-day tested",
    role: "VALIDATION",
    credentials: ["UPDATED EACH SEASON", "TIME-IN-STATION DATA"],
    bio: "We treat the Hyrox calendar as the validation set. After every Major and World Championship event, the coaching team reviews station times and decision points from the broadcast, our own race-tape, and athlete logs. What works gets folded into the next programming cycle. What doesn't gets cut, even if it looked good on paper.",
    kind: "principle",
  },
];
