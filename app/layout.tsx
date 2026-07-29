import type { Metadata, Viewport } from "next";
import { Oswald, Inter, Geist_Mono } from "next/font/google";
import "./globals.css";
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
  // PRE-LAUNCH HARD RULE: no indexing until Kieron explicitly clears it
  // (and re-confirm with him even then). Belt to the X-Robots-Tag header
  // braces in next.config.ts; that header wins over any per-page value.
  robots: { index: false, follow: false },
  title: {
    default: "Suth Performance. Train like a Hyrox athlete",
    template: "%s · Suth Performance",
  },
  description:
    "Personalised Hyrox training programmes built by an Elite 15 coach. See your Week 1 before you pay.",
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
      "Personalised Hyrox training programmes built by an Elite 15 coach. See your Week 1 before you pay.",
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
    >
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
                potentialAction: {
                  "@type": "SearchAction",
                  target:
                    `${SITE}/quiz?program={search_term_string}`,
                  "query-input": "required name=search_term_string",
                },
              },
              // SoftwareApplication: lets Google surface Suth Performance as an
              // "app" rich-result for queries like "best Hyrox training
              // app". Also pulls in the rating + price for the SERP
              // card.
              {
                "@context": "https://schema.org",
                "@type": "SoftwareApplication",
                "@id": `${SITE}#software`,
                name: "Suth Performance",
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
                inLanguage: "en-GB",
              },
            ]),
          }}
        />
      </body>
    </html>
  );
}
