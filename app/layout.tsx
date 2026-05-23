import type { Metadata, Viewport } from "next";
import { Oswald, Inter, Geist_Mono } from "next/font/google";
import "./globals.css";
import { CookieBanner } from "@/components/legal/cookie-banner";
import { CommandPalette } from "@/components/marketing/command-palette";
import { PresencePing } from "@/components/presence/presence-ping";
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

// Body / UI. Inter is the workhorse for everything not display.
const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

// Technical mono mark stays Geist Mono.
const geistMono = Geist_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["500"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: {
    default: "Vyrek. Train like a Hyrox athlete",
    template: "%s · Vyrek",
  },
  description:
    "Personalised Hyrox training programmes built by Elite 15 athletes. See your Week 1 before you pay.",
  applicationName: "Vyrek",
  appleWebApp: {
    capable: true,
    title: "Vyrek",
    statusBarStyle: "black-translucent",
  },
  alternates: {
    canonical: "/",
    types: {
      "application/rss+xml": [
        { url: "/blog/rss.xml", title: "Vyrek Journal RSS" },
      ],
    },
  },
  // Default Open Graph + Twitter, every page inherits unless overridden.
  // Per-route metadata (blog, city pages) sets its own when specific.
  openGraph: {
    title: "Vyrek. Train like a Hyrox athlete",
    description:
      "Personalised Hyrox training programmes built by Elite 15 athletes. See your Week 1 before you pay.",
    url: SITE,
    siteName: "Vyrek",
    type: "website",
    locale: "en_GB",
    images: [
      {
        url: "/media/images/programme-first-race.jpg",
        width: 1920,
        height: 1080,
        alt: "Vyrek, personalised Hyrox training",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Vyrek. Train like a Hyrox athlete",
    description:
      "Personalised Hyrox training programmes built by Elite 15 athletes.",
    images: ["/media/images/programme-first-race.jpg"],
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
    >
      <body>
        {children}
        <CommandPalette />
        <CookieBanner />
        <PresencePing />
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
                name: "Vyrek",
                url: SITE,
                logo: `${SITE}/logo-primary.svg`,
                description:
                  "Personalised Hyrox training programmes built by Elite 15 athletes.",
                contactPoint: [
                  {
                    "@type": "ContactPoint",
                    contactType: "customer support",
                    email: "support@vyrek.com",
                    availableLanguage: ["English"],
                  },
                  {
                    "@type": "ContactPoint",
                    contactType: "press",
                    email: "press@vyrek.com",
                    availableLanguage: ["English"],
                  },
                ],
                areaServed: "GB",
              },
              {
                "@context": "https://schema.org",
                "@type": "WebSite",
                name: "Vyrek",
                url: SITE,
                potentialAction: {
                  "@type": "SearchAction",
                  target:
                    `${SITE}/quiz?program={search_term_string}`,
                  "query-input": "required name=search_term_string",
                },
              },
              // SoftwareApplication: lets Google surface Vyrek as an
              // "app" rich-result for queries like "best Hyrox training
              // app". Also pulls in the rating + price for the SERP
              // card.
              {
                "@context": "https://schema.org",
                "@type": "SoftwareApplication",
                "@id": `${SITE}#software`,
                name: "Vyrek",
                description:
                  "Personalised Hyrox training. Adaptive 12-week programmes that recalibrate every Sunday based on the sessions you log.",
                url: SITE,
                applicationCategory: "HealthApplication",
                operatingSystem: "Web, iOS, Android",
                offers: {
                  "@type": "Offer",
                  price: "8.99",
                  priceCurrency: "GBP",
                  priceSpecification: {
                    "@type": "UnitPriceSpecification",
                    price: "8.99",
                    priceCurrency: "GBP",
                    billingDuration: "P1M",
                  },
                },
                aggregateRating: {
                  "@type": "AggregateRating",
                  ratingValue: "4.9",
                  ratingCount: "327",
                  bestRating: "5",
                  worstRating: "1",
                },
                inLanguage: "en-GB",
              },
            ]),
          }}
        />
      </body>
    </html>
  );
}
