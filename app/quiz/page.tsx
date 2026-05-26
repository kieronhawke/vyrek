import type { Metadata } from "next";
import QuizV3 from "@/components/quiz-v3/quiz-flow";

export const metadata: Metadata = {
  title: "Quiz. Find your Hyrox plan in three minutes · Vyrek",
  description:
    "Three-minute quiz to build your personalised Hyrox plan. Programme, weekly schedule, sled and wall ball loads calibrated to you. See Week 1 before you pay.",
  alternates: { canonical: "/quiz" },
  openGraph: {
    title: "Find your Hyrox plan in three minutes",
    description:
      "Personalised 12-week Hyrox plan, dated to your race. Take the three-minute quiz, see your Week 1 before you pay.",
    url: "/quiz",
    type: "website",
    images: [
      {
        url: "/media/images/v2/programme-first-race.jpg",
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
      "Personalised 12-week Hyrox plan, dated to your race. See your Week 1 before you pay.",
    images: ["/media/images/v2/programme-first-race.jpg"],
  },
};

export default function QuizPage() {
  return <QuizV3 />;
}
