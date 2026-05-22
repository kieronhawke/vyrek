# Vyrek — Build Brief v3.1 ADDENDUM (Sanity + Blog + SEO)

**This document extends v3. Paste both into Claude Code together.**
**v3 covers the core funnel. v3.1 adds the CMS, blog, and SEO infrastructure.**

Where v3.1 conflicts with v3, v3.1 wins (it's the latest decision).

---

## 1. What changes vs v3

**Added:**
- Sanity headless CMS for all editable content
- Sanity Studio embedded at `/studio`
- Blog system: index, posts, categories, tags, RSS
- SEO infrastructure: structured data, sitemaps, OG images
- Semrush + Google Search Console integration
- Custom Sanity schemas for Hyrox-specific content blocks
- Editorial workflow (drafts, scheduling, previews)

**Unchanged from v3:**
- Tech stack (Next.js, Tailwind, shadcn, GSAP, Motion)
- 8-question quiz flow, plan generator, paywall logic
- Stripe + Supabase + Resend + PostHog + Sentry stack
- Voice & tone (Trainer's Notebook)
- 4 programmes, 12-week fixed plans
- Hidden pricing, brand-led coaches
- £20 BACS bounty referral
- Mobile-first design tokens, PWA setup, haptics

**Modified from v3:**
- Build order extended from 14 days to 18 days
- Some hardcoded content (FAQ, programmes, hero copy) now lives in Sanity
- `lib/email/` templates can pull content from Sanity if needed

---

## 2. Why Sanity, locked rationale

Locked decision (already made):
- Content editing must be possible for non-coder
- Major structural edits handled via Claude Code
- SEO must be backend-first
- Third-party integrations must be simple
- Mobile-first 90% traffic preserved

Sanity wins because:
- Editor experience genuinely matches Elementor for content edits
- Cannot break layouts (developers control structure, content editors control fields)
- Static-generated output = sub-1s loads = Core Web Vitals = Google ranking
- Same codebase as the funnel (no cross-domain handoffs)
- Free tier covers Phase 1 entirely

---

## 3. Sanity setup

### Account + project

```bash
# Initialise Sanity in the existing repo (NOT a separate project)
pnpm create sanity@latest -- --template clean --create-project "Vyrek" --dataset production
```

This creates:
- Sanity project on sanity.io
- Local Studio config in `/sanity` folder
- Embedded Studio route at `/studio`

### Environment variables (add to `.env.local`)

```
NEXT_PUBLIC_SANITY_PROJECT_ID=
NEXT_PUBLIC_SANITY_DATASET=production
SANITY_API_READ_TOKEN=
SANITY_API_WRITE_TOKEN=
SANITY_REVALIDATE_SECRET=
```

### Required packages

```bash
pnpm add @sanity/client @sanity/image-url @sanity/vision next-sanity sanity sanity-plugin-media @portabletext/react
```

---

## 4. File structure additions

Adding to v3 structure:

```
vyrek/
├── app/
│   ├── studio/                       # Embedded Sanity Studio
│   │   └── [[...tool]]/page.tsx
│   ├── blog/
│   │   ├── page.tsx                  # Blog index (paginated)
│   │   ├── [slug]/page.tsx           # Individual post
│   │   ├── category/[category]/page.tsx
│   │   ├── tag/[tag]/page.tsx
│   │   ├── author/[author]/page.tsx
│   │   └── feed.xml/route.ts         # RSS feed
│   ├── api/
│   │   ├── revalidate/route.ts       # Sanity webhook for ISR
│   │   └── og/                        # Dynamic OG images
│   │       ├── blog/[slug]/route.tsx
│   │       └── default/route.tsx
│   └── sitemap.ts                    # Now pulls from Sanity + static routes
├── sanity/
│   ├── sanity.config.ts              # Studio config
│   ├── sanity.cli.ts
│   ├── env.ts
│   ├── lib/
│   │   ├── client.ts                 # Read client
│   │   ├── live.ts                   # Live preview client
│   │   ├── image.ts                  # Image URL builder
│   │   └── queries.ts                # GROQ queries
│   ├── schemas/
│   │   ├── index.ts
│   │   ├── singletons/
│   │   │   ├── homepage.ts           # Hero, programmes order, sections toggle
│   │   │   ├── pricing.ts            # Price, trial length, inclusions
│   │   │   ├── settings.ts           # Site name, social, footer
│   │   │   └── legal.ts              # Privacy, terms, cookies, refunds
│   │   ├── documents/
│   │   │   ├── post.ts               # Blog post
│   │   |   ├── author.ts
│   │   │   ├── category.ts
│   │   │   ├── tag.ts
│   │   │   ├── programme.ts          # The 4 programmes
│   │   │   ├── coach.ts              # Multi-coach scaffolding
│   │   │   ├── testimonial.ts
│   │   │   └── faq.ts
│   │   └── objects/
│   │       ├── seo.ts                # Reusable SEO object
│   │       ├── customBlocks/
│   │       │   ├── workoutStructure.ts
│   │       │   ├── stationGuide.ts
│   │       │   ├── faqBlock.ts
│   │       │   ├── statBlock.ts
│   │       │   ├── ctaBlock.ts
│   │       │   ├── beforeAfter.ts
│   │       │   └── videoEmbed.ts
│   │       └── richText.ts           # Portable Text with custom blocks
│   ├── structure/
│   │   └── deskStructure.ts          # Studio left-nav organisation
│   └── plugins/
│       └── productionUrl.ts          # Preview button in Studio
├── components/
│   ├── blog/
│   │   ├── post-card.tsx
│   │   ├── post-header.tsx
│   │   ├── post-body.tsx             # PortableText renderer
│   │   ├── author-bio.tsx
│   │   ├── related-posts.tsx
│   │   ├── reading-time.tsx
│   │   ├── share-buttons.tsx
│   │   ├── breadcrumbs.tsx
│   │   ├── category-pill.tsx
│   │   ├── newsletter-cta.tsx
│   │   └── table-of-contents.tsx
│   └── seo/
│       ├── article-schema.tsx
│       ├── faq-schema.tsx
│       ├── howto-schema.tsx
│       ├── breadcrumb-schema.tsx
│       └── organization-schema.tsx
└── lib/
    └── seo/
        ├── generate-metadata.ts      # Helper for page-level metadata
        ├── canonical-url.ts
        └── reading-time.ts
```

---

## 5. Sanity schemas (the editing fields)

These are the actual fields you'll edit in the Studio. Designed for editor clarity.

### 5.1 Homepage singleton

```typescript
// sanity/schemas/singletons/homepage.ts
{
  name: 'homepage',
  type: 'document',
  title: 'Homepage',
  fields: [
    {
      name: 'hero',
      type: 'object',
      title: 'Hero',
      fields: [
        { name: 'headline', type: 'string', title: 'Headline' },
        { name: 'subheadline', type: 'text', title: 'Sub-headline' },
        { name: 'ctaLabel', type: 'string', title: 'CTA label', initialValue: 'Get your plan →' },
        { name: 'backgroundVideo', type: 'file', title: 'Background video (MP4)' },
        { name: 'backgroundPoster', type: 'image', title: 'Poster image (for slow connections)' },
      ],
    },
    {
      name: 'socialProofBar',
      type: 'object',
      title: 'Social proof bar',
      fields: [
        { name: 'ratingLine', type: 'string', title: 'Rating line', initialValue: '★★★★★ · 327 athletes training' },
        { name: 'pressLogos', type: 'array', of: [{ type: 'image' }], title: 'Press logos' },
      ],
    },
    {
      name: 'programmesSection',
      type: 'object',
      title: 'Programmes section',
      fields: [
        { name: 'heading', type: 'string', initialValue: 'Find your programme' },
        { name: 'programmes', type: 'array', of: [{ type: 'reference', to: [{ type: 'programme' }] }] },
      ],
    },
    {
      name: 'bentoGrid',
      type: 'object',
      title: 'Bento feature grid',
      fields: [
        {
          name: 'cards',
          type: 'array',
          of: [{
            type: 'object',
            fields: [
              { name: 'size', type: 'string', options: { list: ['large', 'medium'] } },
              { name: 'headline', type: 'string' },
              { name: 'subhead', type: 'text' },
              { name: 'image', type: 'image' },
            ],
          }],
          validation: (Rule) => Rule.length(3),
        },
      ],
    },
    {
      name: 'weekInLife',
      type: 'object',
      title: 'Week in your life',
      fields: [
        { name: 'heading', type: 'string' },
        {
          name: 'vignettes',
          type: 'array',
          of: [{
            type: 'object',
            fields: [
              { name: 'timestamp', type: 'string', title: 'Day + time (e.g. Tuesday, 6:15am)' },
              { name: 'description', type: 'text' },
            ],
          }],
        },
      ],
    },
    {
      name: 'objectionHandling',
      type: 'object',
      title: 'What if I\'m not ready',
      fields: [
        { name: 'heading', type: 'string' },
        {
          name: 'columns',
          type: 'array',
          of: [{
            type: 'object',
            fields: [
              { name: 'fear', type: 'string' },
              { name: 'response', type: 'text' },
            ],
          }],
          validation: (Rule) => Rule.length(3),
        },
      ],
    },
    {
      name: 'coachHub',
      type: 'object',
      title: 'Coach hub',
      fields: [
        { name: 'heading', type: 'string', initialValue: 'Built by Elite 15 athletes' },
        { name: 'coaches', type: 'array', of: [{ type: 'reference', to: [{ type: 'coach' }] }] },
      ],
    },
    {
      name: 'planDeepDive',
      type: 'object',
      title: 'What a week looks like',
      fields: [
        { name: 'heading', type: 'string' },
        {
          name: 'days',
          type: 'array',
          of: [{
            type: 'object',
            fields: [
              { name: 'day', type: 'string' },
              { name: 'workoutType', type: 'string' },
              { name: 'duration', type: 'string' },
              { name: 'intensityZone', type: 'string' },
            ],
          }],
          validation: (Rule) => Rule.length(7),
        },
      ],
    },
    {
      name: 'testimonialsSection',
      type: 'object',
      fields: [
        { name: 'testimonials', type: 'array', of: [{ type: 'reference', to: [{ type: 'testimonial' }] }] },
      ],
    },
    {
      name: 'faqSection',
      type: 'object',
      fields: [
        { name: 'faqs', type: 'array', of: [{ type: 'reference', to: [{ type: 'faq' }] }] },
      ],
    },
    {
      name: 'finalCta',
      type: 'object',
      fields: [
        { name: 'heading', type: 'string' },
        { name: 'subheading', type: 'text' },
        { name: 'ctaLabel', type: 'string' },
        { name: 'trustLine', type: 'string' },
      ],
    },
    { name: 'seo', type: 'seo', title: 'SEO metadata' },
  ],
}
```

### 5.2 Pricing singleton

```typescript
{
  name: 'pricing',
  type: 'document',
  title: 'Pricing',
  fields: [
    { name: 'monthlyPrice', type: 'number', title: 'Monthly price (GBP)', initialValue: 14.99 },
    { name: 'trialDays', type: 'number', initialValue: 7 },
    { name: 'priceAnchorCopy', type: 'string', initialValue: 'Less than two coffees a week' },
    { name: 'inclusions', type: 'array', of: [{ type: 'string' }], title: 'What\'s included' },
    { name: 'ctaLabel', type: 'string', initialValue: 'Start free trial →' },
  ],
}
```

### 5.3 Programme document

```typescript
{
  name: 'programme',
  type: 'document',
  fields: [
    { name: 'name', type: 'string', title: 'Name (e.g. First Race)' },
    { name: 'slug', type: 'slug', source: 'name' },
    { name: 'tag', type: 'string', title: 'Tag (e.g. [ BEGINNER / 12 WEEKS ])' },
    { name: 'audience', type: 'text', title: 'Audience one-liner' },
    { name: 'weeks', type: 'number', initialValue: 12 },
    { name: 'difficulty', type: 'string', options: { list: ['Beginner', 'Intermediate', 'Advanced'] } },
    { name: 'image', type: 'image', title: 'Card background' },
    { name: 'description', type: 'richText', title: 'Detailed description' },
    { name: 'order', type: 'number', title: 'Display order' },
  ],
}
```

### 5.4 Coach document

```typescript
{
  name: 'coach',
  type: 'document',
  fields: [
    { name: 'name', type: 'string' },
    { name: 'slug', type: 'slug', source: 'name' },
    { name: 'role', type: 'string', title: 'Role tag (e.g. FOUNDING COACH)' },
    { name: 'portrait', type: 'image' },
    { name: 'video', type: 'file', title: 'Looping portrait video (optional)' },
    { name: 'bio', type: 'text', title: 'Bio (80 words)' },
    {
      name: 'credentials',
      type: 'array',
      of: [{ type: 'string' }],
      title: 'Credentials (each becomes a bracketed mono label)',
    },
    {
      name: 'social',
      type: 'object',
      fields: [
        { name: 'instagram', type: 'url' },
        { name: 'tiktok', type: 'url' },
        { name: 'strava', type: 'url' },
      ],
    },
    { name: 'isFounding', type: 'boolean', title: 'Founding coach (Ben)?' },
    { name: 'comingSoon', type: 'boolean', title: 'Coming soon placeholder?' },
    { name: 'order', type: 'number' },
  ],
}
```

### 5.5 Blog post document

```typescript
{
  name: 'post',
  type: 'document',
  title: 'Blog post',
  fields: [
    { name: 'title', type: 'string', validation: (Rule) => Rule.required().max(70) },
    { name: 'slug', type: 'slug', source: 'title', validation: (Rule) => Rule.required() },
    { name: 'excerpt', type: 'text', title: 'Excerpt (search + social)', validation: (Rule) => Rule.required().max(160) },
    { name: 'coverImage', type: 'image', options: { hotspot: true } },
    { name: 'publishedAt', type: 'datetime', validation: (Rule) => Rule.required() },
    { name: 'updatedAt', type: 'datetime', title: 'Last updated (auto-set on edit)' },
    { name: 'author', type: 'reference', to: [{ type: 'author' }] },
    { name: 'category', type: 'reference', to: [{ type: 'category' }] },
    { name: 'tags', type: 'array', of: [{ type: 'reference', to: [{ type: 'tag' }] }] },
    {
      name: 'body',
      type: 'array',
      title: 'Body',
      of: [
        { type: 'block' }, // Standard text blocks
        { type: 'image', options: { hotspot: true } },
        { type: 'workoutStructure' },
        { type: 'stationGuide' },
        { type: 'faqBlock' },
        { type: 'statBlock' },
        { type: 'ctaBlock' },
        { type: 'beforeAfter' },
        { type: 'videoEmbed' },
      ],
    },
    {
      name: 'tableOfContents',
      type: 'boolean',
      title: 'Show table of contents',
      initialValue: true,
    },
    {
      name: 'relatedPosts',
      type: 'array',
      of: [{ type: 'reference', to: [{ type: 'post' }] }],
      validation: (Rule) => Rule.max(3),
    },
    { name: 'featured', type: 'boolean', title: 'Featured (appears top of blog index)' },
    { name: 'seo', type: 'seo' },
    {
      name: 'schemaType',
      type: 'string',
      title: 'Schema type',
      options: { list: ['Article', 'HowTo', 'FAQPage'] },
      initialValue: 'Article',
      description: 'Article for normal posts. HowTo for technique guides. FAQPage if mostly Q&A.',
    },
  ],
  preview: {
    select: {
      title: 'title',
      author: 'author.name',
      media: 'coverImage',
      date: 'publishedAt',
    },
  },
}
```

### 5.6 SEO object (reusable)

```typescript
// sanity/schemas/objects/seo.ts
{
  name: 'seo',
  type: 'object',
  title: 'SEO',
  fields: [
    { name: 'title', type: 'string', title: 'Meta title (60 char max)', validation: (Rule) => Rule.max(60) },
    { name: 'description', type: 'text', title: 'Meta description (160 char max)', validation: (Rule) => Rule.max(160) },
    { name: 'ogImage', type: 'image', title: 'OG image (auto-generated if blank)' },
    { name: 'noIndex', type: 'boolean', title: 'Hide from search engines' },
    {
      name: 'focusKeyword',
      type: 'string',
      title: 'Focus keyword',
      description: 'Primary keyword for this page. Used in internal linking suggestions.',
    },
  ],
}
```

### 5.7 Custom content blocks (for blog posts)

These are reusable, Hyrox-specific block types editors can drop into any blog post.

**Workout Structure block:**
```typescript
{
  name: 'workoutStructure',
  type: 'object',
  fields: [
    { name: 'title', type: 'string' },
    { name: 'duration', type: 'string' },
    {
      name: 'sections',
      type: 'array',
      of: [{
        type: 'object',
        fields: [
          { name: 'name', type: 'string', title: 'Section (warm-up / main / cool-down)' },
          { name: 'duration', type: 'string' },
          {
            name: 'blocks',
            type: 'array',
            of: [{
              type: 'object',
              fields: [
                { name: 'exercise', type: 'string' },
                { name: 'reps', type: 'string' },
                { name: 'duration', type: 'string' },
                { name: 'notes', type: 'string' },
              ],
            }],
          },
        ],
      }],
    },
  ],
}
```

**Station Guide block:**
```typescript
{
  name: 'stationGuide',
  type: 'object',
  fields: [
    { name: 'stationName', type: 'string', title: 'Station (e.g. Sled Push)' },
    { name: 'distance', type: 'string', title: 'Distance / reps' },
    { name: 'image', type: 'image' },
    { name: 'video', type: 'url', title: 'YouTube embed URL' },
    { name: 'commonMistakes', type: 'array', of: [{ type: 'string' }] },
    { name: 'technique', type: 'text' },
    { name: 'pacing', type: 'text' },
  ],
}
```

**FAQ block:**
```typescript
{
  name: 'faqBlock',
  type: 'object',
  fields: [
    { name: 'title', type: 'string', initialValue: 'Frequently asked' },
    {
      name: 'questions',
      type: 'array',
      of: [{
        type: 'object',
        fields: [
          { name: 'question', type: 'string' },
          { name: 'answer', type: 'text' },
        ],
      }],
    },
  ],
}
```

**Stat block:**
```typescript
{
  name: 'statBlock',
  type: 'object',
  fields: [
    {
      name: 'stats',
      type: 'array',
      of: [{
        type: 'object',
        fields: [
          { name: 'value', type: 'string' },
          { name: 'label', type: 'string' },
        ],
      }],
      validation: (Rule) => Rule.min(2).max(4),
    },
  ],
}
```

These blocks render as polished, branded components on the live site. Editor drops them in like Elementor widgets — but they're typed, structured, and impossible to break.

---

## 6. Studio organisation

The Studio sidebar will be organised as:

```
✏️  Edit site
    ├── Homepage
    ├── Pricing
    ├── Settings
    └── Legal pages
        ├── Privacy
        ├── Terms
        ├── Cookies
        └── Refunds

📚  Content
    ├── Programmes
    ├── Coaches
    ├── Testimonials
    └── FAQ

📝  Blog
    ├── All posts
    ├── Drafts
    ├── Scheduled
    ├── Authors
    ├── Categories
    └── Tags

🔍  SEO
    ├── Pages overview
    └── Sitemap preview

⚙️  Media
    └── (all uploaded images, organised)
```

This is configured via `sanity/structure/deskStructure.ts`.

---

## 7. Blog page templates

### 7.1 Blog index (`app/blog/page.tsx`)

Layout:
- Hero band: "Hyrox training, explained." + search input
- Featured post (if marked featured) at top, full-width card
- Filter pills: All / Training / Nutrition / Recovery / Race Day / Beginners
- Grid of post cards (12 per page)
- Pagination at bottom
- Sidebar (desktop): popular posts, newsletter signup, related categories
- Mobile: above patterns stack vertically

Each post card:
- Cover image (16:9, lazy-loaded WebP)
- Category pill
- Title (text-xl, weight 700)
- Excerpt (text-sm, secondary)
- Author name + reading time + date

### 7.2 Single post (`app/blog/[slug]/page.tsx`)

Layout:
- Breadcrumb: Home › Blog › Category › Post title
- Title (text-4xl on desktop, text-3xl on mobile)
- Meta row: Author avatar + name · Published date · Reading time · Updated badge if updated
- Cover image (16:9, priority load)
- Reading progress bar (sticky at top, fills as you scroll)
- Table of contents (collapsible on mobile, sticky sidebar on desktop)
- Body (PortableText renders text + custom blocks)
- Author bio at bottom
- Share buttons (Web Share API on mobile, Twitter/LinkedIn/Copy on desktop)
- Related posts (3 cards)
- Newsletter CTA
- Comments off by default (Phase 1)

### 7.3 Category page (`app/blog/category/[category]/page.tsx`)

Same as blog index but pre-filtered. Category description at top.

### 7.4 Tag page (`app/blog/tag/[tag]/page.tsx`)

Same pattern as category.

### 7.5 Author page (`app/blog/author/[author]/page.tsx`)

- Author portrait + bio (large)
- Credentials
- Social links
- All posts by this author (grid)

### 7.6 RSS feed (`app/blog/feed.xml/route.ts`)

Auto-generated XML feed of latest 20 posts. Required for some SEO tools and aggregators.

---

## 8. SEO infrastructure (the bit you specifically asked for)

### 8.1 Metadata generation pattern

Every page implements `generateMetadata`:

```typescript
// app/blog/[slug]/page.tsx
import { Metadata } from 'next';
import { client } from '@/sanity/lib/client';
import { generateSeoMetadata } from '@/lib/seo/generate-metadata';

export async function generateMetadata({ params }): Promise<Metadata> {
  const post = await client.fetch(POST_QUERY, { slug: params.slug });

  return generateSeoMetadata({
    title: post.seo?.title || post.title,
    description: post.seo?.description || post.excerpt,
    ogImage: post.seo?.ogImage || `/api/og/blog/${post.slug}`,
    canonical: `https://vyrek.com/blog/${post.slug}`,
    noIndex: post.seo?.noIndex,
    type: 'article',
    publishedTime: post.publishedAt,
    modifiedTime: post.updatedAt,
    author: post.author.name,
  });
}
```

### 8.2 Structured data (JSON-LD)

Every page emits the right schema. Built into reusable React components:

**Article schema** (`components/seo/article-schema.tsx`)
```tsx
export function ArticleSchema({ post }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'Article',
          headline: post.title,
          image: post.coverImage,
          datePublished: post.publishedAt,
          dateModified: post.updatedAt,
          author: {
            '@type': 'Person',
            name: post.author.name,
            url: `https://vyrek.com/blog/author/${post.author.slug}`,
          },
          publisher: {
            '@type': 'Organization',
            name: 'Vyrek',
            logo: { '@type': 'ImageObject', url: 'https://vyrek.com/logo.png' },
          },
          description: post.excerpt,
          mainEntityOfPage: {
            '@type': 'WebPage',
            '@id': `https://vyrek.com/blog/${post.slug}`,
          },
        }),
      }}
    />
  );
}
```

Same pattern for:
- `FaqSchema` — emits FAQPage schema when FAQ block detected
- `HowToSchema` — emits HowTo schema when post.schemaType === 'HowTo'
- `BreadcrumbSchema` — every page
- `OrganizationSchema` — homepage + layout
- `WebSiteSchema` — homepage with search action

### 8.3 Dynamic OG images

`app/api/og/blog/[slug]/route.tsx` uses Next.js ImageResponse to generate OG images at the edge:

```tsx
import { ImageResponse } from 'next/og';

