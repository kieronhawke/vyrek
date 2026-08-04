"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useCelebration } from "@/components/control/celebrate";
import {
  applyAction,
  nextActions,
  needsAction,
  stageProgress,
  STAGE_LABEL,
  STAGE_ORDER,
  type LeadEffect,
  type LeadStage,
} from "@/lib/control/lead-workflow";

/**
 * The lead pipeline, as the thing Ben actually works from.
 *
 * The leads screen was a sortable table. A table tells you a lead exists and
 * leaves the decision to you, every time you look at it. This asks one
 * question per lead — what is the next thing to do — and makes the answer a
 * button.
 *
 * State lives in localStorage. There is no leads table yet, and the screen
 * says so: the alternative was a demo where nothing you press does anything,
 * which teaches the operator that the buttons are fake.
 */

export type PipelineLead = {
  id: string;
  name: string;
  email: string;
  phone: string;
  segment: string;
  source: string;
  ageHours: number;
};

const STORAGE_KEY = "control.leadStages.v1";

type Stages = Record<string, LeadStage>;

function readStages(): Stages {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "{}") as Stages;
  } catch {
    return {};
  }
}

/** What an effect did, shown as a receipt so nothing happens invisibly. */
function describe(e: LeadEffect, lead: PipelineLead): string {
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

export function LeadPipeline({ leads }: { leads: PipelineLead[] }) {
  const [stages, setStages] = useState<Stages>({});
  const [hydrated, setHydrated] = useState(false);
  const [receipts, setReceipts] = useState<{ id: string; text: string }[]>([]);
  const { celebrate, Canvas } = useCelebration();

  useEffect(() => {
    setStages(readStages());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stages));
  }, [stages, hydrated]);

  const stageOf = useCallback(
    (l: PipelineLead): LeadStage => stages[l.id] ?? "new",
    [stages],
  );

  /* Confetti when there is a lead nobody has touched yet. Once per set of
     leads, on arrival, not on every re-render — hence the id list in the key.
     Fires after hydration so the server and client markup still match. */
  const untouchedKey = useMemo(
    () => leads.filter((l) => (stages[l.id] ?? "new") === "new").map((l) => l.id).join(","),
    [leads, stages],
  );
  useEffect(() => {
    if (!hydrated || !untouchedKey) return;
    const seen = window.sessionStorage.getItem("control.leadConfetti");
    if (seen === untouchedKey) return;
    window.sessionStorage.setItem("control.leadConfetti", untouchedKey);
    // No sound here. Opening a page should never make a noise.
    celebrate("lead", { sound: false });
  }, [hydrated, untouchedKey, celebrate]);

  const act = (lead: PipelineLead, actionId: string) => {
    const from = stageOf(lead);
    const { stage, effects } = applyAction(from, actionId);
    setStages((s) => ({ ...s, [lead.id]: stage }));

    const notes = effects.map((e) => describe(e, lead)).filter(Boolean);
    if (notes.length) {
      const id = `${lead.id}-${Date.now()}`;
      setReceipts((r) => [...r, ...notes.map((text, i) => ({ id: `${id}-${i}`, text }))]);
      setTimeout(() => setReceipts((r) => r.filter((x) => !x.id.startsWith(id))), 4200);
    }
    if (effects.some((e) => e.kind === "celebrate")) celebrate("client");
  };

  const waiting = leads.filter((l) => needsAction(stageOf(l)));
  const won = leads.filter((l) => stageOf(l) === "client");

  return (
    <>
      <Canvas />

      <div className="lp-summary">
        <span>
          <strong>{waiting.length}</strong> need you
        </span>
        <span>
          <strong>{leads.length - waiting.length - won.length}</strong> in flight
        </span>
        <span>
          <strong>{won.length}</strong> won
        </span>
        <button
          type="button"
          className="lp-reset"
          onClick={() => {
            setStages({});
            window.sessionStorage.removeItem("control.leadConfetti");
          }}
        >
          Reset pipeline
        </button>
      </div>

      <ul className="lp-list" role="list">
        {leads.map((lead) => {
          const stage = stageOf(lead);
          const actions = nextActions(stage);
          const pct = Math.round(stageProgress(stage) * 100);
          return (
            <li key={lead.id} className="lp-card" data-stage={stage}>
              <div className="lp-card__head">
                <div>
                  <p className="lp-card__name">{lead.name}</p>
                  <p className="lp-card__meta">
                    {lead.segment} · {lead.source} · waiting {lead.ageHours}h
                  </p>
                </div>
                <span className="lp-stage" data-terminal={stage === "client" || stage === "lost"}>
                  {STAGE_LABEL[stage]}
                </span>
              </div>

              {/* The rail. Shows how far along without making the operator
                  count stages, and greys out entirely for a lost lead. */}
              <div
                className="lp-rail"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={pct}
                aria-label={`${lead.name} pipeline progress`}
                data-lost={stage === "lost"}
              >
                <div className="lp-rail__fill" style={{ width: `${pct}%` }} />
              </div>

              {actions.length ? (
                <div className="lp-actions">
                  {actions.map((a, i) => (
                    <button
                      key={a.id}
                      type="button"
                      className="lp-btn"
                      data-primary={i === 0 && !a.muted}
                      data-muted={a.muted ? "" : undefined}
                      onClick={() => act(lead, a.id)}
                      title={a.hint}
                    >
                      {a.label}
                    </button>
                  ))}
                  {actions[0]?.hint ? <p className="lp-hint">{actions[0].hint}</p> : null}
                </div>
              ) : (
                <p className="lp-hint">
                  {stage === "client"
                    ? "Paying client. Nothing left to do here."
                    : "Closed. No further action."}
                </p>
              )}
            </li>
          );
        })}
      </ul>

      {/* Receipts. Every send says what it did and to which number, because
          an automation you cannot see is one you stop trusting. */}
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

/** Stage counts, for the dashboard. Exported so one definition drives both. */
export function pipelineCounts(stages: Stages, ids: string[]) {
  const counts: Partial<Record<LeadStage, number>> = {};
  for (const id of ids) {
    const s = stages[id] ?? "new";
    counts[s] = (counts[s] ?? 0) + 1;
  }
  return { counts, order: STAGE_ORDER };
}
