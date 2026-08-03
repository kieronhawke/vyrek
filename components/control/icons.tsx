/**
 * THE ADMIN ICON SET.
 *
 * Fourteen modules in a sidebar, each labelled in 13px grey, is a list — you
 * read it top to bottom every time because nothing about "Payments" looks
 * different from "Plans". An icon is what makes a nav scannable: after a week
 * Ben stops reading and goes straight to the shape.
 *
 * Line glyphs on `currentColor` rather than emoji, deliberately. Emoji are
 * pictures the operating system chooses — a different drawing on iOS, Android
 * and Windows, always full-colour, always at odds with a two-colour brand, and
 * inconsistently sized against 13px text. These inherit the link's colour, so
 * they go accent when a module is active and muted when it is not, and they
 * are legible at 18px on a phone tab bar and 20px in the rail.
 *
 * 24×24 viewBox, 1.6 stroke, round caps. Drawn as paths rather than pulled
 * from a library: fourteen icons is not worth a dependency, and a dependency
 * would not match the wordmark's weight anyway.
 */

type IconProps = { size?: number };

function Svg({ size = 20, children }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
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

/** Dashboard — the work queue, drawn as stacked panels. */
export function IconDashboard(p: IconProps) {
  return (
    <Svg {...p}>
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" />
    </Svg>
  );
}

/** Leads — someone who has raised a hand and not yet been answered. */
export function IconLeads(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M16 20v-1.5a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4V20" />
      <circle cx="9.5" cy="7" r="3.5" />
      <path d="M18 6.5v5M20.5 9h-5" />
    </Svg>
  );
}

/** Coach tracker — who is programmed until when. */
export function IconTracker(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </Svg>
  );
}

/** Clients — the people paying. */
export function IconClients(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M15 20v-1.5a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4V20" />
      <circle cx="8.5" cy="7" r="3.5" />
      <path d="M22 20v-1.5a4 4 0 0 0-3-3.87M16.5 3.63a4 4 0 0 1 0 6.74" />
    </Svg>
  );
}

/** Plans — the week, seven columns. */
export function IconPlans(p: IconProps) {
  return (
    <Svg {...p}>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M3 9h18M9 9v11M15 9v11" />
    </Svg>
  );
}

/** Diary — a calendar with its rings. */
export function IconDiary(p: IconProps) {
  return (
    <Svg {...p}>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
      <path d="M8 14.5h2.5" />
    </Svg>
  );
}

/** Messages — a thread. */
export function IconMessages(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M20 13a3 3 0 0 1-3 3H9l-4.5 3.5V7a3 3 0 0 1 3-3h9.5a3 3 0 0 1 3 3z" />
      <path d="M9 9h7M9 12h4.5" />
    </Svg>
  );
}

/** Payments — a card. */
export function IconPayments(p: IconProps) {
  return (
    <Svg {...p}>
      <rect x="2.5" y="5" width="19" height="14" rx="2.5" />
      <path d="M2.5 10h19M6 15h3" />
    </Svg>
  );
}

/** Finance — revenue, drawn as bars that go up. */
export function IconFinance(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M3.5 20.5h17" />
      <rect x="5" y="13" width="3.5" height="5" rx="1" />
      <rect x="10.25" y="9" width="3.5" height="9" rx="1" />
      <rect x="15.5" y="4.5" width="3.5" height="13.5" rx="1" />
    </Svg>
  );
}

/** Activity — a live trace. */
export function IconActivity(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M2.5 12.5h4l2.5-7 4 14 2.5-7h6" />
    </Svg>
  );
}

/** SEO — search. */
export function IconSeo(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="M15.5 15.5 21 21" />
    </Svg>
  );
}

/** Assets — the photo library. */
export function IconAssets(p: IconProps) {
  return (
    <Svg {...p}>
      <rect x="3" y="4.5" width="18" height="15" rx="2" />
      <circle cx="8.5" cy="9.5" r="1.8" />
      <path d="m3.5 17 4.75-4.5a2 2 0 0 1 2.75 0L16 17.5M14.5 13.5l1.75-1.6a2 2 0 0 1 2.7 0L21 13.8" />
    </Svg>
  );
}

/** Settings — the one place the site is configured. */
export function IconSettings(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2.5v2.2M12 19.3v2.2M21.5 12h-2.2M4.7 12H2.5M18.7 5.3l-1.6 1.6M6.9 17.1l-1.6 1.6M18.7 18.7l-1.6-1.6M6.9 6.9 5.3 5.3" />
    </Svg>
  );
}

/** Accounts — who can get in. */
export function IconAccounts(p: IconProps) {
  return (
    <Svg {...p}>
      <rect x="4" y="10.5" width="16" height="10.5" rx="2.5" />
      <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" />
      <path d="M12 15v2" />
    </Svg>
  );
}

/** More — everything the bottom bar has no room for. */
export function IconMore(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="5.5" cy="12" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="18.5" cy="12" r="1.4" fill="currentColor" stroke="none" />
    </Svg>
  );
}

/** Every module's glyph, keyed by the href fragment the shell already uses. */
export const MODULE_ICONS: Record<string, (p: IconProps) => React.ReactElement> = {
  "": IconDashboard,
  "/leads": IconLeads,
  "/tracker": IconTracker,
  "/clients": IconClients,
  "/plans": IconPlans,
  "/diary": IconDiary,
  "/messages": IconMessages,
  "/payments": IconPayments,
  "/finance": IconFinance,
  "/activity": IconActivity,
  "/seo": IconSeo,
  "/assets": IconAssets,
  "/settings": IconSettings,
  "/accounts": IconAccounts,
};
