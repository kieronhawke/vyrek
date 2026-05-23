import type { Metadata } from "next";
import Link from "next/link";
import { MarketingNav } from "@/components/marketing/nav";
import { MarketingFooter } from "@/components/marketing/footer";
import { Container } from "@/components/shared/container";
import { Eyebrow } from "@/components/shared/eyebrow";
import { CtaButton } from "@/components/shared/cta-button";

export const metadata: Metadata = {
  title: "Partner dashboard",
  description:
    "Sign in to your Vyrek Partner Programme dashboard. Track referrals, earnings, and payouts.",
  robots: { index: false, follow: false },
};

export default function PartnersDashboardPage() {
  return (
    <>
      <MarketingNav />
      <main className="pb-24 pt-32 md:pt-40">
        <Container>
          <div className="mx-auto max-w-2xl">
            <Eyebrow>Partner dashboard</Eyebrow>
            <h1 className="mt-4 text-3xl font-black leading-[1.05] tracking-[-0.04em] text-vyrek-text md:text-5xl">
              Sign in.
            </h1>
            <p className="mt-5 text-base text-vyrek-text-secondary md:text-lg">
              The partner dashboard opens once your application is approved.
              We email you a sign-in link as soon as we have reviewed your
              application (typically within 48 hours, Monday to Friday).
            </p>

            <div className="mt-12 rounded-lg border border-vyrek-border-subtle bg-vyrek-elevated p-6 md:p-8">
              <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-vyrek-accent">
                [ NOT APPLIED YET? ]
              </p>
              <p className="mt-4 text-base leading-relaxed text-vyrek-text-secondary md:text-lg">
                Tell us about your audience in three minutes. We review every
                application by hand.
              </p>
              <div className="mt-6">
                <CtaButton href="/partners/apply" size="md">
                  Apply to join →
                </CtaButton>
              </div>
            </div>

            <div className="mt-8 rounded-lg border border-vyrek-border-subtle bg-vyrek-elevated p-6 md:p-8">
              <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-vyrek-accent">
                [ ALREADY APPROVED? ]
              </p>
              <p className="mt-4 text-base leading-relaxed text-vyrek-text-secondary md:text-lg">
                Open the sign-in link from your approval email. If you cannot
                find it, request a new one from{" "}
                <a
                  href="mailto:partners@vyrek.com"
                  className="text-vyrek-accent underline underline-offset-4"
                >
                  partners@vyrek.com
                </a>
                .
              </p>
              <p className="mt-4 text-sm text-vyrek-text-tertiary">
                We reply within 24 hours, Monday to Friday.
              </p>
            </div>

            <p className="mt-12 text-center font-mono text-[11px] uppercase tracking-[0.22em] text-vyrek-text-tertiary">
              [ DASHBOARD UI IN PROGRESS · STATS, LINKS, PAYOUTS LAUNCHING SOON ]
            </p>

            <div className="mt-10 text-center">
              <Link
                href="/partners"
                className="font-mono text-[11px] uppercase tracking-[0.22em] text-vyrek-text-secondary hover:text-vyrek-text"
              >
                ← back to programme overview
              </Link>
            </div>
          </div>
        </Container>
      </main>
      <MarketingFooter />
    </>
  );
}
