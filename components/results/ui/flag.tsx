/**
 * Nation flags as inline SVG.
 *
 * Emoji flags look fine on macOS and iOS and render as **bare letter pairs on
 * Windows** — Chrome and Edge there ship no flag glyphs at all, so a British
 * athlete showed up as "GB" in a box. That is most desktop visitors seeing a
 * broken-looking table.
 *
 * These are simple geometric approximations, drawn to read correctly at 16px
 * in a dense row rather than to be heraldically exact. Each is a handful of
 * rects and paths, inlined, so there is no sprite to fetch and no layout shift
 * when it arrives.
 *
 * Adding a nation: add a case here and to NATION_CODE in format.ts. Anything
 * unmapped falls back to the three-letter code in a chip, which is honest and
 * still readable — never a blank space.
 */

import { nationCode } from "@/lib/results/format";

const VIEW = "0 0 24 16";

/** Union flag, simplified: the diagonals are drawn as plain crossbars. */
function GB() {
  return (
    <>
      <rect width="24" height="16" fill="#012169" />
      <path d="M0 0l24 16M24 0L0 16" stroke="#fff" strokeWidth="3.2" />
      <path d="M0 0l24 16M24 0L0 16" stroke="#C8102E" strokeWidth="1.6" />
      <path d="M12 0v16M0 8h24" stroke="#fff" strokeWidth="5.4" />
      <path d="M12 0v16M0 8h24" stroke="#C8102E" strokeWidth="3.2" />
    </>
  );
}

function tricolour(a: string, b: string, c: string, vertical = true) {
  return vertical ? (
    <>
      <rect width="8" height="16" fill={a} />
      <rect x="8" width="8" height="16" fill={b} />
      <rect x="16" width="8" height="16" fill={c} />
    </>
  ) : (
    <>
      <rect width="24" height="5.34" fill={a} />
      <rect y="5.34" width="24" height="5.33" fill={b} />
      <rect y="10.67" width="24" height="5.33" fill={c} />
    </>
  );
}

function nordicCross(field: string, cross: string) {
  return (
    <>
      <rect width="24" height="16" fill={field} />
      <rect x="7" width="3.2" height="16" fill={cross} />
      <rect y="6.4" width="24" height="3.2" fill={cross} />
    </>
  );
}


/**
 * ⚠️ The source speaks IOC, this file speaks ISO-3166 alpha-2.
 *
 * Results carry `GBR`, `USA`, `GER`, `NED` — Olympic codes. Every lookup here
 * is keyed on the two-letter ISO code (`gb`, `us`, `de`, `nl`), so **every
 * single flag missed** and fell through to the text chip. That is why a
 * finished board showed a column of "GBR" and "USA" in boxes with no flags
 * anywhere: not a rendering bug, a vocabulary mismatch.
 *
 * Several are not merely a truncation — GER is Germany, NED the Netherlands,
 * SUI Switzerland, RSA South Africa — so the two vocabularies have to be
 * mapped rather than sliced.
 *
 * `ENG`, `SCO` and `WAL` appear because HYROX records the home nations
 * separately; they fly the Union flag here rather than nothing.
 */
const IOC_TO_ISO: Record<string, string> = {
  gbr: "gb", eng: "gb", sco: "gb", wal: "gb", nir: "gb",
  usa: "us", ger: "de", ned: "nl", sui: "ch", rsa: "za", den: "dk",
  por: "pt", sin: "sg", ina: "id", phi: "ph", mas: "my", tpe: "tw",
  chi: "cl", cro: "hr", gre: "gr", lat: "lv", slo: "si", svk: "sk",
  bul: "bg", uae: "ae", ksa: "sa", kuw: "kw", qat: "qa", bah: "bh",
  vie: "vn", cam: "kh", mya: "mm", nep: "np", sri: "lk", bru: "bn",
  fra: "fr", ita: "it", esp: "es", aus: "au", mex: "mx", pol: "pl",
  ind: "in", irl: "ie", bel: "be", hkg: "hk", aut: "at", can: "ca",
  nzl: "nz", tha: "th", swe: "se", bra: "br", jpn: "jp", kor: "kr",
  nor: "no", fin: "fi", chn: "cn", tur: "tr", cze: "cz", arg: "ar",
  ltu: "lt", col: "co", isr: "il", egy: "eg", mar: "ma", ken: "ke",
  ecu: "ec", per: "pe", uru: "uy", pan: "pa", crc: "cr", est: "ee",
  hun: "hu", rou: "ro", ukr: "ua", srb: "rs", isl: "is", lux: "lu",
  cyp: "cy", mlt: "mt", jam: "jm", tto: "tt", nga: "ng", gha: "gh",
};

