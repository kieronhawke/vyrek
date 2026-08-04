"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useCelebration } from "@/components/control/celebrate";
import { formatBookingTime } from "@/lib/booking/model";
import { seedLeads } from "@/lib/control/lead-seed";
import {
  CLOSE_REASONS,
  CLOSE_REASON_LABEL,
  awaitingOutcome,
  callState,
  closeLead,
  isAbandoned,
  isTerminal,
  leadCounts,
  logEvent,
  moveTo,
  needsPersonalMessage,
  pendingAutomations,
  sendQueue,
  sortLeads,
  sortTimeline,
  type CloseReason,
  type CommsEvent,
  type LeadRecord,
} from "@/lib/control/lead-record";
import {
  applyAction,
  isFork,
  nextActions,
  otherActions,
  primaryAction,
  STAGE_LABEL,
  STAGE_ORDER,
  type LeadEffect,
  type LeadStage,
} from "@/lib/control/lead-workflow";
import { OnboardingCompose } from "@/components/control/onboarding-compose";

/**
 * THE LEAD PIPELINE.
 *
 * The version before this rendered, per lead: a progress rail, a "what to do
 * here and why" panel, a "move to any stage" row of ten buttons, and every
 * action the stage offered. Seven or eight controls on a card, times a dozen
 * cards. Ben's note on it was that there were lots of buttons, which is the
 * politest possible way of saying it was unusable.
 *
 * So this asks one question per lead and offers one answer. The alternatives,
 * the stage override and closing all moved behind Edit — still one click away,
 * no longer competing with the thing he should actually do.
 *
 * WHAT THE CARD SHOWS, IN ORDER
 *  1. Who, and what state they are in.
 *  2. Their call: when it is, or that it has been and gone unrecorded.
 *  3. The one button.
 *  4. What has already been said to them, and what will send itself next.
 *
 * Numbers 2 and 4 are new because they were the actual complaint underneath
 * the buttons: he could not tell whether a lead had been contacted, so he
 * either texted them twice or not at all.
 *
 * State persists to localStorage. There is no leads table yet and the screen
 * says so, because a demo where the buttons do nothing teaches the operator
 * that the buttons are fake.
 */

const STORAGE_KEY = "control.leads.v2";

/** What an effect did, as a receipt. Nothing happens invisibly. */
function describe(e: LeadEffect, lead: LeadRecord): string {
  switch (e.kind) {
    case "sms":
      return e.template === "first-contact"
        ? `Text sent to ${lead.phone}`
        : `Follow-up text sent to ${lead.phone}`;
    case "email":
      return `Onboarding invite emailed to ${lead.email}`;
    case "reminder":
      return `Reminder set for ${e.inDays} days`;
    case "celebrate":
      return "";
  }
}

/** "in 3 hours", "2 days ago" — a duration as a person says it. */
function relative(iso: string, now: Date): string {
  const mins = Math.round((new Date(iso).getTime() - now.getTime()) / 60_000);
  const ahead = mins >= 0;
  const n = Math.abs(mins);
  const say =
    n < 60
      ? `${n} min`
      : n < 60 * 48
        ? `${Math.round(n / 60)} hour${Math.round(n / 60) === 1 ? "" : "s"}`
        : `${Math.round(n / 1440)} days`;
  return ahead ? `in ${say}` : `${say} ago`;
}

