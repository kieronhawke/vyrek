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
  "james-wright": {
    slug: "james-wright",
    name: "James Wright",
    role: "Founding coach · Elite 15 athlete",
    bio: "James races at Elite 15. Top 50 at the 2025 Hyrox World Championships. Programmed for over 200 first-time finishers before Vyrek launched.",
    photo: "/media/images/coach-james-wright.jpg",
    sameAs: [
      "https://instagram.com/jameswright.hyrox",
      "https://www.linkedin.com/in/jameswright-hyrox",
    ],
  },
  "vyrek-team": {
    slug: "vyrek-team",
    name: "The Vyrek team",
    role: "Coaches and editors",
    bio: "The Vyrek programming team — Elite 15 athletes and S&C coaches who've raced Hyrox at every level.",
    photo: "/media/images/bento-coaches.jpg",
    sameAs: [
      "https://instagram.com/vyrek",
      "https://tiktok.com/@vyrek",
    ],
  },
};
