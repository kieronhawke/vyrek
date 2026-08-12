/**
 * Blog post loader. Reads MDX files from /content/blog at build time, parses
 * frontmatter, and returns a typed list. Designed to be swap-out-able for a
 * future Sanity-backed implementation, the public API (Post type, listPosts,
 * getPost, etc.) stays the same.
 *
 * Server-only: imports `fs`. Don't call from client components.
 */

import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import readingTime from "reading-time";
import { AUTHORS, type Author } from "@/lib/blog/authors";

const POSTS_DIR = path.join(process.cwd(), "content", "blog");

export type Faq = { q: string; a: string };

export type PostMeta = {
  slug: string;
  title: string;
  excerpt: string;
  category: Category;
  tags: string[];
  publishedAt: string; // ISO date
  updatedAt?: string; // ISO date
  authorSlug: string;
  author: Author;
  heroImage: string;
  heroAlt: string;
  seoTitle?: string;
  seoDescription?: string;
  faqs?: Faq[];
  /** Reading time minutes (rounded up) */
  readingMinutes: number;
  /** Wordcount */
  words: number;
  /** Show in featured slot on /blog index */
  featured?: boolean;
};

export type Post = PostMeta & {
  content: string;
};

export type Category =
  | "first-race"
  | "training"
  | "technique"
  | "nutrition"
  | "race-day"
  | "recovery";

/* `description` is the blurb printed under the category heading, so it is
   written to be read. `metaDescription` is the <meta> tag only: the crawl on
   2026-08-03 found these categories serving 57-93 character descriptions,
   which wastes the one line of the SERP we control. Padding the visible
   blurb to fix that would have made the page worse. */
export const CATEGORIES: Record<
  Category,
  { label: string; description: string; metaDescription: string }
> = {
  "first-race": {
    label: "First race",
    description:
      "Step-by-step preparation for your first Hyrox. Build a base, train smart, finish strong.",
    metaDescription:
      "Everything you need for a first Hyrox: how the race works, how long to train, what to expect on the day, and how to pace it so the back half does not fall apart.",
  },
  training: {
    label: "Training",
    description:
      "Programming, periodisation, and the week-by-week structure that gets you race-ready.",
    metaDescription:
      "Hyrox training guides: how to build a week, structure a twelve-week block, taper properly, and train the compromised running that decides most finish times.",
  },
  technique: {
    label: "Technique",
    description:
      "Station-by-station how-tos from coaches who've done the work. Drills, scaling, and cues.",
    metaDescription:
      "Station-by-station Hyrox technique: cues, common faults and the drills that fix them, across the SkiErg, both sleds, burpees, row, carry, lunges and wall balls.",
  },
  nutrition: {
    label: "Nutrition",
    description: "What to eat before, during, and after, without the noise.",
    metaDescription:
      "What to eat around Hyrox training and racing: fuelling a twelve-week block, race-week carbs, race-morning timing, and what to take on the course itself.",
  },
  "race-day": {
    label: "Race day",
    description: "Pacing, warm-up, mental cues, and the small things that make a big difference.",
    metaDescription:
      "Hyrox race day: pacing plans, warm-up, the Roxzone, what to pack, how waves and start times work, and the small decisions that cost or save real minutes.",
  },
  recovery: {
    label: "Recovery",
    description:
      "Sleep, mobility, and the boring habits that compound across a 12-week build.",
    metaDescription:
      "Recovering from Hyrox training and racing: sleep, mobility, deload weeks, and how long to leave between races so the next block starts from a good place.",
  },
};

async function readAllMdxFiles(): Promise<string[]> {
  try {
    const entries = await fs.readdir(POSTS_DIR);
    return entries.filter((e) => e.endsWith(".mdx"));
  } catch {
    return [];
  }
}

