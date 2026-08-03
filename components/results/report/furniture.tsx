import Image from "next/image";
import type { CoachNote } from "@/lib/results/report-notes";
import { cn } from "@/lib/utils";

/**
 * Structural furniture for the race report.
 *
 * Kept apart from the page so the page reads as a table of contents rather than
 * as markup, and so the print rules have stable class names to hook — pagination
 * is driven by `.report-section` and `.report-photo`, not by guessing at
 * generated Tailwind classes.
 */

export function ReportSection({
  number, title, lede, children,
}: {
  number: string;
  title: string;
  lede?: string;
  children: React.ReactNode;
}) {
  const id = `s${number}`;
  return (
    <section className="report-section mt-14" aria-labelledby={id}>
      <div className="flex items-baseline gap-3">
        <span
          aria-hidden
          className="results-num text-xs text-suth-text-disabled"
        >
          {number}
        </span>
        <h2
          id={id}
          className="text-xl font-black tracking-[-0.02em] text-suth-text md:text-2xl"
        >
          {title}
        </h2>
      </div>
      {lede ? (
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-suth-text-secondary">
          {lede}
        </p>
      ) : null}
      <div className="mt-5">{children}</div>
    </section>
  );
}

/**
 * A chart plus the sentence that explains it.
 *
 * The caption is not optional decoration. A chart whose derivation is not
 * stated is exactly the black box this report exists to avoid, and on paper
 * there is no tooltip to fall back on.
 */
export function ReportFigure({
  caption, children, className,
}: {
  caption?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <figure className={cn("report-figure-block", className)}>
      <div className="rounded-md border border-suth-border-subtle bg-suth-elevated p-3 md:p-4">
        {children}
      </div>
      {caption ? (
        <figcaption className="mt-2 max-w-3xl text-xs leading-relaxed text-suth-text-tertiary">
          {caption}
        </figcaption>
      ) : null}
    </figure>
  );
}

/**
 * Ben's read on the section above.
 *
 * The paid reports put a coach beside each chart and it is the best thing they
 * do — a chart says what happened, a coach says what to do next. Theirs is the
 * same paragraph in every report; these are chosen by the numbers, so an
 * athlete who faded reads about fading and one who paced it well does not.
 */
export function CoachNoteBlock({
  note, photo,
}: {
  note: CoachNote;
  photo: string;
}) {
  return (
    <aside className="report-note mt-6 rounded-md border border-suth-border-subtle bg-suth-overlay/40 p-4 md:p-5">
      <div className="flex items-start gap-4">
        <Image
          src={photo}
          alt=""
          width={96}
          height={96}
          sizes="56px"
          className="size-12 shrink-0 rounded-full object-cover md:size-14"
        />
        <div className="min-w-0">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-suth-text-tertiary">
            Ben Sutherland · HYROX Elite 15
          </p>
          <h3 className="mt-1 text-sm font-semibold text-suth-text md:text-base">
            {note.heading}
          </h3>
          {note.body.map((paragraph) => (
            <p key={paragraph.slice(0, 32)} className="mt-2 max-w-2xl text-sm leading-relaxed text-suth-text-secondary">
              {paragraph}
            </p>
          ))}
        </div>
      </div>
    </aside>
  );
}

/** A full-width photograph between sections, to break up fourteen pages of numbers. */
export function PhotoBreak({ src, caption }: { src: string; caption: string }) {
  return (
    <figure className="report-photo mt-14 overflow-hidden rounded-lg border border-suth-border-subtle">
      <Image
        src={src}
        alt=""
        width={1600}
        height={700}
        sizes="(min-width: 1000px) 1000px, 100vw"
        className="h-44 w-full object-cover grayscale md:h-64"
      />
      <figcaption className="bg-suth-elevated px-4 py-3 text-xs leading-relaxed text-suth-text-tertiary">
        {caption}
      </figcaption>
    </figure>
  );
}
