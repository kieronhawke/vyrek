/**
 * Coach hub data (brief §8.9). James is the founding coach; the rest are
 * explicitly placeholder slots (never faked).
 */

export type Coach = {
  slug: string;
  name: string;
  role: string;
  credentials: string[];
  bio?: string;
  socials?: { instagram?: string; tiktok?: string };
  comingSoon?: boolean;
  /** Looping background video (Pexels CDN). DEMO until a real portrait clip lands. */
  video?: { src: string; poster?: string };
  /** Static portrait image — preferred over video where available. */
  image?: string;
};

export const COACHES: Coach[] = [
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
    socials: {
      instagram: "https://instagram.com/jameswright",
      tiktok: "https://tiktok.com/@jameswright",
    },
    image: "/media/images/coach-james-wright.jpg",
    // Video fallback kept while real coach clip pending.
    video: {
      src: "https://videos.pexels.com/video-files/6296583/6296583-uhd_2560_1080_25fps.mp4",
      poster: "/posters/6296583.jpg",
    },
  },
  {
    slug: "coach-2",
    name: "—",
    role: "COMING SOON",
    credentials: [],
    comingSoon: true,
  },
  {
    slug: "coach-3",
    name: "—",
    role: "COMING SOON",
    credentials: [],
    comingSoon: true,
  },
];
