import { MarketingNav } from "@/components/marketing/nav";
import { Hero } from "@/components/marketing/hero";
import { SocialProofBar } from "@/components/marketing/social-proof-bar";
import { PlanTeaser } from "@/components/marketing/plan-teaser";
import { OutcomeStats } from "@/components/marketing/outcome-stats";
import { Programmes } from "@/components/marketing/programmes";
import { BentoFeatures } from "@/components/marketing/bento-features";
import { WeekInLife } from "@/components/marketing/week-in-life";
import { NotReady } from "@/components/marketing/not-ready";
import { CoachHub } from "@/components/marketing/coach-hub";
import { PlanDeepDive } from "@/components/marketing/plan-deep-dive";
import { Methodology } from "@/components/marketing/methodology";
import { Testimonials } from "@/components/marketing/testimonials";
import { Faq } from "@/components/marketing/faq";
import { FinalCta } from "@/components/marketing/final-cta";
import { MarketingFooter } from "@/components/marketing/footer";

export default function Home() {
  return (
    <>
      <MarketingNav />
      <main>
        <Hero />
        <SocialProofBar />
        <PlanTeaser />
        <OutcomeStats />
        <Programmes />
        <BentoFeatures />
        <WeekInLife />
        <NotReady />
        <CoachHub />
        <PlanDeepDive />
        <Methodology />
        <Testimonials />
        <Faq />
        <FinalCta />
      </main>
      <MarketingFooter />
    </>
  );
}
