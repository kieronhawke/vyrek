/**
 * The Suth Performance photo library.
 *
 * Every photograph the site can use, in one typed place, so that:
 *   - a path is never typed by hand into a component again;
 *   - alt text ships with the image rather than being invented at the call
 *     site (or forgotten);
 *   - swapping a photo is a one-line edit here, not a search across 100 files.
 *
 * ── The Elite 15 set ──────────────────────────────────────────────────────
 * 39 frames of Ben Sutherland racing the Elite 15 at HYROX Warsaw, plus two
 * frames outside the arena on the Road to Stockholm. Supplied by Kieron on
 * 2 August 2026; these are the photos the asset database previously recorded
 * as "Elite 15 Race Pics zip (218 bytes) contained an empty folder".
 *
 * Originals (4000x6000) stay outside the repo, per the existing convention:
 * ~/Downloads/sutherlandse15-photo-download-1of1/Highlights/
 *
 * Web encodes live in public/media/images/elite15/ as
 *   <slug>.jpg        1200x1800  2:3 portrait, the native shape
 *   <slug>-wide.jpg   1800x1013  16:9 banner crop, only where it survives one
 *
 * ── Why these matter ──────────────────────────────────────────────────────
 * They are real race photography of the founder, at the top division of the
 * sport the site sells coaching for, and they cover seven of the eight HYROX
 * stations. That makes them the strongest images on the site by some distance,
 * so they take precedence over the track/camp sets wherever both would work.
 *
 * HARD-RULES: every caption below describes only what is visibly in the frame.
 * No result, time or placing is claimed from a photograph.
 */

/** The eight HYROX stations, as slugged by app/hyrox/stations/[station]. */
export type StationSlug =
  | "ski-erg"
  | "sled-push"
  | "sled-pull"
  | "burpee-broad-jump"
  | "row"
  | "farmers-carry"
  | "sandbag-lunge"
  | "wall-balls";

export type PhotoSubject =
  | "running"
  | "station"
  | "portrait"
  | "recovery"
  | "team";

export type Photo = {
  /** Path under public/, without extension variants. */
  readonly src: string;
  /** 16:9 banner crop, where one exists that keeps the athlete in frame. */
  readonly wide?: string;
  readonly width: number;
  readonly height: number;
  /** Written to be read aloud, not to be keyword-stuffed. */
  readonly alt: string;
  readonly subject: PhotoSubject;
  /** Set when the frame shows a specific HYROX station. */
  readonly station?: StationSlug;
  /**
   * Editorial quality, 1-5. 5 = will carry a hero on its own.
   * Used to rank candidates, never rendered.
   */
  readonly quality: 1 | 2 | 3 | 4 | 5;
  /**
   * Does the frame survive a black-and-white treatment? The brand leans
   * monochrome for heroes and keeps colour where the kit or the venue is
   * doing the work. Applied in CSS (`grayscale`), so there is no second file.
   */
  readonly mono: boolean;
  /** True where Ben is the subject, not just present in frame. */
  readonly isBen: boolean;
};

const DIR = "/media/images/elite15";

function photo(
  slug: string,
  alt: string,
  subject: PhotoSubject,
  quality: Photo["quality"],
  opts: {
    wide?: boolean;
    station?: StationSlug;
    mono?: boolean;
    isBen?: boolean;
  } = {},
): Photo {
  return {
    src: `${DIR}/${slug}.jpg`,
    ...(opts.wide ? { wide: `${DIR}/${slug}-wide.jpg` } : {}),
    width: 1200,
    height: 1800,
    alt,
    subject,
    ...(opts.station ? { station: opts.station } : {}),
    quality,
    mono: opts.mono ?? true,
    isBen: opts.isBen ?? false,
  };
}

