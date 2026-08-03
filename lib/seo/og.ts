/**
 * THE DEFAULT SOCIAL CARD, AND WHY THIS HELPER HAS TO EXIST.
 *
 * `app/layout.tsx` declares a perfectly good `openGraph.images` default. It was
 * reaching almost none of the site.
 *
 * Next.js does not deep-merge metadata. A page that declares *any* `openGraph`
 * object replaces the parent's entirely — so
 *
 *     openGraph: { url: "…", type: "website" }
 *
 * silently drops the inherited image along with the site name and locale. That
 * pattern was on 26 pages, including `/results`, `/rankings`, `/simulator` and
 * every commercial landing page, and the failure is invisible: the page looks
 * fine, the metadata looks deliberate, and the only symptom is that every link
 * anybody shares arrives as a grey rectangle.
 *
 * So `ogImages()` supplies the default array, and `og()` builds a whole
 * `openGraph` block with the defaults already folded in. Either is fine; the
 * point is that adding `url` to a page must stop costing it a social card.
 */

/** 1200×630, the size every platform crops from. */
export const OG_DEFAULT_IMAGE = "/media/images/track/og-default.jpg";

export function ogImages(url: string = OG_DEFAULT_IMAGE) {
  return [
    {
      url,
      width: 1200,
      height: 630,
      alt: "Suth Performance, personalised HYROX training",
    },
  ];
}

/**
 * Build an `openGraph` block that keeps the site-wide defaults.
 *
 * Pass only what differs. Anything omitted falls back to the value the root
 * layout would have provided, which is what a page author reasonably expects
 * `openGraph: { url }` to do already.
 */
export function og(opts: {
  url: string;
  title?: string;
  description?: string;
  type?: "website" | "article";
  image?: string;
}) {
  return {
    url: opts.url,
    ...(opts.title ? { title: opts.title } : {}),
    ...(opts.description ? { description: opts.description } : {}),
    type: opts.type ?? ("website" as const),
    siteName: "Suth Performance",
    locale: "en_GB",
    images: ogImages(opts.image),
  };
}
