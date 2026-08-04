"use client";

import { WORLD_PATHS } from "@/lib/control/world-paths";
import { useEffect, useMemo, useState } from "react";
import "leaflet/dist/leaflet.css";
import {
  GeoMap,
  MAP_THEMES,
  CITY_ACCURACY_KM,
  type MapTheme,
  type GeoPoint,
} from "@/components/control/geo-map";
import { useCollection } from "@/lib/control/store";
import {
  ADMIN_IPS_KEY,
  FILTER_LABEL,
  RANGE_LABEL,
  SORT_LABEL,
  byCountry,
  byPage,
  excludeAdmin,
  formatDuration,
  inRange,
  intentOf,
  matchesFilter,
  project,
  quizFunnel,
  relativeTime,
  sortSessions,
  totalSeconds,
  totals,
  worstStep,
  type FilterKey,
  type Intent,
  type Range,
  type RangeKey,
  type Session,
  type SortKey,
} from "@/lib/control/activity";
import { loadActivity } from "@/lib/control/activity-sample";
import { useHydrated, readStored } from "@/hooks/use-hydrated";

/**
 * ACTIVITY — who came, what they did, and where they stopped.
 *
 * The screen is ordered by what a person can act on. How many came and how
 * many got in touch, first. Then where the quiz leaks, because that is the one
 * number on this page that turns directly into money. Then where they are,
 * then who they were.
 *
 * IT SAYS WHEN THE NUMBERS ARE NOT REAL. Nothing is being collected — there is
 * no analytics key — so the banner is not a nicety. HARD-RULES §1 forbids
 * presenting anything invented as real, and an analytics page is precisely
 * where a founder would act on a number without questioning it.
 *
 * EXCLUDED TRAFFIC IS REMOVED BEFORE ANYTHING IS COUNTED, not filtered out of
 * the table. See lib/control/activity.ts.
 */

const INTENT_LABEL: Record<Intent, string> = {
  high: "High",
  medium: "Medium",
  low: "Low",
  anonymous: "Anonymous",
};

/** Regional-indicator flag from a two-letter code, or null rather than wrong. */
function flag(iso: string): string | null {
  if (!/^[A-Za-z]{2}$/.test(iso)) return null;
  return String.fromCodePoint(
    ...[...iso.toUpperCase()].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65),
  );
}