export const ELITE15 = {
  // ── Stations ──────────────────────────────────────────────────────────
  skiErgPull: photo(
    "ski-erg-pull",
    "Ben Sutherland driving down on the SkiErg handles mid-race, other athletes working either side of him",
    "station",
    5,
    { wide: true, station: "ski-erg", isBen: true },
  ),
  sledPullEffort: photo(
    "sled-pull-effort",
    "An athlete hauling hand over hand on the sled pull rope, body low over the line",
    "station",
    5,
    { wide: true, station: "sled-pull" },
  ),
  sledPullRope: photo(
    "sled-pull-rope",
    "Sled pull station from the side, rope taut and the sled tracking across the floor",
    "station",
    4,
    { station: "sled-pull" },
  ),
  sledPullPair: photo(
    "sled-pull-pair",
    "Two athletes side by side on adjacent sled pull lanes",
    "station",
    4,
    { station: "sled-pull" },
  ),
  sledPullStation: photo(
    "sled-pull-station",
    "The sled pull station in full, ropes coiled on the floor between lanes",
    "station",
    3,
    { station: "sled-pull" },
  ),
  burpeeBroadJumpPlank: photo(
    "burpee-broad-jump-plank",
    "An athlete flat to the floor at the bottom of a burpee broad jump",
    "station",
    4,
    { station: "burpee-broad-jump" },
  ),
  burpeeBroadJumpGroup: photo(
    "burpee-broad-jump-group",
    "A line of athletes working through burpee broad jumps down the lanes",
    "station",
    4,
    { wide: true, station: "burpee-broad-jump" },
  ),
  burpeeBroadJumpSolo: photo(
    "burpee-broad-jump-solo",
    "A single athlete mid burpee broad jump, chest to the floor between the lane markings",
    "station",
    5,
    { wide: true, station: "burpee-broad-jump" },
  ),
  burpeeBroadJumpDown: photo(
    "burpee-broad-jump-down",
    "Close view of an athlete dropping into a burpee, hands planted wide",
    "station",
    3,
    { station: "burpee-broad-jump" },
  ),
  rowDrive: photo(
    "row-drive",
    "Ben Sutherland at the catch on the rowing erg, crowd close behind the barrier",
    "station",
    5,
    { wide: true, station: "row", isBen: true },
  ),
  rowCrowd: photo(
    "row-crowd",
    "The rowing station with spectators and photographers pressed against the rail",
    "station",
    4,
    { station: "row" },
  ),
  rowEffort: photo(
    "row-effort",
    "An athlete driving through the legs on the rower, jaw set",
    "station",
    5,
    { wide: true, station: "row" },
  ),
  rowPair: photo(
    "row-pair",
    "Two athletes rowing on adjacent ergs, one finishing a stroke as the other catches",
    "station",
    4,
    { station: "row" },
  ),
  farmersCarryPair: photo(
    "farmers-carry-pair",
    "Two athletes walking the farmers carry, kettlebells hanging at arm's length",
    "station",
    4,
    { station: "farmers-carry" },
  ),
  farmersCarryFront: photo(
    "farmers-carry-front",
    "Ben Sutherland carrying two kettlebells straight at the camera on the farmers carry",
    "station",
    5,
    { wide: true, station: "farmers-carry", isBen: true },
  ),
  sandbagLungeFront: photo(
    "sandbag-lunge-front",
    "Ben Sutherland driving out of a lunge with a thirty kilo sandbag across his shoulders",
    "station",
    5,
    { wide: true, station: "sandbag-lunge", isBen: true },
  ),
  wallBallsRelease: photo(
    "wall-balls-release",
    "A wall ball at the top of its arc, the athlete's hands still open beneath it",
    "station",
    4,
    { station: "wall-balls" },
  ),
  wallBallsRack: photo(
    "wall-balls-rack",
    "Athletes holding wall balls at the chest between reps under the target rig",
    "station",
    4,
    { wide: true, station: "wall-balls" },
  ),
  wallBallsThrow: photo(
    "wall-balls-throw",
    "An athlete throwing a wall ball, arms fully extended overhead",
    "station",
    5,
    { wide: true, station: "wall-balls" },
  ),
  wallBallsSquat: photo(
    "wall-balls-squat",
    "An athlete at the bottom of a wall ball squat, ball held tight to the chest",
    "station",
    4,
    { station: "wall-balls" },
  ),
  wallBallsKneel: photo(
    "wall-balls-kneel",
    "An athlete on one knee beside the wall ball rig, gathering himself before the next set",
    "station",
    3,
    { station: "wall-balls" },
  ),

  // ── Running ───────────────────────────────────────────────────────────
  runPackStadium: photo(
    "run-pack-stadium",
    "A pack of athletes running the stadium loop, empty red seating rising behind them",
    "running",
    5,
    { wide: true },
  ),
  runGroupFront: photo(
    "run-group-front",
    "A group of athletes running straight at the camera on the arena floor",
    "running",
    5,
    { wide: true },
  ),
  runGroupLead: photo(
    "run-group-lead",
    "A tight group of athletes running together, one just clear at the front",
    "running",
    4,
    { wide: true },
  ),
  runSoloRear: photo(
    "run-solo-rear",
    "A lone athlete running away down the lane, shoulders relaxed",
    "running",
    4,
  ),
  runSoloFront: photo(
    "run-solo-front",
    "A single athlete mid-stride toward the camera, others strung out behind",
    "running",
    5,
    { wide: true },
  ),
  runHyroxBoards: photo(
    "run-hyrox-boards",
    "Athletes running past the branded boards on the arena perimeter",
    "running",
    4,
    { wide: true },
  ),
  runPairHyrox: photo(
    "run-pair-hyrox",
    "Two athletes running side by side along the boards",
    "running",
    5,
    { wide: true },
  ),
  runSoloHyrox: photo(
    "run-solo-hyrox",
    "An athlete running the perimeter alone, arena boards behind",
    "running",
    5,
    { wide: true },
  ),
  runLaneDistance: photo(
    "run-lane-distance",
    "A runner far down the lane seen past the blurred shoulders of spectators",
    "running",
    4,
    { wide: true },
  ),

  // ── Portraits ─────────────────────────────────────────────────────────
  portraitCloseSweat: photo(
    "portrait-close-sweat",
    "Close portrait of an athlete between stations, breathing hard, eyes off camera",
    "portrait",
    5,
    { wide: true },
  ),
  portraitScoreboard: photo(
    "portrait-scoreboard",
    "Ben Sutherland standing with his hands on his hips beneath the station scoreboard",
    "portrait",
    5,
    { wide: true, isBen: true },
  ),
  portraitFrontScoreboard: photo(
    "portrait-front-scoreboard",
    "Ben Sutherland facing the camera under the rig, race number board lit above him",
    "portrait",
    5,
    { wide: true, isBen: true },
  ),
  athleteStandingFront: photo(
    "athlete-standing-front",
    "An athlete standing square to the camera between efforts, hands on hips",
    "portrait",
    4,
  ),

  // ── Recovery ──────────────────────────────────────────────────────────
  recoveryHandsOnHips: photo(
    "recovery-hands-on-hips",
    "An athlete standing with hands on hips, recovering, another bent double behind him",
    "recovery",
    4,
  ),
  recoveryBentOver: photo(
    "recovery-bent-over",
    "An athlete bent over his knees after a station, scoreboard glowing above",
    "recovery",
    4,
  ),
  recoveryLean: photo(
    "recovery-lean",
    "An athlete leaning on the rig between efforts, foreground thrown out of focus",
    "recovery",
    3,
  ),

  // ── Team ──────────────────────────────────────────────────────────────
  stockholmStepsPair: photo(
    "stockholm-steps-pair",
    "Two of the Suth Performance team sitting on the arena steps in team kit, Road to Stockholm banners behind",
    "team",
    5,
    { wide: true, mono: false },
  ),
  stockholmStepsWide: photo(
    "stockholm-steps-wide",
    "Wider view of the pair on the arena steps with the HYROX banners either side",
    "team",
    4,
    { wide: true, mono: false },
  ),
} as const satisfies Record<string, Photo>;

