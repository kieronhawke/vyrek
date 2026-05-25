/**
 * The four Phase 1 programmes (brief §8.5). Slugs match `/quiz?program=<slug>`
 * entry-point shortcuts. Phase G replaces this with Sanity content.
 */

export type Programme = {
  slug: "first-race" | "sub-90" | "doubles" | "pro";
  name: string;
  tag: string;
  audience: string;
  weeks: number;
  difficulty: "Beginner" | "Intermediate" | "Advanced" | "Partner";
  /** Background image (Pexels poster. DEMO, swap for Hyrox station imagery). */
  image: string;
};

export const PROGRAMMES: Programme[] = [
  {
    slug: "first-race",
    name: "First Race",
    tag: "BEGINNER / 12 WEEKS",
    audience: "Never raced. Build to your first finish line.",
    weeks: 12,
    difficulty: "Beginner",
    image: "/media/images/v2/programme-first-race.jpg",
  },
  {
    slug: "sub-90",
    name: "Sub-90",
    tag: "INTERMEDIATE / 12 WEEKS",
    audience: "Completed Hyrox. Break the 90-minute barrier.",
    weeks: 12,
    difficulty: "Intermediate",
    image: "/media/images/v2/programme-sub-90-v2.jpg",
  },
  {
    slug: "doubles",
    name: "Doubles",
    tag: "PARTNER / 12 WEEKS",
    audience: "Train together. Race together. One plan, two athletes.",
    weeks: 12,
    difficulty: "Partner",
    image: "/media/images/v2/programme-doubles.jpg",
  },
  {
    slug: "pro",
    name: "Pro",
    tag: "ADVANCED / 12 WEEKS",
    audience: "Sub-75 athletes chasing podiums.",
    weeks: 12,
    difficulty: "Advanced",
    image: "/media/images/v2/programme-pro.jpg",
  },
];
