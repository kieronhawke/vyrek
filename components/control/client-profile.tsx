"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useCollection } from "@/lib/control/store";
import { CLIENTS } from "@/lib/control/fixtures";
import { PAYMENT_STATE_LABEL, humanDate, paymentTone } from "@/lib/control/client-hub";
import { HyroxLink } from "@/components/control/hyrox-link";
import { ClientSplitsEditor } from "@/components/control/client-splits";
import {
  PROFILE_KEY,
  bmi,
  completeness,
  emptyProfile,
  membershipLength,
  missingFields,
  seedProfiles,
  sortNotes,
  type ClientNote,
  type ClientProfile as Profile,
} from "@/lib/control/client-profile";
import {
  SEED_ATHLETES,
  TRACKER_KEY,
  TIER_LABEL,
  daysLeft,
  urgency,
  type TrackedAthlete,
} from "@/lib/control/tracker";

/**
 * ONE CLIENT, EVERYTHING ABOUT THEM.
 *
 * The tracker answers "who is due". This answers "who is this", which is the
 * question Ben has thirty seconds before a call and currently answers by
 * scrolling WhatsApp.
 *
 * ORDER IS THE DESIGN. Status first — programmed until when, what they pay,
 * what is missing — because that is what makes him act. Then the training
 * picture: their goal, their real race history, their plan. Then the record:
 * contact, medical, notes. Anything he needs before a call is above anything
 * he needs while writing a block.
 *
 * TWO KINDS OF NOTE. His own, and ones written to be read by the athlete.
 * There is no default: a coach's shorthand appearing in a client's account is
 * not a bug you can apologise for afterwards.
 */

/** The three payment tones, as the CSS variables the rest of the console uses. */
const PAYMENT_TONE: Record<"ok" | "warn" | "danger", string> = {
  ok: "var(--ok)",
  warn: "var(--warn)",
  danger: "var(--danger)",
};

const URGENCY_TONE: Record<string, string> = {
  overdue: "var(--danger)",
  due: "var(--warn)",
  soon: "var(--text)",
  ok: "var(--ok)",
  unknown: "var(--text-faint)",
};