export type PhotoKey = keyof typeof ELITE15;

/** Every photo in the library, in declaration order. */
export const ALL_PHOTOS: readonly Photo[] = Object.values(ELITE15);

/**
 * The best frame we hold for a station, or undefined if we hold none.
 * Sled push is the one station with no Elite 15 frame — it falls back to the
 * existing guide illustration rather than borrowing a photo of another station.
 */
export function photoForStation(station: StationSlug): Photo | undefined {
  return ALL_PHOTOS.filter((p) => p.station === station).sort(
    (a, b) => b.quality - a.quality,
  )[0];
}

/** Every frame we hold for a station, best first. */
export function photosForStation(station: StationSlug): Photo[] {
  return ALL_PHOTOS.filter((p) => p.station === station).sort(
    (a, b) => b.quality - a.quality,
  );
}

/** Hero-grade frames: quality 5 and a wide crop that survived the recrop. */
export const HEROES: readonly Photo[] = ALL_PHOTOS.filter(
  (p) => p.quality === 5 && p.wide,
);

/** Frames where Ben is the subject. For about, coach and press surfaces. */
export const BEN_PHOTOS: readonly Photo[] = ALL_PHOTOS.filter((p) => p.isBen);

/**
 * Ben, facing the camera, for the screens where the point is that a person is
 * asking rather than a form.
 *
 * Named rather than picked from the pool, because most of `BEN_PHOTOS` are
 * action frames — the back of somebody on a rower is a fine banner and a
 * useless portrait. At 240px an action shot with no face in it reads as an
 * empty black box, which is the opposite of what a screen like the
 * cancellation flow is for.
 */
export const BEN_PORTRAIT: Photo = ELITE15.portraitFrontScoreboard;

export function photosBySubject(subject: PhotoSubject): Photo[] {
  return ALL_PHOTOS.filter((p) => p.subject === subject).sort(
    (a, b) => b.quality - a.quality,
  );
}

/**
 * Deterministic pick from a pool, keyed by any string (a slug, usually).
 * Same key always returns the same photo, so a page does not reshuffle its
 * own imagery between builds — which would make every rebuild a visual diff.
 */
export function pickPhoto(pool: readonly Photo[], key: string): Photo {
  if (pool.length === 0) throw new Error("pickPhoto: empty pool");
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) | 0;
  return pool[Math.abs(h) % pool.length];
}
