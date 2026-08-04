"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { listCoachClients } from "@/lib/control/fixtures";
import {
  TIER_LABEL,
  TIER_ORDER,
  clientLenses,
  matchesLens,
  nextDeadline,
  paymentTone,
  type Lens,
} from "@/lib/control/client-hub";
import type { CoachClient } from "@/lib/control/fixtures";

/**
 * One client hub, replacing two screens that read the same data.
 *
 * /clients rendered CLIENTS as an editable list; /tracker rendered the same
 * CLIENTS grouped by tier and sorted by who needs a plan. Two lenses on one
 * dataset, presented as two destinations, which is why it was never obvious
 * which one to open.
 *
 * This is the dataset once, with the lens as a filter. "Needs a plan" is the
 * tracker, and it is now a chip rather than a page.
 *
 * BOARD FIRST
 *
 * Small cards, scannable, one glance each: who, which tier, what is due, and
 * whether the money is fine. The table is still there behind a toggle for
 * when you want to sort or export the lot, but the default answers the
 * question Ben actually opens this with, which is "who needs me today".
 */
export function ClientHub({ base, lens: initialLens = "all" }: { base: string; lens?: Lens }) {
  /*
   * The roster is a plain import, so it renders on the server. It used to be
   * loaded in an effect, which meant the first paint was an empty board even
   * once the Suspense boundary was gone.
   */
  const clients = useMemo(() => listCoachClients(), []);
  /* The starting lens comes from the query, resolved on the server. /tracker
     redirects here with ?lens=needs_plan so the page it replaced still lands
     on the view it existed to show. */
  const [lens, setLens] = useState<Lens>(initialLens);
  const [view, setView] = useState<"board" | "table">("board");
  const [q, setQ] = useState("");

  const lenses = useMemo(() => clientLenses(clients), [clients]);

  const shown = useMemo(() => {
    const term = q.trim().toLowerCase();
    return clients
      .filter((c) => matchesLens(c, lens))
      .filter((c) => !term || c.name.toLowerCase().includes(term))
      .sort((a, b) => a.programmedUntilDays - b.programmedUntilDays);
  }, [clients, lens, q]);

  return (
    <div className="ch">
      <div className="ch-controls">
        <div className="ch-lenses" role="group" aria-label="Filter clients">
          {lenses.map((l) => (
            <button
              key={l.key}
              type="button"
              className="ch-lens"
              aria-pressed={lens === l.key}
              onClick={() => setLens(l.key)}
              data-tone={l.tone}
            >
              {l.label}
              <span className="ch-lens__n">{l.count}</span>
            </button>
          ))}
        </div>

        <div className="ch-tools">
          <input
            className="ch-search"
            type="search"
            placeholder="Find a client"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Find a client"
          />
          <div className="ch-view" role="group" aria-label="View">
            <button
              type="button"
              className="ch-view__btn"
              aria-pressed={view === "board"}
              onClick={() => setView("board")}
            >
              Board
            </button>
            <button
              type="button"
              className="ch-view__btn"
              aria-pressed={view === "table"}
              onClick={() => setView("table")}
            >
              Table
            </button>
          </div>
        </div>
      </div>

      {shown.length === 0 ? (
        <p className="ch-empty">
          {q ? `Nobody matching "${q}".` : "Nobody in this view."}
        </p>
      ) : view === "board" ? (
        <ul className="ch-board" role="list">
          {shown.map((c) => (
            <ClientCard key={c.id} client={c} base={base} />
          ))}
        </ul>
      ) : (
        <ClientTable clients={shown} base={base} />
      )}
    </div>
  );
}

function ClientCard({ client: c, base }: { client: CoachClient; base: string }) {
  const deadline = nextDeadline(c);
  const tone = paymentTone(c.payment);
  return (
    <li className="ch-card" data-urgent={deadline.urgent || undefined}>
      <Link href={`${base}/clients/${c.id}`} className="ch-card__link">
        <div className="ch-card__top">
          <span className="ch-card__name">{c.name}</span>
          <span className="ch-card__tier">{TIER_LABEL[c.tier]}</span>
        </div>

        {/* The one line that decides whether Ben opens this card today. */}
        <p className="ch-card__deadline" data-urgent={deadline.urgent || undefined}>
          {deadline.label}
        </p>

        <div className="ch-card__foot">
          <span className="ch-pay" data-tone={tone}>
            {c.paymentLabel}
          </span>
          {c.nextRace ? (
            <span className="ch-card__race">
              {c.nextRace.name} · {c.nextRace.inDays}d
            </span>
          ) : null}
        </div>

        {c.flags.length ? (
          <p className="ch-card__flag">{c.flags[0]}</p>
        ) : null}
      </Link>
    </li>
  );
}

function ClientTable({ clients, base }: { clients: CoachClient[]; base: string }) {
  return (
    <div className="ch-tablewrap">
      <table className="ch-table">
        <thead>
          <tr>
            <th>Client</th>
            <th>Tier</th>
            <th>Programmed until</th>
            <th>Payment</th>
            <th>Next race</th>
          </tr>
        </thead>
        <tbody>
          {clients.map((c) => {
            const d = nextDeadline(c);
            return (
              <tr key={c.id}>
                <td>
                  <Link href={`${base}/clients/${c.id}`}>{c.name}</Link>
                </td>
                <td>{TIER_LABEL[c.tier]}</td>
                <td data-urgent={d.urgent || undefined}>{d.label}</td>
                <td>
                  <span className="ch-pay" data-tone={paymentTone(c.payment)}>
                    {c.paymentLabel}
                  </span>
                </td>
                <td>{c.nextRace ? `${c.nextRace.name} · ${c.nextRace.inDays}d` : "—"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export { TIER_ORDER };
