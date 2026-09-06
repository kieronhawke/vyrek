import Image from "next/image";
import Link from "next/link";

/**
 * COMING SOON — the six sections a billing-only client can reach but not use.
 *
 * An existing client moved onto Stripe by payment link has a live
 * subscription and nothing else: no published block, no logged sessions, no
 * coach thread. Until 2026-09-06 that was handled by hiding the product from
 * them entirely — the rail was stripped and every training route redirected
 * to /app/account — which left a single bare page and no sign that anything
 * else was being built.
 *
 * So each section says what it is instead. The rule for all six: show the
 * SHAPE of the thing, never fake its contents. A drawn chart with invented
 * numbers on it would be a lie a client could quote back; an empty axis that
 * animates into place is a promise. Nothing here reads as data.
 *
 * Every graphic is CSS on inline SVG, no library and no images beyond the one
 * photograph, and every animation resolves to its finished state so a reader
 * on `prefers-reduced-motion` sees the completed drawing rather than a
 * half-built one.
 */

type Section = "today" | "plan" | "progress" | "fuel" | "coach" | "connections";

const COPY: Record<Section, { title: string; lede: string }> = {
  today: {
    title: "Today",
    lede: "Your session for the day, with the warm-up, the work and the targets, ready to tick off as you go.",
  },
  plan: {
    title: "Plan",
    lede: "The full training block laid out week by week, so you can see what is coming and work around your diary.",
  },
  progress: {
    title: "Progress",
    lede: "Your times, loads and splits over the block, so improvement is something you can see rather than guess at.",
  },
  fuel: {
    title: "Fuel",
    lede: "Eating built around your training week, with what to take on before a session and what to get back afterwards.",
  },
  coach: {
    title: "Coach",
    lede: "A direct line to Ben for form checks, questions and adjustments, kept in one thread rather than scattered.",
  },
  connections: {
    title: "Connections",
    lede: "Your watch and tracker feeding sessions in automatically, so nothing has to be typed in twice.",
  },
};

/* ── The six instruments ──────────────────────────────────────────────────
   Each one is the recognisable furniture of its section with the content
   taken out. Sized on a 240×150 viewBox so they sit at the same optical
   weight next to each other. */

function ArtToday() {
  return (
    <svg viewBox="0 0 240 150" className="cs-art" role="presentation">
      {/* The session card, with its rows empty. */}
      <rect x="16" y="20" width="208" height="110" rx="12" className="cs-panel" />
      <circle cx="56" cy="58" r="22" className="cs-ring-track" />
      <circle cx="56" cy="58" r="22" className="cs-ring cs-ring--today" />
      <rect x="92" y="44" width="86" height="8" rx="4" className="cs-bar cs-d1" />
      <rect x="92" y="60" width="58" height="8" rx="4" className="cs-bar cs-d2" />
      <rect x="32" y="96" width="176" height="7" rx="3.5" className="cs-bar cs-d3" />
      <rect x="32" y="111" width="132" height="7" rx="3.5" className="cs-bar cs-d4" />
    </svg>
  );
}

function ArtPlan() {
  // Twelve weeks, filling one after another.
  const cells = Array.from({ length: 12 });
  return (
    <svg viewBox="0 0 240 150" className="cs-art" role="presentation">
      {cells.map((_, i) => {
        const col = i % 6;
        const row = Math.floor(i / 6);
        return (
          <rect
            key={i}
            x={16 + col * 36}
            y={38 + row * 42}
            width="28"
            height="32"
            rx="6"
            className="cs-cell"
            style={{ animationDelay: `${i * 0.11}s` }}
          />
        );
      })}
    </svg>
  );
}

function ArtProgress() {
  // An axis and a trend line that draws itself. No labels: the shape is the
  // point, and a number here would be a number nobody measured.
  return (
    <svg viewBox="0 0 240 150" className="cs-art" role="presentation">
      <line x1="28" y1="122" x2="216" y2="122" className="cs-axis" />
      <line x1="28" y1="26" x2="28" y2="122" className="cs-axis" />
      {[104, 82, 60, 38].map((y) => (
        <line key={y} x1="28" y1={y} x2="216" y2={y} className="cs-grid" />
      ))}
      <path
        d="M28 108 L66 96 L104 100 L142 72 L180 58 L216 36"
        className="cs-line"
        fill="none"
      />
      <circle cx="216" cy="36" r="5" className="cs-endpoint" />
    </svg>
  );
}

