/**
 * CONNECTING SOMEBODY'S FITNESS DATA.
 *
 * The ask was "a connection section where they can connect, and their fitness
 * data is automatically tracked". Building that as four identical "Connect"
 * buttons would be the placeholder problem all over again — three of them
 * could never work, and finding that out by tapping is worse than being told.
 *
 * So each provider carries its real status, checked rather than assumed:
 *
 * ── STRAVA — genuinely available ────────────────────────────────────────
 * Public OAuth2, free, documented. Activities, distance, moving time, heart
 * rate. This is the one worth building, and it needs a client id and secret
 * from the Strava developer console.
 *
 * ── APPLE HEALTH — not possible from a website ──────────────────────────
 * HealthKit is an iOS framework. There is no web API and no server API: data
 * never leaves the device except through an app the user installs. A browser
 * cannot read it, and no amount of OAuth changes that. It needs a native app,
 * or a bridge service the athlete also installs.
 *
 * ── GOOGLE FIT — the REST API is gone ───────────────────────────────────
 * Deprecated in favour of Health Connect, which is an Android on-device API.
 * Same shape of problem as Apple Health.
 *
 * ── MYFITNESSPAL — closed ───────────────────────────────────────────────
 * The API is private and partner-only, and as of 2026 they state they are not
 * accepting requests for access. Verified on their developer portal rather
 * than assumed. A "Connect MyFitnessPal" button cannot be made to work by us.
 *
 * ── GARMIN, WHOOP, OURA — possible, on approval ─────────────────────────
 * Each has a real API behind an application process. Worth doing after Strava
 * if athletes ask for them.
 *
 * The page renders all of this plainly. An athlete who uses MyFitnessPal
 * learns in one line why it is not there, instead of tapping a dead button.
 */

export type ConnectionStatus =
  /** OAuth exists and we can build it. Needs credentials configured. */
  | "available"
  /** Real API, but behind an application we have not made. */
  | "on-request"
  /** Cannot work from a website at all. */
  | "needs-app"
  /** The provider does not offer access. */
  | "closed";

export type Provider = {
  key: string;
  name: string;
  /** What we would pull in, in the athlete's words. */
  brings: string;
  status: ConnectionStatus;
  /** The one sentence shown under the name. Always true. */
  note: string;
  /** Where somebody can read the same thing for themselves. */
  docs?: string;
};

export const PROVIDERS: Provider[] = [
  {
    key: "strava",
    name: "Strava",
    brings: "Runs, rides and workouts — distance, time, pace and heart rate.",
    status: "available",
    note:
      "Strava's API is open and free, so this is the one integration that can "
      + "work today. Once connected, every run and workout you record lands on "
      + "your account without you touching anything.",
    docs: "https://developers.strava.com/",
  },
  {
    key: "apple-health",
    name: "Apple Health",
    brings: "Steps, workouts, resting heart rate, sleep and weight.",
    status: "needs-app",
    note:
      "Apple Health data never leaves your iPhone except through an installed "
      + "app — there is no way for a website to read it. This needs a Suth app "
      + "on the App Store, which is a bigger piece of work.",
  },
  {
    key: "google-fit",
    name: "Google Fit / Health Connect",
    brings: "Steps, workouts and heart rate from an Android phone.",
    status: "needs-app",
    note:
      "Google retired the Fit web API in favour of Health Connect, which is "
      + "on-device on Android. Same as Apple Health: it needs an installed app.",
  },
  {
    key: "myfitnesspal",
    name: "MyFitnessPal",
    brings: "Food diary and macros.",
    status: "closed",
    note:
      "MyFitnessPal's API is partner-only and they are not accepting new "
      + "applications. We cannot connect to it, so log your food here instead — "
      + "it takes the same taps and Ben can actually see it.",
    docs: "https://www.myfitnesspal.com/api.php?op=link",
  },
  {
    key: "garmin",
    name: "Garmin",
    brings: "Workouts, heart rate, sleep and body battery.",
    status: "on-request",
    note:
      "Garmin's Health API is real but sits behind an application. Worth doing "
      + "if enough athletes ask for it.",
    docs: "https://developer.garmin.com/gc-developer-program/health-api/",
  },
  {
    key: "whoop",
    name: "WHOOP",
    brings: "Recovery, strain and sleep.",
    status: "on-request",
    note: "WHOOP has a developer API behind a registration step.",
    docs: "https://developer.whoop.com/",
  },
];

/** Whether the button on the card should do anything at all. */
export function isConnectable(provider: Provider): boolean {
  return provider.status === "available";
}

/**
 * Whether the provider is configured to the point of being usable.
 *
 * `available` means the API exists; this means the keys are present. A card
 * saying "Connect" that opens a broken OAuth screen is the same failure as a
 * button with no handler, so the page distinguishes the two.
 */
export function isConfigured(key: string, env: NodeJS.ProcessEnv = process.env): boolean {
  if (key !== "strava") return false;
  return Boolean(env.STRAVA_CLIENT_ID && env.STRAVA_CLIENT_SECRET);
}

export const STATUS_LABEL: Record<ConnectionStatus, string> = {
  available: "Ready to switch on",
  "on-request": "Needs approval",
  "needs-app": "Needs a phone app",
  closed: "Not available",
};
