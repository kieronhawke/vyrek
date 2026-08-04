"use client";

import { useEffect, useMemo, useState } from "react";
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
import {
  pendingClients,
  waitingLabel,
  type PendingClient,
} from "@/lib/control/pending-clients";
import type { LeadRecord } from "@/lib/control/lead-record";
import type { CoachClient } from "@/lib/control/fixtures";

/** The key the lead pipeline persists to. Read, never written, from here. */
const LEADS_KEY = "control.leads.v2";

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
export function ClientHub({
  base,
  lens: initialLens = "all",
  seedLeads: seeded = [],
  nowISO,
}: {
  base: string;
  lens?: Lens;
  /** The pipeline as the server sees it, so the pending list renders there. */
  seedLeads?: LeadRecord[];
  nowISO: string;
}) {
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

  /*
   * The people mid-signup come from the lead pipeline, which persists to the
   * browser. The server renders the seed so the section is there on first
   * paint; anything Ben has actually done to a lead replaces it after mount.
   *
   * Read-only on purpose. Two screens writing one list is how they end up
   * disagreeing, and the pipeline is where a lead is worked.
   */
  const [leads, setLeads] = useState<LeadRecord[]>(seeded);
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(LEADS_KEY);
      const stored = raw ? (JSON.parse(raw) as LeadRecord[]) : null;
      if (stored?.length) setLeads(stored);
    } catch {
      /* storage blocked; the server's seed still rendered */
    }
  }, []);

  const pending = useMemo(
    () => pendingClients(leads, new Date(nowISO)),
    [leads, nowISO],
  );

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

      {/* The handover, made visible. These are not clients yet — no tier, no
          plan, no payment — so they sit above the roster rather than inside
          it, and none of the counts that mean money include them. */}
      {pending.length > 0 && lens === "all" && !q && (
        <section className="ch-pending" aria-label="Signing up">
          <h3 className="ch-pending__title">
            {pending.length} signing up
          </h3>
          <ul className="ch-pending__list" role="list">
            {pending.map((p) => (
              <PendingCard key={p.id} pending={p} base={base} />
            ))}
          </ul>
        </section>
      )}

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

/**
 * Somebody who has been invited and not finished.
 *
 * Deliberately plainer than a client card: there is nothing to report about
 * them except how long it has been, because nothing else exists yet. The one
 * number is the one that matters — past five days the automatic chasing has
 * run out and it is Ben's turn.
 */
function PendingCard({ pending: p, base }: { pending: PendingClient; base: string }) {
  return (
    <li className="ch-pcard" data-stuck={p.stuck || undefined}>
      <Link href={`${base}/leads`} className="ch-pcard__link">
        <span className="ch-pcard__name">{p.name}</span>
        <span className="ch-pcard__wait">{waitingLabel(p)}</span>
        {p.calledOn && <span className="ch-pcard__call">Spoke {p.calledOn}</span>}
        {p.stuck && (
          <span className="ch-pcard__stuck">
            Chasing has run out. Worth a line from you.
          </span>
        )}
      </Link>
    </li>
  );
}
