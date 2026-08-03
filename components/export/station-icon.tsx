import type { StationKey } from "@/lib/plan/stations";

/**
 * ONE GLYPH PER KIND OF WORK.
 *
 * A plan on paper is a wall of grey text at six in the morning. An icon in
 * front of each line makes the shape of a session visible before it is read —
 * you can see that Monday is two ergs and an EMOM without reading a word.
 *
 * WHY THESE ARE DRAWN HERE
 *
 * HYROX publish their own station pictograms, and they are the ones everybody
 * recognises. They are also HYROX's artwork: lifting the files out of a race
 * report and shipping them inside a commercial coaching product is a
 * trademark and copyright problem, not a technical one. So these are drawn to
 * the same visual language — the sled with its posts, the ski erg's straps,
 * the wall ball and its target — without being copies of their files.
 *
 * DRAWN FOR 14 PIXELS, NOT FOR A PREVIEW AT 200%. The first set failed here:
 * the ski erg read as a wine glass and the row as an arrow, because they had
 * detail that turns to mush at print size. Every glyph below is now built from
 * at most five strokes, with one unmistakable feature each — the sled's
 * posts, the erg's flywheel, the jump's arc, the target on the wall.
 *
 * Stroked on `currentColor`, no fills, nothing under 1pt, so they survive a
 * domestic inkjet as well as a retina screen.
 */

type Props = { size?: number };

function Svg({ size = 16, children }: Props & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      focusable="false"
      style={{ flexShrink: 0, display: "block" }}
    >
      {children}
    </svg>
  );
}

/** RUN — a figure mid-stride. The one station everyone pictures as a person. */
function Run(p: Props) {
  return (
    <Svg {...p}>
      <circle cx="14.5" cy="4" r="2" />
      <path d="M16 21l-2-5.5-3.5-2.5.5-4" />
      <path d="M11 9l4 1.5 2 4" />
      <path d="M11 9 7.5 11 6 15" />
      <path d="M4 21l3.5-4" />
    </Svg>
  );
}

/**
 * SKI ERG — the top bar and the two straps pulled down.
 *
 * The feature that identifies it is the pair of straps hanging from a high
 * bar. The previous drawing put a bowl under the bar and read as a trophy.
 */
function Ski(p: Props) {
  return (
    <Svg {...p}>
      <path d="M5 4h14" />
      <path d="M12 4v3" />
      <path d="M9 5.5 7 15" />
      <path d="M15 5.5 17 15" />
      <path d="M5.5 15h3M15.5 15h3" />
    </Svg>
  );
}

/**
 * ROW — the flywheel, the rail and the seat, from the side.
 *
 * The flywheel is what separates it from every other horizontal machine, so
 * it is the largest thing in the glyph.
 */
function Row(p: Props) {
  return (
    <Svg {...p}>
      <circle cx="5.5" cy="9.5" r="3.5" />
      <path d="M3 19h18" />
      <path d="M9 19v-2.5h5" />
      <path d="M9 11.5h8" />
      <path d="M17 9.5v4" />
    </Svg>
  );
}

/** BIKE — two wheels and a frame. */
function Bike(p: Props) {
  return (
    <Svg {...p}>
      <circle cx="5.5" cy="17" r="3.5" />
      <circle cx="18.5" cy="17" r="3.5" />
      <path d="M5.5 17 10 8h4l4.5 9" />
      <path d="M9 8h6" />
    </Svg>
  );
}

/**
 * SLED PUSH — the sled, its two posts, and the direction of travel.
 *
 * The uprights are the thing that makes a sled a sled rather than a box, and
 * they sit behind, where your hands go.
 */
function SledPush(p: Props) {
  return (
    <Svg {...p}>
      <path d="M3 17.5h11" />
      <path d="M4 17.5V13h9v4.5" />
      <path d="M6 13V6M10.5 13V6" />
      <path d="M17 15.5h4M19 13.5l2 2-2 2" />
    </Svg>
  );
}

/** SLED PULL — the same sled, with a rope coming towards you. */
function SledPull(p: Props) {
  return (
    <Svg {...p}>
      <path d="M10 17.5h11" />
      <path d="M20 17.5V13h-9v4.5" />
      <path d="M18 13V6M13.5 13V6" />
      <path d="M9 11h-6M5 9l-2 2 2 2" />
    </Svg>
  );
}

