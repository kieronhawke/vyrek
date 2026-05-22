/**
 * Verify the blog's SEO + UX in one sweep:
 *   - Index page: JSON-LD CollectionPage + Organization + Breadcrumb
 *   - Post page: BlogPosting + BreadcrumbList + Person + (FAQPage)
 *   - Canonical URLs, og:image, twitter:card
 *   - <link rel="alternate" type="application/rss+xml"> present
 *   - Headings hierarchy correct (one h1 per page)
 *   - Images have alt text
 *   - RSS feed parses, lists posts
 *   - llms.txt lists posts
 *   - Sitemap lists blog routes
 *
 * Usage: node scripts/test-blog-seo.mjs [baseUrl]
 */

import puppeteer from "puppeteer-core";

const BASE = process.argv[2] || "http://localhost:3000";
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox"],
});

let pass = true;
const fail = (msg) => {
  pass = false;
  console.log("  ✗ " + msg);
};
const ok = (msg) => console.log("  ✓ " + msg);

async function checkJsonLd(page, expectedTypes) {
  return page.evaluate((types) => {
    const scripts = Array.from(
      document.querySelectorAll('script[type="application/ld+json"]'),
    );
    const parsed = scripts
      .map((s) => {
        try {
          return JSON.parse(s.textContent || "{}");
        } catch {
          return null;
        }
      })
      .filter(Boolean);
    const found = parsed
      .map((p) => (Array.isArray(p) ? p : [p]))
      .flat()
      .map((p) => p["@type"])
      .filter(Boolean);
    return { found, parsed };
  }, expectedTypes);
}

