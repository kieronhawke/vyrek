"use client";

import { useState } from "react";
import type { Lead } from "@/lib/leads/model";
import { shortPlace } from "@/lib/leads/model";
import { cn } from "@/lib/utils";
import { PLANS } from "@/lib/onboarding/model";
import {
  sendSetupInvite,
  setupBlocker,
  deliveryLine,
  type SetupResult,
} from "@/lib/control/setup-invite";

/** The plan-select value meaning "a price Ben agreed on the call". */
const AGREED = "__agreed";

/**
 * THE LEADS BEN WORKS THROUGH.
 *
 * The middle of the journey, and until now the missing link in it: an
 * enquiry produced an email and a text, and then nothing. If Ben archived
 * the email the lead was gone, and there was no list anywhere showing who
 * had asked and not yet been called.
 *
 * ORDERED BY HOW LONG THEY HAVE BEEN WAITING, because that is the only
 * thing that decides what to do next. Anything past an hour is marked,
 * past a day is marked louder — contact speed is the single biggest lever
 * on whether a lead converts, and a list sorted by anything else hides the
 * one fact that matters.
 *
 * EVERY ROW CARRIES THE WHOLE JOURNEY: call them, open the full request,
 * and — the step this page exists to make possible — send them the account
 * setup link once he has spoken to them. That is the handoff from lead to
 * client, and it is one button.
 */

type Props = { leads: Lead[]; durable: boolean };

function waitedFor(createdISO: string, now: number): { label: string; tone: "ok" | "warn" | "late" } {
  const mins = Math.max(0, Math.round((now - new Date(createdISO).getTime()) / 60000));
  if (mins < 60) return { label: `${mins}m ago`, tone: mins > 15 ? "warn" : "ok" };
  const hours = Math.round(mins / 60);
  if (hours < 24) return { label: `${hours}h ago`, tone: "warn" };
  const days = Math.round(hours / 24);
  return { label: `${days}d ago`, tone: "late" };
}

export function LeadsList({ leads, durable }: Props) {
  // Fixed at first render rather than live: a list where every row's age
  // ticks up under the cursor is distracting, and a minute's precision is
  // more than this decision needs.
  const [now] = useState(() => Date.now());

  if (!durable) {
    return (
      <p className="rounded-lg border border-suth-warning/40 bg-suth-warning/10 px-4 py-3 text-sm text-suth-text">
        <strong className="font-semibold">Leads are not being stored.</strong>{" "}
        The database isn&apos;t configured, so this list stays empty and the
        links in Ben&apos;s texts will 404. The email still goes out with
        everything in it.
      </p>
    );
  }

  if (leads.length === 0) {
    return (
      <p className="text-sm text-suth-text-secondary">
        No enquiries yet. They land here the moment somebody submits the
        consultation form or finishes the quiz.
      </p>
    );
  }

  return (
    <ul role="list" className="space-y-3">
      {leads.map((lead) => (
        <LeadRow key={lead.id} lead={lead} now={now} />
      ))}
    </ul>
  );
}

