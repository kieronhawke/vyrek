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
  /** Background image (Pexels poster — DEMO, swap for Hyrox station imagery). */
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
    image: "/posters/7674511.jpg",
  },
  {
    slug: "sub-90",
    name: "Sub-90",
    tag: "INTERMEDIATE / 12 WEEKS",
    audience: "Completed Hyrox. Break the 90-minute barrier.",
    weeks: 12,
    difficulty: "Intermediate",
    image: "/posters/6296583.jpg",
  },
  {
    slug: "doubles",
    name: "Doubles",
    tag: "PARTNER / 12 WEEKS",
    audience: "Train together. Race together. One plan, two athletes.",
    weeks: 12,
    difficulty: "Partner",
    image: "/posters/8343383.jpg",
  },
  {
    slug: "pro",
    name: "Pro",
    tag: "ADVANCED / 12 WEEKS",
    audience: "Sub-75 athletes chasing podiums.",
    weeks: 12,
    difficulty: "Advanced",
    image: "/posters/18573489.jpg",
  },
];
