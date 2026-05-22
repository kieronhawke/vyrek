import type { ReactNode } from "react";
import { MarketingNav } from "@/components/marketing/nav";
import { MarketingFooter } from "@/components/marketing/footer";
import { Container } from "@/components/shared/container";
import { Eyebrow } from "@/components/shared/eyebrow";
import { SplitHeading } from "@/components/shared/split-heading";

const LAST_UPDATED_LABEL = "22 May 2026";

export function LegalLayout({
  eyebrow,
  title,
  children,
  lastUpdated = LAST_UPDATED_LABEL,
}: {
  eyebrow: string;
  title: string;
  children: ReactNode;
  lastUpdated?: string;
}) {
  return (
    <>
      <MarketingNav />
      <main className="pb-24 pt-32 md:pt-40">
        <Container>
          <header className="mx-auto max-w-3xl">
            <Eyebrow>{eyebrow}</Eyebrow>
            <SplitHeading
              as="h1"
              className="mt-4 text-3xl font-black leading-[1.05] tracking-[-0.04em] text-vyrek-text md:text-5xl"
            >
              {title}
            </SplitHeading>
            <p className="mt-4 font-mono text-xs uppercase tracking-[0.18em] text-vyrek-text-tertiary">
              Last updated: {lastUpdated}
            </p>
          </header>

          <article
            className="legal-body mx-auto mt-12 max-w-3xl text-base leading-relaxed text-vyrek-text-secondary md:text-lg"
          >
            {children}
          </article>
        </Container>
      </main>
      <MarketingFooter />
    </>
  );
}
