import type { Metadata, Viewport } from "next";
import { Oswald, Inter, Geist_Mono } from "next/font/google";
import "./globals.css";
import { CONSENT_STORAGE_KEY } from "@/lib/consent";
import { CookieBanner } from "@/components/legal/cookie-banner";
import { CommandPalette } from "@/components/marketing/command-palette";
import { PresencePing } from "@/components/presence/presence-ping";
import { MotionConfigProvider } from "@/components/shared/motion-config-provider";
import { siteUrl } from "@/lib/site-url";

// Pre-compute once at module-eval time. siteUrl() reads env vars set
// by Vercel; in the prod build these are baked into the bundle. All
// JSON-LD @id and canonical URLs use this single value.
const SITE = siteUrl();

// Display, condensed heavy sans for headings and the wordmark.
// Marchon's brand voice uses Druk Cond Super; Oswald 700 is the closest
// free analog (athletic, narrow, strong vertical stress).
const oswald = Oswald({
  variable: "--font-display",
  subsets: ["latin"],
  // Only weight 700 is used, hero H1, wordmark, section headings.
  weight: ["700"],
  display: "swap",
  preload: true,
});

/* Body / UI. Inter is the workhorse for everything not display.
 *
 * preload matters here as much as it does for Oswald: Inter and Geist Mono are
 * both above the fold on every page, and without preloading the browser only
 * discovers them after parsing CSS. The swap that follows re-flows text and was
 * measured as the residual ~0.05 CLS across the Results section once the
 * layout-driven shift was removed. */
const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  preload: true,
});

/* Technical mono mark stays Geist Mono. Every number in the Results section is
 * set in it, so it is above the fold on every one of those pages too. */
const geistMono = Geist_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["500"],
  display: "swap",
  preload: true,
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  // PRE-LAUNCH HARD RULE: no indexing until Kieron explicitly clears it
  // (and re-confirm with him even then). Belt to the X-Robots-Tag header
  // braces in next.config.ts; that header wins over any per-page value.
  robots: { index: false, follow: false },
  title: {
    default: "Suth Performance. Train like a Hyrox athlete",
    template: "%s · Suth Performance",
  },
  description:
    "Personalised Hyrox training programmes built by an Elite 15 coach. See your Week 1, then talk it through with Ben on a free consultation.",
  applicationName: "Suth Performance",
  appleWebApp: {
    capable: true,
    title: "Suth Performance",
    statusBarStyle: "black-translucent",
  },
  alternates: {
    canonical: "/",
    types: {
      "application/rss+xml": [
        { url: "/blog/rss.xml", title: "Suth Performance Journal RSS" },
      ],
    },
  },
  // Default Open Graph + Twitter, every page inherits unless overridden.
  // Per-route metadata (blog, city pages) sets its own when specific.
  openGraph: {
    title: "Suth Performance. Train like a Hyrox athlete",
    description:
      "Personalised Hyrox training programmes built by an Elite 15 coach. See your Week 1, then talk it through with Ben on a free consultation.",
    url: SITE,
    siteName: "Suth Performance",
    type: "website",
    locale: "en_GB",
    images: [
      {
        url: "/media/images/track/og-default.jpg",
        width: 1200,
        height: 630,
        alt: "Suth Performance, personalised Hyrox training",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Suth Performance. Train like a Hyrox athlete",
    description:
      "Personalised Hyrox training programmes built by an Elite 15 coach.",
    images: ["/media/images/track/og-default.jpg"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: "#0A0A0A",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en-GB"
      className={`dark ${oswald.variable} ${inter.variable} ${geistMono.variable}`}
      // The consent-height script below writes to this element before React
      // hydrates — that is the whole point of it. Without this, React sees an
      // attribute it did not render, calls the tree mismatched, and throws
      // away the server HTML for the whole app. Client state set before that
      // point goes with it, which is why plan-builder edits silently reverted.
      suppressHydrationWarning
    >
      <head>
        {/* Set the consent-strip height BEFORE first paint.
         *
         * `body` has `padding-top: var(--suth-consent-h)` with a 320ms
         * transition, and the banner sets that variable from an effect after
         * mount. The result was the entire page sliding down 48px on every
         * load — measured as ~0.054 CLS on every route, on every page of the
         * site, not just Results.
         *
         * This is the same trick a no-flash theme switch uses: read the stored
         * decision synchronously in the head so the first paint is already
         * correct. The banner still owns showing and hiding itself; this only
         * reserves the space it will occupy. Wrapped in try/catch because
         * localStorage throws in some privacy modes, and a thrown error here
         * would block rendering. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var r=localStorage.getItem(${JSON.stringify(CONSENT_STORAGE_KEY)});var d=r?JSON.parse(r).decided:false;if(!d){document.documentElement.style.setProperty('--suth-consent-h','48px');}}catch(e){}})();`,
          }}
        />
      </head>
      <body>
        <MotionConfigProvider>
          {children}
          <CommandPalette />
          <CookieBanner />
          <PresencePing />
        </MotionConfigProvider>
        <script
          type="application/ld+json"
          // Organization + WebSite JSON-LD lives in the root so it appears
          // on every page. Search engines treat this as the canonical
          // identity record for the brand.
          dangerouslySetInnerHTML={{
            __html: JSON.stringify([
              {
                "@context": "https://schema.org",
                "@type": "Organization",
                name: "Suth Performance",
                url: SITE,
                logo: `${SITE}/logo-primary.svg`,
                description:
                  "Personalised Hyrox training programmes built by an Elite 15 coach.",
                contactPoint: [
                  {
                    "@type": "ContactPoint",
                    contactType: "customer support",
                    email: "support@suthperformance.com",
                    availableLanguage: ["English"],
                  },
                  {
                    "@type": "ContactPoint",
                    contactType: "press",
                    email: "press@suthperformance.com",
                    availableLanguage: ["English"],
                  },
                ],
                areaServed: "GB",
              },
              {
                "@context": "https://schema.org",
                "@type": "WebSite",
                name: "Suth Performance",
                url: SITE,
                /* No SearchAction. It pointed at /quiz?program={term}, but
                   the quiz is not a search endpoint and the site has no
                   search route at all, so the markup described something
                   that does not exist. Google also retired the sitelinks
                   searchbox rich result, so it bought nothing in exchange
                   for the inaccuracy. */
              },
              /* SoftwareApplication: lets Google surface Suth Performance
                 as an "app" rich result for queries like "best Hyrox
                 training app". It carries no aggregateRating or offers,
                 deliberately: we have neither real ratings nor a published
                 coaching price, and inventing either is out. */
              {
                "@context": "https://schema.org",
                "@type": "SoftwareApplication",
                "@id": `${SITE}#software`,
                name: "Suth Performance",
                description:
                  "Personalised Hyrox training. Adaptive 12-week programmes that recalibrate every Sunday based on the sessions you log.",
                url: SITE,
                applicationCategory: "HealthApplication",
                /* Web only. This claimed "Web, iOS, Android" while no iOS
                   or Android app exists, which is exactly the kind of
                   inaccurate markup that earns a spammy-structured-data
                   manual action. */
                operatingSystem: "Web",
                inLanguage: "en-GB",
              },
            ]),
          }}
        />
      </body>
    </html>
  );
}