export async function GET(request: Request, { params }) {
  const post = await getPost(params.slug);

  return new ImageResponse(
    (
      <div style={{
        background: '#0A0A0A',
        color: '#F5F5F3',
        padding: 80,
        height: '100%',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        fontFamily: 'Geist',
      }}>
        <div style={{ fontSize: 24, opacity: 0.55 }}>VYREK · BLOG</div>
        <div style={{ fontSize: 64, fontWeight: 900, lineHeight: 1.1 }}>
          {post.title}
        </div>
        <div style={{ fontSize: 24, opacity: 0.7 }}>
          {post.author.name} · {readingTime(post.body)} min read
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
```

Auto-generated per post. Editors can override with custom OG image if they want.

### 8.4 Sitemap

`app/sitemap.ts` pulls all routes including blog posts:

```typescript
import { MetadataRoute } from 'next';
import { client } from '@/sanity/lib/client';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const posts = await client.fetch(`*[_type == "post" && !(_id in path("drafts.**"))]{ slug, updatedAt, publishedAt }`);
  const categories = await client.fetch(`*[_type == "category"]{ slug }`);
  const programmes = await client.fetch(`*[_type == "programme"]{ slug }`);

  const staticRoutes = [
    { url: 'https://vyrek.com', lastModified: new Date(), priority: 1.0 },
    { url: 'https://vyrek.com/blog', lastModified: new Date(), priority: 0.9 },
    { url: 'https://vyrek.com/pricing', lastModified: new Date(), priority: 0.7 },
    { url: 'https://vyrek.com/legal/privacy', lastModified: new Date(), priority: 0.3 },
    { url: 'https://vyrek.com/legal/terms', lastModified: new Date(), priority: 0.3 },
  ];

  const blogRoutes = posts.map(p => ({
    url: `https://vyrek.com/blog/${p.slug.current}`,
    lastModified: new Date(p.updatedAt || p.publishedAt),
    priority: 0.8,
    changeFrequency: 'weekly' as const,
  }));

  const categoryRoutes = categories.map(c => ({
    url: `https://vyrek.com/blog/category/${c.slug.current}`,
    lastModified: new Date(),
    priority: 0.6,
  }));

  return [...staticRoutes, ...blogRoutes, ...categoryRoutes];
}
```

### 8.5 robots.txt

```typescript
// app/robots.ts
import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: ['/api/', '/account/', '/checkout/', '/studio/'] },
      { userAgent: 'GPTBot', disallow: '/' }, // Optional: block AI scraping
    ],
    sitemap: 'https://vyrek.com/sitemap.xml',
  };
}
```

### 8.6 Internal linking automation

Reading time + reading difficulty calculated automatically. Related posts auto-suggested based on shared category + tag overlap. Internal link suggestions can be surfaced in the Sanity Studio (future enhancement).

### 8.7 Canonical URLs

Every page emits a canonical URL. Configured in `generateMetadata` per route. Blog posts canonical = `vyrek.com/blog/[slug]` regardless of how they were reached (avoids dup content if accessed via category/tag pages with query strings).

### 8.8 ISR (Incremental Static Regeneration)

Blog posts statically generated at build time + revalidated on Sanity publish:

```typescript
// app/blog/[slug]/page.tsx
export const revalidate = 3600; // Fallback: revalidate every hour
```

```typescript
// app/api/revalidate/route.ts
// Webhook fired when Sanity content publishes
export async function POST(req: Request) {
  const secret = req.headers.get('x-sanity-signature');
  if (secret !== process.env.SANITY_REVALIDATE_SECRET) return new Response('Unauthorized', { status: 401 });

  const body = await req.json();
  const slug = body.slug?.current;

  if (slug) revalidatePath(`/blog/${slug}`);
  revalidatePath('/blog');
  revalidatePath('/sitemap.xml');

  return Response.json({ revalidated: true });
}
```

Configure the webhook in Sanity project settings → API → Webhooks → URL = `https://vyrek.com/api/revalidate`.

