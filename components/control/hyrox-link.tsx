"use client";

import { useEffect, useState } from "react";
import { formatSeconds } from "@/lib/results/types";

/**
 * LINK A CLIENT TO THEIR REAL RACE HISTORY.
 *
 * The results engine is live and holds real HYROX results. A coaching client
 * almost certainly appears in it, and their actual splits are more useful to
 * Ben than anything they will type into a form — it is the difference between
 * "she says the sled is slow" and "her sled push is 41 seconds off the
 * division median".
 *
 * SEARCHED AND CHOSEN, NEVER GUESSED FROM THE NAME. Two people genuinely
 * share a name, and attaching the wrong race history to a client is worse than
 * showing none: it would put someone else's times into the plan Ben writes.
 * So the link is an explicit act, it shows what it matched, and it can be
 * broken again.
 *
 * Reads our own API, which reads our own database. There is no path from here
 * to hyrox.com, so a client profile keeps working when the source is down.
 */

type Found = { slug: string; name: string; countryIso?: string; raceCount?: number };

type Race = {
  eventSlug: string;
  eventCity?: string;
  year?: number;
  divisionLabel?: string;
  division?: string;
  finishSeconds: number;
  rank?: number;
  ageGroupRank?: number;
};

type Profile = {
  name?: string;
  ageGroup?: string;
  pbSeconds?: number;
  races?: Race[];
} | null;

export function HyroxLink({
  slug,
  name,
  onLink,
}: {
  slug: string | null;
  /** The client's name, used only to prefill the search box. */
  name: string;
  onLink: (slug: string | null) => void;
}) {
  const [query, setQuery] = useState(name);
  const [found, setFound] = useState<Found[] | null>(null);
  const [searching, setSearching] = useState(false);
  /**
   * The fetched profile, tagged with the slug it belongs to.
   *
   * Not cleared in the effect body — setting state synchronously inside an
   * effect cascades renders, which this repo lints against. Tagging is better
   * anyway: it makes it impossible to show the previous athlete's races for a
   * frame after re-linking, which is the failure that would matter.
   */
  const [loaded, setLoaded] = useState<{
    slug: string;
    data: Profile;
    error: string | null;
  } | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    let live = true;
    fetch(`/api/results/v1/athlete/${encodeURIComponent(slug)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d) => live && setLoaded({ slug, data: d?.data ?? d, error: null }))
      .catch(() => {
        if (!live) return;
        // Said plainly rather than rendered as an empty history, which would
        // read as "this athlete has never raced".
        setLoaded({
          slug,
          data: null,
          error: "Could not reach the results database just now.",
        });
      });
    return () => {
      live = false;
    };
  }, [slug]);

  const current = loaded?.slug === slug ? loaded : null;
  const profile = current?.data ?? null;
  const error = current?.error ?? null;

  async function search() {
    const q = query.trim();
    if (q.length < 2) return;
    setSearching(true);
    setSearchError(null);
    try {
      const res = await fetch(`/api/results/v1/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      // v1 wraps its payload in `data`; the older /api/results/search is
      // backed by the demo source and returns nothing in production.
      setFound(((data?.data ?? data)?.athletes ?? []).slice(0, 8));
    } catch {
      setSearchError("Search is unavailable.");
      setFound([]);
    } finally {
      setSearching(false);
    }
  }

  if (!slug) {
    return (
      <div className="cp-hyrox">
        <p className="cp-hint">
          Not linked. Search the results database to attach their real race
          history — splits, finishes and how they sit in their division.
        </p>
        <div className="cp-search">
          <label className="sr-only" htmlFor="hx-q">
            Search athletes
          </label>
          <input
            id="hx-q"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                search();
              }
            }}
            placeholder="Search by name"
            className="cp-input"
          />
          <button type="button" className="cp-btn" onClick={search} disabled={searching}>
            {searching ? "Searching…" : "Search"}
          </button>
        </div>

        {searchError ? <p className="cp-error">{searchError}</p> : null}

        {found?.length ? (
          <ul className="cp-found">
            {found.map((a) => (
              <li key={a.slug}>
                <button type="button" className="cp-found__item" onClick={() => onLink(a.slug)}>
                  <span className="cp-found__name">{a.name}</span>
                  <span className="cp-found__meta num">
                    {a.countryIso ? `${a.countryIso} · ` : ""}
                    {a.raceCount ? `${a.raceCount} race${a.raceCount === 1 ? "" : "s"}` : "—"}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : found ? (
          <p className="cp-hint">
            No athlete of that name in the database. They may not have raced
            yet, or may be recorded under a different spelling.
          </p>
        ) : null}
      </div>
    );
  }

  const races = profile?.races ?? [];

  return (
    <div className="cp-hyrox">
      <div className="cp-linked">
        <span>
          Linked to <strong>{profile?.name ?? slug}</strong>
          {profile?.pbSeconds ? (
            <span className="num cp-found__meta">
              {" "}
              · PB {formatSeconds(profile.pbSeconds)}
            </span>
          ) : null}
        </span>
        <button type="button" className="cp-btn cp-btn--quiet" onClick={() => onLink(null)}>
          Unlink
        </button>
      </div>

      {error ? <p className="cp-error">{error}</p> : null}

      {!profile && !error ? <p className="cp-hint">Loading race history…</p> : null}

      {profile && races.length === 0 ? (
        <p className="cp-hint">No races recorded against this athlete yet.</p>
      ) : null}

      {races.length ? (
        <div className="cp-races">
          <table className="cp-table">
            <caption className="sr-only">Race history</caption>
            <thead>
              <tr>
                <th scope="col">Race</th>
                <th scope="col">Division</th>
                <th scope="col">Finish</th>
                <th scope="col">Place</th>
                <th scope="col">Age group</th>
              </tr>
            </thead>
            <tbody>
              {races.slice(0, 8).map((r, i) => (
                <tr key={`${r.eventSlug}-${i}`}>
                  <td>
                    {r.eventCity ?? r.eventSlug.replace(/-/g, " ")}
                    {r.year ? <span className="num"> {r.year}</span> : null}
                  </td>
                  <td>{r.divisionLabel ?? r.division ?? "—"}</td>
                  <td className="num">{formatSeconds(r.finishSeconds)}</td>
                  <td className="num">{r.rank || "—"}</td>
                  <td className="num">{r.ageGroupRank || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {races.length > 8 ? (
            <p className="cp-hint">Showing the 8 most recent of {races.length}.</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
