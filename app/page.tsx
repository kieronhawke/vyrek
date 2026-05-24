import { MarketingNav } from "@/components/marketing/nav";
import { Hero } from "@/components/marketing/hero";
import { SocialProofBar } from "@/components/marketing/social-proof-bar";
import { WhatYouGet } from "@/components/marketing/what-you-get";
import { Programmes } from "@/components/marketing/programmes";
import { DatedWeeklyPlan } from "@/components/marketing/dated-weekly-plan";
import { AdaptAsYouImprove } from "@/components/marketing/adapt-as-you-improve";
import { WeekInLife } from "@/components/marketing/week-in-life";
import { PlanDeepDive } from "@/components/marketing/plan-deep-dive";
import { CoachHub } from "@/components/marketing/coach-hub";
import { Methodology } from "@/components/marketing/methodology";
import { Testimonials } from "@/components/marketing/testimonials";
import { Faq } from "@/components/marketing/faq";
import { FinalCta } from "@/components/marketing/final-cta";
import { MarketingFooter } from "@/components/marketing/footer";
import { StickyMobileCta } from "@/components/marketing/sticky-mobile-cta";

export default function Home() {
  return (
    <>
      <MarketingNav />
      <main>
        <Hero />
        <SocialProofBar />
        <WhatYouGet />
        <Programmes />
        <DatedWeeklyPlan />
        <AdaptAsYouImprove />
        <WeekInLife />
        <PlanDeepDive />
        <CoachHub />
        <Methodology />
        <Testimonials />
        <Faq />
        <FinalCta />
      </main>
      <MarketingFooter />
      <StickyMobileCta />
    </>
  );
}
