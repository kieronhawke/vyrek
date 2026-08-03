import Link from "next/link";
import { Container } from "@/components/shared/container";
import { Eyebrow } from "@/components/shared/eyebrow";
import { CtaButton } from "@/components/shared/cta-button";

/**
 * The in-person VIP offer.
 *
 * Kieron's brief of 3 August 2026, in full: "an ultra VIP package: in-person
 * training for exclusive clientele. Your trainer will travel to you, offering
 * a VIP experience with training, etc. Ben will fly to you from the UK."
 *
 * WHAT IS DELIBERATELY NOT ON THIS PAGE
 *
 * That brief establishes the offer. It does not establish how long a visit
 * lasts, how many days of training it includes, what else is in the "VIP
 * experience", how many clients Ben can take, how far ahead it books, who pays
 * for flights, or what any of it costs. Every one of those is a commitment to
 * a customer, and inventing one to make a page feel complete is how a business
 * ends up honouring something nobody agreed to.
 *
 * So the section sells the thing that is true — an Elite 15 athlete flies to
 * you and coaches you in person — and routes the specifics to a conversation,
 * which is also how this kind of engagement is actually sold. Ben's 1:1
 * capacity is an open question in VYREK-LANES.md §6 and needs answering before
 * this page can promise availability.
 *
 * The no-pricing policy applies here as everywhere: no figure, and no "from"
 * anchor either.
 */
export function VipInPerson({
  city,
  country,
}: {
  city: string;
  country: string;
}) {
  return (
    <section
      aria-labelledby="vip-heading"
      className="border-y border-suth-border-subtle bg-suth-elevated py-16 md:py-24"
    >
      <Container>
        <div className="mx-auto max-w-3xl">
          <Eyebrow>Private coaching</Eyebrow>
          <h2
            id="vip-heading"
            className="mt-3 text-2xl font-black tracking-[-0.03em] text-suth-text md:text-4xl"
          >
            The version where Ben gets on a plane.
          </h2>
          <p className="mt-5 text-base leading-relaxed text-suth-text-secondary md:text-lg">
            Everything else on this site is online coaching, and online is the
            right answer for almost everyone — it is why the programme adapts
            weekly instead of costing you an hourly rate. For a small number of
            clients in {city}, there is another version: Ben flies out from the
            UK and coaches you in person.
          </p>

          <div className="mt-10 grid gap-6 md:grid-cols-3">
            <div>
              <h3 className="text-sm font-semibold text-suth-text">
                Coached in the room
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-suth-text-secondary">
                A sled push you can feel being corrected is worth more than a
                dozen form videos. The stations that punish technique — sled,
                wall balls, burpee broad jumps — are the ones worth fixing with
                somebody stood next to you.
              </p>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-suth-text">
                By an Elite 15 athlete
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-suth-text-secondary">
                Ben races in the HYROX Elite 15 Doubles. The person writing your
                programme is the person you train beside, which is not how most
                coaching at this level works.
              </p>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-suth-text">
                It continues after he leaves
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-suth-text-secondary">
                In-person sits on top of the programme rather than replacing it,
                so the work carries on in the app the week after — dated to your
                race and rebuilt every Sunday, the same as everyone else&apos;s.
              </p>
            </div>
          </div>

          {/* Availability, scope and cost are all genuinely open. Saying so is
              better than a fabricated "from £X" or "3-day package". */}
          <div className="mt-10 rounded-lg border border-suth-border bg-suth-base p-6">
            <p className="text-base leading-relaxed text-suth-text">
              Private coaching is arranged around one athlete at a time, so
              dates, length of stay and what a visit covers are agreed
              individually rather than sold as a package.
            </p>
            <p className="mt-3 text-sm leading-relaxed text-suth-text-secondary">
              Tell Ben what you are training for and where you are in {country},
              and he will tell you honestly whether flying out is the right call
              for you — or whether the online programme gets you there without
              it.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <CtaButton href="/free-consultation" size="md">
                Enquire about private coaching
              </CtaButton>
              <Link
                href="/quiz"
                className="text-sm font-medium text-suth-accent underline decoration-suth-accent/40 underline-offset-4 hover:decoration-suth-accent"
              >
                Or start with the online programme →
              </Link>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
