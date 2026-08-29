import type { Metadata } from "next";
import Link from "next/link";
import { MarketingNav } from "@/components/marketing/nav";
import { MarketingFooter } from "@/components/marketing/footer";
import { Container } from "@/components/shared/container";
import { Eyebrow } from "@/components/shared/eyebrow";
import { SplitHeading } from "@/components/shared/split-heading";

export const metadata: Metadata = {
  /* The root layout appends " \u00b7 Suth Performance" to every child title.
     Naming the brand here printed it twice. */
  title: "Contact, support, press and partnerships",
  description:
    "Questions, billing, press or partnership enquiries for Suth Performance. We reply within 24 hours, Monday to Friday.",
  alternates: { canonical: "/contact" },
};

const CONTACTS = [
  {
    tag: "General",
    label: "General questions",
    email: "hello@suthperformance.com",
    note: "Anything that does not fit a more specific inbox.",
  },
  {
    tag: "Coaching",
    label: "Coaching support",
    email: "support@suthperformance.com",
    note: "Training questions, plan issues, billing, account changes, refunds.",
  },
  {
    tag: "Press",
    label: "Press enquiries",
    email: "press@suthperformance.com",
    note: "Media enquiries, interviews with Ben, brand collaborations.",
  },
];

export default function ContactPage() {
  return (
    <>
      <MarketingNav />
      <main className="pb-24 pt-32 md:pt-40">
        <Container>
          <div className="mx-auto max-w-5xl">
            <Eyebrow>Contact</Eyebrow>
            <SplitHeading
              as="h1"
              className="mt-4 text-3xl font-black leading-[1.05] tracking-[-0.04em] text-suth-text md:text-[46px]"
            >
              Get in touch.
            </SplitHeading>
            <p className="mt-5 text-base text-suth-text-secondary md:text-lg">
              We reply within 24 hours, Monday to Friday. If you are already
              training with Ben, message him in the app — it reaches him
              faster than any inbox here.
            </p>

            <div className="mt-14 grid grid-cols-1 gap-4 md:grid-cols-3">
              {CONTACTS.map((c) => (
                <a
                  key={c.email}
                  href={`mailto:${c.email}`}
                  className="group flex h-full flex-col gap-4 rounded-lg border border-suth-border bg-suth-elevated p-6 transition-[border,transform] duration-fast ease-out hover:border-suth-border-strong active:scale-[0.99]"
                >
                  <Eyebrow>{c.tag}</Eyebrow>
                  <div>
                    <h2 className="text-lg font-bold tracking-tight text-suth-text md:text-xl">
                      {c.label}
                    </h2>
                    <p className="mt-2 text-sm text-suth-text-secondary md:text-base">
                      {c.note}
                    </p>
                  </div>
                  {/* break-all: the longest address overflows the card at
                      three-across on desktop otherwise. */}
                  <span className="mt-auto break-all text-sm text-suth-accent transition-colors group-hover:text-suth-accent-hover md:text-[15px]">
                    {c.email}
                  </span>
                </a>
              ))}
            </div>

            {/* FOUR STACKED BLOCKS BECAME A GRID, AND ONE OF THEM LEFT.
                Each of these was a full-width row with a rule above it, in a
                max-w-3xl column — on a monitor that is a ribbon of text down
                the middle of an empty page with four horizontal lines
                through it. They are all short, so they sit side by side.

                The "coming soon: live chat" panel is gone. It had been
                coming soon long enough to have become a statement about the
                site rather than about the chat, and a contact page is the
                worst place to promise a channel that does not exist. The
                inboxes above are the honest answer.

                And the thing most people arriving here actually want is now
                on the page: a call with Ben, which is free and bookable in
                two taps rather than an email and a wait. */}
            <div className="mt-16 grid gap-10 border-t border-suth-border-subtle pt-10 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-14">
              <dl className="grid gap-8 sm:grid-cols-2">
                <div>
                  <dt>
                    <Eyebrow>Response time</Eyebrow>
                  </dt>
                  <dd className="mt-3 text-base text-suth-text md:text-lg">
                    Within 24 hours, Monday to Friday.
                  </dd>
                </div>
                <div>
                  <dt>
                    <Eyebrow>Office</Eyebrow>
                  </dt>
                  <dd className="mt-3 text-base text-suth-text-secondary md:text-lg">
                    Suth Performance, United Kingdom.
                  </dd>
                </div>
                <div className="sm:col-span-2">
                  <dt>
                    <Eyebrow>Follow Ben</Eyebrow>
                  </dt>
                  <dd className="mt-3 text-base text-suth-text-secondary md:text-lg">
                    Training, racing, and behind the scenes:{" "}
                    <a
                      href="https://instagram.com/bennysuth95"
                      target="_blank"
                      rel="noopener noreferrer"
                      /* Always underlined. On touch there is no hover, so
                         `hover:underline` leaves the link colour-only. */
                      className="text-suth-accent underline underline-offset-4"
                    >
                      @bennysuth95 on Instagram
                    </a>
                    .
                  </dd>
                </div>
              </dl>

              <aside className="rounded-lg border border-suth-accent/40 bg-suth-elevated p-6">
                <Eyebrow>Rather talk?</Eyebrow>
                <p className="mt-3 text-base leading-relaxed text-suth-text">
                  Ben does a free half-hour call — about your training, not a
                  sales pitch. Pick a time from his diary and he&apos;ll ring
                  you.
                </p>
                <Link
                  href="/book"
                  className="mt-5 inline-flex h-12 w-full items-center justify-center rounded-pill bg-suth-accent px-6 text-sm font-semibold text-[#0A0A0A] transition-colors hover:bg-suth-accent-hover"
                >
                  Free assessment →
                </Link>
                <p className="mt-3 text-xs leading-relaxed text-suth-text-tertiary">
                  No card, no obligation, move it whenever.
                </p>
              </aside>
            </div>
          </div>
        </Container>
      </main>
      <MarketingFooter />
    </>
  );
}
