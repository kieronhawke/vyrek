/**
 * FAQ copy.
 *
 * Two jobs, and the second one is why this list is longer than a brand FAQ
 * usually is. It answers what people ask Ben on consultations, and it feeds the
 * `FAQPage` JSON-LD on the home page — so each entry is also a shot at a
 * long-tail query that people genuinely type ("how long to train for HYROX",
 * "can you do HYROX without a sled", "what is a good HYROX time").
 *
 * Rules that keep it useful rather than padded:
 *
 *   • **Answer in the first sentence.** Rich results truncate, and a question
 *     that opens with throat-clearing gets rendered as throat-clearing.
 *   • **Real questions only.** An invented question nobody asks is a snippet
 *     nobody searches for; it dilutes the page and helps no one.
 *   • **Concrete numbers where they exist.** "Depends on the athlete" is what
 *     everybody else's FAQ says, and it is why nobody reads them.
 *
 * Phase G migrates these to Sanity for non-coder editing.
 */

export type Faq = { question: string; answer: string };

export const FAQS: Faq[] = [
  {
    question: "What is Suth Performance?",
    answer:
      "Personalised Hyrox training programmes built by Elite 15 athletes. Take the three-minute quiz, see your first week, then talk it through with Ben on a free consultation.",
  },
  {
    question: "Is this just an app?",
    answer:
      "Right now, it's a web platform. Access from any device. iOS app coming. Add to your home screen for app-like use today.",
  },
  {
    question: "Who designs the programming?",
    answer:
      "Programmes are designed by Ben Sutherland, a HYROX Elite 15 athlete who coaches from first race to professional level.",
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
    question: "How much does it cost?",
    answer:
      "Pricing is tailored to your goals and level, and there is a cost-effective option for every budget. It starts with a free consultation with Ben, no card and no commitment.",
  },
  {
    question: "Can I cancel?",
    answer: "Yes. Two taps. No questions asked.",
  },
  {
    question: "Will my plan change as I improve?",
    answer:
      "Yes. Every Sunday, plans recalibrate based on your logged sessions.",
  },
  {
    question: "How long does it take to train for a HYROX?",
    answer:
      "Twelve weeks is the standard block, and it is what every Suth programme is built around: four weeks of aerobic base and station competence, four of race-pace work, three of sharpening, then a taper week. If your race is sooner than that the plan compresses rather than skipping phases — tell Ben the date on the consultation and he will say honestly whether the time is there.",
  },
  {
    question: "What is a good HYROX time?",
    answer:
      "For a first race, finishing is the result — most first-timers land between 1:20 and 1:40. Sub-1:15 is a strong age-group time, sub-90 minutes is the milestone most people chase after their first race, and Elite racing sits under an hour. You can check exactly where any time places you, by division and age group, with the free tools in our results section.",
  },
  {
    question: "How many days a week will I be training?",
    answer:
      "Usually four or five, and the plan is built to the number you actually have rather than the number that would be ideal. Three well-placed sessions beats five you skip, and the Sunday recalibration reads what you logged, not what was prescribed.",
  },
  {
    question: "Can I train for HYROX without a sled?",
    answer:
      "Yes, and most people start that way. Sled push and pull are the two stations hardest to replicate at home, so the programme substitutes heavy sustained-effort work that trains the same quality — and if you can get to a sled even once a fortnight, that is enough to keep the skill sharp.",
  },
  {
    question: "Do I need to be a runner?",
    answer:
      "No, but running is where most HYROX races are won and lost — it is half the event by time. The programming is built to make you a better runner under fatigue, which is a different thing from being a fast runner, and it starts from wherever you are.",
  },
  {
    question: "I do CrossFit already. Is this different?",
    answer:
      "Yes. CrossFit trains you to be broadly capable across unknown demands; HYROX is one known format, eight stations and eight kilometres, repeated identically at every race. The programming works backwards from that format, which mostly means far more running and much more specific sled, sandbag and wall ball work than a general fitness plan gives you.",
  },
  {
    question: "Do you coach doubles?",
    answer:
      "Yes, and Ben races doubles himself in the Elite 15 with his brother Harry. Doubles changes pacing and station strategy more than people expect, so the plan is written for the pair rather than handed to two individuals.",
  },
  {
    question: "Do you coach women and masters athletes?",
    answer:
      "Yes. Loads are set from your own standards rather than a fixed plate — women's sled at 102 kg, wall ball at 6 kg, sandbag lunge as a percentage of bodyweight — and the progression respects recovery rather than assuming a twenty-five-year-old's.",
  },
  {
    question: "Do I get an actual coach, or just a plan?",
    answer:
      "A coach. Ben writes the programme, you message him inside the app, and every Sunday the next week is rebuilt from what you logged. A static PDF is not what this is.",
  },
  {
    question: "What happens on the free consultation?",
    answer:
      "A conversation about your race date, your training history and what you actually have access to — then Ben tells you what he would do. No card, no commitment, and if a programme is not the right thing for you he will say so.",
  },
  {
    question: "Do you cover nutrition?",
    answer:
      "Fuelling around sessions and race day, yes — what to eat before a hard run, how to carb up in race week, what to take on the day. It is not a diet plan and there is no meal prescription.",
  },
  {
    question: "What if I get injured?",
    answer:
      "Tell Ben and the week gets rewritten around it. Most niggles need the load moved rather than the training stopped, and the plan is rebuilt weekly precisely so it can absorb that.",
  },
  {
    question: "Are the results tools really free?",
    answer:
      "Yes, all of them, with no account and no email. That includes the full race report: twelve sections on a single race, laid out as an A4 document you can print or share.",
  },
];
