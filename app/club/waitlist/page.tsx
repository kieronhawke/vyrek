import type { Metadata } from "next";
import { MarketingNav } from "@/components/marketing/nav";
import { MarketingFooter } from "@/components/marketing/footer";
import { Container } from "@/components/shared/container";
import { ClubWaitlistForm } from "@/components/club/waitlist-form";

export const metadata: Metadata = {
  title: "Join the Suth Club waiting list · Suth Performance",
  description:
    "Suth Club opens soon. Join the waiting list and be first in when it does.",
};

export default function ClubWaitlistPage() {
  return (
    <>
      <MarketingNav />
      <main className="pb-24 pt-32 md:pt-40">
        <Container>
          <div className="mx-auto max-w-xl">
            <header className="text-center">
              <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-suth-accent">
                [ Suth Club · coming soon ]
              </p>
              <h1 className="mt-4 text-3xl font-black leading-[1.05] tracking-[-0.05em] text-suth-text md:text-[44px]">
                Be first through the door.
              </h1>
              <p className="mt-5 text-base text-suth-text-secondary">
                Suth Club is nearly ready: Ben&apos;s programming, scaled to
                wherever you are, run at your own pace. Leave your details
                and you&apos;ll be the first to know when it opens.
              </p>
            </header>
            <div className="mt-10">
              <ClubWaitlistForm />
            </div>
          </div>
        </Container>
      </main>
      <MarketingFooter />
    </>
  );
}
