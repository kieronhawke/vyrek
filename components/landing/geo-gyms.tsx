import { Container } from "@/components/shared/container";
import type { GeoSeo } from "@/lib/locations/seo";

/**
 * Where you can actually train, named, in this town.
 *
 * This is the section that makes a location page a location page. Everything
 * else on the page is the same offer described the same way; a list of the
 * real gyms in Kendal is something only Kendal's page can carry.
 *
 * Records come from OpenStreetMap via scripts/seed-gyms.mjs: name, type,
 * chain and distance, each carrying its source. What OSM does not record is
 * whether a given gym owns a sled, a ski erg or a wall-ball target, so the
 * page says what it knows and is explicit about what it does not. Claiming a
 * kit list we have not verified would be exactly the invented data hard rule 1
 * forbids.
 *
 * Attribution is required by the ODbL licence and is rendered, not optional.
 */

function stationNote(
  count: number,
  name: string,
  variant: "hyrox" | "pt",
): string {
  if (count >= 12)
    return variant === "pt" ? `${name} has plenty of choice, which means you can be picky about the thing that actually matters: whether you will still be going in March. Proximity beats facilities almost every time, and a rack you can get on at the hour you train beats both.` : `${name} has plenty of choice, which means you can be picky. The thing to look for is not a Hyrox sticker on the door, it is a sled lane long enough to push on, a spare wall for wall balls, and a rower nobody queues for at 6pm.`;
  if (count >= 5)
    return variant === "pt"
      ? `Enough choice in ${name} to pick on convenience rather than compromise. The gym you pass on the way home gets used; the better one across town gets paid for. Worth being honest with yourself about which is which before you sign anything.`
      : `Enough choice in ${name} to find one that suits the training rather than the other way round. Ring ahead and ask about sled space and a wall you are allowed to throw at, because those two decide more than anything on the membership page.`;
  return variant === "pt"
    ? `${name} is not spoilt for choice, which matters less than it sounds. A barbell, something to pull on and somewhere to walk covers most of what changes a body, and your programme is written around what you can actually get to rather than an ideal setup.`
    : `${name} is not spoilt for choice, which matters less than it sounds. Six of the eight stations need a sled, a rower, a ski erg, kettlebells and a wall, and most of that substitutes cleanly. Your programme is built around what you can actually get to.`;
}

export function GeoGyms({
  seo,
  name,
  variant = "hyrox",
}: {
  seo: GeoSeo;
  name: string;
  /** The intro differed not at all between the two families; it does now. */
  variant?: "hyrox" | "pt";
}) {
  const gyms = seo.gyms.slice(0, 12);
  if (!gyms.length) return null;

  return (
    <section
      aria-labelledby="geo-gyms-heading"
      className="border-t border-suth-border-subtle bg-suth-elevated/30 py-16 md:py-24"
    >
      <Container>
        <div className="mx-auto max-w-3xl">
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-suth-accent">
            [ Gyms in {name} ]
          </p>
          <h2
            id="geo-gyms-heading"
            className="mt-4 text-[28px] font-black leading-[1.1] tracking-[-0.03em] text-suth-text md:text-[36px]"
          >
            Where you can train in {name}.
          </h2>
          <p className="mt-4 text-base leading-relaxed text-suth-text-secondary">
            {stationNote(seo.gyms.length, name, variant)}
          </p>
          {seo.chains.length ? (
            <p className="mt-4 text-base leading-relaxed text-suth-text-secondary">
              Chains with a site here:{" "}
              <span className="text-suth-text">{seo.chains.slice(0, 5).join(", ")}</span>. If
              you already hold one of those memberships, you can start this week
              without paying anything new.
            </p>
          ) : null}
        </div>

        <ul className="mx-auto mt-10 grid max-w-3xl gap-px overflow-hidden rounded-lg border border-suth-border-subtle bg-suth-border-subtle md:mt-12">
          {gyms.map((g) => (
            <li
              key={g.name}
              className="flex items-baseline justify-between gap-4 bg-suth-elevated px-5 py-3.5"
            >
              <span className="text-sm text-suth-text">
                {g.name}
                {g.chain && g.chain !== g.name ? (
                  <span className="text-suth-text-tertiary"> · {g.chain}</span>
                ) : null}
              </span>
              <span className="flex shrink-0 items-baseline gap-3">
                <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-suth-text-tertiary">
                  {g.type === "sports-centre" ? "sports centre" : "gym"}
                </span>
                {typeof g.distanceKm === "number" ? (
                  <span className="w-14 text-right font-mono text-[11px] tabular-nums text-suth-text-tertiary">
                    {g.distanceKm} km
                  </span>
                ) : null}
              </span>
            </li>
          ))}
        </ul>

        <p className="mx-auto mt-5 max-w-3xl text-[11px] leading-relaxed text-suth-text-tertiary">
          {seo.gyms.length > gyms.length
            ? `${seo.gyms.length} sites within reach of the centre of ${name}; the twelve closest are listed. `
            : ""}
          Distances are straight-line from the centre of {name}. We have not
          audited what equipment each site holds, so treat this as where to
          start ringing rather than a verified kit list. Gym data ©{" "}
          <a
            href="https://www.openstreetmap.org/copyright"
            rel="noopener noreferrer"
            className="underline decoration-suth-border-strong underline-offset-2 hover:text-suth-text-secondary"
          >
            OpenStreetMap contributors
          </a>
          .
        </p>
      </Container>
    </section>
  );
}
