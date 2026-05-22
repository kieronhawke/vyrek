/**
 * Stock training footage from Pexels — used as looping background video
 * across the marketing site.
 *
 * All clips are CC0 / Pexels license — free for commercial use, attribution
 * not required but appreciated (we link Pexels in the footer when shipping).
 * Originals at https://www.pexels.com/video/{id}/.
 */

export type StockVideo = {
  /** Pexels video id (also the URL slug suffix on the page) */
  id: string;
  /** Direct CDN MP4 — fine to hot-link, Pexels permits this */
  src: string;
  /** Optional poster image — Pexels CDN, used as fallback + initial frame */
  poster?: string;
  /** A short editorial description so we can tell them apart later */
  description: string;
};

export const VIDEOS = {
  manBattleRopes: {
    id: "18573489",
    // Self-hosted at SD 960x540 (3.3MB) — eliminates third-party-cookie BP
    // hit on the LCP-critical hero. Original at Pexels:
    // https://www.pexels.com/video/{id}/
    src: "/hero.mp4",
    poster: "/posters/18573489.jpg",
    description: "Man performing battle ropes in a dark gym — hero backdrop",
  },
  manWorkingOut: {
    id: "6296583",
    src: "https://videos.pexels.com/video-files/6296583/6296583-uhd_2560_1080_25fps.mp4",
    poster: "/posters/6296583.jpg",
    description: "Man training — coach tile",
  },
  womanBoxJumps: {
    id: "7674511",
    src: "https://videos.pexels.com/video-files/7674511/7674511-uhd_2732_1440_25fps.mp4",
    poster: "/posters/7674511.jpg",
    description: "Woman box jumps — Elite 15 bento card atmosphere",
  },
  womanRopes: {
    id: "8520584",
    src: "https://videos.pexels.com/video-files/8520584/8520584-uhd_2732_1122_25fps.mp4",
    description: "Woman battle ropes in urban gym — plan teaser preview",
  },
} satisfies Record<string, StockVideo>;
