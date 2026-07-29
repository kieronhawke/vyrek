/**
 * Suth Performance training footage, shot with Ben and Harry on track and
 * in the gym. Owner-supplied, free for our commercial use. Originals live
 * outside the repo (photos/suth-track/, gitignored); these are web encodes
 * (1280x720, H.264, muted, faststart). See docs/assets/asset-database.md.
 */

export type BrandVideo = {
  /** Source clip id in the asset database (e.g. C0094) */
  id: string;
  /** Self-hosted MP4 under public/ */
  src: string;
  /** Optional poster image, used as fallback + initial frame */
  poster?: string;
  /** A short editorial description so we can tell them apart later */
  description: string;
};

export const VIDEOS = {
  trackPairApproach: {
    id: "C0094",
    // 8s loop, pair running front-on down the straight in golden light,
    // ends on an upper-body close-up. Hero backdrop; the hero wrapper
    // applies grayscale so it renders black and white on site.
    src: "/hero.mp4",
    poster: "/media/images/track/pair-frontal-bw.jpg",
    description: "Ben and Harry running front-on down the track straight, hero backdrop",
  },
  trackSidePan: {
    id: "C0096",
    src: "/media/videos/track-sidepan-loop.mp4",
    poster: "/media/images/track/straight-elevated-bw.jpg",
    description: "Side pan of the pair striding down the straight, long shadows",
  },
  trackSunflare: {
    id: "C0102",
    src: "/media/videos/track-sunflare-loop.mp4",
    poster: "/media/images/track/sunflare-stride-bw.jpg",
    description: "Low track-level sun flare, runners pass in the distance",
  },
  gymRow: {
    id: "C0086",
    src: "/media/videos/gym-row-loop.mp4",
    poster: "/media/images/track/under-stands-kit-bw.jpg",
    description: "Close-up rowing erg effort in the gym",
  },
} satisfies Record<string, BrandVideo>;
