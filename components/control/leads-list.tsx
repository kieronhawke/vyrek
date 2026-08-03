"use client";

import { useState } from "react";
import type { Lead } from "@/lib/leads/model";
import { shortPlace } from "@/lib/leads/model";
import { cn } from "@/lib/utils";

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
        UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN aren&apos;t set, so
        this list is empty on every restart and the links in Ben&apos;s texts
        will 404. The email still goes out with everything in it.
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
  const [error, setError] = useState<string | null>(null);

  const waited = waitedFor(lead.createdISO, now);
  const place = shortPlace(lead);

  const sendSetup = async () => {
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/onboarding/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: lead.name,
          email: lead.email,
          phone: lead.phone ?? "",
          kind: "full",
          // The lead knows which route they came down; without this the
          // setup link asks a "getting fit" client about their HYROX races.
          rail: /getting fit|beginner/i.test(lead.rail ?? "") ? "beginner" : undefined,
        }),
      });
      const d = (await res.json()) as { link?: string; error?: string };
      if (!res.ok || !d.link) {
        setError(d.error ?? "Couldn't send the setup link.");
        return;
      }
      setSent(d.link);
    } catch {
      setError("Couldn't reach the server.");
    } finally {
      setSending(false);
    }
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
          onClick={sendSetup}
          disabled={sending || Boolean(sent)}
          className="inline-flex h-9 items-center rounded-pill border border-suth-accent px-4 text-xs font-medium text-suth-accent transition-colors hover:bg-suth-accent hover:text-[#0A0A0A] disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-suth-accent"
        >
          {sending ? "Sending…" : sent ? "Setup link sent ✓" : "Send account setup"}
        </button>
      </div>

      {sent ? (
        // Shown as well as sent: a delivery failure must never leave Ben
        // without a way to onboard somebody.
        <p
          aria-live="polite"
          className="mt-3 break-all rounded-lg border border-suth-accent/40 bg-suth-accent/10 px-3 py-2 font-mono text-[11px] text-suth-text"
        >
          {sent}
        </p>
      ) : null}

      {error ? (
        <p role="alert" className="mt-3 text-sm text-suth-danger">
          {error}
        </p>
      ) : null}
    </li>
  );
}