export function LeadPipeline({ nowISO }: { nowISO: string }) {
  /*
   * `now` comes from the server, once, as a prop.
   *
   * The first version read the browser clock in an effect, which meant the
   * server rendered nothing but "Loading the pipeline" and the operator saw a
   * blank screen flash on every visit. Reading it during render instead would
   * make the server and the browser disagree and break hydration, because
   * every relative time on this screen is derived from it.
   *
   * So the page resolves the instant per request and passes it down. Both
   * sides render the same markup from the same moment, and a value that does
   * not change mid-session also stops the sort jumping under the pointer.
   */
  const now = useMemo(() => new Date(nowISO), [nowISO]);
  /* The seed renders on the server; anything saved in this browser replaces
     it after mount, which is the same swap the rest of the console makes. */
  const [leads, setLeads] = useState<LeadRecord[]>(() => seedLeads(new Date(nowISO)));
  const [openId, setOpenId] = useState<string | null>(null);
  const [receipts, setReceipts] = useState<{ id: string; text: string }[]>([]);
  const [showClosed, setShowClosed] = useState(false);
  const { celebrate, Canvas } = useCelebration();

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      const stored = raw ? (JSON.parse(raw) as LeadRecord[]) : null;
      if (stored?.length) setLeads(stored);
    } catch {
      /* storage blocked; the seed already rendered */
    }
  }, []);

  const persist = useCallback((next: LeadRecord[]) => {
    setLeads(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* storage blocked; the in-memory value still updated */
    }
  }, []);

  const counts = useMemo(() => leadCounts(leads, now), [leads, now]);

  /* Confetti for a lead nobody has touched, once per set, after hydration so
     the server and client markup still match. No sound: opening a page should
     never make a noise. */
  const untouched = useMemo(
    () => leads.filter((l) => l.stage === "new").map((l) => l.id).join(","),
    [leads],
  );
  useEffect(() => {
    if (!untouched) return;
    if (window.sessionStorage.getItem("control.leadConfetti") === untouched) return;
    window.sessionStorage.setItem("control.leadConfetti", untouched);
    celebrate("lead", { sound: false });
  }, [now, untouched, celebrate]);

  const receipt = (texts: string[], key: string) => {
    if (!texts.length) return;
    const stamp = `${key}-${texts.join("|").length}`;
    setReceipts((r) => [...r, ...texts.map((text, i) => ({ id: `${stamp}-${i}`, text }))]);
    setTimeout(() => setReceipts((r) => r.filter((x) => !x.id.startsWith(stamp))), 4200);
  };

  const act = (lead: LeadRecord, actionId: string) => {
    const { stage, effects } = applyAction(lead.stage, actionId);
    const action = nextActions(lead.stage).find((a) => a.id === actionId);

    let next = moveTo(lead, stage, now);
    // Whatever the action sent goes on the record, so the timeline is the
    // truth about this lead rather than a parallel story.
    for (const e of effects) {
      if (e.kind === "sms" || e.kind === "email") {
        next = logEvent(next, {
          atISO: now.toISOString(),
          kind: e.kind,
          body: action?.label ?? "Message sent",
        });
      }
    }
    persist(leads.map((l) => (l.id === lead.id ? next : l)));

    receipt(effects.map((e) => describe(e, lead)).filter(Boolean), lead.id);
    if (effects.some((e) => e.kind === "celebrate")) celebrate("client");
  };

  const patch = (lead: LeadRecord, next: LeadRecord) =>
    persist(leads.map((l) => (l.id === lead.id ? next : l)));

  const ordered = sortLeads(leads, now);
  const open = ordered.filter((l) => !isTerminal(l.stage));
  const closed = ordered.filter((l) => isTerminal(l.stage));

  return (
    <>
      <Canvas />

      <div className="lp-summary">
        <span>
          <strong>{counts.needsYou}</strong> need you
        </span>
        <span>
          <strong>{counts.waitingOnThem}</strong> waiting on them
        </span>
        <span data-tone={counts.abandoned ? "warn" : undefined}>
          <strong>{counts.abandoned}</strong> gone quiet
        </span>
        <button
          type="button"
          className="lp-reset"
          onClick={() => {
            persist(seedLeads(now));
            window.sessionStorage.removeItem("control.leadConfetti");
          }}
        >
          Reset pipeline
        </button>
      </div>

      <SendQueue leads={leads} now={now} />

      <ul className="lp-list" role="list">
        {open.map((lead) => (
          <LeadCard
            key={lead.id}
            lead={lead}
            now={now}
            open={openId === lead.id}
            onToggle={() => setOpenId(openId === lead.id ? null : lead.id)}
            onAct={(id) => act(lead, id)}
            onPatch={(next) => patch(lead, next)}
          />
        ))}
      </ul>

      {closed.length > 0 && (
        <div className="lp-closed">
          <button
            type="button"
            className="lp-closed__toggle"
            aria-expanded={showClosed}
            onClick={() => setShowClosed(!showClosed)}
          >
            {showClosed ? "Hide" : "Show"} {closed.length} finished
          </button>
          {showClosed && (
            <ul className="lp-list" role="list">
              {closed.map((lead) => (
                <LeadCard
                  key={lead.id}
                  lead={lead}
                  now={now}
                  open={openId === lead.id}
                  onToggle={() => setOpenId(openId === lead.id ? null : lead.id)}
                  onAct={(id) => act(lead, id)}
                  onPatch={(next) => patch(lead, next)}
                />
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Receipts. Every send says what it did and to which number, because an
          automation you cannot see is one you stop trusting. */}
      <div className="lp-receipts" role="status" aria-live="polite">
        {receipts.map((r) => (
          <p key={r.id} className="lp-receipt">
            {r.text}
          </p>
        ))}
      </div>
    </>
  );
}

/** Actions that create a real invite, so they compose rather than fire. */
const SENDS_INVITE = new Set(["send-onboarding", "resend"]);

function LeadCard({
  lead,
  now,
  open,
  onToggle,
  onAct,
  onPatch,
}: {
  lead: LeadRecord;
  now: Date;
  open: boolean;
  onToggle: () => void;
  onAct: (actionId: string) => void;
  onPatch: (next: LeadRecord) => void;
}) {
  /*
   * Sending the setup link opens a compose panel rather than firing.
   *
   * It is the one action in the pipeline that produces something outside this
   * browser — a real invite, with a real price on it — and it is the moment
   * the call's outcome has to be recorded. Every other action here is a state
   * change and rightly a single tap.
   */
  const [composing, setComposing] = useState<string | null>(null);

  const call = callState(lead, now);
  const unrecorded = awaitingOutcome(lead, now);
  const quiet = isAbandoned(lead, now);
  const chaseMe = needsPersonalMessage(lead, now);
  const auto = pendingAutomations(lead, now);
  const primary = primaryAction(lead.stage);
  const fork = isFork(lead.stage);
  const actions = fork ? nextActions(lead.stage) : primary ? [primary] : [];

  return (
    <li
      className="lp-card"
      data-stage={lead.stage}
      data-alert={unrecorded ? "" : undefined}
      data-quiet={quiet ? "" : undefined}
    >
      <div className="lp-card__head">
        <div>
          <p className="lp-card__name">{lead.name}</p>
          <p className="lp-card__meta">
            {lead.segment} · {lead.source} · came in {relative(lead.createdISO, now)}
          </p>
        </div>
        <span className="lp-tags">
          {/* Ben switched this one off deliberately. That is a fact about how
              the lead is being handled and belongs on the card, not two
              clicks inside Edit where he will forget he ever set it. */}
          {!lead.automation && !isTerminal(lead.stage) && (
            <span className="lp-manual" title="No automatic messages for this lead">
              Manual
            </span>
          )}
          <span className="lp-stage" data-terminal={isTerminal(lead.stage)}>
            {lead.stage === "lost" && lead.closeReason
              ? CLOSE_REASON_LABEL[lead.closeReason]
              : STAGE_LABEL[lead.stage]}
          </span>
        </span>
      </div>

      {/* The call. Leads book through our own system before they ever reach
          this screen, so the slot is a fact, not something to chase them for. */}
      {lead.booking && (
        <p className="lp-call" data-state={call}>
          <span className="lp-call__when">{formatBookingTime(lead.booking.startISO)}</span>
          <span className="lp-call__rel">
            {call === "passed" ? relative(lead.booking.startISO, now) : relative(lead.booking.startISO, now)}
            {" · "}
            {lead.booking.ref}
          </span>
        </p>
      )}

      {/* The one prompt worth interrupting for. A pipeline with calls in it
          that nobody wrote down the result of is a pipeline nobody trusts. */}
      {unrecorded && (
        <p className="lp-alert">That call has been and gone. How did it go?</p>
      )}
      {quiet && !unrecorded && (
        <p className="lp-alert" data-tone="quiet">
          Nothing back for {relative(lead.stageSinceISO, now).replace(" ago", "")}. Worth closing.
        </p>
      )}
      {chaseMe && (
        <p className="lp-alert" data-tone="quiet">
          Two reminders sent and ignored. A line from you now, not another
          automatic text.
        </p>
      )}

      <div className="lp-actions">
        {actions.map((a, i) => (
          <button
            key={a.id}
            type="button"
            className="lp-btn"
            data-primary={i === 0 && !a.muted}
            data-muted={a.muted ? "" : undefined}
            onClick={() =>
              SENDS_INVITE.has(a.id) ? setComposing(a.id) : onAct(a.id)
            }
          >
            {a.label}
          </button>
        ))}
        <button
          type="button"
          className="lp-btn"
          data-edit=""
          aria-expanded={open}
          onClick={onToggle}
        >
          Edit
        </button>
      </div>
      {composing ? (
        <OnboardingCompose
          name={lead.name}
          email={lead.email}
          phone={lead.phone}
          /* The segment is what the funnel recorded about which route they
             came down. Without it a "getting fit" client's setup link opens
             by asking about their HYROX races. */
          rail={
            /getting fit|beginner|unsure|weight/i.test(lead.segment ?? "")
              ? "beginner"
              : undefined
          }
          onSent={() => {
            /* The stage moves once the invite exists, not when the button was
               pressed — a lead marked "onboarding sent" after a failed send is
               a lead nobody ever looks at again. */
            onAct(composing);
          }}
          onCancel={() => setComposing(null)}
        />
      ) : null}

      {!actions.length && (
        <p className="lp-hint">
          {lead.stage === "client"
            ? "Paying client. Nothing left to do here."
            : "Closed. Reopen from Edit if they come back."}
        </p>
      )}

      {/* What has already been said, and what is about to send itself. */}
      <Timeline lead={lead} now={now} auto={auto} />

      {open && <EditPanel lead={lead} now={now} onAct={onAct} onPatch={onPatch} />}
    </li>
  );
}

/**
 * What has happened, and what is queued.
 *
 * Collapsed by default: the point is that it is *there*, not that it is in
 * your face. Ben's complaint was not being able to find out whether a lead had
 * been contacted, which is a two-second question and should cost two seconds.
 */
function Timeline({
  lead,
  now,
  auto,
}: {
  lead: LeadRecord;
  now: Date;
  auto: ReturnType<typeof pendingAutomations>;
}) {
  const events = sortTimeline(lead.timeline);
  if (!events.length && !auto.length) {
    return <p className="lp-timeline__none">Nothing sent yet.</p>;
  }
  return (
    <details className="lp-timeline">
      <summary className="lp-timeline__toggle">
        {events.length} message{events.length === 1 ? "" : "s"}
        {auto.length ? ` · ${auto.length} queued` : ""}
      </summary>
      <ol className="lp-timeline__list" role="list">
        {auto.map((a) => (
          <li key={a.id} className="lp-ev" data-queued="">
            <span className="lp-ev__kind">Queued</span>
            <span className="lp-ev__body">{a.label}</span>
            <span className="lp-ev__when">{relative(a.dueISO, now)}</span>
          </li>
        ))}
        {events.map((e) => (
          <Event key={e.id} event={e} now={now} />
        ))}
      </ol>
    </details>
  );
}

const KIND_LABEL: Record<CommsEvent["kind"], string> = {
  sms: "Text",
  email: "Email",
  call: "Call",
  note: "Note",
  system: "—",
};

function Event({ event, now }: { event: CommsEvent; now: Date }) {
  return (
    <li className="lp-ev" data-inbound={event.inbound ? "" : undefined}>
      <span className="lp-ev__kind">
        {event.inbound ? "Reply" : KIND_LABEL[event.kind]}
      </span>
      <span className="lp-ev__body">{event.body}</span>
      <span className="lp-ev__when">
        {event.automated && !event.inbound ? "auto · " : ""}
        {relative(event.atISO, now)}
      </span>
    </li>
  );
}

/**
 * Everything that used to be on the card.
 *
 * The alternatives, the stage override, the automation switch, and closing
 * with a reason. All of it still one click away; none of it in the way.
 */
function EditPanel({
  lead,
  now,
  onAct,
  onPatch,
}: {
  lead: LeadRecord;
  now: Date;
  onAct: (actionId: string) => void;
  onPatch: (next: LeadRecord) => void;
}) {
  const [closing, setClosing] = useState(false);
  const others = otherActions(lead.stage);

  return (
    <div className="lp-edit">
      {others.length > 0 && (
        <div className="lp-edit__row">
          <span className="lp-edit__label">Or</span>
          <div className="lp-edit__btns">
            {others.map((a) => (
              <button key={a.id} type="button" className="lp-chip" onClick={() => onAct(a.id)}>
                {a.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="lp-edit__row">
        <span className="lp-edit__label">Stage</span>
        <div className="lp-edit__btns">
          {STAGE_ORDER.map((target: LeadStage) => (
            <button
              key={target}
              type="button"
              className="lp-chip"
              aria-pressed={target === lead.stage}
              disabled={target === lead.stage}
              onClick={() => onPatch(moveTo(lead, target, now))}
            >
              {STAGE_LABEL[target]}
            </button>
          ))}
        </div>
      </div>

      {/* Ben knows things the pipeline does not. Off means nothing sends
          itself for this person until he turns it back on. */}
      <div className="lp-edit__row">
        <span className="lp-edit__label">Automatic messages</span>
        <button
          type="button"
          className="lp-switch"
          role="switch"
          aria-checked={lead.automation}
          onClick={() => onPatch({ ...lead, automation: !lead.automation })}
        >
          <span className="lp-switch__dot" />
          {lead.automation ? "On" : "Off — you are handling this one"}
        </button>
      </div>

      {/* Closing takes a reason. Forty closed leads with no reasons attached
          tell you nothing about whether the problem is the price, the
          follow-up, or the people arriving. */}
      <div className="lp-edit__row">
        <span className="lp-edit__label">Close</span>
        {lead.stage === "lost" ? (
          <p className="lp-edit__note">
            Closed — {lead.closeReason ? CLOSE_REASON_LABEL[lead.closeReason] : "no reason given"}.
            Move them back to a stage above to reopen.
          </p>
        ) : !closing ? (
          <button type="button" className="lp-chip" onClick={() => setClosing(true)}>
            Close this lead
          </button>
        ) : (
          <div className="lp-edit__btns">
            {CLOSE_REASONS.map((r: CloseReason) => (
              <button
                key={r}
                type="button"
                className="lp-chip"
                onClick={() => {
                  onPatch(closeLead(lead, r, now));
                  setClosing(false);
                }}
              >
                {CLOSE_REASON_LABEL[r]}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Everything going out on its own, across every lead.
 *
 * The per-lead timeline answers "what happens to this person". This answers
 * the question Ben actually asks before he shuts the laptop: what is the
 * system going to send overnight, and do I want any of it to. An automation
 * you cannot see the whole of is one you switch off entirely the first time
 * it surprises you.
 *
 * Collapsed when there is nothing due, rather than hidden: "nothing queued"
 * is itself worth being able to confirm.
 */
function SendQueue({ leads, now }: { leads: LeadRecord[]; now: Date }) {
  const queue = sendQueue(leads, now);
  if (!queue.length) {
    return <p className="lp-queue__none">Nothing queued to send.</p>;
  }
  return (
    <details className="lp-queue">
      <summary className="lp-queue__toggle">
        {queue.length} message{queue.length === 1 ? "" : "s"} queued to send —
        next {relative(queue[0].dueISO, now)}
      </summary>
      <ol className="lp-queue__list" role="list">
        {queue.map((q) => (
          <li key={q.id} className="lp-queue__item">
            <span className="lp-queue__who">{q.leadName}</span>
            <span className="lp-queue__what">{q.label}</span>
            <span className="lp-queue__when">{relative(q.dueISO, now)}</span>
          </li>
        ))}
      </ol>
    </details>
  );
}
