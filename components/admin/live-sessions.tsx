"use client";

import { useEffect, useState } from "react";
import { Card, Badge, Stat } from "@/components/admin/ui";

type Session = {
  id: string;
  path: string;
  country: string | null;
  customer_email: string | null;
  user_agent: string | null;
  referrer: string | null;
  started_at: string;
  last_seen: string;
};

const POLL_MS = 5_000;

export function LiveSessions({ initial }: { initial: Session[] }) {
  const [sessions, setSessions] = useState<Session[]>(initial);
  const [stale, setStale] = useState(false);
  const [pulseTick, setPulseTick] = useState(0);
  // `now` is read during render to compute session ages. It's set on each
  // poll tick (so ages refresh) and on a 1s timer (so a session that's been
  // idle for 30s shows the right number even between fetches). Keeping it
  // in state makes render pure and lets React 19's purity lint pass.
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    let cancelled = false;
    let timer: number | null = null;

    const tick = async () => {
      try {
        const res = await fetch("/api/admin/live", {
          cache: "no-store",
          credentials: "same-origin",
        });
        if (!res.ok) {
          if (!cancelled) setStale(true);
          return;
        }
        const data = (await res.json()) as {
          ok?: boolean;
          sessions?: Session[];
        };
        if (cancelled) return;
        if (data.ok && Array.isArray(data.sessions)) {
          setSessions(data.sessions);
          setStale(false);
          setPulseTick((n) => n + 1);
        }
      } catch {
        if (!cancelled) setStale(true);
      }
    };

    timer = window.setInterval(tick, POLL_MS);
    return () => {
      cancelled = true;
      if (timer !== null) window.clearInterval(timer);
    };
  }, []);

  const total = sessions.length;
  const signedIn = sessions.filter((s) => s.customer_email).length;

  // Page distribution (top 12)
  const byPath = new Map<string, number>();
  for (const s of sessions) byPath.set(s.path, (byPath.get(s.path) ?? 0) + 1);
  const topPaths = Array.from(byPath.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12);

  // Country distribution
  const byCountry = new Map<string, number>();
  for (const s of sessions) {
    const c = s.country ?? "??";
    byCountry.set(c, (byCountry.get(c) ?? 0) + 1);
  }
  const topCountries = Array.from(byCountry.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  return (
    <div className="space-y-8">
      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat
          label="Active now"
          value={total.toString()}
          hint={stale ? "Live data stale" : "Last 60 seconds"}
        />
        <Stat
          label="Signed in"
          value={signedIn.toString()}
          hint={`${total - signedIn} anonymous`}
        />
        <Stat
          label="Distinct paths"
          value={byPath.size.toString()}
        />
        <Stat label="Countries" value={byCountry.size.toString()} />
      </section>

      <section className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <Card>
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-vyrek-text-tertiary">
            Top pages right now
          </p>
          {topPaths.length === 0 ? (
            <p className="mt-3 text-sm text-vyrek-text-tertiary">
              Nobody on the site in the last 60 seconds. Open vyrek.com in a
              second tab to populate this list.
            </p>
          ) : (
            <ul role="list" className="mt-4 space-y-2">
              {topPaths.map(([path, count]) => (
                <li
                  key={path}
                  className="flex items-center justify-between gap-3 rounded-md border border-vyrek-border-subtle bg-vyrek-elevated/60 px-3 py-2"
                >
                  <span className="truncate font-mono text-xs text-vyrek-text">
                    {path}
                  </span>
                  <span className="shrink-0 font-mono text-xs tabular-nums text-vyrek-accent">
                    {count}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-vyrek-text-tertiary">
            Top countries
          </p>
          {topCountries.length === 0 ? (
            <p className="mt-3 text-sm text-vyrek-text-tertiary">
              No country data yet.
            </p>
          ) : (
            <ul role="list" className="mt-4 grid grid-cols-2 gap-2">
              {topCountries.map(([country, count]) => (
                <li
                  key={country}
                  className="flex items-center justify-between gap-3 rounded-md border border-vyrek-border-subtle bg-vyrek-elevated/60 px-3 py-2"
                >
                  <span className="font-mono text-xs uppercase text-vyrek-text">
                    {country}
                  </span>
                  <span className="font-mono text-xs tabular-nums text-vyrek-accent">
                    {count}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>

      <section>
        <header className="mb-3 flex items-center justify-between">
          <h2 className="font-mono text-[11px] uppercase tracking-[0.22em] text-vyrek-text-tertiary">
            Active sessions ({total})
          </h2>
          <div className="flex items-center gap-2">
            <span
              className="inline-block size-2 rounded-full bg-emerald-400"
              style={{
                animation: `pulse-${pulseTick} 600ms ease-out 1`,
                boxShadow: "0 0 0 0 rgba(52,211,153,0.6)",
              }}
              aria-hidden
            />
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-vyrek-text-tertiary">
              {stale ? "stale" : "live · poll 5s"}
            </span>
          </div>
        </header>
        {sessions.length === 0 ? (
          <Card>
            <p className="text-sm text-vyrek-text-tertiary">
              No live sessions right now. Open vyrek.com in another tab and
              this list will populate within 5 seconds.
            </p>
          </Card>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-vyrek-border-subtle">
            <table className="w-full border-collapse text-sm">
              <thead className="bg-vyrek-elevated">
                <tr>
                  <Th>Path</Th>
                  <Th>Who</Th>
                  <Th>Country</Th>
                  <Th>Started</Th>
                  <Th>Last seen</Th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((s) => {
                  const ageS = Math.round(
                    (now - new Date(s.last_seen).getTime()) / 1000,
                  );
                  const sessAgeS = Math.round(
                    (now - new Date(s.started_at).getTime()) / 1000,
                  );
                  return (
                    <tr
                      key={s.id}
                      className="border-b border-vyrek-border-subtle last:border-b-0 hover:bg-vyrek-elevated/60"
                    >
                      <Td>
                        <span className="font-mono text-xs text-vyrek-text">
                          {s.path}
                        </span>
                      </Td>
                      <Td>
                        {s.customer_email ? (
                          <span className="text-vyrek-text">
                            {s.customer_email}
                          </span>
                        ) : (
                          <span className="font-mono text-xs text-vyrek-text-tertiary">
                            anon · {s.id.slice(0, 8)}
                          </span>
                        )}
                      </Td>
                      <Td>
                        <span className="font-mono text-xs uppercase text-vyrek-text-secondary">
                          {s.country ?? "-"}
                        </span>
                      </Td>
                      <Td>
                        <span className="font-mono text-xs text-vyrek-text-secondary">
                          {fmtAge(sessAgeS)}
                        </span>
                      </Td>
                      <Td>
                        <span className="font-mono text-xs text-vyrek-text-secondary">
                          {fmtAge(ageS)} ago
                        </span>
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function fmtAge(secs: number): string {
  if (secs < 60) return `${secs}s`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h${mins % 60}m`;
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="border-b border-vyrek-border-subtle px-4 py-3 text-left font-mono text-[10px] uppercase tracking-[0.18em] text-vyrek-text-tertiary">
      {children}
    </th>
  );
}

function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-4 py-3 align-middle">{children}</td>;
}
