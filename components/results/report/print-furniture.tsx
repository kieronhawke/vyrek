import { Wordmark } from "@/components/shared/logo";

/*
 * The chartreuse full stop is right on a dark screen and wrong on paper —
 * it prints as a pale yellow smudge. These elements only ever render in
 * print, so the darker accent can be passed unconditionally.
 */
const PRINT_ACCENT = "#4D7C0F";

/**
 * THE PARTS OF THE PDF THAT ARE NOT ON THE WEB PAGE.
 *
 * The report prints from the same markup it renders from, which is the right
 * call — one source of truth, selectable text, no server-side PDF pipeline. But
 * a web page and a document are not the same artefact, and the previous version
 * printed like a web page that happened to fit on A4: it opened on a small
 * header card floating in two-thirds of a blank sheet, and every page after it
 * carried no title, no branding and no indication of what it was.
 *
 * Set next to the RoxOpt report this is competing with, the gap was not the
 * analysis — ours is better — it was that theirs looks like a document somebody
 * made and ours looked like a page somebody printed.
 *
 * Three pieces of furniture close most of that gap, and all three exist only
 * on paper (`display: none` on screen, so they cost the web page nothing):
 *
 *   • **A cover page** that fills the sheet.
 *   • **A running header** on every page after it.
 *   • **A colophon** at the end, which is where the backlink lives — a printed
 *     report gets forwarded, and it should say where it came from.
 *
 * The running header repeats via `position: fixed`, which Chrome paints once
 * per printed page. This is the only mechanism available: Chrome has never
 * supported `@page` margin boxes (`@top-center { content: … }`), so a genuine
 * page number is not achievable here and none is faked.
 */

export function PrintCover({
  athleteName,
  eventName,
  division,
  ageGroup,
  nation,
  venue,
  date,
  finishTime,
  standing,
}: {
  athleteName: string;
  eventName: string;
  division: string;
  ageGroup: string;
  nation: string;
  venue?: string;
  date?: string;
  finishTime: string;
  standing: string;
}) {
  return (
    <div className="report-print-cover" aria-hidden>
      <div className="report-print-cover__top">
        <Wordmark className="report-print-cover__logo" accent={PRINT_ACCENT} />
        <span className="report-print-cover__kicker">HYROX Race Report</span>
      </div>

      <div className="report-print-cover__title">
        <h1>
          Race
          <br />
          Performance
          <br />
          Report
        </h1>
      </div>

      {/*
        The accent rule down the left is doing real work: it is the one piece
        of brand colour on an otherwise monochrome sheet, so it survives being
        printed on a black-and-white office laser as a grey bar rather than
        disappearing into the page.
      */}
      <div className="report-print-cover__meta">
        <p className="report-print-cover__name">{athleteName}</p>
        <p>{eventName}</p>
        <p>
          {division} · {ageGroup} · {nation}
        </p>
        {venue || date ? <p>{[venue, date].filter(Boolean).join(" · ")}</p> : null}
      </div>

      <div className="report-print-cover__result">
        <span className="report-print-cover__time">{finishTime}</span>
        <span className="report-print-cover__standing">{standing}</span>
      </div>
    </div>
  );
}

/**
 * Repeats on every printed page, in the bottom margin.
 *
 * A footer rather than a header, and that is where Chrome actually puts it: a
 * `position: fixed` block in paged media lands against the page box, and the
 * honest thing to do was name it for where it lands rather than describe it as
 * a header and leave the next person confused by the PDF.
 *
 * Quiet on purpose. It is a wayfinding aid — which report is this, whose is it
 * — not a banner, and it sits in the margin where no body copy can reach it.
 */
export function PrintRunningFooter({
  athleteName,
  eventName,
}: {
  athleteName: string;
  eventName: string;
}) {
  return (
    <div className="report-print-runner" aria-hidden>
      <span className="report-print-runner__left">
        <strong>{athleteName}</strong> · Race Report
      </span>
      <span className="report-print-runner__right">{eventName}</span>
    </div>
  );
}

/**
 * The last thing on the last page.
 *
 * A printed report is the most forwardable thing on this site — it gets sent to
 * a coach, a training partner, a group chat — and a PDF with no URL on it is a
 * dead end for everyone who receives it. This is the backlink, stated plainly
 * rather than dressed up as marketing.
 */
export function PrintColophon({ reportUrl }: { reportUrl: string }) {
  return (
    <div className="report-print-colophon" aria-hidden>
      <Wordmark className="report-print-colophon__logo" accent={PRINT_ACCENT} />
      <p className="report-print-colophon__line">
        Generated free at <strong>{reportUrl}</strong>
      </p>
      <p className="report-print-colophon__sub">
        Every figure in this report states its own derivation. No account, no
        payment, no email — search any HYROX result and the same report is there.
      </p>
    </div>
  );
}
