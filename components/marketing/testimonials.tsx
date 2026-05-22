import { Container } from "@/components/shared/container";
import { Eyebrow } from "@/components/shared/eyebrow";
import { RevealOnView } from "@/components/shared/reveal-on-view";
import { SplitHeading } from "@/components/shared/split-heading";
import { TESTIMONIALS } from "@/lib/testimonials";

export function Testimonials() {
  if (TESTIMONIALS.length === 0) return null;
  const anyIllustrative = TESTIMONIALS.some((t) => t.illustrative);

  return (
    <RevealOnView
      as="section"
      aria-labelledby="testimonials-heading"
      className="border-t border-vyrek-border-subtle py-24 md:py-32"
    >
      <Container>
        <header className="mx-auto max-w-2xl text-center">
          <Eyebrow>Athletes</Eyebrow>
          <SplitHeading
            id="testimonials-heading"
            className="mt-4 text-3xl font-black leading-[1.05] tracking-[-0.04em] text-vyrek-text md:text-4xl"
          >
            What members say
          </SplitHeading>
          {anyIllustrative ? (
            <p className="mt-4 inline-block rounded-pill border border-vyrek-border bg-vyrek-elevated px-4 py-1.5 font-mono text-[10px] uppercase tracking-[0.22em] text-vyrek-text-tertiary">
              Pre-launch · illustrative until real consented quotes land
            </p>
          ) : null}
        </header>

        <ul
          className="mt-14 -mx-6 flex snap-x snap-mandatory gap-4 overflow-x-auto px-6 pb-3 [scrollbar-width:none] md:mx-0 md:grid md:grid-cols-3 md:gap-6 md:overflow-visible md:px-0 [&::-webkit-scrollbar]:hidden"
        >
          {TESTIMONIALS.map((t) => (
            <li
              key={t.id}
              className="flex min-w-[88%] snap-center flex-col gap-6 overflow-hidden rounded-lg border border-vyrek-border-subtle bg-vyrek-elevated md:min-w-0"
            >
              {t.image && (
                <div className="relative aspect-[5/4] w-full overflow-hidden bg-vyrek-base">
                  <img
                    src={t.image}
                    alt=""
                    aria-hidden
                    className="absolute inset-0 h-full w-full object-cover grayscale"
                    loading="lazy"
                    decoding="async"
                  />
                  <div
                    aria-hidden
                    className="absolute inset-0 bg-gradient-to-t from-vyrek-elevated/95 via-vyrek-elevated/30 to-transparent"
                  />
                </div>
              )}
              <div className="flex flex-1 flex-col justify-between gap-6 p-6 pt-0 md:p-8 md:pt-0">
                <blockquote className="text-lg font-medium leading-relaxed text-vyrek-text md:text-xl">
                  &ldquo;{t.quote}&rdquo;
                </blockquote>
                <div className="flex flex-col gap-2 text-sm">
                  <span className="font-medium text-vyrek-text">
                    {t.name}
                    {t.raceTime ? (
                      <span className="ml-2 font-mono text-xs text-vyrek-accent">
                        {t.raceTime}
                      </span>
                    ) : null}
                  </span>
                  <Eyebrow>
                    {[t.city, t.programme && `${t.programme} graduate`]
                      .filter(Boolean)
                      .join(" · ")}
                  </Eyebrow>
                  {t.illustrative ? (
                    <span className="mt-1 inline-block w-fit rounded-pill border border-vyrek-border bg-vyrek-base/40 px-2.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.22em] text-vyrek-text-tertiary">
                      Pre-launch · illustrative
                    </span>
                  ) : null}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </Container>
    </RevealOnView>
  );
}
