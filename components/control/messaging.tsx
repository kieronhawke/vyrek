"use client";

import { useMemo, useState } from "react";
import { useCollection } from "@/lib/control/store";
import {
  MUTES_KEY,
  SEED_TEMPLATES,
  TEMPLATES_KEY,
  VARIABLES,
  canMute,
  canSend,
  isMuted,
  muteId,
  preview,
  problems,
  smsCost,
  type Mute,
  type Template,
} from "@/lib/control/messaging";
import { SEED_ATHLETES, type TrackedAthlete } from "@/lib/control/tracker";

/**
 * MESSAGING — every automated SMS and email, in one place, editable.
 *
 * It was an inbox and a read-only list of template names. Ben asked for the
 * thing that matters: what the app sends, in his words, with a switch per
 * client.
 *
 * THE EDITOR TELLS HIM WHAT IT WILL COST AND WHAT IT WILL BREAK. An unknown
 * variable is not a typo that degrades gracefully — it is `{{frist_name}}`
 * arriving in somebody's inbox — so it is an error, in front of him, while he
 * types. An SMS with a curly quote in it costs twice as much to send, and
 * nothing else in the interface would ever explain that.
 *
 * MARKETING AND TRANSACTIONAL ARE NOT THE SAME THING (HARD-RULES §11). The
 * per-client switches only appear for marketing, because somebody who opts out
 * of being sold to must still be told their card failed. The rule is enforced
 * in lib/control/messaging.ts, not here.
 */

