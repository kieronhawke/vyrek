import type { Metadata } from "next";
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
    "Get in touch with Suth Performance. General questions, billing support, press enquiries, athlete features, brand collaborations. We reply within 24 hours, Monday to Friday.",
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
          <div className="mx-auto max-w-3xl">
            <Eyebrow>Contact</Eyebrow>
            <SplitHeading
              as="h1"
              className="mt-4 text-3xl font-black leading-[1.05] tracking-[-0.04em] text-suth-text md:text-[46px]"
            >
              Get in touch.
            </SplitHeading>
            <p className="mt-5 text-base text-suth-text-secondary md:text-lg">
              The Suth Performance team typically replies within 24 hours, Monday to
              Friday. For urgent training questions, message us in the app.
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

            <div className="mt-16 border-t border-suth-border-subtle pt-10">
              <Eyebrow>Response time</Eyebrow>
              <p className="mt-3 text-base text-suth-text md:text-lg">
                We reply within 24 hours, Monday to Friday.
              </p>
            </div>

            <div className="mt-12 border-t border-suth-border-subtle pt-10">
              <Eyebrow>Live chat</Eyebrow>
              <div className="mt-3 rounded-lg border border-dashed border-suth-border bg-suth-elevated/60 p-5">
                <p className="text-base text-suth-text">
                  Coming soon: live chat at the bottom-right of every page.
                </p>
                <p className="mt-2 text-sm text-suth-text-secondary">
                  Until then, the inboxes above are the fastest way through.
                </p>
                {/*
                  CRISP EMBED PLACEHOLDER.
                  When ready, drop the Crisp Live Chat script into
                  app/layout.tsx <body>:

                    <Script id="crisp" strategy="afterInteractive">{`
                      window.$crisp=[];window.CRISP_WEBSITE_ID="<id>";
                      (function(){var d=document;var s=d.createElement("script");
                      s.src="https://client.crisp.chat/l.js";s.async=1;
                      d.getElementsByTagName("head")[0].appendChild(s);})();
                    `}</Script>

                  Get the website ID from app.crisp.chat → Settings →
                  Website Settings → Setup Instructions.
                */}
              </div>
            </div>

            <div className="mt-12 border-t border-suth-border-subtle pt-10">
              <Eyebrow>Follow Ben</Eyebrow>
              <p className="mt-3 text-base text-suth-text-secondary md:text-lg">
                Training, racing, and behind the scenes:{" "}
                <a
                  href="https://instagram.com/bennysuth95"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-suth-accent underline-offset-4 hover:underline"
                >
                  @bennysuth95 on Instagram
                </a>
                .
              </p>
            </div>

            <div className="mt-12 border-t border-suth-border-subtle pt-10">
              <Eyebrow>Office</Eyebrow>
              <p className="mt-3 text-base text-suth-text-secondary md:text-lg">
                Suth Performance, United Kingdom.
              </p>
            </div>
          </div>
        </Container>
      </main>
      <MarketingFooter />
    </>
  );
}
