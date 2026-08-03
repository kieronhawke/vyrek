import type { StationKey } from "@/lib/plan/stations";
import { STATION_PATHS } from "@/components/export/station-paths";

/**
 * ONE GLYPH PER KIND OF WORK.
 *
 * A plan on paper is a wall of grey text at six in the morning. An icon in
 * front of each line makes the shape of a session visible before it is read —
 * you can see Monday is two ergs and an EMOM without reading a word.
 *
 * WHY THE PREVIOUS TWO SETS WERE WRONG
 * Both were thin line drawings, and the pictograms everyone in this sport
 * recognises are solid silhouettes of a figure doing the movement. That is a
 * different visual language, not a different level of detail, which is why no
 * amount of redrawing outlines was ever going to look right.
 *
 * The eight stations and the run now come from the report Kieron supplied,
 * traced to vector — see components/export/station-paths.ts for provenance and
 * for the licensing position, which he decided.
 *
 * THE REST ARE DRAWN HERE, IN THE SAME LANGUAGE. Bike, strength, core,
 * warm-up, cool-down and rest are not HYROX stations and are not in that set.
 * They are solid silhouettes at the same weight, because one line icon among
 * fifteen filled ones looks like a mistake.
 */

type Props = { size?: number };

function Svg({ size = 16, children }: Props & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      fillRule="evenodd"
      aria-hidden
      focusable="false"
      style={{ flexShrink: 0, display: "block" }}
    >
      {children}
    </svg>
  );
}

/** A traced pictogram. */
function Traced({ name, size }: { name: string; size?: number }) {
  const paths = STATION_PATHS[name];
  if (!paths) return <Dot size={size} />;
  return (
    <Svg size={size}>
      {paths.d.map((d, i) => (
        <path key={i} d={d} />
      ))}
    </Svg>
  );
}

/* ── Drawn here, to match ──────────────────────────────────────────────── */

/** BIKE — two wheels and a frame, as a solid. */
function Bike(p: Props) {
  return (
    <Svg {...p}>
      <path d="M5.5 12.5a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9zm0 2.4a2.1 2.1 0 1 1 0 4.2 2.1 2.1 0 0 1 0-4.2z" />
      <path d="M18.5 12.5a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9zm0 2.4a2.1 2.1 0 1 1 0 4.2 2.1 2.1 0 0 1 0-4.2z" />
      <path d="M9.4 5.4h5.2v2.1h-1.9l3.9 8.6-1.9.9-4.2-9.2-3.6 8.6-2-.8 4-9.6H8.2z" />
      <path d="M15.3 2.6h4v2h-4z" />
    </Svg>
  );
}

/** STRENGTH — a loaded bar. */
function Strength(p: Props) {
  return (
    <Svg {...p}>
      <path d="M2 10.4h1.9v3.2H2zM4.7 8.2h2.6v7.6H4.7zM8.1 11h7.8v2H8.1zM16.7 8.2h2.6v7.6h-2.6zM20.1 10.4H22v3.2h-1.9z" />
    </Svg>
  );
}

/** CORE — a braced trunk held off the floor. */
function Core(p: Props) {
  return (
    <Svg {...p}>
      <path d="M18.6 4.2a2.1 2.1 0 1 1 0 4.2 2.1 2.1 0 0 1 0-4.2z" />
      <path d="M16.9 9.6 8.6 13 5 13v6.2H2.6V21H21v-1.8h-9.1V15l5.9-2.4z" />
    </Svg>
  );
}

/** WARM-UP — rising. */
function Warmup(p: Props) {
  return (
    <Svg {...p}>
      <path d="M3.7 17.1 8.2 12l4 3.4 6.6-7.6-2.3-.1V5.5H21v6.4h-2.2l-.1-2.2-6.4 7.4-4-3.4-4.2 4.8z" />
      <path d="M2.4 19.6H21v1.9H2.4z" />
    </Svg>
  );
}

/** COOL-DOWN — settling. */
function Cooldown(p: Props) {
  return (
    <Svg {...p}>
      <path d="M3.7 6.9 8.2 12l4-3.4 6.6 7.6-2.3.1v2.2H21v-6.4h-2.2l-.1 2.2-6.4-7.4-4 3.4L4.1 5.5z" />
      <path d="M2.4 19.6H21v1.9H2.4z" />
    </Svg>
  );
}

/** REST — a bed. */
function Rest(p: Props) {
  return (
    <Svg {...p}>
      <path d="M2.4 8.6h2.3v7.1H2.4z" />
      <path d="M4.7 10.9h16.9v4.8H4.7z" />
      <path d="M6.9 8.1h12.5a2.2 2.2 0 0 1 2.2 2.2v.6H6.9z" />
      <path d="M2.4 15.7h2.3v3.4H2.4zM19.3 15.7h2.3v3.4h-2.3z" />
      <path d="M7.6 9.6a1.9 1.9 0 1 1 0 3.8 1.9 1.9 0 0 1 0-3.8z" />
    </Svg>
  );
}

/** Anything unrecognised: a plain marker, never a wrong picture. */
function Dot(p: Props) {
  return (
    <Svg {...p}>
      <path d="M12 8.6a3.4 3.4 0 1 1 0 6.8 3.4 3.4 0 0 1 0-6.8z" />
    </Svg>
  );
}

/**
 * The station each key draws with.
 *
 * `run` uses the plain runner rather than the run-plus-chevrons, because most
 * lines in a plan are ordinary running rather than a race transition.
 */
const TRACED: Partial<Record<StationKey, string>> = {
  run: "run",
  ski: "ski",
  row: "row",
  "sled-push": "sled-push",
  "sled-pull": "sled-pull",
  burpee: "burpee",
  farmers: "farmers",
  lunges: "lunges",
  "wall-balls": "wall-balls",
};

const DRAWN: Partial<Record<StationKey, (p: Props) => React.ReactElement>> = {
  bike: Bike,
  strength: Strength,
  core: Core,
  warmup: Warmup,
  cooldown: Cooldown,
  rest: Rest,
  other: Dot,
};

export function StationIcon({ station, size }: { station: StationKey; size?: number }) {
  const traced = TRACED[station];
  if (traced) return <Traced name={traced} size={size} />;
  const Drawn = DRAWN[station] ?? Dot;
  return <Drawn size={size} />;
}

/** The transition chevrons, for anywhere a roxzone needs marking. */
export function RoxzoneIcon({ size }: { size?: number }) {
  return <Traced name="roxzone" size={size} />;
}
