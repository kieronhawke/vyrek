import type { StationKey } from "@/lib/plan/stations";

/**
 * ONE GLYPH PER KIND OF WORK.
 *
 * A plan on paper is a wall of grey text at six in the morning. An icon in
 * front of each line makes the shape of a session visible before it is read —
 * you can see that Monday is two ergs and an EMOM without reading a word.
 *
 * DRAWN FOR PAPER FIRST. Stroked on `currentColor` at 1.7, no fills, no
 * gradients, nothing under 1pt: everything here has to survive a domestic
 * inkjet at 8mm as well as a retina screen. That constraint is also why they
 * are drawn here rather than pulled from an icon set — general-purpose icon
 * libraries have no sled, no ski erg and no wall ball, and the three that
 * matter most to a HYROX plan are exactly the three nobody draws.
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
      strokeWidth={1.7}
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

/** A runner: the only figurative glyph, because a run is the only station
 *  everybody already pictures as a person. */
function Run(p: Props) {
  return (
    <Svg {...p}>
      <circle cx="15" cy="4.5" r="1.8" />
      <path d="M13.5 21l1.5-5-3-2.5 1-4.5-3.5 2-1 3" />
      <path d="M13 9l3.5 1.5L19 15" />
      <path d="M4.5 12.5h3M3 16.5h3.5" />
    </Svg>
  );
}

/** Ski erg: the handles and the pull, straight down. */
function Ski(p: Props) {
  return (
    <Svg {...p}>
      <path d="M6 3.5h12" />
      <path d="M8.5 3.5v6.5a3.5 3.5 0 0 0 7 0V3.5" />
      <path d="M12 13.5V21" />
      <path d="M9 21h6" />
    </Svg>
  );
}

/** Row: the seat rail and the handle drawn back. */
function Row(p: Props) {
  return (
    <Svg {...p}>
      <path d="M3 18h18" />
      <path d="M6 18v-3.5h5.5" />
      <path d="M11.5 14.5 20 6" />
      <path d="M17.5 6h3v3" />
    </Svg>
  );
}

/** Bike: two wheels, no rider. */
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

/** Sled push: the sled, and the direction of travel. */
function SledPush(p: Props) {
  return (
    <Svg {...p}>
      <path d="M4 16h11a2 2 0 0 0 2-2V8" />
      <path d="M4 16v-5" />
      <path d="M4 11h9" />
      <path d="M18.5 12.5 21 15l-2.5 2.5" />
      <path d="M21 15h-6" />
    </Svg>
  );
}

/** Sled pull: the same sled with the rope coming towards you. */
function SledPull(p: Props) {
  return (
    <Svg {...p}>
      <path d="M20 16H9a2 2 0 0 1-2-2V8" />
      <path d="M20 16v-5" />
      <path d="M20 11h-9" />
      <path d="M5.5 12.5 3 15l2.5 2.5" />
      <path d="M3 15h6" />
    </Svg>
  );
}

/** Burpee broad jump: down, then forward. */
function Burpee(p: Props) {
  return (
    <Svg {...p}>
      <path d="M3 19h6" />
      <path d="M4.5 19v-3.5h4" />
      <path d="M10.5 15 15 8.5" />
      <path d="M15 19h6" />
      <path d="M18 8.5a1.8 1.8 0 1 0 0-3.6 1.8 1.8 0 0 0 0 3.6z" />
      <path d="M15 19l2-5.5" />
    </Svg>
  );
}

/** Farmers carry: two loads, one each side. */
function Farmers(p: Props) {
  return (
    <Svg {...p}>
      <path d="M12 3.5v6" />
      <rect x="3" y="9.5" width="6" height="10" rx="1.5" />
      <rect x="15" y="9.5" width="6" height="10" rx="1.5" />
      <path d="M6 9.5V7h12v2.5" />
    </Svg>
  );
}

/** Sandbag lunges: the bag on a shoulder, the step. */
function Lunges(p: Props) {
  return (
    <Svg {...p}>
      <rect x="6" y="3.5" width="12" height="5" rx="2" />
      <path d="M9 8.5 6 21" />
      <path d="M15 8.5l2 6 3 6.5" />
      <path d="M4 21h5M16 21h5" />
    </Svg>
  );
}

/** Wall balls: the ball and the target. */
function WallBalls(p: Props) {
  return (
    <Svg {...p}>
      <circle cx="8" cy="16" r="4" />
      <path d="M14 4h7v5h-7z" />
      <path d="M10.5 12.5 15 9" />
    </Svg>
  );
}

/** Strength: a loaded bar. */
function Strength(p: Props) {
  return (
    <Svg {...p}>
      <path d="M2.5 12h19" />
      <path d="M6 8v8M18 8v8" />
      <path d="M3.5 9.5v5M20.5 9.5v5" />
    </Svg>
  );
}

/** Core: the trunk, braced. */
function Core(p: Props) {
  return (
    <Svg {...p}>
      <path d="M4 18h16" />
      <path d="M6 18c0-4 3-7 7-7h5" />
      <circle cx="19.5" cy="9" r="1.6" />
      <path d="M9 18v-2.5" />
    </Svg>
  );
}

/** Warm-up: rising. */
function Warmup(p: Props) {
  return (
    <Svg {...p}>
      <path d="M3 18.5 8 13l4 3.5L21 6" />
      <path d="M15.5 6H21v5.5" />
    </Svg>
  );
}

/** Cool-down: settling. */
function Cooldown(p: Props) {
  return (
    <Svg {...p}>
      <path d="M3 6l5 5.5 4-3.5 9 10.5" />
      <path d="M15.5 18.5H21V13" />
    </Svg>
  );
}

/** Rest. */
function Rest(p: Props) {
  return (
    <Svg {...p}>
      <path d="M3.5 16.5h17" />
      <path d="M6 16.5V11a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v5.5" />
      <path d="M5 20v-3.5M19 20v-3.5" />
    </Svg>
  );
}

/** Anything unrecognised: a plain marker, never a wrong picture. */
function Other(p: Props) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="12" r="3" />
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
