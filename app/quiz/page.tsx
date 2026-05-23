import type { Metadata } from "next";
import QuizV3 from "@/components/quiz-v3/quiz-flow";

export const metadata: Metadata = {
  title: "Quiz. Find your plan",
  description:
    "Three-minute quiz to build your personalised Hyrox training plan. See your Week 1 before you pay.",
};

export default function QuizPage() {
  return <QuizV3 />;
}
