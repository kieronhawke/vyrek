import type { Metadata } from "next";
import Image from "next/image";
import { MarketingNav } from "@/components/marketing/nav";
import { MarketingFooter } from "@/components/marketing/footer";
import { Container } from "@/components/shared/container";
import { ConsultationForm } from "@/components/consultation/consultation-form";
import { siteUrl } from "@/lib/blog/urls";

export const metadata: Metadata = {
  title: "Free consultation with Ben Sutherland",
  description:
    "A free, no-pressure call with HYROX Elite 15 athlete Ben Sutherland about your goals and how to train for them. No card, no commitment.",
  alternates: { canonical: `${siteUrl()}/free-consultation` },
};

const CALL_POINTS = [
  {
    title: "Where you are now",
    body: "Your training history, what's worked, what hasn't, and anything to work around. No judgement, everyone starts somewhere.",
  },
  {
    title: "Where you want to get to",
    body: "Losing weight, feeling strong, a first Hyrox finish line, or a serious time goal. Ben coaches every level of that spectrum.",
  },
  {
    title: "The honest plan to get there",
    body: "What training would actually look like week to week, and which coaching option fits your goals and budget. If we're not the right fit, Ben will say so.",
  },
];

export default function FreeConsultationPage() {
  return (
    <>
      <MarketingNav />
      <main className="pb-24 pt-28 md:pt-36">
        <Container>
          <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-12 lg:gap-16">
            <div className="lg:col-span-6">
              <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-suth-accent">
                [ Free consultation ]
              </p>
              <h1 className="mt-4 text-balance text-[34px] font-black leading-[1.06] tracking-[-0.03em] text-suth-text md:text-[44px]">
                Talk to Ben about your goals.
              </h1>
              <p className="mt-5 max-w-xl text-base leading-relaxed text-suth-text-secondary md:text-lg">
                A free, no-pressure call with HYROX Elite 15 athlete Ben
                Sutherland. Whether you&apos;re starting from the sofa or
                chasing an elite time, the first step is the same
                conversation.
              </p>

              <div className="relative mt-8 aspect-[16/9] overflow-hidden rounded-lg bg-suth-overlay">
                <Image
                  src="/media/images/track/gym-coach-row-colour.jpg"
                  alt="Coach standing over an athlete mid rowing interval in the gym"
                  fill
                  priority
                  sizes="(min-width: 1024px) 560px, 100vw"
                  className="object-cover"
                />
              </div>

              <h2 className="mt-10 font-mono text-[11px] uppercase tracking-[0.22em] text-suth-text-tertiary">
                What the call covers
              </h2>
              <ol className="mt-4 space-y-4">
                {CALL_POINTS.map((p, i) => (
                  <li key={p.title} className="flex gap-4">
                    <span className="shrink-0 font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-suth-accent">
                      [ 0{i + 1} ]
                    </span>
                    <div>
                      <p className="text-base font-bold text-suth-text">
                        {p.title}
                      </p>
                      <p className="mt-1 text-sm leading-relaxed text-suth-text-secondary">
                        {p.body}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>

            <div className="lg:col-span-6">
              <div className="rounded-lg border border-suth-border-subtle bg-suth-elevated p-6 md:p-8 lg:sticky lg:top-28">
                <ConsultationForm />
              </div>
            </div>
          </div>
        </Container>
      </main>
      <MarketingFooter />
    </>
  );
}
