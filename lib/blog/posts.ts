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

export const CATEGORIES: Record<
  Category,
  { label: string; description: string }
> = {
  "first-race": {
    label: "First race",
    description:
      "Step-by-step preparation for your first Hyrox. Build a base, train smart, finish strong.",
  },
  training: {
    label: "Training",
    description:
      "Programming, periodisation, and the week-by-week structure that gets you race-ready.",
  },
  technique: {
    label: "Technique",
    description:
      "Station-by-station how-tos from coaches who've done the work. Drills, scaling, and cues.",
  },
  nutrition: {
    label: "Nutrition",
    description: "What to eat before, during, and after, without the noise.",
  },
  "race-day": {
    label: "Race day",
    description: "Pacing, warm-up, mental cues, and the small things that make a big difference.",
  },
  recovery: {
    label: "Recovery",
    description:
      "Sleep, mobility, and the boring habits that compound across a 12-week build.",
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

  const authorSlug = (fm.author as string | undefined) ?? "vyrek-team";
  const author = AUTHORS[authorSlug] ?? AUTHORS["vyrek-team"];

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
      (fm.heroImage as string) ?? "/media/images/programme-first-race.jpg",
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

// Cache the parsed posts within a single server run.
let cached: Promise<Post[]> | null = null;

export function listPosts(): Promise<Post[]> {
  if (cached) return cached;
  cached = (async () => {
    const files = await readAllMdxFiles();
    const posts = (
      await Promise.all(files.map((f) => parseFile(f)))
    ).filter((p): p is Post => p !== null);
    // Newest first
    posts.sort((a, b) => (a.publishedAt > b.publishedAt ? -1: 1));
    return posts;
  })();
  return cached;
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
  scored.sort((a, b) => b.score - a.score || (a.p.publishedAt < b.p.publishedAt ? 1: -1));
  return scored.slice(0, limit).map((s) => s.p);
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
