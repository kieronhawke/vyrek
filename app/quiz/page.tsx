import type { Metadata } from "next";
import QuizV3 from "@/components/quiz-v3/quiz-flow";
import { loadQuizCopy } from "@/lib/quiz-copy/store";
import { headers } from "next/headers";
import { isoFromCountryHeader } from "@/lib/dial-codes";

export const metadata: Metadata = {
  /* The root layout appends " \u00b7 Suth Performance" to every child title.
     Naming the brand here printed it twice. */
  title: "Quiz. Find your Hyrox plan in three minutes",
  description:
    "Three-minute quiz to build your personalised Hyrox plan. Programme, weekly schedule, sled and wall ball loads calibrated to you. See Week 1 for free.",
  alternates: { canonical: "/quiz" },
  openGraph: {
    title: "Find your Hyrox plan in three minutes",
    description:
      "Personalised 12-week Hyrox plan, dated to your race. Take the three-minute quiz, see your Week 1 for free.",
    url: "/quiz",
    type: "website",
    images: [
      {
        url: "/media/images/track/programme-first-race.jpg",
        width: 1200,
        height: 630,
        alt: "Athlete in a training session",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Find your Hyrox plan in three minutes",
    description:
      "Personalised 12-week Hyrox plan, dated to your race. See your Week 1 for free.",
    images: ["/media/images/track/programme-first-race.jpg"],
  },
};

/* Read on the server so the edited words are in the first HTML, not
   swapped in after paint. A read failure returns {} rather than throwing —
   the quiz opens with its shipped copy, which is the right answer to a
   database that is having a bad day. */
export const dynamic = "force-dynamic";

export default async function QuizPage() {
  const copy = await loadQuizCopy();

  /* Open the phone field on the country they are actually in.
     Vercel puts an ISO country on every request. A UK default is right for
     most people here and silently wrong for the rest: 612 34 56 78 typed
     under an assumed +44 produces a number nobody can ring, and they never
     find out it failed. */
  const h = await headers();
  const country = isoFromCountryHeader(h.get("x-vercel-ip-country"));

  return (
    <>
      {/* Both aside photographs, fetched before the first question renders.
          The panel swaps when the rail is decided on screen one, and a
          remount happens on the way out of every interstitial — neither
          should ever wait on a network round trip. */}
      <link
        rel="preload"
        as="image"
        href="/media/images/ben/ben-steps.jpg"
        fetchPriority="high"
      />
      <link rel="preload" as="image" href="/media/images/ben/ben-race-portrait.jpg" />
      <QuizV3 copy={copy} country={country} />
    </>
  );
}
