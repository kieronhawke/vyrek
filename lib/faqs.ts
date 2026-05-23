/**
 * FAQ copy, verbatim from build brief §8.12.
 * Phase G migrates these to Sanity for non-coder editing.
 */

export type Faq = { question: string; answer: string };

export const FAQS: Faq[] = [
  {
    question: "What is Vyrek?",
    answer:
      "Personalised Hyrox training programmes built by Elite 15 athletes. Take the three-minute quiz. See your first week. Start a 7-day free trial.",
  },
  {
    question: "Is this just an app?",
    answer:
      "Right now, it's a web platform. Access from any device. iOS app coming. Add to your home screen for app-like use today.",
  },
  {
    question: "Who designs the programming?",
    answer:
      "Programmes are designed by Elite 15 Hyrox athletes. Founding coach: James Wright. More coaches joining.",
  },
  {
    question: "What if I've never done a Hyrox?",
    answer:
      "The First Race programme is built for exactly that. 12 weeks to your first finish line.",
  },
  {
    question: "What equipment do I need?",
    answer:
      "None to start. The quiz adapts to whatever you have. Full gym, home setup, or bodyweight.",
  },
  {
    question: "What happens after my trial ends?",
    answer:
      "On day 8, you're charged £8.99/month. Cancel anytime in two taps.",
  },
  {
    question: "Can I cancel during the trial?",
    answer: "Yes. Two taps. No questions. No charge.",
  },
  {
    question: "Will my plan change as I improve?",
    answer:
      "Yes. Every Sunday, plans recalibrate based on your logged sessions.",
  },
];
