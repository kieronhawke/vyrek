"use client";

import { useState } from "react";
import Image from "next/image";
import {
  DEMO_THREAD,
  QUICK_PROMPTS,
  formatDay,
  formatTime,
  groupByDay,
  type CoachMessage,
} from "@/lib/member/messages";
import type { Photo } from "@/lib/photo-library";

/**
 * ASK BEN — the athlete's half of the coach thread.
 *
 * A conversation, not a ticket system: one thread, Ben's face on his messages,
 * and quick prompts under an empty composer because a blank box gets no
 * messages. The four prompts are the questions a HYROX athlete actually asks,
 * and they decide what Ben ends up answering most.
 *
 * NOT CONNECTED. Sending appends locally and the confirmation says so.
 */
export function CoachThread({ coachPhoto }: { coachPhoto: Photo }) {
  const [thread, setThread] = useState<CoachMessage[]>(DEMO_THREAD);
  const [draft, setDraft] = useState("");
  const [justSent, setJustSent] = useState(false);

  function send() {
    const body = draft.trim();
    if (!body) return;
    setThread((t) => [
      ...t,
      {
        id: `local-${t.length + 1}`,
        author: "athlete",
        // Fixed so the demo does not drift; a real send stamps server-side.
        sentAt: "2026-08-02T12:00:00Z",
        body,
      },
    ]);
    setDraft("");
    setJustSent(true);
  }

  const groups = groupByDay(thread);

  return (
    <>
      <div style={{ display: "grid", gap: "var(--space-3)" }}>
        {groups.map((group) => (
          <div key={group.day} style={{ display: "grid", gap: "var(--space-1)" }}>
            <p
              className="eyebrow"
              style={{ margin: 0, textAlign: "center" }}
            >
              {formatDay(group.day)}
            </p>

            {group.messages.map((m) => {
              const fromCoach = m.author === "coach";
              return (
                <div
                  key={m.id}
                  style={{
                    display: "flex",
                    gap: "var(--space-1)",
                    alignItems: "flex-end",
                    justifyContent: fromCoach ? "flex-start" : "flex-end",
                  }}
                >
                  {fromCoach ? (
                    <div
                      style={{
                        position: "relative",
                        flex: "0 0 auto",
                        width: 32,
                        height: 32,
                        borderRadius: 999,
                        overflow: "hidden",
                        background: "#14100f",
                      }}
                    >
                      <Image
                        src={coachPhoto.src}
                        alt=""
                        fill
                        sizes="32px"
                        style={{ objectFit: "cover", filter: "grayscale(1)" }}
                      />
                    </div>
                  ) : null}

                  <div style={{ maxWidth: "82%" }}>
                    {m.about ? (
                      <p
                        className="eyebrow"
                        style={{
                          margin: "0 0 3px",
                          textAlign: fromCoach ? "left" : "right",
                        }}
                      >
                        About {m.about.day} · {m.about.title}
                      </p>
                    ) : null}

                    <div
                      style={{
                        padding: "10px 14px",
                        borderRadius: 16,
                        borderBottomLeftRadius: fromCoach ? 4 : 16,
                        borderBottomRightRadius: fromCoach ? 16 : 4,
                        background: fromCoach
                          ? "var(--surface)"
                          : "var(--accent-faint)",
                        border: `1px solid ${
                          fromCoach ? "var(--border)" : "transparent"
                        }`,
                        color: "var(--text)",
                        fontSize: "var(--text-sm)",
                        lineHeight: 1.55,
                      }}
                    >
                      {m.body}
                    </div>

                    <p
                      style={{
                        margin: "3px 0 0",
                        fontSize: "var(--text-2xs)",
                        color: "var(--text-muted)",
                        textAlign: fromCoach ? "left" : "right",
                      }}
                    >
                      {fromCoach ? "Ben" : "You"} · {formatTime(m.sentAt)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* ── Composer ──────────────────────────────────────────────────── */}
      <div style={{ marginTop: "var(--space-4)" }}>
        {draft.trim().length === 0 ? (
          <div style={{ marginBottom: "var(--space-1)" }}>
            <p className="eyebrow" style={{ margin: "0 0 6px" }}>
              Not sure what to ask?
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {QUICK_PROMPTS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    setDraft(p.body);
                    setJustSent(false);
                  }}
                  style={{
                    minHeight: 44,
                    padding: "0 14px",
                    borderRadius: 999,
                    border: "1px solid var(--border)",
                    background: "var(--surface)",
                    color: "var(--text)",
                    fontSize: "var(--text-sm)",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <label htmlFor="coach-message" className="sr-only">
          Message Ben
        </label>
        <textarea
          id="coach-message"
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            setJustSent(false);
          }}
          rows={3}
          placeholder="Ask Ben anything about your training."
          style={{
            width: "100%",
            padding: "10px 12px",
            borderRadius: "var(--radius-input)",
            border: "1px solid var(--border)",
            background: "var(--surface)",
            color: "var(--text)",
            fontSize: "var(--text-sm)",
            fontFamily: "inherit",
            resize: "vertical",
          }}
        />
        <button
          type="button"
          onClick={send}
          disabled={!draft.trim()}
          style={{
            marginTop: "var(--space-1)",
            width: "100%",
            minHeight: 52,
            borderRadius: 999,
            border: "none",
            background: draft.trim() ? "var(--accent)" : "var(--surface-raised)",
            color: draft.trim() ? "var(--accent-ink)" : "var(--text-faint)",
            fontSize: "var(--text-base)",
            fontWeight: 700,
            cursor: draft.trim() ? "pointer" : "not-allowed",
          }}
        >
          Send to Ben
        </button>

        {justSent ? (
          <p
            role="status"
            style={{
              margin: "var(--space-1) 0 0",
              padding: "var(--space-2)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-card)",
              background: "var(--surface-raised)",
              fontSize: "var(--text-sm)",
            }}
          >
            <strong>Saved on this device — not sent.</strong> Messaging needs
            email and SMS connecting. Once it is, this lands in Ben&apos;s inbox
            and he is nudged if it sits unanswered.
          </p>
        ) : (
          <p
            style={{
              margin: "var(--space-1) 0 0",
              fontSize: "var(--text-xs)",
              color: "var(--text-muted)",
            }}
          >
            Ben usually replies within a day. For anything urgent or medical,
            speak to a doctor rather than waiting.
          </p>
        )}
      </div>
    </>
  );
}