---

## 9. Semrush + Google Search Console integration

### Setup steps (post-launch)

1. **Google Search Console**
   - Add property: `vyrek.com`
   - Verify via DNS TXT record (Vercel makes this 2-clicks)
   - Submit sitemap: `https://vyrek.com/sitemap.xml`
   - Wait 24-48hr for first crawl data

2. **Semrush**
   - Create new project for `vyrek.com`
   - Set up Position Tracking with target keywords:
     - "hyrox training plan"
     - "how to train for hyrox"
     - "hyrox sub 90 plan"
     - "first hyrox race"
     - "hyrox doubles training"
     - (plus 50+ long-tail Hyrox keywords)
   - Configure Site Audit (weekly automated crawl)
   - Set up backlink monitoring
   - Connect Google Analytics 4 + Search Console accounts within Semrush

3. **Google Analytics 4**
   - Create property
   - Install via PostHog integration OR direct script
   - Connect to Search Console

### What this gives you

- Daily keyword ranking updates
- Site audit findings (broken links, missing alt text, slow pages)
- Competitor analysis (Marchon, Runna, Hybrid Athlete Club)
- Backlink opportunities
- Content gap analysis (keywords competitors rank for that you don't)

### Code-side requirements (already in v3.1 spec)

- Verified site ownership: Vercel handles via DNS verification at domain setup
- Sitemap.xml available at `/sitemap.xml`
- robots.txt at `/robots.txt`
- Structured data on every page
- Fast Core Web Vitals (Lighthouse 95+)
- Mobile-friendly (already)

**Nothing else needed.** Semrush is external. The website doesn't integrate with Semrush. Semrush integrates with the website.

---

## 10. Editorial workflow

### Drafts and preview

- Editor writes post in Sanity Studio
- Saves as draft (auto-saves continuously)
- Clicks "Preview" → opens preview URL on live site showing draft content (only visible to authenticated editor)
- Edits more if needed
- Clicks "Publish" → goes live within 30 seconds (ISR revalidation)

### Scheduling

- Set `publishedAt` to future date
- Post stays in "Scheduled" view in Sanity
- Automatically publishes when date arrives via Sanity Scheduled Publishing add-on (free)

### Multiple authors / future team

- Add new author document
- Author can be invited to Sanity Studio with editor/viewer role
- Posts can be assigned to authors
- Author archive page auto-generated at `/blog/author/[slug]`

### Version history

Every edit in Sanity creates a history entry. Revert to any previous version with one click. Better than WordPress's "Revisions."

---

## 11. Initial content seeding

Before launch, seed the CMS with:

### Singletons (one-time setup)
- Homepage (all sections from §5.1, pre-filled with v3 brief copy)
- Pricing (£14.99 etc.)
- Settings (site name, social links, footer)
- Legal pages (privacy, terms, cookies, refunds copy)

### Programmes
- First Race
- Sub-90
- Doubles
- Pro

### Coaches
- Ben (founding coach, full bio)
- 2-3 "Coming soon" placeholders

### Testimonials
- 4-6 beta tester quotes (with permission, real first names)

### FAQ
- 8 questions from v3 §8.12

### Blog (launch with these 5 posts ready)
- "Hyrox explained: the rules, the stations, the strategy"
- "Your first Hyrox: a 12-week roadmap"
- "How to break 90 minutes at Hyrox"
- "Hyrox Doubles: the partner guide"
- "What to eat before, during, and after a Hyrox"

5 posts at launch establishes topical authority faster than launching with 0 and adding 1 per week.

---

## 12. Updated build order (now 18 days)

### v3 sequence (Days 1-14) — unchanged
Phases A through F as per v3.

### NEW Phase G: Sanity + Blog (Days 15-18)

**Day 15:**
- Initialise Sanity in repo
- Configure Studio at `/studio`
- Build all singleton schemas (homepage, pricing, settings, legal)
- Build all document schemas (post, author, category, tag, programme, coach, testimonial, faq)
- Build all object schemas (seo, customBlocks)
- Migrate hardcoded copy from v3 components into Sanity content
- Update components to fetch from Sanity instead of static data

**Day 16:**
- Build blog index page
- Build single post template with PortableText renderer
- Build category, tag, author pages
- Build RSS feed route
- Build all blog components (post-card, post-header, post-body, author-bio, related-posts, share-buttons, breadcrumbs, table-of-contents)

**Day 17:**
- Build all SEO schemas (Article, FAQ, HowTo, Breadcrumb, Organization)
- Build dynamic OG image route for blog
- Update sitemap.ts to pull from Sanity
- Configure ISR + revalidation webhook
- Set up Google Search Console verification
- Submit sitemap to GSC
- Configure Semrush project

**Day 18:**
- Author 5 launch blog posts
- Configure all internal linking
- Test schema markup with Google Rich Results Test
- Test Lighthouse on every blog template
- Test mobile experience end-to-end
- Set up editor onboarding doc (how to publish a post)

---

## 13. What you can edit yourself, complete list

After build, here's what's editable via Sanity Studio without coding:

**Marketing copy (homepage)**
- Hero headline, sub-headline, CTA label
- Hero background video / poster image
- Social proof bar text + press logos
- Programmes section heading + programme order
- Bento grid: 3 cards (headline, sub, image, size)
- Week in your life: vignettes (timestamp + description)
- Objection handling: 3 fear/response pairs
- Coach hub heading + coach order
- Plan deep-dive: 7-day example workouts
- Testimonials section: order + which testimonials show
- FAQ section: order + which FAQs show
- Final CTA: heading, sub, label, trust line

**Pricing**
- Monthly price
- Trial days
- Price anchor copy
- Inclusion bullets
- CTA label

**Programmes** (4 of them)
- Name
- Tag
- Audience one-liner
- Image
- Detailed description
- Display order

**Coaches** (multi-coach scaffolding)
- Add new coach
- Edit name, role, portrait, video, bio, credentials, social, founding/coming-soon flags
- Reorder

**Testimonials**
- Add / edit / delete
- Quote, name, race time, city, optional photo

**FAQ**
- Add / edit / delete
- Question + answer
- Reorder

**Legal pages**
- Privacy, terms, cookies, refunds content

**Blog**
- Full post management (drafts, scheduled, published)
- Authors, categories, tags
- SEO per post (meta title, description, OG image)
- Custom blocks (workout structure, station guides, FAQs, stats)

**Settings**
- Site name
- Social links
- Footer columns
- Default OG image

**What you cannot edit without Claude Code:**
- Site structure (adding new pages)
- Component layouts (how things position)
- New section types not in current schema
- Tech stack changes
- New integrations

These all happen via Claude Code in 1-5 minutes per change.

---

## 14. Sanity Studio onboarding (write this up before launch)

Create a 5-page internal doc with screenshots:

1. **Logging in** — `vyrek.com/studio`, Google sign-in
2. **Editing the homepage** — find Homepage in left nav, click section, edit field, publish
3. **Adding a testimonial** — Content → Testimonials → New, fill fields, publish
4. **Publishing a blog post** — Blog → All posts → New post, write, set SEO, publish/schedule
5. **Using custom blocks** — In post body, click "+" → choose block type, fill in

15-minute read for the editor. Covers 95% of what you'll need.

---

## 15. Performance impact

Adding Sanity to v3 has zero performance cost because:
- Content fetched at build time + cached at edge
- Pages still statically generated
- No runtime database queries
- No client-side CMS overhead
- Studio is a separate route, not loaded on public pages

Lighthouse 95+ target unchanged.

---

## 16. Cost summary

| Service | Tier | Cost |
|---|---|---|
| Sanity | Free | £0/mo until 10K documents (you won't hit this) |
| Sanity (when needed) | Growth | £15/mo |
| Vercel | Pro | £15/mo (covers project + Studio + ISR + image opt) |
| Sanity Scheduled Publishing | Free | £0 |
| Google Search Console | Free | £0 |
| Semrush | Pro plan | £119/mo (essential for the SEO strategy) |
| Resend | Pro | £15/mo |
| PostHog | Free tier | £0 until volume |
| Sentry | Free tier | £0 until volume |
| Supabase | Free tier | £0 until volume |
| Upstash | Free tier | £0 until volume |
| **Total minimum to operate** | | **£149/mo** |

Compare to WordPress equivalent:
- Managed hosting (Kinsta starter): £30/mo
- Elementor Pro: £49/year (~£4/mo)
- WP Rocket cache: £49/year (~£4/mo)
- Yoast Premium: £89/year (~£7/mo)
- Plus all the other services above (Resend, Semrush, etc.)
- **WordPress total: £165+/mo with worse performance**

Sanity is cheaper AND faster AND more maintainable.

---

## 17. Definition of done — additions

Per blog post:
- [ ] Lighthouse Performance ≥95
- [ ] Article schema valid (Google Rich Results Test)
- [ ] OG image renders correctly
- [ ] Canonical URL set
- [ ] Reading time displayed
- [ ] TOC generated for posts >800 words
- [ ] Related posts populated
- [ ] Internal links to relevant programmes
- [ ] Author bio shown

Whole CMS:
- [ ] Studio accessible at /studio with Google auth
- [ ] All schemas registered and validated
- [ ] Preview button works (shows draft on live site)
- [ ] Scheduled publishing works (test with future date)
- [ ] ISR revalidates on Sanity publish (test by editing a post and checking timestamp)
- [ ] Sitemap includes all blog posts
- [ ] Search Console verified
- [ ] Semrush project configured

---

## 18. Out of scope (still)

Unchanged from v3 plus:
- Comments on blog posts
- Newsletter automation (capture only, Phase 1)
- Multi-language blog
- Blog post audio versions
- AI-generated blog content (write everything yourself or hire a writer)
- Affiliate tracking on blog (Phase 2)

---

**End of v3.1 addendum. Paste with v3. Build the funnel first (v3), then the CMS + blog (v3.1).**
