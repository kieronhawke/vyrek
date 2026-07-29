import type { Metadata } from "next";
import Image from "next/image";
import { MarketingNav } from "@/components/marketing/nav";
import { MarketingFooter } from "@/components/marketing/footer";
import { Container } from "@/components/shared/container";
import { Eyebrow } from "@/components/shared/eyebrow";
import { SplitHeading } from "@/components/shared/split-heading";

export const metadata: Metadata = {
  title: "Product screenshots · Suth Performance press kit",
  description:
    "Press-approved product screenshots of the Suth Performance app and marketing site. Free to use in editorial coverage with credit.",
  alternates: { canonical: "/press/screenshots" },
};

const SHOTS = [
  {
    src: "/media/images/track/pair-frontal-bw.jpg",
    title: "Home: hero",
    note: "Landing page hero, mobile crop.",
    credit: "Suth Performance",
  },
  {
    src: "/media/images/track/straight-elevated-bw.jpg",
    title: "Plan: Week 1 grid",
    note: "Day-by-day grid showing a personalised first week.",
    credit: "Suth Performance",
  },
  {
    src: "/media/images/track/bend-lanes-bw.jpg",
    title: "Progression view",
    note: "Athlete logging splits and station times across a 12-week block.",
    credit: "Suth Performance",
  },
  {
    src: "/media/images/track/palms-sunflare-pair-bw.jpg",
    title: "Quiz: interstitial",
    note: "Mid-funnel reassurance screen from the 15-screen plan-builder quiz.",
    credit: "Suth Performance",
  },
  {
    src: "/media/images/track/coach-avatar-colour.jpg",
    title: "Founder portrait: Ben Sutherland",
    note: "Placeholder. Approved press photography of Ben to follow.",
    credit: "Suth Performance",
  },
];

export default function PressScreenshotsPage() {
  return (
    <>
      <MarketingNav />
      <main className="pb-24 pt-32 md:pt-40">
        <Container>
          <div className="mx-auto max-w-4xl">
            <Eyebrow>Press · Product screenshots</Eyebrow>
            <SplitHeading
              as="h1"
              className="mt-4 text-3xl font-black leading-[1.05] tracking-[-0.04em] text-suth-text md:text-5xl"
            >
              Product screenshots.
            </SplitHeading>
            <p className="mt-5 text-base text-suth-text-secondary md:text-lg">
              Press-approved imagery from the Suth Performance app and marketing surface.
              Right-click or long-press to save the full-resolution file.
              Credit &quot;Suth Performance&quot; where space allows.
            </p>

            <ul role="list" className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2">
              {SHOTS.map((s) => (
                <li
                  key={s.src}
                  className="flex flex-col gap-3 rounded-lg border border-suth-border bg-suth-elevated p-4"
                >
                  <a
                    href={s.src}
                    target="_blank"
                    rel="noreferrer"
                    download
                    className="relative block aspect-[4/3] overflow-hidden rounded-md bg-suth-overlay"
                  >
                    <Image
                      src={s.src}
                      alt={s.title}
                      fill
                      sizes="(min-width: 640px) 50vw, 100vw"
                      className="object-cover"
                    />
                  </a>
                  <div>
                    <p className="text-base font-bold text-suth-text">
                      {s.title}
                    </p>
                    <p className="mt-1 text-sm text-suth-text-secondary">
                      {s.note}
                    </p>
                    <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.22em] text-suth-text-tertiary">
                      [ Credit: {s.credit} ]
                    </p>
                  </div>
                </li>
              ))}
            </ul>

            <p className="mt-10 text-sm text-suth-text-tertiary">
              Higher resolutions or specific crops available on request:{" "}
              <a
                href="mailto:press@suthperformance.com"
                className="underline underline-offset-4 hover:text-suth-accent"
              >
                press@suthperformance.com
              </a>
              .
            </p>
          </div>
        </Container>
      </main>
      <MarketingFooter />
    </>
  );
}
