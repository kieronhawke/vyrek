import type { Metadata } from "next";
import Link from "next/link";
import { siteUrl } from "@/lib/blog/urls";
import { listDivisionReferences, SIMULATOR_DIVISIONS } from "@/lib/results/reference-splits";
import { formatTime } from "@/lib/results/format";
import { PercentileTool } from "@/components/results/tools/percentile-tool";
import { MicroLabel } from "@/components/results/ui/primitives";
import { CoachingCta } from "@/components/results/coaching-cta";

/**
 * `/tools/good-hyrox-time` — the percentile tool with an editorial wrapper.
 *
 * Targets "what is a good hyrox time", which is one of the highest-volume
 * questions in the sport and one nobody answers with actual distributions —
 * the existing answers are forum opinion. This gives a number *and* explains
 * why the number is the wrong question on its own.
 */

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "What Is a Good HYROX Time? Percentiles by Division | Suth Performance",
  description:
    "A good HYROX time depends entirely on your division. Enter yours and see the exact "
    + "percentile it places you in, against real finish distributions.",
  alternates: { canonical: "/tools/good-hyrox-time" },
  openGraph: { url: `${siteUrl()}/tools/good-hyrox-time`, type: "article" },
};

export default async function GoodTimePage({
  searchParams,
}: {
  searchParams: Promise<{ t?: string }>;
}) {
  const { t } = await searchParams;
  const initialSeconds = Number(t) > 0 ? Number(t) : undefined;
  const references = listDivisionReferences(SIMULATOR_DIVISIONS);
  const men = references.find((r) => r.division === "hyrox-men");
  const women = references.find((r) => r.division === "hyrox-women");

  const faqs = [
    {
      q: "What is a good HYROX time?",
      a: men && women
        ? `For an Open division athlete, the median finish is around ${formatTime(men.medianFinishSeconds)} `
          + `for men and ${formatTime(women.medianFinishSeconds)} for women. Anything under the median `
          + `puts you in the faster half of your division. But "good" only means anything relative to `
          + `your division, your age group and how long you have been training — a first-timer finishing `
          + `at the median has had a far better day than a third-season athlete doing the same.`
        : "It depends entirely on your division and age group.",
    },
    {
      q: "Is sub-90 a good HYROX time?",
      a: men
        ? `Sub-90 minutes puts an Open Men athlete comfortably in the faster half of the field, and `
          + `it is the most common first serious target because it is reachable within a season for `
          + `most people who train for it deliberately. For Open Women it is a considerably stronger result.`
        : "Sub-90 is a common first serious target for Open division athletes.",
    },
    {
      q: "What is the fastest HYROX time?",
      a: "Elite fields finish well under an hour. Those times are not a useful reference for anyone "
        + "outside the professional field — compare yourself to your own division and age group instead, "
        + "which is what the tool above does.",
    },
    {
      q: "Does the Roxzone count towards my time?",
      a: "Yes. Every second between crossing the mat and starting the next station is in your finish "
        + "time, and transitions are usually the cheapest minutes to win back — most athletes lose more "
        + "there than they realise.",
    },
  ];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.q,
      acceptedAnswer: { "@type": "Answer", text: faq.a },
    })),
  };

  return (
    <div className="mx-auto max-w-[900px] px-5 py-6 md:py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <header>
        <MicroLabel>[ PERCENTILE ]</MicroLabel>
        <h1 className="mt-2 text-2xl font-black tracking-[-0.02em] text-suth-text md:text-4xl">
          What is a good HYROX time?
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-suth-text-secondary md:text-base">
          The honest answer is that it depends on your division, and most sources answer it with
          opinion rather than data. Enter your time below and see exactly where it places you.
        </p>
      </header>

      <div className="mt-6">
        {references.length > 0 ? (
          <PercentileTool references={references} initialSeconds={initialSeconds} />
        ) : (
          <p className="text-sm text-suth-text-secondary">Reference data is unavailable.</p>
        )}
      </div>

      <section className="mt-10" aria-labelledby="explainer">
        <h2 id="explainer" className="text-lg font-semibold text-suth-text">
          Why the number on its own is misleading
        </h2>
        <div className="mt-3 space-y-3 text-sm leading-relaxed text-suth-text-secondary">
          <p>
            A finish time is the sum of sixteen segments and a transition total, and two athletes
            can arrive at the same number by completely different routes. One runs 4:30 kilometres
            and survives the stations; the other walks the back half of every run and is untouchable
            on the sled. They share a percentile and share nothing else.
          </p>
          <p>
            That matters because it decides what you train next. The runner who is losing four
            minutes across the compromised runs after the sled push has a strength problem wearing a
            running problem&apos;s clothes. The percentile will not tell you which one you are —
            your splits will.
          </p>
          <p>
            So use the number to calibrate expectations, then{" "}
            <Link href="/results" className="text-suth-accent underline">
              open your own result
            </Link>{" "}
            and look at where the time actually went.
          </p>
        </div>
      </section>

      <section className="mt-10" aria-labelledby="faq">
        <h2 id="faq" className="text-lg font-semibold text-suth-text">Common questions</h2>
        <dl className="mt-3 space-y-4">
          {faqs.map((faq) => (
            <div
              key={faq.q}
              className="rounded-md border border-suth-border-subtle bg-suth-elevated p-4"
            >
              <dt className="text-sm font-semibold text-suth-text">{faq.q}</dt>
              <dd className="mt-1.5 text-sm leading-relaxed text-suth-text-secondary">{faq.a}</dd>
            </div>
          ))}
        </dl>
      </section>

      <CoachingCta
        className="mt-8"
        headline="Know where you sit. Now change it."
        body="A percentile is a starting position, not a verdict."
      />
    </div>
  );
}
