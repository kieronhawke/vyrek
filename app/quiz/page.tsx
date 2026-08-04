import type { Metadata } from "next";
import QuizV3 from "@/components/quiz-v3/quiz-flow";
import { loadQuizCopy } from "@/lib/quiz-copy/store";

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
  return <QuizV3 copy={copy} />;
}
