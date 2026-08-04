"use client";

import { WORLD_PATHS } from "@/lib/control/world-paths";
import { useMemo, useState } from "react";
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
        <div className="ac-geo">
          <GeoPlot sessions={counted} onPick={(id) => setOpen(id)} />
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
          Pins are plotted by latitude and longitude. Tap a pin or a country
          to filter the table below.
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
 * A world map.
 *
 * Equirectangular latitude and longitude, with a pin per city sized by how
 * many sessions came from it.
 *
 * This was a bare graticule, and the reasoning for that was sound: "a
 * hand-drawn world silhouette at this size would be a worse lie than an
 * honest grid". The objection was to drawing coastlines by eye, not to
 * having them. It now renders Natural Earth 1:110m outlines from
 * lib/control/world-paths.ts, which are surveyed rather than sketched, so
 * a pin at 51°N reads as Britain instead of as a dot in empty space.
 *
 * Named GeoPlot rather than Map because a component called `Map` shadows the
 * global `Map` constructor inside its own body, and `new Map()` then resolves
 * to the component. TypeScript caught it; at runtime it would have been a
 * blank panel with no error.
 */
function GeoPlot({
  sessions,
  onPick,
}: {
  sessions: Session[];
  onPick: (id: string) => void;
}) {
  const cities = useMemo(() => {
    const map = new Map<string, { lat: number; lng: number; city: string; n: number; id: string; enquiries: number }>();
    for (const s of sessions) {
      const key = `${s.lat},${s.lng}`;
      const row = map.get(key) ?? {
        lat: s.lat,
        lng: s.lng,
        city: s.city,
        n: 0,
        id: s.id,
        enquiries: 0,
      };
      row.n++;
      if (s.enquired) row.enquiries++;
      map.set(key, row);
    }
    return [...map.values()];
  }, [sessions]);

  const most = Math.max(1, ...cities.map((c) => c.n));

  return (
    <div className="ac-map">
      <svg viewBox="0 0 360 180" className="ac-map__svg" role="img" aria-label="Sessions by location">
        {/* Land first, so the pins sit on top of it. This was a bare grid
            with dots floating on it, which told you a session came from
            somewhere at 51°N but not that the somewhere was Britain. */}
        <g className="ac-map__land">
          {WORLD_PATHS.map((d, i) => (
            <path key={i} d={d} />
          ))}
        </g>
        {/* Graticule every 30°, over the land but under the pins. */}
        {[30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((x) => (
          <line key={`v${x}`} x1={x} y1={0} x2={x} y2={180} className="ac-map__grid" />
        ))}
        {[30, 60, 90, 120, 150].map((y) => (
          <line key={`h${y}`} x1={0} y1={y} x2={360} y2={y} className="ac-map__grid" />
        ))}
        <line x1={0} y1={90} x2={360} y2={90} className="ac-map__equator" />
        <line x1={180} y1={0} x2={180} y2={180} className="ac-map__equator" />

        {cities.map((c) => {
          const p = project(c.lat, c.lng);
          const r = 2 + (c.n / most) * 5;
          return (
            <g key={`${c.lat},${c.lng}`}>
              <circle
                cx={p.x * 360}
                cy={p.y * 180}
                r={r + 4}
                className="ac-map__halo"
                data-enquiry={c.enquiries > 0 || undefined}
              />
              <circle
                cx={p.x * 360}
                cy={p.y * 180}
                r={r}
                className="ac-map__pin"
                data-enquiry={c.enquiries > 0 || undefined}
              >
                {/* One string child, not several. React splits multi-child
                    text with comment markers and a <title> reconciles
                    differently from a normal element, which showed up as a
                    hydration mismatch that discarded the whole tree. */}
                <title>{`${c.city} — ${c.n} session${c.n === 1 ? "" : "s"}${
                  c.enquiries ? `, ${c.enquiries} enquiry` : ""
                }`}</title>
              </circle>
            </g>
          );
        })}
      </svg>
      <ul className="ac-map__key">
        {cities
          .slice()
          .sort((a, b) => b.n - a.n)
          .slice(0, 5)
          .map((c) => (
            <li key={c.city + c.lat}>
              <button type="button" className="ac-map__city" onClick={() => onPick(c.id)}>
                {c.city} <span className="num">{c.n}</span>
              </button>
            </li>
          ))}
      </ul>
    </div>
  );
}

function Detail({
  session: s,
  now,
  excluded,
  onExclude,
  onClose,
}: {
  session: Session;
  now: string;
  excluded: boolean;
  onExclude: () => void;
  onClose: () => void;
}) {
  const p = project(s.lat, s.lng);
  return (
    <div className="ac-detail" role="dialog" aria-modal="true" aria-label="Session detail">
      <button type="button" className="ac-detail__scrim" aria-label="Close" onClick={onClose} />
      <div className="ac-detail__panel">
        <div className="ac-detail__grip" aria-hidden />
        <h3 className="ac-detail__title">
          <span aria-hidden>{flag(s.countryIso) ?? "•"}</span> {s.city}, {s.country}
        </h3>

        <svg viewBox="0 0 360 180" className="ac-detail__map" role="img" aria-label={`Location of ${s.city}`}>
          {[60, 120, 180, 240, 300].map((x) => (
            <line key={x} x1={x} y1={0} x2={x} y2={180} className="ac-map__grid" />
          ))}
          {[45, 90, 135].map((y) => (
            <line key={y} x1={0} y1={y} x2={360} y2={y} className="ac-map__grid" />
          ))}
          <circle cx={p.x * 360} cy={p.y * 180} r={10} className="ac-map__halo" data-enquiry />
          <circle cx={p.x * 360} cy={p.y * 180} r={4} className="ac-map__pin" data-enquiry />
        </svg>

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
