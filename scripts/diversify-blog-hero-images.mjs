#!/usr/bin/env node
/**
 * Stage 9.1 — diversify blog hero images.
 *
 * Maps each post filename to a topical hero from /public/media/images/v2/
 * so visual variety improves without sourcing 48 new stock images.
 * Safe: only rewrites the `heroImage:` line in frontmatter; leaves body
 * + alt text untouched. Idempotent.
 */
import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const BLOG_DIR = path.resolve("content/blog");
const IMG = (n) => `/media/images/v2/${n}`;

// Topic buckets, evaluated top-down. First matching keyword wins.
const RULES = [
  { kw: ["doubles"], img: ["programme-doubles.jpg", "testimonial-doubles.jpg"] },
  { kw: ["sled-pull", "sled push"], img: ["video-sled-pull.jpg"] },
  { kw: ["sled"], img: ["video-sled-pull.jpg", "programme-sub-90-v2.jpg"] },
  { kw: ["ski-erg"], img: ["video-ski-erg.jpg"] },
  { kw: ["burpee"], img: ["video-burpee.jpg"] },
  { kw: ["farmers"], img: ["video-farmers.jpg"] },
  { kw: ["recovery", "sleep", "taper"], img: ["video-recovery.jpg", "honesty-fresh.jpg"] },
  { kw: ["wall-ball"], img: ["station-fresh.jpg"] },
  { kw: ["sandbag", "lunge"], img: ["station-fresh.jpg", "workout-dated.jpg"] },
  { kw: ["rowing", "row"], img: ["video-ski-erg.jpg", "workout-dated.jpg"] },
  { kw: ["nutrition"], img: ["metrics-fresh.jpg", "honesty-fresh.jpg"] },
  { kw: ["heat", "warm-up", "warmup"], img: ["how-step-1.jpg", "workout-dated.jpg"] },
  { kw: ["pacing", "first-5km", "mid-race", "mental"], img: ["diverse-1.jpg", "diverse-2.jpg", "about-portrait.jpg"] },
  { kw: ["transition", "flow"], img: ["adapt-coaching.jpg", "how-step-2.jpg"] },
  { kw: ["plateau", "offseason"], img: ["bento-progress.jpg", "metrics-fresh.jpg"] },
  { kw: ["12-week-plan", "12-week-hyrox", "training-week", "weekly-nutrition"], img: ["bento-plan.jpg", "workout-dated.jpg"] },
  { kw: ["beginner", "couch-to", "first-hyrox"], img: ["programme-first-race.jpg", "how-step-1.jpg"] },
  { kw: ["sub-90", "secret"], img: ["programme-sub-90-v2.jpg"] },
  { kw: ["world-championship", "qualifying", "pro"], img: ["programme-pro.jpg"] },
  { kw: ["parent", "kids", "young", "shift", "masters", "over-40"], img: ["diverse-2.jpg", "about-outdoor.jpg"] },
  { kw: ["women"], img: ["testimonial-sarah.jpg", "diverse-1.jpg"] },
  { kw: ["crossfit", "spartan", "deka", "vs"], img: ["bento-coaches.jpg", "partners-coach-warm.jpg"] },
  { kw: ["uk-calendar", "london", "manchester", "race-day"], img: ["hero-cinematic.jpg", "about-coaching.jpg"] },
  { kw: ["kit", "checklist", "cheapest"], img: ["workout-dated.jpg", "station-fresh.jpg"] },
  { kw: ["station-weights", "strength"], img: ["station-fresh.jpg", "video-sled-pull.jpg"] },
];

function pickImage(slug, index) {
  for (const rule of RULES) {
    if (rule.kw.some((k) => slug.includes(k))) {
      return IMG(rule.img[index % rule.img.length]);
    }
  }
  // Fallback rotation across rest of catalogue if nothing matched
  const fallback = ["adapt-coaching.jpg", "bento-plan.jpg", "workout-dated.jpg", "station-fresh.jpg", "metrics-fresh.jpg"];
  return IMG(fallback[index % fallback.length]);
}

const files = (await readdir(BLOG_DIR)).filter((f) => f.endsWith(".mdx")).sort();
let changed = 0;
const usage = new Map();

for (let i = 0; i < files.length; i++) {
  const file = files[i];
  const slug = file.replace(/\.mdx$/, "");
  const fullPath = path.join(BLOG_DIR, file);
  const src = await readFile(fullPath, "utf8");

  const newImage = pickImage(slug, i);
  usage.set(newImage, (usage.get(newImage) || 0) + 1);

  const updated = src.replace(
    /^heroImage:\s*".*?"/m,
    `heroImage: "${newImage}"`,
  );
  if (updated !== src) {
    await writeFile(fullPath, updated, "utf8");
    changed++;
  }
}

console.log(`Updated ${changed}/${files.length} blog posts.`);
console.log("\nFinal distribution:");
for (const [img, count] of [...usage.entries()].sort((a, b) => b[1] - a[1])) {
  console.log(`  ${count.toString().padStart(2)} × ${img.replace("/media/images/v2/", "")}`);
}