export function Messaging() {
  const templates = useCollection<Template>(TEMPLATES_KEY, SEED_TEMPLATES);
  const mutes = useCollection<Mute>(MUTES_KEY, []);
  const athletes = useCollection<TrackedAthlete>("tracker", SEED_ATHLETES);

  const [openId, setOpenId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "sms" | "email">("all");

  const shown = useMemo(
    () => templates.items.filter((t) => filter === "all" || t.channel === filter),
    [templates.items, filter],
  );

  const open = templates.items.find((t) => t.id === openId) ?? null;
  const broken = templates.items.filter(
    (t) => t.enabled && problems(t).some((p) => p.level === "error"),
  );

  return (
    <div className="mg">
      <p className="mg-banner" role="status">
        <strong>Nothing sends yet.</strong> These are the messages the app will
        send once Resend and Twilio are connected. Editing them here is real and
        saved; no client receives anything.
      </p>

      {broken.length ? (
        <p className="mg-broken" role="alert">
          <strong>
            {broken.length} switched-on {broken.length === 1 ? "template" : "templates"} cannot
            send.
          </strong>{" "}
          {broken.map((t) => t.name).join(", ")} — open and fix, or switch off.
        </p>
      ) : null}

      <div className="mg-filters" role="group" aria-label="Channel">
        {(["all", "sms", "email"] as const).map((k) => (
          <button
            key={k}
            type="button"
            className="mg-chip"
            data-on={filter === k || undefined}
            onClick={() => setFilter(k)}
          >
            {k === "all" ? "Everything" : k === "sms" ? "SMS" : "Email"}
          </button>
        ))}
      </div>

      <ul className="mg-list">
        {shown.map((t) => {
          const errors = problems(t).filter((p) => p.level === "error").length;
          return (
            <li key={t.id} className="mg-row" data-off={!t.enabled || undefined}>
              <button type="button" className="mg-row__open" onClick={() => setOpenId(t.id)}>
                <span className="mg-row__top">
                  <span className="mg-row__name">{t.name}</span>
                  <span className="mg-tag" data-channel={t.channel}>
                    {t.channel === "sms" ? "SMS" : "Email"}
                  </span>
                  <span className="mg-tag" data-class={t.classification}>
                    {t.classification === "marketing" ? "Marketing" : "Transactional"}
                  </span>
                  {errors ? <span className="mg-tag" data-bad>{errors} problem{errors === 1 ? "" : "s"}</span> : null}
                </span>
                <span className="mg-row__trigger">{t.trigger}</span>
                <span className="mg-row__peek">{preview(t.body).split("\n")[0]}</span>
              </button>

              <label className="mg-switch">
                <input
                  type="checkbox"
                  checked={t.enabled}
                  onChange={(e) => templates.update(t.id, { enabled: e.target.checked })}
                  aria-label={`${t.name} — send this at all`}
                />
                <span>{t.enabled ? "On" : "Off"}</span>
              </label>
            </li>
          );
        })}
      </ul>

      {open ? (
        <Editor
          template={open}
          athletes={athletes.items}
          mutes={mutes.items}
          onChange={(patch) => templates.update(open.id, patch)}
          onMute={(clientId, muted) => {
            const id = muteId(clientId, open.key);
            if (muted) mutes.add({ id, clientId, templateKey: open.key });
            else mutes.remove(id);
          }}
          onClose={() => setOpenId(null)}
        />
      ) : null}
    </div>
  );
}

function Editor({
  template: t,
  athletes,
  mutes,
  onChange,
  onMute,
  onClose,
}: {
  template: Template;
  athletes: TrackedAthlete[];
  mutes: Mute[];
  onChange: (patch: Partial<Template>) => void;
  onMute: (clientId: string, muted: boolean) => void;
  onClose: () => void;
}) {
  const found = problems(t);
  const cost = smsCost(t.body);

  return (
    <div className="mg-editor" role="dialog" aria-modal="true" aria-label={`Edit ${t.name}`}>
      <button type="button" className="mg-editor__scrim" aria-label="Close" onClick={onClose} />
      <div className="mg-editor__panel">
        <div className="mg-editor__grip" aria-hidden />
        <h3 className="mg-editor__title">{t.name}</h3>
        <p className="mg-editor__trigger">Sends when: {t.trigger}</p>

        {t.channel === "email" ? (
          <label className="mg-field">
            <span className="eyebrow">Subject</span>
            <input
              value={t.subject}
              onChange={(e) => onChange({ subject: e.target.value })}
              className="mg-input"
            />
          </label>
        ) : null}

        <label className="mg-field">
          <span className="eyebrow">Message</span>
          <textarea
            value={t.body}
            onChange={(e) => onChange({ body: e.target.value })}
            rows={t.channel === "sms" ? 4 : 10}
            className="mg-input mg-body"
          />
        </label>

        {t.channel === "sms" ? (
          <p className="mg-cost num" data-over={cost.segments > 1 || undefined}>
            {cost.characters} characters · {cost.segments} segment
            {cost.segments === 1 ? "" : "s"} · {cost.encoding}
            {cost.segments >= 1 ? ` · ${cost.remaining} left in this one` : ""}
          </p>
        ) : null}

        {found.length ? (
          <ul className="mg-problems">
            {found.map((p, i) => (
              <li key={i} data-level={p.level}>
                {p.message}
              </li>
            ))}
          </ul>
        ) : null}

        <div className="mg-vars">
          <p className="eyebrow">Insert</p>
          <div className="mg-vars__row">
            {VARIABLES.map((v) => (
              <button
                key={v.token}
                type="button"
                className="mg-var"
                title={v.describes}
                onClick={() => onChange({ body: `${t.body}{{${v.token}}}` })}
              >
                {v.token}
              </button>
            ))}
          </div>
        </div>

        <div className="mg-preview">
          <p className="eyebrow">What they receive</p>
          {t.channel === "email" && t.subject ? (
            <p className="mg-preview__subject">{preview(t.subject)}</p>
          ) : null}
          <p className="mg-preview__body">{preview(t.body)}</p>
        </div>

        {/* Per-client switches, marketing only. See lib/control/messaging.ts
            for why a transactional message cannot be muted. */}
        <div className="mg-audience">
          <p className="eyebrow">Who gets it</p>
          {canMute(t) ? (
            <ul className="mg-clients">
              {athletes.slice(0, 12).map((a) => {
                const muted = isMuted(t, a.id, mutes);
                return (
                  <li key={a.id}>
                    <label className="mg-client">
                      <input
                        type="checkbox"
                        checked={!muted}
                        onChange={(e) => onMute(a.id, !e.target.checked)}
                        aria-label={`Send ${t.name} to ${a.name}`}
                      />
                      <span>{a.name}</span>
                    </label>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="mg-hint">
              Everybody. This is a transactional message — it is sent because of
              something that happened to that person, so it cannot be switched
              off for one of them. Somebody who opts out of marketing still
              needs telling when their card fails.
            </p>
          )}
        </div>

        <div className="mg-editor__actions">
          <span className="mg-status" data-ok={canSend(t) || undefined}>
            {canSend(t)
              ? "Would send"
              : t.enabled
                ? "Cannot send — fix the errors above"
                : "Switched off"}
          </span>
          <button type="button" className="mg-done" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
