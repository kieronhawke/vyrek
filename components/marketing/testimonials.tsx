import { Container } from "@/components/shared/container";
import { Eyebrow } from "@/components/shared/eyebrow";
import { RevealOnView } from "@/components/shared/reveal-on-view";
import { SplitHeading } from "@/components/shared/split-heading";
import { TESTIMONIALS } from "@/lib/testimonials";

export function Testimonials() {
  // Don't render the section until we have real, consented quotes (ASA rules).
  if (TESTIMONIALS.length === 0) return null;

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
                <div className="flex flex-col gap-1 text-sm">
                  <span className="font-medium text-vyrek-text">{t.name}</span>
                  <Eyebrow>
                    {[t.city, t.programme && `${t.programme} graduate`]
                      .filter(Boolean)
                      .join(" · ")}
                  </Eyebrow>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </Container>
    </RevealOnView>
  );
}