async function parseFile(filename: string): Promise<Post | null> {
  const file = await fs.readFile(path.join(POSTS_DIR, filename), "utf8");
  const parsed = matter(file);
  const fm = parsed.data as Record<string, unknown>;
  const slug =
    (fm.slug as string | undefined) ?? filename.replace(/\.mdx$/, "");

  const authorSlug = (fm.author as string | undefined) ?? "suth-team";
  const author = AUTHORS[authorSlug] ?? AUTHORS["suth-team"];

  const category = (fm.category as Category | undefined) ?? "training";
  if (!CATEGORIES[category]) {
     
    console.warn(`[blog] unknown category '${category}' in ${filename}`);
  }

  const rt = readingTime(parsed.content);

  return {
    slug,
    title: (fm.title as string) ?? slug,
    excerpt: (fm.excerpt as string) ?? "",
    category,
    tags: Array.isArray(fm.tags) ? (fm.tags as string[]): [],
    publishedAt:
      (fm.publishedAt as string) ?? new Date().toISOString().slice(0, 10),
    updatedAt: fm.updatedAt as string | undefined,
    authorSlug,
    author,
    heroImage:
      (fm.heroImage as string) ?? "/media/images/track/programme-first-race.jpg",
    heroAlt: (fm.heroAlt as string) ?? "",
    seoTitle: fm.seoTitle as string | undefined,
    seoDescription: fm.seoDescription as string | undefined,
    faqs: Array.isArray(fm.faqs) ? (fm.faqs as Faq[]): undefined,
    readingMinutes: Math.max(1, Math.ceil(rt.minutes)),
    words: Math.round(rt.words),
    featured: fm.featured === true,
    content: parsed.content,
  };
}

// Only the FILE posts are cached per server run: they cannot change
// without a deploy. Database overrides are fetched fresh on every call,
// because they change the moment Ben presses save in the admin and a
// warm lambda holding a stale merge would keep serving his old words.
let cachedFiles: Promise<Post[]> | null = null;

export function listFilePosts(): Promise<Post[]> {
  if (cachedFiles) return cachedFiles;
  cachedFiles = (async () => {
    const files = await readAllMdxFiles();
    return (await Promise.all(files.map((f) => parseFile(f)))).filter(
      (p): p is Post => p !== null,
    );
  })();
  return cachedFiles;
}

/** A database row shaped into the same Post the file parser produces. */
function dbRowToPost(row: import("@/lib/blog/store").BlogPostRow): Post {
  const rt = readingTime(row.content);
  const category = (
    CATEGORIES[row.category as Category] ? row.category : "training"
  ) as Category;
  return {
    slug: row.slug,
    title: row.title || row.slug,
    excerpt: row.excerpt,
    category,
    tags: row.tags,
    publishedAt: row.publishedAt,
    updatedAt: row.updatedAtISO.slice(0, 10),
    authorSlug: row.authorSlug,
    author: AUTHORS[row.authorSlug] ?? AUTHORS["suth-team"],
    heroImage:
      row.heroImage || "/media/images/track/programme-first-race.jpg",
    heroAlt: row.heroAlt ?? "",
    seoTitle: row.seoTitle ?? undefined,
    seoDescription: row.seoDescription ?? undefined,
    faqs: undefined,
    readingMinutes: Math.max(1, Math.ceil(rt.minutes)),
    words: Math.round(rt.words),
    featured: row.featured,
    content: row.content,
  };
}

export async function listPosts(): Promise<Post[]> {
  const [files, overrides] = await Promise.all([
    listFilePosts(),
    import("@/lib/blog/store").then((m) => m.listDbPosts()),
  ]);

  // Start from the files, then let each row hide, replace, or add.
  // Drafts change nothing publicly: a drafted edit of a live file post
  // leaves the file version up until it is published.
  const bySlug = new Map(files.map((p) => [p.slug, p] as const));
  for (const row of overrides) {
    if (row.status === "hidden") bySlug.delete(row.slug);
    else if (row.status === "published") bySlug.set(row.slug, dbRowToPost(row));
  }

  const posts = Array.from(bySlug.values());
  /* Newest first, then slug, so the order is deterministic.
     The old comparator never returned 0, so for the hundred-odd posts
     sharing a publish date the result was whatever the sort happened to
     do with an inconsistent comparator. That matters more than it sounds:
     hero images are assigned so that no two neighbouring cards share one,
     and a listing order that can move invalidates that the moment anything
     is re-parsed in a different order. */
  posts.sort((a, b) =>
    a.publishedAt === b.publishedAt
      ? a.slug.localeCompare(b.slug)
      : a.publishedAt > b.publishedAt
        ? -1
        : 1,
  );
  return posts;
}

