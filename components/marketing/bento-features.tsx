import { Container } from "@/components/shared/container";
import { Eyebrow } from "@/components/shared/eyebrow";
import { RevealOnView } from "@/components/shared/reveal-on-view";
import { SplitHeading } from "@/components/shared/split-heading";
import { LoopingVideo } from "@/components/shared/looping-video";
import { AdaptsChart } from "@/components/marketing/adapts-chart";
import { VIDEOS } from "@/lib/video-assets";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DAY_LOAD = [0.55, 0.78, 0.62, 0.45, 0.7, 0.95, 0]; // bar heights, Sun = rest

export function BentoFeatures() {
  return (
    <RevealOnView
      as="section"
      aria-labelledby="features-heading"
      className="border-t border-vyrek-border-subtle py-24 md:py-32"
    >
      <Container>
        <header className="mx-auto max-w-2xl text-center">
          <Eyebrow>What you get</Eyebrow>
          <SplitHeading
            id="features-heading"
            className="mt-4 text-3xl font-black leading-[1.05] tracking-[-0.04em] text-vyrek-text md:text-4xl"
          >
            Built to fit, built to adapt
          </SplitHeading>
        </header>

        <div className="mt-12 grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* Large card, spans both columns on desktop */}
          <Card className="md:col-span-2">
            <CardCopy
              headline="A dated weekly plan, built around your life."
              sub="Every Sunday, your next 7 days appear. Hyrox-specific. Your equipment. Your time."
            />
            <div className="mt-8 grid grid-cols-7 gap-2 md:gap-3">
              {DAYS.map((day, i) => (
                <div
                  key={day}
                  className="flex flex-col items-center gap-2"
                >
                  <div className="flex h-32 w-full items-end justify-center md:h-40">
                    {DAY_LOAD[i] === 0 ? (
                      <div className="h-1 w-full rounded-pill bg-vyrek-border-strong" />
                    ): (
                      <div
                        className="w-full rounded-md bg-gradient-to-t from-vyrek-accent/40 to-vyrek-accent"
                        style={{ height: `${DAY_LOAD[i] * 100}%` }}
                      />
                    )}
                  </div>
                  <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-vyrek-text-tertiary">
                    {day}
                  </span>
                </div>
              ))}
            </div>
          </Card>

          {/* Medium. Elite 15 */}
          <Card className="relative isolate overflow-hidden">
            <LoopingVideo
              src={VIDEOS.womanBoxJumps.src}
              poster={VIDEOS.womanBoxJumps.poster}
              className="absolute inset-0 opacity-55"
            />
            <div
              aria-hidden
              className="absolute inset-0 bg-gradient-to-b from-vyrek-elevated/60 via-vyrek-elevated/35 to-vyrek-elevated/85"
            />
            <div className="relative z-10">
              <CardCopy
                headline="Programmed by an Elite 15 coach."
                sub="Programming designed by an athlete who races at the top of the sport. Two more coaches join in 2026 for Doubles and Pro."
              />
              <div className="mt-8 grid grid-cols-4 gap-2">
                {[
                  { name: "James", role: "Coach" },
                  { name: "First", role: "Race" },
                  { name: "Sub-90", role: "Plan" },
                  { name: "Doubles", role: "Plan" },
                ].map((tile, i) => (
                  <div
                    key={tile.name}
                    className="relative aspect-square overflow-hidden rounded-md border border-vyrek-border-subtle bg-vyrek-overlay/80 backdrop-blur-sm"
                  >
                    <div className="absolute inset-0 bg-[radial-gradient(80%_80%_at_50%_30%,rgba(163,230,53,0.18)_0%,rgba(20,20,20,0)_55%)]" />
                    <span
                      className={`absolute bottom-2 left-2 font-mono text-[9px] uppercase tracking-[0.18em] ${i === 0 ? "text-vyrek-text-secondary": "text-vyrek-text-tertiary"}`}
                    >
                      {tile.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          {/* Medium. Adapts as you improve */}
          <Card>
            <CardCopy
              headline="Adapts as you improve."
              sub="Log your sessions. Plans recalibrate every Sunday."
            />
            <div className="mt-8">
              <AdaptsChart />
            </div>
          </Card>
        </div>
      </Container>
    </RevealOnView>
  );
}

function Card({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`rounded-lg border border-vyrek-border-subtle bg-vyrek-elevated p-6 md:p-8 ${className ?? ""}`}
    >
      {children}
    </div>
  );
}

function CardCopy({
  headline,
  sub,
}: {
  headline: string;
  sub: string;
}) {
  return (
    <>
      <h3 className="text-xl font-black leading-tight tracking-[-0.04em] text-vyrek-text md:text-2xl">
        {headline}
      </h3>
      <p className="mt-3 text-sm leading-relaxed text-vyrek-text-secondary md:text-base">
        {sub}
      </p>
    </>
  );
}
