import type { Metadata } from "next";
import { MarketingNav } from "@/components/marketing/nav";
import { MarketingFooter } from "@/components/marketing/footer";
import { Container } from "@/components/shared/container";
import { BookingForm } from "@/components/booking/booking-form";
import { BEN } from "@/lib/ben";
import { siteUrl } from "@/lib/site-url";

export const metadata: Metadata = {
  title: "Book your free consultation",
  description:
    "Pick a time and Ben Sutherland will call you. Thirty minutes, free, no obligation — whether you're starting from scratch or chasing a time.",
  alternates: { canonical: `${siteUrl()}/book` },
};

/**
 * The booking page.
 *
 * Deliberately thin on copy. Somebody arriving here has already decided —
 * they came from the quiz, an email, or a CTA that said what this is. The
 * job now is to get them to a time in as few decisions as possible, so the
 * calendar is the first thing on the page rather than the fourth.
 *
 * The reassurance that remains is the reassurance that stops people
 * hesitating over a phone call specifically: what it costs, how long it
 * takes, and that it is not a sales call.
 */
export default function BookPage() {
  return (
    <>
      <MarketingNav />
      <main className="pb-24 pt-28 md:pt-36">
        <Container>
          <div className="mx-auto max-w-5xl">
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-suth-accent">
              [ Free consultation ]
            </p>
            <h1 className="mt-4 text-balance text-[34px] font-black leading-[1.06] tracking-[-0.03em] text-suth-text md:text-[44px]">
              Pick a time and Ben will call you.
            </h1>
            <p className="mt-5 max-w-2xl text-pretty text-base leading-relaxed text-suth-text-secondary md:text-lg">
              Thirty minutes on the phone with {BEN.name}. It&apos;s free,
              there&apos;s nothing to prepare, and if he isn&apos;t the right
              coach for what you&apos;re after he&apos;ll tell you.
            </p>

            <ul className="mt-8 flex flex-wrap gap-2">
              {["Free", "About 30 minutes", "No obligation", "UK time"].map(
                (item) => (
                  <li
                    key={item}
                    // 11px, not 10. The email tests hold an 11px floor and there is no
                    // reason the site should be softer than the inbox.
                    className="rounded-pill border border-suth-border bg-suth-elevated px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.16em] text-suth-text-secondary"
                  >
                    {item}
                  </li>
                ),
              )}
            </ul>

            <div className="mt-12">
              <BookingForm />
            </div>
          </div>
        </Container>
      </main>
      <MarketingFooter />
    </>
  );
}