function ArtFuel() {
  // Three macro arcs, each filling to its own length.
  const arcs = [
    { r: 46, cls: "cs-arc--1", len: 289 },
    { r: 34, cls: "cs-arc--2", len: 214 },
    { r: 22, cls: "cs-arc--3", len: 138 },
  ];
  return (
    <svg viewBox="0 0 240 150" className="cs-art" role="presentation">
      <g transform="translate(120 75) rotate(-90)">
        {arcs.map((a) => (
          <g key={a.r}>
            <circle r={a.r} className="cs-arc-track" />
            <circle
              r={a.r}
              className={`cs-arc ${a.cls}`}
              style={{ strokeDasharray: `${a.len}`, strokeDashoffset: `${a.len}` }}
            />
          </g>
        ))}
      </g>
    </svg>
  );
}

function ArtCoach() {
  return (
    <svg viewBox="0 0 240 150" className="cs-art" role="presentation">
      {/* Their message, then Ben's, then Ben typing. */}
      <rect x="96" y="22" width="118" height="30" rx="12" className="cs-bubble cs-d1" />
      <rect x="26" y="62" width="104" height="30" rx="12" className="cs-bubble cs-bubble--them cs-d2" />
      <rect x="26" y="102" width="70" height="28" rx="12" className="cs-bubble cs-bubble--them cs-d3" />
      <g className="cs-typing">
        <circle cx="46" cy="116" r="4" className="cs-dot cs-dot--1" />
        <circle cx="61" cy="116" r="4" className="cs-dot cs-dot--2" />
        <circle cx="76" cy="116" r="4" className="cs-dot cs-dot--3" />
      </g>
    </svg>
  );
}

function ArtConnections() {
  return (
    <svg viewBox="0 0 240 150" className="cs-art" role="presentation">
      <circle cx="120" cy="75" r="34" className="cs-orbit cs-orbit--1" />
      <circle cx="120" cy="75" r="56" className="cs-orbit cs-orbit--2" />
      <circle cx="120" cy="75" r="14" className="cs-hub" />
      <g className="cs-spin cs-spin--in" style={{ transformOrigin: "120px 75px" }}>
        <circle cx="154" cy="75" r="6" className="cs-node" />
      </g>
      <g className="cs-spin cs-spin--out" style={{ transformOrigin: "120px 75px" }}>
        <circle cx="120" cy="19" r="6" className="cs-node" />
        <circle cx="64" cy="75" r="6" className="cs-node" />
      </g>
    </svg>
  );
}

const ART: Record<Section, () => React.ReactElement> = {
  today: ArtToday,
  plan: ArtPlan,
  progress: ArtProgress,
  fuel: ArtFuel,
  coach: ArtCoach,
  connections: ArtConnections,
};

export function ComingSoon({ section }: { section: Section }) {
  const { title, lede } = COPY[section];
  const Art = ART[section];

  return (
    <section className="cs" data-section={section}>
      {/* Ben at HYROX, dimmed almost out. It is texture behind the panel
          rather than a picture on it: at full strength it competes with the
          drawing, and the drawing is the thing being explained. */}
      <div className="cs__bg" aria-hidden>
        <Image
          src="/media/images/ben/ben-race-portrait.jpg"
          alt=""
          fill
          sizes="(max-width: 767px) 100vw, 900px"
          quality={60}
          className="cs__bg-img"
        />
      </div>

      <div className="cs__inner">
        <p className="cs__eyebrow">Coming soon</p>
        <h1 className="cs__title">{title}</h1>
        <p className="cs__lede">{lede}</p>

        <div className="cs__stage">
          <Art />
        </div>

        <p className="cs__foot">
          Your subscription is live and nothing here affects it. You can{" "}
          <Link href="/app/account" className="cs__link">
            manage your billing in Account
          </Link>
          .
        </p>
      </div>
    </section>
  );
}