export function Activity({ today, now }: { today: string; now: string }) {
  const data = useMemo(() => loadActivity(today), [today]);
  const adminIps = useCollection<{ id: string }>(ADMIN_IPS_KEY, []);

  const [range, setRange] = useState<Range>({ key: "30d" });
  const [filter, setFilter] = useState<FilterKey>("all");
  const [sort, setSort] = useState<SortKey>("last-seen");
  const [country, setCountry] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  /* Kieron liked the dark map and asked to be able to switch. Persisted,
     because a map that forgets its theme on every navigation is worse than
     one that never had a switch. */
  /*
   * Read as the initial value rather than through an effect that then calls
   * `setMapTheme`. The effect version re-rendered the whole activity view on
   * mount and, for anyone with a saved theme, redrew the map twice — once in
   * dark, once in theirs.
   *
   * `hydrated` below keeps the first client render identical to the server's,
   * which is what makes seeding from storage safe.
   */
  const hydrated = useHydrated();
  const [savedTheme, setMapTheme] = useState<MapTheme>(() => {
    const v = readStored<string>("activity.mapTheme", "dark");
    return MAP_THEMES.some((t) => t.key === v) ? (v as MapTheme) : "dark";
  });
  const mapTheme: MapTheme = hydrated ? savedTheme : "dark";
  useEffect(() => {
    window.localStorage.setItem("activity.mapTheme", mapTheme);
  }, [mapTheme]);

  const excluded = adminIps.items.map((r) => r.id);

  /**
   * The order matters and is the whole point: exclude, then bound by date,
   * then everything else is computed from that one set. Any figure computed
   * before the exclusion would count Ben's own visits.
   *
   * Left as a plain expression — the React Compiler memoises it, and a hand
   * written useMemo here could not keep a stable dependency without stringing
   * the IP list and splitting it again, which the compiler then refuses to
   * preserve.
   */
  const counted = excludeAdmin(data.sessions, excluded).filter((s) =>
    inRange(s, range, today),
  );

  const t = totals(counted);
  const funnel = quizFunnel(counted);
  const worst = worstStep(funnel);
  const countries = byCountry(counted);
  const pages = byPage(counted).slice(0, 8);

  const listed = sortSessions(
    counted.filter(
      (s) =>
        matchesFilter(s, filter) &&
        (country === "" || s.countryIso === country),
    ),
    sort,
  );

  const detail = counted.find((s) => s.id === open) ?? null;

  return (
    <div className="ac">
      {data.isSample ? (
        <p className="ac-sample" role="status">
          <strong>Sample data.</strong> {data.reason}
        </p>
      ) : null}

      {/* ── When ───────────────────────────────────────────────────────── */}
      <div className="ac-range" role="group" aria-label="Date range">
        {(["today", "7d", "30d", "all"] as RangeKey[]).map((k) => (
          <button
            key={k}
            type="button"
            className="ac-chip"
            data-on={range.key === k || undefined}
            onClick={() => setRange({ key: k })}
          >
            {RANGE_LABEL[k]}
          </button>
        ))}
        {/* Two controls, two labels. A <label> wrapping both inputs names
            neither of them unambiguously — the accessible name resolved to
            the same string for both, which is a real screen-reader defect and
            not merely an awkward test locator. */}
        <span className="ac-dates">
          <label className="sr-only" htmlFor="ac-from">
            Custom range from
          </label>
          <input
            id="ac-from"
            type="date"
            value={range.from ?? ""}
            onChange={(e) => setRange({ key: "custom", from: e.target.value, to: range.to })}
            className="ac-input"
          />
          <span aria-hidden>–</span>
          <label className="sr-only" htmlFor="ac-to">
            Custom range to
          </label>
          <input
            id="ac-to"
            type="date"
            value={range.to ?? ""}
            onChange={(e) => setRange({ key: "custom", from: range.from, to: e.target.value })}
            className="ac-input"
          />
        </span>
      </div>

      {/* ── How many ───────────────────────────────────────────────────── */}
      <section className="ac-stats" aria-label="Totals">
        <Stat label="Sessions" value={t.sessions} />
        <Stat label="Page views" value={t.pageViews} />
        <Stat label="Enquiries" value={t.enquiries} tone="accent" />
        <Stat label="Median visit" text={formatDuration(t.medianSeconds)} />
      </section>

      {/* ── Where the quiz leaks ───────────────────────────────────────── */}
      <section className="ac-panel" aria-label="Quiz">
        <h2 className="ac-panel__title">The quiz</h2>
        {t.quizStarted === 0 ? (
          <p className="ac-hint">Nobody started the quiz in this period.</p>
        ) : (
          <>
            <p className="ac-lead">
              <span className="num">{t.quizStarted}</span> started,{" "}
              <span className="num">{t.quizCompleted}</span> finished
              {worst ? (
                <>
                  {" "}
                  — the biggest drop-off is <strong>{worst.step}</strong>, where{" "}
                  <span className="num">{worst.abandoned}</span> stopped.
                </>
              ) : (
                "."
              )}
            </p>
            <ul className="ac-funnel">
              {funnel.map((f) => {
                const width = t.quizStarted ? (f.reached / t.quizStarted) * 100 : 0;
                return (
                  <li key={f.step} className="ac-step">
                    <span className="ac-step__name">{f.step}</span>
                    <span className="ac-step__bar">
                      <span
                        className="ac-step__fill"
                        style={{ width: `${width}%` }}
                        data-worst={f.step === worst?.step || undefined}
                      />
                    </span>
                    <span className="num ac-step__n">{f.reached}</span>
                    <span className="num ac-step__lost">
                      {f.abandoned ? `−${f.abandoned}` : ""}
                    </span>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </section>

      {/* ── Where they are ─────────────────────────────────────────────── */}
      <section className="ac-panel" aria-label="Locations">
        <h2 className="ac-panel__title">Where they are</h2>
        <div className="ac-maptheme" role="group" aria-label="Map style">
          {MAP_THEMES.map((t) => (
            <button
              key={t.key}
              type="button"
              className="ac-maptheme__btn"
              aria-pressed={mapTheme === t.key}
              onClick={() => setMapTheme(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="ac-geo">
          <GeoMap
            points={cityPoints(counted)}
            theme={mapTheme}
            height={380}
            onSelect={(id) => setOpen(id)}
            ariaLabel="Sessions by location"
          />
          <ul className="ac-countries">
            {countries.map((c) => (
              <li key={c.countryIso}>
                <button
                  type="button"
                  className="ac-country"
                  data-on={country === c.countryIso || undefined}
                  onClick={() => setCountry(country === c.countryIso ? "" : c.countryIso)}
                >
                  <span aria-hidden>{flag(c.countryIso) ?? "•"}</span>
                  <span className="ac-country__name">{c.country}</span>
                  <span className="num ac-country__n">{c.sessions}</span>
                  {c.enquiries ? (
                    <span className="num ac-country__e">{c.enquiries} enq</span>
                  ) : null}
                </button>
              </li>
            ))}
            {countries.length === 0 ? <li className="ac-hint">Nothing in this period.</li> : null}
          </ul>
        </div>
        <p className="ac-hint">
          Drag to pan, scroll or pinch to zoom. The ring around each pin is
          how precisely an IP actually places somebody, not a margin of error
          we chose. Tap a pin for the session, or a country to filter the
          table below.
        </p>
      </section>

      {/* ── What they read ─────────────────────────────────────────────── */}
      <section className="ac-panel" aria-label="Pages">
        <h2 className="ac-panel__title">Most-read pages</h2>
        <ul className="ac-pages">
          {pages.map((p) => (
            <li key={p.path}>
              <span className="ac-pages__path">{p.path}</span>
              <span className="num ac-pages__n">{p.views}</span>
              <span className="num ac-pages__t">{formatDuration(Math.round(p.seconds / p.views))} avg</span>
            </li>
          ))}
          {pages.length === 0 ? <li className="ac-hint">Nothing in this period.</li> : null}
        </ul>
      </section>

      {/* ── Who they were ──────────────────────────────────────────────── */}
      <section className="ac-panel" aria-label="Visitors">
        <h2 className="ac-panel__title">Visitors</h2>

        <div className="ac-controls">
          <div className="ac-filters" role="group" aria-label="Filter">
            {(Object.keys(FILTER_LABEL) as FilterKey[]).map((k) => (
              <button
                key={k}
                type="button"
                className="ac-chip"
                data-on={filter === k || undefined}
                onClick={() => setFilter(k)}
              >
                {FILTER_LABEL[k]}
              </button>
            ))}
          </div>
          <label className="ac-sort">
            <span className="eyebrow">Sort</span>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="ac-input"
            >
              {(Object.keys(SORT_LABEL) as SortKey[]).map((k) => (
                <option key={k} value={k}>
                  {SORT_LABEL[k]}
                </option>
              ))}
            </select>
          </label>
          {country ? (
            <button type="button" className="ac-chip" onClick={() => setCountry("")}>
              {flag(country)} {country} ×
            </button>
          ) : null}
        </div>

        <div className="ac-tablewrap">
          <table className="ac-table">
            <caption className="sr-only">Visitor sessions</caption>
            <thead>
              <tr>
                <th scope="col">Where</th>
                <th scope="col">Last page</th>
                <th scope="col">Pages</th>
                <th scope="col">Time</th>
                <th scope="col">Intent</th>
                <th scope="col">Last seen</th>
              </tr>
            </thead>
            <tbody>
              {listed.map((s) => {
                const level = intentOf(s);
                return (
                  <tr key={s.id}>
                    <td>
                      <button
                        type="button"
                        className="ac-rowbtn"
                        onClick={() => setOpen(s.id)}
                        aria-label={`Session from ${s.city}, ${s.country}`}
                      >
                        <span aria-hidden>{flag(s.countryIso) ?? "•"}</span> {s.city}
                      </button>
                    </td>
                    <td className="ac-cell--path">{s.pages.at(-1)?.path ?? "—"}</td>
                    <td className="num">{s.pages.length}</td>
                    <td className="num">{formatDuration(totalSeconds(s))}</td>
                    <td>
                      <span className="ac-intent" data-level={level}>
                        {INTENT_LABEL[level]}
                      </span>
                    </td>
                    <td className="ac-cell--when">{relativeTime(s.lastSeenAt, now)}</td>
                  </tr>
                );
              })}
              {listed.length === 0 ? (
                <tr>
                  <td colSpan={6} className="ac-hint">
                    Nobody matches that.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Excluded traffic ───────────────────────────────────────────── */}
      <section className="ac-panel" aria-label="Excluded traffic">
        <h2 className="ac-panel__title">Excluded traffic</h2>
        {excluded.length === 0 ? (
          <p className="ac-hint">
            Nothing excluded. Open a session and mark it as yours to keep your
            own visits out of every figure on this page.
          </p>
        ) : (
          <ul className="ac-excluded">
            {excluded.map((ip) => (
              <li key={ip}>
                <span className="num">{ip}</span>
                <button
                  type="button"
                  className="ac-chip"
                  onClick={() => adminIps.remove(ip)}
                  aria-label={`Stop excluding ${ip}`}
                >
                  Include again
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {detail ? (
        <Detail
          session={detail}
          now={now}
          mapTheme={mapTheme}
          excluded={excluded.includes(detail.ip)}
          onExclude={() => {
            adminIps.add({ id: detail.ip });
            setOpen(null);
          }}
          onClose={() => setOpen(null)}
        />
      ) : null}
    </div>
  );
}

/* ── Bits ──────────────────────────────────────────────────────────────── */

function Stat({
  label,
  value,
  text,
  tone,
}: {
  label: string;
  value?: number;
  text?: string;
  tone?: "accent";
}) {
  return (
    <div className="ac-stat">
      <span className="eyebrow">{label}</span>
      <strong
        className="num ac-stat__v"
        style={tone === "accent" ? { color: "var(--accent-text)" } : undefined}
      >
        {text ?? value}
      </strong>
    </div>
  );
}



/**
 * One pin per city rather than per session, so ten visits from Manchester
 * are one marker of size ten instead of ten markers stacked on each other.
 * The id is the first session there, which is what a click opens.
 */
function cityPoints(sessions: Session[]): GeoPoint[] {
  const byCity = new Map<string, GeoPoint>();
  for (const s of sessions) {
    const key = `${s.lat},${s.lng}`;
    const existing = byCity.get(key);
    if (existing) {
      existing.weight = (existing.weight ?? 1) + 1;
      existing.accent = existing.accent || s.enquired;
    } else {
      byCity.set(key, {
        id: s.id,
        lat: s.lat,
        lng: s.lng,
        label: s.city,
        weight: 1,
        accent: s.enquired,
      });
    }
  }
  return [...byCity.values()];
}

function Detail({
  session: s,
  now,
  excluded,
  mapTheme,
  onExclude,
  onClose,
}: {
  session: Session;
  now: string;
  excluded: boolean;
  mapTheme: MapTheme;
  onExclude: () => void;
  onClose: () => void;
}) {
  /* Escape closes it. Previously the only way out was the scrim, and the
     scrim covered the whole viewport including behind the panel, so a click
     anywhere near the sheet dismissed it. */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="ac-detail" role="dialog" aria-modal="true" aria-label="Session detail">
      <button type="button" className="ac-detail__scrim" aria-label="Close" onClick={onClose} />
      <div className="ac-detail__panel">
        <div className="ac-detail__grip" aria-hidden />
        <h3 className="ac-detail__title">
          <span aria-hidden>{flag(s.countryIso) ?? "•"}</span> {s.city}, {s.country}
        </h3>

        {/* Was the entire planet in a 360x180 SVG, which answered "which
            continent" and nothing else. Now the same map component, focused
            on the session, with the accuracy ring drawn at its real size so
            the area is the answer rather than the dot. */}
        <div className="ac-detail__mapwrap">
          <GeoMap
            points={[
              {
                id: s.id,
                lat: s.lat,
                lng: s.lng,
                label: s.city,
                accent: s.enquired,
              },
            ]}
            theme={mapTheme}
            focus={{ lat: s.lat, lng: s.lng, zoom: 9 }}
            height={240}
            ariaLabel={`Map of the area around ${s.city}`}
          />
          <p className="ac-detail__accuracy">
            Somewhere in this ring. An IP places somebody to about{" "}
            {CITY_ACCURACY_KM}km, further on mobile networks, so the circle is
            the honest answer and the dot is only its centre.
          </p>
        </div>

        <dl className="ac-facts">
          <Fact k="IP address" v={s.ip} mono />
          <Fact k="Time zone" v={s.timezone} />
          <Fact k="Landed on" v={s.landing} mono />
          <Fact k="Came from" v={s.referrer} />
          <Fact k="Intent" v={INTENT_LABEL[intentOf(s)]} />
          <Fact k="Last seen" v={relativeTime(s.lastSeenAt, now)} />
          <Fact k="Total time" v={formatDuration(totalSeconds(s))} mono />
        </dl>

        <h4 className="ac-detail__sub">Every page, in order</h4>
        <ol className="ac-trail">
          {s.pages.map((page, i) => (
            <li key={`${page.path}-${i}`}>
              <span className="ac-trail__path">{page.path}</span>
              <span className="num ac-trail__t">{formatDuration(page.seconds)}</span>
            </li>
          ))}
        </ol>

        <div className="ac-detail__actions">
          {excluded ? (
            <p className="ac-hint">This address is already excluded from every figure.</p>
          ) : (
            <button type="button" className="ac-exclude" onClick={onExclude}>
              This is me — exclude {s.ip}
            </button>
          )}
          <button type="button" className="ac-chip" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function Fact({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div className="ac-fact">
      <dt className="eyebrow">{k}</dt>
      <dd className={mono ? "num" : undefined}>{v}</dd>
    </div>
  );
}
