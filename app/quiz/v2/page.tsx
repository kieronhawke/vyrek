import type { Metadata } from "next";
import QuizFlow from "@/components/quiz-v2/quiz-flow";

export const metadata: Metadata = {
  title: "Quiz V2. Find your plan",
  description:
    "Vyrek's V2 onboarding quiz, preserved as a fallback while V3 is verified live.",
  robots: { index: false, follow: false },
};

export default function QuizV2Page() {
  return <QuizFlow />;
}