function LeadRow({ lead, now }: { lead: Lead; now: number }) {
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState<string | null>(null);
  const [result, setResult] = useState<SetupResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Stamped server-side, so it survives a refresh — the old client-only
  // "sent ✓" vanished on reload and Ben couldn't tell who he'd invited.
  const alreadyInvited = Boolean(lead.invitedAtISO);

  const waited = waitedFor(lead.createdISO, now);
  const place = shortPlace(lead);

  /*
   * THE HANDOFF, WITH THE DETAIL IT ACTUALLY NEEDS.
   *
   * This was one button. Ben rang somebody, agreed a price on the call, and
   * then had a control that could only send the standard tiers — so the
   * agreed price lived in his head and got applied by hand later, or not at
   * all.
   *
   * Opening a small form instead costs one tap and buys the two things the
   * call produced: which route they are on, and what he told them it would
   * cost.
   */
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<"full" | "payment">("full");
  const [plan, setPlan] = useState("");
  const [agreed, setAgreed] = useState("");
  const [agreedName, setAgreedName] = useState("");

  const request = {
    name: lead.name,
    email: lead.email ?? "",
    phone: lead.phone ?? "",
    kind,
    plan: plan === AGREED ? undefined : plan || undefined,
    agreedPrice: plan === AGREED ? agreed : undefined,
    agreedName: plan === AGREED ? agreedName : undefined,
    // The lead knows which route they came down; without this the setup
    // link asks a "getting fit" client about their HYROX races.
    rail: /getting fit|beginner/i.test(lead.rail ?? "")
      ? ("beginner" as const)
      : undefined,
    // WHICH ROW THIS CAME FROM. The invite API stamps the lead as invited
    // from this, and that stamp is the only reason "Invited 12/08" and
    // "Send again" survive a refresh. sendSetupInvite still has to forward
    // it — SetupRequest needs `leadId?: string` and the posted body needs
    // `leadId: req.leadId` — until then nothing is stamped.
    leadId: lead.id,
  };
  const blocked = setupBlocker(request);

  const sendSetup = async () => {
    setSending(true);
    setError(null);
    // The shared sender: same request shape, same error wording and same
    // delivery report as the add-a-client panel. The hand-rolled fetch this
    // replaced is what let the two screens drift apart.
    const out = await sendSetupInvite(request);
    setSending(false);
    if (!out.ok) {
      setError(out.message);
      return;
    }
    setResult(out.result);
    setSent(out.result.link);
    setOpen(false);
  };

  return (
    <li className="rounded-xl border border-suth-border bg-suth-elevated p-4">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <p className="text-base font-medium text-suth-text">{lead.name}</p>
          <p className="mt-1 text-sm text-suth-text-secondary">
            {[lead.wants, place].filter(Boolean).join(" · ") || lead.email}
          </p>
        </div>
        <span
          className={cn(
            "shrink-0 rounded-pill px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.16em]",
            waited.tone === "ok" && "text-suth-text-tertiary",
            waited.tone === "warn" && "bg-suth-warning/15 text-suth-warning",
            waited.tone === "late" && "bg-suth-danger/15 text-suth-danger",
          )}
        >
          {waited.label}
        </span>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {lead.phone ? (
          <a
            href={`tel:${lead.phone.replace(/\s+/g, "")}`}
            className="inline-flex h-9 items-center rounded-pill bg-suth-accent px-4 text-xs font-medium text-[#0A0A0A] hover:bg-suth-accent-hover"
          >
            Call {lead.phone}
          </a>
        ) : null}

        <a
          href={`/l/${lead.id}`}
          className="inline-flex h-9 items-center rounded-pill border border-suth-border px-4 text-xs text-suth-text-secondary hover:border-suth-border-strong hover:text-suth-text"
        >
          Full request
        </a>

        {/* THE HANDOFF. Ben rings them, they say yes, and this turns the
            enquiry into a client: it sends the onboarding link by email and
            text, and they set up the account and the card themselves. */}
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          disabled={Boolean(sent)}
          aria-expanded={open}
          className="inline-flex h-9 items-center rounded-pill border border-suth-accent px-4 text-xs font-medium text-suth-accent transition-colors hover:bg-suth-accent hover:text-[#0A0A0A] disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-suth-accent"
        >
          {/* This button now only opens the form — "Sending…" belongs on the
              "Send it" button inside it. "Send again" stays: a row Ben has
              already invited must not look like one he has not. */}
          {sent
            ? "Setup link sent \u2713"
            : open
              ? "Close"
              : alreadyInvited
                ? "Send again"
                : "Send account setup"}
        </button>
        {alreadyInvited && !sent ? (
          <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-suth-text-tertiary">
            Invited {new Date(lead.invitedAtISO!).toLocaleDateString("en-GB")}
          </span>
        ) : null}
      </div>

      {open && !sent ? (
        <div className="mt-4 grid gap-3 rounded-lg border border-suth-border bg-suth-bg/50 p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1">
              <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-suth-text-tertiary">
                What to send
              </span>
              <select
                value={kind}
                onChange={(e) => setKind(e.target.value as "full" | "payment")}
                className="h-9 rounded-md border border-suth-border bg-suth-elevated px-2 text-sm text-suth-text"
              >
                <option value="full">Full setup — questions, then pay</option>
                <option value="payment">Payment only — straight to the plan</option>
              </select>
            </label>

            <label className="grid gap-1">
              <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-suth-text-tertiary">
                Plan
              </span>
              <select
                value={plan}
                onChange={(e) => setPlan(e.target.value)}
                className="h-9 rounded-md border border-suth-border bg-suth-elevated px-2 text-sm text-suth-text"
              >
                <option value="">Let them choose</option>
                {PLANS.map((p) => (
                  <option key={p.key} value={p.key}>
                    {p.name} — {p.display} {p.cadence}
                  </option>
                ))}
                <option value={AGREED}>A price you agreed on the call…</option>
              </select>
            </label>
          </div>

          {/* Only when he says there is one. A money field sitting open on
              every enquiry is a money field somebody eventually types in by
              accident. */}
          {plan === AGREED ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1">
                <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-suth-text-tertiary">
                  Agreed monthly price
                </span>
                <input
                  value={agreed}
                  onChange={(e) => setAgreed(e.target.value)}
                  inputMode="decimal"
                  placeholder="150"
                  className="h-9 rounded-md border border-suth-border bg-suth-elevated px-2 text-sm text-suth-text"
                />
              </label>
              <label className="grid gap-1">
                <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-suth-text-tertiary">
                  Call it (optional)
                </span>
                <input
                  value={agreedName}
                  onChange={(e) => setAgreedName(e.target.value)}
                  placeholder="Your agreed plan"
                  maxLength={40}
                  className="h-9 rounded-md border border-suth-border bg-suth-elevated px-2 text-sm text-suth-text"
                />
              </label>
              <p className="sm:col-span-2 text-xs text-suth-text-tertiary">
                This appears first on their setup link, only on theirs, and it
                is what Stripe charges. The price is signed into the link, so
                they cannot change it.
              </p>
            </div>
          ) : null}

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={sendSetup}
              disabled={sending || Boolean(blocked)}
              className="inline-flex h-9 items-center rounded-pill bg-suth-accent px-4 text-xs font-medium text-[#0A0A0A] hover:bg-suth-accent-hover disabled:opacity-50"
            >
              {sending ? "Sending…" : "Send it"}
            </button>
            {/* Why the button is not lit, rather than a dead control. */}
            {blocked ? (
              <span className="text-xs text-suth-text-tertiary">{blocked}</span>
            ) : null}
          </div>
        </div>
      ) : null}

      {sent && result ? (
        // Shown as well as sent: a delivery failure must never leave Ben
        // without a way to onboard somebody, and a tick over a message that
        // never transmitted would stop him chasing.
        <div aria-live="polite" className="mt-3 grid gap-2">
          <p className="text-xs text-suth-text-secondary">
            {deliveryLine(result)}
            {result.agreedPence
              ? ` Agreed price £${(result.agreedPence / 100).toFixed(2).replace(/\.00$/, "")} a month.`
              : ""}
          </p>
          <p className="break-all rounded-lg border border-suth-accent/40 bg-suth-accent/10 px-3 py-2 font-mono text-[11px] text-suth-text">
            {sent}
          </p>
          {!result.secured ? (
            <p className="text-xs text-suth-danger">
              This link is signed with a development key. Set ONBOARDING_SECRET
              before sending it to a real client.
            </p>
          ) : null}
        </div>
      ) : null}

      {error ? (
        <p role="alert" className="mt-3 text-sm text-suth-danger">
          {error}
        </p>
      ) : null}
    </li>
  );
}