/**
 * BURPEE BROAD JUMP — the arc, and the ground either side of it.
 *
 * A jump is a trajectory. Nothing else in the set is an arc, so it is
 * unmistakable even at 12px.
 */
function Burpee(p: Props) {
  return (
    <Svg {...p}>
      <path d="M3 19h18" />
      <path d="M5 19c0-7 14-7 14 0" />
      <path d="M5 15.5H3M21 15.5h-2" />
      <circle cx="12" cy="7.5" r="1.6" />
    </Svg>
  );
}

/** FARMERS CARRY — two loads, one each side, hanging from the hands. */
function Farmers(p: Props) {
  return (
    <Svg {...p}>
      <path d="M12 3v7" />
      <path d="M5 8h14" />
      <path d="M5 8v3M19 8v3" />
      <rect x="2.5" y="11" width="5" height="8" rx="1" />
      <rect x="16.5" y="11" width="5" height="8" rx="1" />
    </Svg>
  );
}

/** SANDBAG LUNGES — the bag across the shoulders, and the step under it. */
function Lunges(p: Props) {
  return (
    <Svg {...p}>
      <rect x="5" y="3" width="14" height="5" rx="2.2" />
      <path d="M12 8v5" />
      <path d="M12 13 6.5 20M12 13l5 4v3" />
      <path d="M4.5 20h4" />
    </Svg>
  );
}

/** WALL BALLS — the target on the wall, the ball, and the throw between. */
function WallBalls(p: Props) {
  return (
    <Svg {...p}>
      <rect x="13" y="3" width="8" height="6" rx="1" />
      <circle cx="6.5" cy="17" r="3.5" />
      <path d="M8.5 13.5c1.5-3 3-4 5-4.5" />
    </Svg>
  );
}

/** STRENGTH — a loaded bar. */
function Strength(p: Props) {
  return (
    <Svg {...p}>
      <path d="M2.5 12h19" />
      <path d="M6 8v8M18 8v8" />
      <path d="M3.5 9.5v5M20.5 9.5v5" />
    </Svg>
  );
}

/** CORE — a braced trunk, held off the floor. */
function Core(p: Props) {
  return (
    <Svg {...p}>
      <path d="M3 19h18" />
      <path d="M6 19v-3l6-3h5" />
      <circle cx="19.5" cy="11.5" r="1.8" />
      <path d="M12 13v6" />
    </Svg>
  );
}

/** WARM-UP — rising. */
function Warmup(p: Props) {
  return (
    <Svg {...p}>
      <path d="M3 18.5 8 13l4 3.5L21 6" />
      <path d="M15.5 6H21v5.5" />
    </Svg>
  );
}

/** COOL-DOWN — settling. */
function Cooldown(p: Props) {
  return (
    <Svg {...p}>
      <path d="M3 6l5 5.5 4-3.5 9 10.5" />
      <path d="M15.5 18.5H21V13" />
    </Svg>
  );
}

/** REST. */
function Rest(p: Props) {
  return (
    <Svg {...p}>
      <path d="M3 17h18" />
      <path d="M6 17v-5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v5" />
      <path d="M6 12H4.5a1.5 1.5 0 0 0 0 3H6" />
      <path d="M5 20v-3M19 20v-3" />
    </Svg>
  );
}

/** Anything unrecognised: a plain marker, never a wrong picture. */
function Other(p: Props) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="12" r="2.6" />
    </Svg>
  );
}

const ICONS: Record<StationKey, (p: Props) => React.ReactElement> = {
  run: Run,
  ski: Ski,
  row: Row,
  bike: Bike,
  "sled-push": SledPush,
  "sled-pull": SledPull,
  burpee: Burpee,
  farmers: Farmers,
  lunges: Lunges,
  "wall-balls": WallBalls,
  strength: Strength,
  core: Core,
  warmup: Warmup,
  cooldown: Cooldown,
  rest: Rest,
  other: Other,
};

export function StationIcon({ station, size }: { station: StationKey; size?: number }) {
  const Icon = ICONS[station] ?? Other;
  return <Icon size={size} />;
}

export { ICONS as STATION_ICONS };