export function ClientProfile({
  id,
  base,
  today,
}: {
  id: string;
  base: string;
  today: string;
}) {
  const athletes = useCollection<TrackedAthlete>(TRACKER_KEY, SEED_ATHLETES);
  const profiles = useCollection<Profile>(
    PROFILE_KEY,
    useMemo(() => seedProfiles(today), [today]),
  );

  const athlete = athletes.items.find((a) => a.id === id);
  const stored = profiles.items.find((p) => p.id === id);
  const profile = stored ?? emptyProfile(id, today);

  const [noteBody, setNoteBody] = useState("");
  const [noteShared, setNoteShared] = useState(false);

  function patch(next: Partial<Profile>) {
    if (stored) profiles.update(id, next);
    // First edit creates the record rather than silently dropping it — a
    // profile nobody has opened before has nothing stored against it.
    else profiles.add({ ...profile, ...next });
  }

  function addNote() {
    const body = noteBody.trim();
    if (!body) return;
    const note: ClientNote = {
      id: `n_${profile.notes.length + 1}_${body.length}`,
      date: today,
      body,
      shared: noteShared,
    };
    patch({ notes: [note, ...profile.notes] });
    setNoteBody("");
    setNoteShared(false);
  }

  if (!athlete) {
    return (
      <p className="cp-hint">
        No client with that id. They may have been removed from the client
        list.{" "}
        <Link href={`${base}/clients`}>Back to clients</Link>.
      </p>
    );
  }

  // The tracker's own helpers, given the same "today" the server resolved, so
  // the profile and the tracker cannot disagree about who is overdue.
  const now = new Date(`${today}T00:00:00Z`);
  const left = daysLeft(athlete, now);
  const state = urgency(athlete, now);
  const missing = missingFields(profile);
  const planHref = `${base}/plans/${athlete.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  const index = bmi(profile);

  /* The billing side of the same person. The tracker row carries a yes/no
     "card on file", which renders green for everybody and so tells Ben
     nothing; the client record carries what actually happened to the last
     charge. Undefined once he adds someone by hand, hence the fallback. */
  const billing = CLIENTS.find((c) => c.id === athlete.id);

  return (
    <div className="cp">
      {/* The name lives here rather than in the shell's title: it comes from
          the tracker, which is client state, and a page headed "Client" tells
          Ben nothing about whose record he has open. */}
      <h2 className="cp-name">{athlete.name}</h2>

      {/* ── Status: what makes him act ─────────────────────────────────── */}
      <section className="cp-status" aria-label="Status">
        <div className="cp-stat">
          <span className="eyebrow">Programmed until</span>
          <strong className="cp-stat__v" style={{ color: URGENCY_TONE[state] }}>
            {athlete.programmedUntil ? humanDate(athlete.programmedUntil, true) : "Not set"}
          </strong>
          <span className="cp-stat__sub">
            {left === null
              ? "no end date set"
              : left < 0
                ? `${Math.abs(left)} days overdue`
                : `${left} days left`}
          </span>
        </div>
        <div className="cp-stat">
          <span className="eyebrow">Tier</span>
          <strong className="cp-stat__v">{TIER_LABEL[athlete.tier]}</strong>
          <span className="cp-stat__sub num">£{athlete.monthly}/month</span>
        </div>
        <div className="cp-stat">
          <span className="eyebrow">Payment</span>
          <strong
            className="cp-stat__v"
            style={{
              color: billing
                ? PAYMENT_TONE[paymentTone(billing.payment)]
                : athlete.paymentSet
                  ? "var(--ok)"
                  : "var(--danger)",
            }}
          >
            {billing ? PAYMENT_STATE_LABEL[billing.payment] : athlete.paymentSet ? "On file" : "Missing"}
          </strong>
          <span className="cp-stat__sub">
            {billing
              ? `${billing.paymentLabel} · next charge in ${billing.billingInDays} days`
              : "no billing record yet"}
          </span>
        </div>
        <div className="cp-stat">
          <span className="eyebrow">With Ben</span>
          <strong className="cp-stat__v">{membershipLength(profile.joined, today)}</strong>
          <span className="cp-stat__sub">
            since {profile.joined ? humanDate(profile.joined, true) : "—"}
          </span>
        </div>
      </section>

      {missing.length ? (
        <p className="cp-missing" role="status">
          <strong>Incomplete.</strong> No {missing.join(", no ")} on file — that
          is what stops a plan being emailed or a reminder being sent.
        </p>
      ) : null}

      <div className="cp-actions">
        <Link href={planHref} className="cp-btn cp-btn--go">
          Write their plan
        </Link>
        <Link href={`${base}/clients`} className="cp-btn">
          All clients
        </Link>
        {profile.email ? (
          <a href={`mailto:${profile.email}`} className="cp-btn">
            Email
          </a>
        ) : null}
        {profile.phone ? (
          <a href={`tel:${profile.phone.replace(/\s+/g, "")}`} className="cp-btn">
            Call
          </a>
        ) : null}
      </div>

      {/* ── Training ───────────────────────────────────────────────────── */}
      <Panel title="Training">
        <Field
          label="Goal"
          value={profile.goal}
          onChange={(v) => patch({ goal: v })}
          placeholder="Sub-1:20 at Manchester. Sled push is the limiter."
          multiline
        />
        <div className="cp-two">
          <Field
            label="Next race"
            value={profile.nextRace}
            onChange={(v) => patch({ nextRace: v })}
            placeholder="HYROX Manchester"
          />
          <Field
            label="Best HYROX time (as reported)"
            value={profile.bestTime}
            onChange={(v) => patch({ bestTime: v })}
            placeholder="1:24:10"
          />
        </div>
        <div className="cp-two">
          <Field
            label="Height (cm)"
            value={profile.heightCm === null ? "" : String(profile.heightCm)}
            onChange={(v) => patch({ heightCm: v.trim() === "" ? null : Number(v) })}
            placeholder="178"
            numeric
          />
          <Field
            label="Weight (kg)"
            value={profile.weightKg === null ? "" : String(profile.weightKg)}
            onChange={(v) => patch({ weightKg: v.trim() === "" ? null : Number(v) })}
            placeholder="76"
            numeric
          />
        </div>
        {index !== null ? (
          <p className="cp-hint num">BMI {index}</p>
        ) : null}
      </Panel>

      {/* ── Race history, from our own results database ────────────────── */}
      <Panel title="HYROX results">
        <HyroxLink
          slug={profile.hyroxSlug}
          name={athlete.name}
          onLink={(slug) => patch({ hyroxSlug: slug })}
        />
      </Panel>

      {/* ── Contact and health ─────────────────────────────────────────── */}
      <Panel title="Contact">
        <div className="cp-two">
          <Field
            label="Email"
            value={profile.email}
            onChange={(v) => patch({ email: v })}
            placeholder="name@example.com"
          />
          <Field
            label="Phone"
            value={profile.phone}
            onChange={(v) => patch({ phone: v })}
            placeholder="+44 7700 900000"
          />
        </div>
        <Field
          label="Joined"
          value={profile.joined}
          onChange={(v) => patch({ joined: v })}
          placeholder="2026-01-01"
          date
        />
      </Panel>

      <Panel title="Injuries and conditions">
        {/* spec/09 §14: Article 9 data. The person it is about is entitled to
            know who can see it, and saying so is part of the lawful basis —
            not a nicety that can be dropped for space. */}
        <p className="cp-hint">
          Special-category health data. Ben and Kieron can see this; it is never
          shown to anyone else and never leaves the account.
        </p>
        <Field
          label="Notes"
          value={profile.medical}
          onChange={(v) => patch({ medical: v })}
          placeholder="Left calf strain, June. Cleared, but flag if run volume jumps."
          multiline
        />
      </Panel>

      {/* ── Notes ──────────────────────────────────────────────────────── */}
      <Panel title="Notes">
        <div className="cp-newnote">
          <label className="sr-only" htmlFor="cp-note">
            New note
          </label>
          <textarea
            id="cp-note"
            value={noteBody}
            onChange={(e) => setNoteBody(e.target.value)}
            placeholder="What you want to remember about this person."
            className="cp-input"
            rows={3}
          />
          <div className="cp-newnote__row">
            {/* Explicit, with no default: a coach's shorthand appearing in a
                client's account is not a bug you can apologise for. */}
            <label className="cp-check">
              <input
                type="checkbox"
                checked={noteShared}
                onChange={(e) => setNoteShared(e.target.checked)}
              />
              They can read this
            </label>
            <button type="button" className="cp-btn cp-btn--go" onClick={addNote} disabled={!noteBody.trim()}>
              Add note
            </button>
          </div>
        </div>

        {profile.notes.length === 0 ? (
          <p className="cp-hint">Nothing written down yet.</p>
        ) : (
          <ul className="cp-notes">
            {sortNotes(profile.notes).map((n) => (
              <li key={n.id} className="cp-note" data-shared={n.shared || undefined}>
                <p className="cp-note__meta">
                  <span className="num">{n.date}</span>
                  <span className="cp-note__tag">
                    {n.shared ? "Shared with them" : "Internal"}
                  </span>
                </p>
                <p className="cp-note__body">{n.body}</p>
                <button
                  type="button"
                  className="cp-note__del"
                  onClick={() => patch({ notes: profile.notes.filter((x) => x.id !== n.id) })}
                  aria-label={`Delete note from ${n.date}`}
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      {/* Where the athlete's Progress screen gets its eight station times.
          They were a fixture — the same numbers for every client — so the
          screen was wrong for everybody from the second week onwards. */}
      <ClientSplitsEditor id={id} today={today} />

      <p className="cp-hint">
        {Math.round(completeness(profile) * 100)}% of the essentials are on
        file. Everything here is saved on this device — sharing it between Ben
        and Kieron needs the database.
      </p>
    </div>
  );
}

/* ── Bits ──────────────────────────────────────────────────────────────── */

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="cp-panel">
      <h2 className="cp-panel__title">{title}</h2>
      <div className="cp-panel__body">{children}</div>
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  multiline,
  numeric,
  date,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
  numeric?: boolean;
  date?: boolean;
}) {
  return (
    <label className="cp-field">
      <span className="eyebrow">{label}</span>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="cp-input"
          rows={2}
        />
      ) : (
        <input
          type={date ? "date" : numeric ? "number" : "text"}
          inputMode={numeric ? "numeric" : undefined}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="cp-input"
        />
      )}
    </label>
  );
}