/**
 * For the admin and the preview page only: a post in ANY state, database
 * version first so Ben always sees his latest words, drafts included.
 */
export async function getAnyPost(slug: string): Promise<Post | null> {
  const { getDbPost } = await import("@/lib/blog/store");
  const row = await getDbPost(slug);
  if (row) return dbRowToPost(row);
  const files = await listFilePosts();
  return files.find((p) => p.slug === slug) ?? null;
}

export async function listPostMeta(): Promise<PostMeta[]> {
  const posts = await listPosts();
  return posts.map(({ content: _content, ...rest }) => rest);
}

export async function getPost(slug: string): Promise<Post | null> {
  const posts = await listPosts();
  return posts.find((p) => p.slug === slug) ?? null;
}

export async function listPostsByCategory(
  category: Category,
): Promise<PostMeta[]> {
  const posts = await listPostMeta();
  return posts.filter((p) => p.category === category);
}

export async function listPostsByAuthor(
  authorSlug: string,
): Promise<PostMeta[]> {
  const posts = await listPostMeta();
  return posts.filter((p) => p.authorSlug === authorSlug);
}

export async function listRelatedPosts(
  slug: string,
  limit = 3,
): Promise<PostMeta[]> {
  const posts = await listPostMeta();
  const current = posts.find((p) => p.slug === slug);
  if (!current) return [];
  // Score by shared category and shared tags.
  const others = posts.filter((p) => p.slug !== slug);
  const scored = others.map((p) => {
    let score = 0;
    if (p.category === current.category) score += 3;
    const sharedTags = p.tags.filter((t) => current.tags.includes(t)).length;
    score += sharedTags * 2;
    return { p, score };
  });
  scored.sort(
    (a, b) =>
      b.score - a.score ||
      (a.p.publishedAt === b.p.publishedAt
        ? a.p.slug.localeCompare(b.p.slug)
        : a.p.publishedAt < b.p.publishedAt
          ? 1
          : -1),
  );

  /* Never put the same photograph in two cards of one strip.
     Hero images are assigned so that no two neighbouring cards on the index
     or a category page share one, but related posts are ordered by relevance,
     which is a different order per post and cannot be pre-solved for all 120.
     So the rule is enforced here, where the list is actually built: take the
     highest-scoring post whose hero is not already in this strip, and only
     fall back to a repeat if the pool genuinely runs out. */
  const picked: PostMeta[] = [];
  const usedImages = new Set<string>();
  for (const { p } of scored) {
    if (picked.length >= limit) break;
    if (p.heroImage && usedImages.has(p.heroImage)) continue;
    picked.push(p);
    if (p.heroImage) usedImages.add(p.heroImage);
  }
  if (picked.length < limit) {
    for (const { p } of scored) {
      if (picked.length >= limit) break;
      if (!picked.includes(p)) picked.push(p);
    }
  }
  return picked;
}

export async function listFeaturedPosts(limit = 1): Promise<PostMeta[]> {
  const posts = await listPostMeta();
  const featured = posts.filter((p) => p.featured);
  if (featured.length) return featured.slice(0, limit);
  return posts.slice(0, limit);
}

/** Helper for sitemap/RSS, every post slug. */
export async function allSlugs(): Promise<string[]> {
  const posts = await listPostMeta();
  return posts.map((p) => p.slug);
}
