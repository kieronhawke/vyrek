import type { Metadata } from "next";
import { MarketingNav } from "@/components/marketing/nav";
import { MarketingFooter } from "@/components/marketing/footer";
import { Container } from "@/components/shared/container";
import { Eyebrow } from "@/components/shared/eyebrow";
import { SplitHeading } from "@/components/shared/split-heading";

export const metadata: Metadata = {
  title: "Contact Vyrek, support, press & partnerships",
  description:
    "Get in touch with Vyrek. General questions, billing support, press enquiries, athlete features, brand collaborations. We reply within 24 hours, Monday to Friday.",
};

const CONTACTS = [
  {
    tag: "General",
    label: "General questions",
    email: "hello@vyrek.com",
    note: "Anything that does not fit a more specific inbox.",
  },
  {
    tag: "Support",
    label: "Product support",
    email: "support@vyrek.com",
    note: "Billing, plan issues, account changes, refunds.",
  },
  {
    tag: "Press",
    label: "Press and partnerships",
    email: "press@vyrek.com",
    note: "Media enquiries, athlete features, brand collaborations.",
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
              className="mt-4 text-3xl font-black leading-[1.05] tracking-[-0.04em] text-vyrek-text md:text-5xl"
            >
              Get in touch.
            </SplitHeading>
            <p className="mt-5 text-base text-vyrek-text-secondary md:text-lg">
              The Vyrek team typically replies within 24 hours, Monday to
              Friday. For urgent training questions, message us in the app.
            </p>

            <div className="mt-14 grid grid-cols-1 gap-4 md:grid-cols-3">
              {CONTACTS.map((c) => (
                <a
                  key={c.email}
                  href={`mailto:${c.email}`}
                  className="group flex h-full flex-col gap-4 rounded-lg border border-vyrek-border bg-vyrek-elevated p-6 transition-[border,transform] duration-fast ease-out hover:border-vyrek-border-strong active:scale-[0.99]"
                >
                  <Eyebrow>{c.tag}</Eyebrow>
                  <div>
                    <h2 className="text-lg font-bold tracking-tight text-vyrek-text md:text-xl">
                      {c.label}
                    </h2>
                    <p className="mt-2 text-sm text-vyrek-text-secondary md:text-base">
                      {c.note}
                    </p>
                  </div>
                  <span className="mt-auto inline-flex items-center gap-1 text-base text-vyrek-accent transition-colors group-hover:text-vyrek-accent-hover">
                    {c.email}
                    <span aria-hidden>→</span>
                  </span>
                </a>
              ))}
            </div>

            <div className="mt-16 border-t border-vyrek-border-subtle pt-10">
              <Eyebrow>Response time</Eyebrow>
              <p className="mt-3 text-base text-vyrek-text md:text-lg">
                We reply within 24 hours, Monday to Friday.
              </p>
            </div>

            <div className="mt-12 border-t border-vyrek-border-subtle pt-10">
              <Eyebrow>Live chat</Eyebrow>
              <div className="mt-3 rounded-lg border border-dashed border-vyrek-border bg-vyrek-elevated/60 p-5">
                <p className="text-base text-vyrek-text">
                  Coming soon: live chat at the bottom-right of every page.
                </p>
                <p className="mt-2 text-sm text-vyrek-text-secondary">
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

            <div className="mt-12 border-t border-vyrek-border-subtle pt-10">
              <Eyebrow>Office</Eyebrow>
              <p className="mt-3 text-base text-vyrek-text-secondary md:text-lg">
                Vyrek, United Kingdom.
              </p>
            </div>
          </div>
        </Container>
      </main>
      <MarketingFooter />
    </>
  );
}