/** IOC or ISO in, ISO-3166 alpha-2 out. */
export function toIso2(code: string): string {
  const c = (code || "").trim().toLowerCase();
  if (c.length === 2) return c;
  return IOC_TO_ISO[c] ?? c;
}

/** Two horizontal bands. */
function bicolour(top: string, bottom: string) {
  return (
    <>
      <rect width="24" height="8" fill={top} />
      <rect y="8" width="24" height="8" fill={bottom} />
    </>
  );
}

/** A plain field with a centred disc — Japan, Bangladesh, Palau. */
function disc(field: string, circle: string, cx = 12) {
  return (
    <>
      <rect width="24" height="16" fill={field} />
      <circle cx={cx} cy="8" r="4.2" fill={circle} />
    </>
  );
}

/** A field with a canton block, for the Nordic-adjacent and Oceania flags. */
function cantoned(field: string, canton: string) {
  return (
    <>
      <rect width="24" height="16" fill={field} />
      <rect width="10" height="7" fill={canton} />
    </>
  );
}

const FLAGS: Record<string, () => React.ReactElement> = {
  fr: () => tricolour("#002395", "#fff", "#ED2939"),
  it: () => tricolour("#009246", "#fff", "#CE2B37"),
  be: () => tricolour("#000", "#FDDA24", "#EF3340"),
  au: () => cantoned("#012169", "#012169"),
  mx: () => tricolour("#006847", "#fff", "#CE1126"),
  pl: () => bicolour("#fff", "#DC143C"),
  at: () => tricolour("#ED2939", "#fff", "#ED2939", false),
  ca: () => tricolour("#D80621", "#fff", "#D80621"),
  nz: () => cantoned("#012169", "#012169"),
  th: () => tricolour("#A51931", "#F4F5F8", "#2D2A4A", false),
  za: () => tricolour("#007A4D", "#fff", "#DE3831", false),
  pt: () => tricolour("#046A38", "#046A38", "#DA291C"),
  ch: () => (
    <>
      <rect width="24" height="16" fill="#DA291C" />
      <rect x="10.4" y="3.2" width="3.2" height="9.6" fill="#fff" />
      <rect x="7.2" y="6.4" width="9.6" height="3.2" fill="#fff" />
    </>
  ),
  dk: () => nordicCross("#C8102E", "#fff"),
  no: () => nordicCross("#BA0C2F", "#fff"),
  fi: () => nordicCross("#fff", "#002F6C"),
  is: () => nordicCross("#02529C", "#fff"),
  br: () => (
    <>
      <rect width="24" height="16" fill="#009B3A" />
      <path d="M12 2l9 6-9 6-9-6z" fill="#FEDF00" />
      <circle cx="12" cy="8" r="3.1" fill="#002776" />
    </>
  ),
  jp: () => disc("#fff", "#BC002D"),
  kr: () => disc("#fff", "#CD2E3A"),
  cn: () => (
    <>
      <rect width="24" height="16" fill="#DE2910" />
      <circle cx="5" cy="5" r="2.4" fill="#FFDE00" />
    </>
  ),
  tr: () => (
    <>
      <rect width="24" height="16" fill="#E30A17" />
      <circle cx="9" cy="8" r="3.4" fill="#fff" />
      <circle cx="10.4" cy="8" r="2.7" fill="#E30A17" />
    </>
  ),
  cz: () => bicolour("#fff", "#D7141A"),
  ar: () => tricolour("#74ACDF", "#fff", "#74ACDF", false),
  lt: () => tricolour("#FDB913", "#006A44", "#C1272D", false),
  co: () => tricolour("#FCD116", "#003893", "#CE1126", false),
  id: () => bicolour("#CE1126", "#fff"),
  ph: () => bicolour("#0038A8", "#CE1126"),
  my: () => cantoned("#CC0001", "#010066"),
  tw: () => cantoned("#FE0000", "#000095"),
  il: () => (
    <>
      <rect width="24" height="16" fill="#fff" />
      <rect y="2" width="24" height="2" fill="#0038B8" />
      <rect y="12" width="24" height="2" fill="#0038B8" />
    </>
  ),
  ae: () => (
    <>
      <rect width="24" height="16" fill="#00732F" />
      <rect y="5.34" width="24" height="5.33" fill="#fff" />
      <rect y="10.67" width="24" height="5.33" fill="#000" />
      <rect width="6" height="16" fill="#FF0000" />
    </>
  ),
  hu: () => tricolour("#CE2939", "#fff", "#477050", false),
  ro: () => tricolour("#002B7F", "#FCD116", "#CE1126"),
  ua: () => bicolour("#0057B7", "#FFD700"),
  gr: () => bicolour("#0D5EAF", "#fff"),
  hr: () => tricolour("#FF0000", "#fff", "#171796", false),
  ee: () => tricolour("#0072CE", "#000", "#fff", false),
  lv: () => tricolour("#9E3039", "#fff", "#9E3039", false),
  si: () => tricolour("#fff", "#0000CD", "#FF0000", false),
  sk: () => tricolour("#fff", "#0B4EA2", "#EE1C25", false),
  lu: () => tricolour("#ED2939", "#fff", "#00A1DE", false),
  gb: GB,
  ie: () => tricolour("#169B62", "#fff", "#FF883E"),
  de: () => tricolour("#000", "#DD0000", "#FFCE00", false),
  es: () => (
    <>
      <rect width="24" height="16" fill="#AA151B" />
      <rect y="4" width="24" height="8" fill="#F1BF00" />
    </>
  ),
  nl: () => tricolour("#AE1C28", "#fff", "#21468B", false),
  se: () => nordicCross("#006AA7", "#FECC00"),
  us: () => (
    <>
      <rect width="24" height="16" fill="#fff" />
      {[0, 2, 4, 6].map((i) => (
        <rect key={i} y={i * 2.46} width="24" height="1.23" fill="#B31942" />
      ))}
      {[1, 3, 5].map((i) => (
        <rect key={i} y={i * 2.46} width="24" height="1.23" fill="#B31942" />
      ))}
      <rect width="10" height="8.6" fill="#0A3161" />
    </>
  ),
  in: () => (
    <>
      {tricolour("#FF9933", "#fff", "#138808", false)}
      <circle cx="12" cy="8" r="2.1" fill="none" stroke="#000088" strokeWidth="0.7" />
    </>
  ),
  hk: () => (
    <>
      <rect width="24" height="16" fill="#DE2910" />
      <circle cx="12" cy="8" r="3.4" fill="#fff" />
    </>
  ),
  sg: () => (
    <>
      <rect width="24" height="16" fill="#fff" />
      <rect width="24" height="8" fill="#ED2939" />
      <circle cx="6" cy="4" r="2.4" fill="#fff" />
      <circle cx="7.4" cy="4" r="2.4" fill="#ED2939" />
    </>
  ),
};

export function Flag({ iso, className }: { iso: string; className?: string }) {
  // IOC in, ISO out. The results source speaks IOC and this map speaks ISO.
  const code = toIso2(iso);
  const Draw = FLAGS[code];

  if (!Draw) {
    // Unmapped nation: the code itself, which is more use than a blank box.
    return (
      <span
        aria-hidden
        className={
          "inline-flex h-4 w-6 shrink-0 items-center justify-center rounded-[2px] "
          + "border border-suth-border bg-suth-overlay font-mono text-[8px] "
          + "leading-none text-suth-text-tertiary "
          + (className ?? "")
        }
      >
        {nationCode(code).slice(0, 3)}
      </span>
    );
  }

  return (
    <svg
      viewBox={VIEW}
      aria-hidden
      focusable="false"
      className={
        "inline-block h-4 w-6 shrink-0 rounded-[2px] ring-1 ring-inset ring-white/15 "
        + (className ?? "")
      }
    >
      <Draw />
    </svg>
  );
}
