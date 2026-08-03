import Image from "next/image";
import { Flag } from "./flag";

/**
 * The visual identity of an event.
 *
 * The reference site puts a desaturated city photograph behind every event
 * card, and it is the single biggest reason their calendar looks like a
 * product rather than a table. We do not have licensed photography of London,
 * Manchester or Hong Kong, and taking theirs is not an option — so this is a
 * typographic identity that stands on its own and accepts a photograph the
 * moment one exists.
 *
 * Three layers:
 *
 * 1. **The IATA code, set large.** Airport codes are how this sport already
 *    talks about its calendar, they are unique per city, and three letters in
 *    a condensed face is a strong mark at any size.
 * 2. **A deterministic wash** derived from the code, so Manchester is always
 *    the same colour and never the same as Birmingham. Hue only — value and
 *    saturation are pinned so nothing fights the chartreuse.
 * 3. **The flag**, small, bottom-left.
 *
 * Pass `photo` and it becomes the background with the code overlaid, which is
 * the same layout — so dropping real photography in later changes nothing
 * structurally and needs no redesign.
 */

/**
 * Stable hue from the city code. Same input, same colour, forever.
 *
 * Stepped by the golden angle rather than taken modulo 360 directly: a plain
 * modulo put Berlin and Manchester within a few degrees of each other and the
 * calendar looked like it had two of the same card. 137.5° maximises the gap
 * between successive values, so adjacent codes land far apart on the wheel.
 */
function hueFor(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return Math.round((hash % 997) * 137.508) % 360;
}

export function CityMark({
  iata, city, countryIso, photo, className, size = "tile",
}: {
  iata: string;
  city: string;
  countryIso: string;
  /** Optional real photograph. Everything else stays identical when set. */
  photo?: string;
  className?: string;
  size?: "tile" | "banner";
}) {
  const code = (iata || city.slice(0, 3)).toUpperCase();
  const hue = hueFor(code);

  return (
    <div
      className={
        "relative isolate overflow-hidden bg-suth-overlay "
        + (size === "banner" ? "h-28 md:h-40 " : "h-20 ")
        + (className ?? "")
      }
      aria-hidden
    >
      {photo ? (
        <>
          <Image
            src={photo}
            alt=""
            fill
            sizes="(max-width: 768px) 100vw, 420px"
            className="object-cover opacity-45 grayscale"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-suth-elevated via-suth-elevated/40 to-transparent" />
        </>
      ) : (
        <div
          className="absolute inset-0"
          style={{
            background:
              `linear-gradient(135deg, hsl(${hue} 32% 16%) 0%, hsl(${(hue + 40) % 360} 26% 9%) 100%)`,
          }}
        />
      )}

      {/* Hairline grid — a timing-board texture rather than decoration. */}
      <div
        className="absolute inset-0 opacity-[0.16]"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(255,255,255,.35) 1px, transparent 1px)",
          backgroundSize: "18px 100%",
        }}
      />

      <span
        className={
          "absolute right-3 top-1/2 -translate-y-1/2 font-display font-bold leading-none "
          + "tracking-[-0.04em] text-white/[0.13] "
          + (size === "banner" ? "text-[5.5rem] md:text-[8rem]" : "text-[3.25rem]")
        }
      >
        {code}
      </span>

      <span className="absolute bottom-2 left-3 flex items-center gap-2">
        <Flag iso={countryIso} />
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/70">
          {code}
        </span>
      </span>
    </div>
  );
}