try {
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true });

  // ── BLOG INDEX ─────────────────────────────
  console.log("\n[1] /blog index");
  await page.goto(`${BASE}/blog`, { waitUntil: "networkidle2" });
  const indexJsonLd = await checkJsonLd(page);
  if (!indexJsonLd.found.includes("CollectionPage")) {
    fail("CollectionPage JSON-LD missing on /blog");
  } else ok("CollectionPage JSON-LD present");
  if (!indexJsonLd.found.includes("Organization")) {
    fail("Organization JSON-LD missing on /blog");
  } else ok("Organization JSON-LD present");
  if (!indexJsonLd.found.includes("BreadcrumbList")) {
    fail("BreadcrumbList JSON-LD missing on /blog");
  } else ok("BreadcrumbList JSON-LD present");

  const indexMeta = await page.evaluate(() => ({
    title: document.title,
    desc:
      document
        .querySelector('meta[name="description"]')
        ?.getAttribute("content") ?? null,
    canonical:
      document.querySelector('link[rel="canonical"]')?.getAttribute("href") ??
      null,
    og:
      document
        .querySelector('meta[property="og:title"]')
        ?.getAttribute("content") ?? null,
    rssLink: Array.from(
      document.querySelectorAll('link[rel="alternate"]'),
    ).find((l) => l.getAttribute("type") === "application/rss+xml")
      ?.getAttribute("href") ?? null,
    h1Count: document.querySelectorAll("h1").length,
    postCards: document.querySelectorAll('main a[href^="/blog/"]').length,
  }));

  if (!indexMeta.title.includes("Journal")) fail(`title weak: ${indexMeta.title}`);
  else ok(`title: "${indexMeta.title}"`);
  if (!indexMeta.canonical) fail("canonical missing on /blog");
  else ok("canonical: " + indexMeta.canonical);
  if (!indexMeta.rssLink) fail("RSS link missing in <head>");
  else ok("RSS alternate link present");
  if (indexMeta.h1Count !== 1) fail(`h1 count is ${indexMeta.h1Count}, expected 1`);
  else ok("exactly one h1");
  if (indexMeta.postCards < 3) fail(`only ${indexMeta.postCards} post cards rendered`);
  else ok(`${indexMeta.postCards} post links rendered`);

  // ── POST PAGE ──────────────────────────────
  console.log("\n[2] /blog/first-hyrox-preparation-guide");
  await page.goto(`${BASE}/blog/first-hyrox-preparation-guide`, {
    waitUntil: "networkidle2",
  });
  const postJsonLd = await checkJsonLd(page);
  for (const expected of ["BlogPosting", "BreadcrumbList", "Person", "Organization", "FAQPage"]) {
    if (!postJsonLd.found.includes(expected)) {
      fail(`${expected} JSON-LD missing on post`);
    } else ok(`${expected} JSON-LD present`);
  }

  const postMeta = await page.evaluate(() => ({
    title: document.title,
    canonical: document.querySelector('link[rel="canonical"]')?.getAttribute("href"),
    ogImage: document.querySelector('meta[property="og:image"]')?.getAttribute("content"),
    ogType: document.querySelector('meta[property="og:type"]')?.getAttribute("content"),
    twitterCard: document
      .querySelector('meta[name="twitter:card"]')
      ?.getAttribute("content"),
    h1Count: document.querySelectorAll("h1").length,
    h2Count: document.querySelectorAll("#article-body h2").length,
    h2WithIds: Array.from(
      document.querySelectorAll("#article-body h2[id]"),
    ).length,
    imageCount: document.querySelectorAll("article img").length,
    imagesWithoutAlt: Array.from(
      document.querySelectorAll("article img"),
    ).filter((i) => i.getAttribute("alt") === null)
      .length,
    article: !!document.querySelector("article"),
    breadcrumb: !!document.querySelector('[aria-label="Breadcrumb"]'),
    relatedPosts: document.querySelectorAll(
      'section[aria-labelledby="related-heading"] a',
    ).length,
    shareButton: !!Array.from(document.querySelectorAll("button")).find((b) =>
      (b.textContent || "").includes("Share"),
    ),
    publishedTime: document
      .querySelector('meta[property="article:published_time"]')
      ?.getAttribute("content"),
    author: document
      .querySelector('meta[name="author"], meta[property="article:author"]')
      ?.getAttribute("content"),
  }));

  if (postMeta.h1Count !== 1) fail(`h1 count is ${postMeta.h1Count}`);
  else ok("exactly one h1");
  if (postMeta.h2Count < 3) fail(`only ${postMeta.h2Count} h2s in article`);
  else ok(`${postMeta.h2Count} h2 sections`);
  // MDX content h2s get ids from rehype-slug; surrounding UI h2s (related cards,
  // final CTA) don't need ids. We assert at least 5 prose h2s carry ids.
  if (postMeta.h2WithIds < 5) fail(`only ${postMeta.h2WithIds} prose h2s carry ids (rehype-slug)`);
  else ok(`${postMeta.h2WithIds} prose h2s with anchor ids`);
  if (postMeta.imagesWithoutAlt > 0) fail(`${postMeta.imagesWithoutAlt} images missing alt`);
  else ok(`all ${postMeta.imageCount} images have alt`);
  if (!postMeta.canonical) fail("canonical missing on post");
  else ok("canonical: " + postMeta.canonical);
  if (!postMeta.ogImage) fail("og:image missing");
  else ok("og:image: " + postMeta.ogImage);
  if (postMeta.ogType !== "article") fail("og:type expected 'article'");
  else ok("og:type: article");
  if (postMeta.twitterCard !== "summary_large_image") fail("twitter:card not summary_large_image");
  else ok("twitter:card: summary_large_image");
  if (!postMeta.breadcrumb) fail("breadcrumb missing");
  else ok("breadcrumb visible");
  if (postMeta.relatedPosts < 1) fail("no related posts shown");
  else ok(`${postMeta.relatedPosts} related links shown`);
  if (!postMeta.shareButton) fail("Share button missing");
  else ok("share button present");
  if (!postMeta.publishedTime) fail("article:published_time missing");
  else ok("article:published_time present");

  // ── RSS ────────────────────────────────────
  console.log("\n[3] /blog/rss.xml");
  await page.goto(`${BASE}/blog/rss.xml`, { waitUntil: "networkidle2" });
  const rss = await page.evaluate(() => document.body.textContent || "");
  const itemCount = (rss.match(/<item>/g) || []).length;
  if (itemCount < 3) fail(`RSS has only ${itemCount} items`);
  else ok(`RSS has ${itemCount} items`);
  if (!rss.includes("<title>Vyrek Journal</title>"))
    fail("RSS channel title missing");
  else ok("RSS channel title present");

  // ── llms.txt ───────────────────────────────
  console.log("\n[4] /llms.txt");
  await page.goto(`${BASE}/llms.txt`, { waitUntil: "networkidle2" });
  const llms = await page.evaluate(() => document.body.textContent || "");
  if (!llms.includes("# Vyrek")) fail("llms.txt missing main header");
  else ok("llms.txt header present");
  if (!llms.includes("/blog/")) fail("llms.txt missing blog links");
  else ok("llms.txt lists blog posts");

  // ── Sitemap ─────────────────────────────────
  console.log("\n[5] /sitemap.xml");
  await page.goto(`${BASE}/sitemap.xml`, { waitUntil: "networkidle2" });
  const sitemap = await page.evaluate(() => document.body.textContent || "");
  if (!sitemap.includes("/blog/first-hyrox-preparation-guide"))
    fail("sitemap missing blog post URLs");
  else ok("sitemap includes blog posts");
  if (!sitemap.includes("/blog/category/training"))
    fail("sitemap missing category URLs");
  else ok("sitemap includes category pages");

  // ── OG image renders ───────────────────────
  console.log("\n[6] /api/og/blog/[slug] renders a PNG");
  const res = await fetch(
    `${BASE}/api/og/blog/first-hyrox-preparation-guide`,
  );
  const contentType = res.headers.get("content-type");
  if (!contentType?.includes("image/png"))
    fail(`OG image content-type was ${contentType}`);
  else ok("OG image content-type: image/png");

  console.log("\n" + (pass ? "✓ PASS" : "✗ FAIL"));
} finally {
  await browser.close();
}

process.exit(pass ? 0 : 1);
