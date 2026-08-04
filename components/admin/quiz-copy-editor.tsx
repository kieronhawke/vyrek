"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { copyKey, type CopyField, type ScreenCopySpec } from "@/lib/quiz-copy/registry";

/**
 * THE QUIZ, AS TWENTY-ODD EDITABLE SCREENS.
 *
 * Built as one page rather than a list-then-detail flow. Wording is read in
 * sequence — the reason to change a question is usually that it repeats the
 * one before it or clashes with the one after — and a two-click detour per
 * screen would hide exactly the thing being edited for.
 *
 * THE DEFAULT IS ALWAYS ON SCREEN. Each field shows the shipped text as its
 * placeholder, so an empty box is never ambiguous: it means "as written",
 * and what is written is right there. Clearing a box is how you undo, and
 * it says so.
 *
 * NOTHING SAVES UNTIL YOU PRESS SAVE. These words are on the public site the
 * moment they are stored, so an autosave on keystroke would publish half a
 * sentence to whoever is mid-quiz.
 */

type Props = {
  screens: ScreenCopySpec[];
  initial: Record<string, string>;
  editedCount: number;
};

const FIELDS: { field: CopyField; label: string; hint: string }[] = [
  { field: "question", label: "Question", hint: "The heading, in bold at the top." },
  { field: "helper", label: "Helper line", hint: "The smaller line underneath." },
  { field: "cta", label: "Button", hint: "The button that moves them on." },
];

const RAIL_LABEL: Record<ScreenCopySpec["rail"], string> = {
  both: "Everyone",
  beginner: "Getting fit",
  athlete: "Racing",
};

export function QuizCopyEditor({ screens, initial, editedCount }: Props) {
  const [values, setValues] = useState<Record<string, string>>(initial);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const dirty = useMemo(() => {
    const keys = new Set([...Object.keys(values), ...Object.keys(initial)]);
    for (const k of keys) {
      if ((values[k] ?? "").trim() !== (initial[k] ?? "").trim()) return true;
    }
    return false;
  }, [values, initial]);

  const changedCount = useMemo(
    () => Object.values(values).filter((v) => v.trim()).length,
    [values],
  );

  async function save() {
    setStatus("saving");
    setError(null);
    try {
      const res = await fetch("/api/admin/quiz-copy", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        // Every key is sent, including the emptied ones — that is how a
        // cleared box gets deleted rather than silently left behind.
        body: JSON.stringify({ entries: values }),
      });
      const d = (await res.json()) as { ok: boolean; error?: string };
      if (!d.ok) {
        setStatus("error");
        setError(d.error ?? "That didn't save.");
        return;
      }
      setStatus("saved");
    } catch {
      setStatus("error");
      setError("Couldn't reach the server.");
    }
  }

  const set = (key: string, v: string) =>
    setValues((prev) => {
      const next = { ...prev, [key]: v };
      if (!v.trim()) delete next[key];
      return next;
    });

  return (
    <div className="pb-28">
      <div className="mb-8 flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl border border-suth-border-subtle bg-suth-elevated px-5 py-4">
        <p className="text-sm text-suth-text-secondary">
          <strong className="text-suth-text">{changedCount}</strong>{" "}
          {changedCount === 1 ? "line" : "lines"} changed from the original
          {editedCount !== changedCount ? " (unsaved)" : ""}.
        </p>
        <Link
          href="/quiz"
          target="_blank"
          className="text-sm text-suth-accent underline underline-offset-4"
        >
          Open the quiz in a new tab →
        </Link>
      </div>

      <div className="space-y-4">
        {screens.map((s) => {
          const anyEdited = FIELDS.some((f) => values[copyKey(s.kind, f.field)]);
          return (
            <section
              key={s.kind}
              className="rounded-xl border border-suth-border-subtle bg-suth-elevated p-5"
            >
              <header className="mb-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <h2 className="text-base font-semibold text-suth-text">
                  {s.label}
                </h2>
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-suth-text-tertiary">
                  {RAIL_LABEL[s.rail]}
                </span>
                {anyEdited ? (
                  <span className="rounded-pill bg-suth-accent/15 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-suth-accent">
                    Edited
                  </span>
                ) : null}
              </header>

              {s.note ? (
                <p className="mb-4 rounded-lg border border-suth-border-subtle bg-suth-base/60 px-3 py-2 text-xs leading-relaxed text-suth-text-tertiary">
                  {s.note}
                </p>
              ) : null}

              <div className="space-y-4">
                {FIELDS.map(({ field, label, hint }) => {
                  const key = copyKey(s.kind, field);
                  const shipped =
                    field === "cta" ? (s.cta ?? "Continue →") : s[field];
                  // A screen with no helper of its own does not get an empty
                  // box to fill in — adding a line where the design has none
                  // is a layout change, not a wording one.
                  if (field === "helper" && !shipped) return null;
                  if (field === "question" && !shipped) return null;
                  const isLong = (shipped ?? "").length > 60;
                  return (
                    <label key={key} className="block">
                      <span className="flex items-baseline justify-between gap-3">
                        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-suth-text-tertiary">
                          {label}
                        </span>
                        <span className="text-[11px] text-suth-text-tertiary">
                          {hint}
                        </span>
                      </span>
                      {isLong ? (
                        <textarea
                          rows={2}
                          value={values[key] ?? ""}
                          placeholder={shipped}
                          onChange={(e) => set(key, e.target.value)}
                          className="mt-1.5 w-full rounded-lg border border-suth-border bg-suth-base px-3 py-2 text-sm text-suth-text outline-none transition-colors placeholder:text-suth-text-tertiary focus:border-suth-accent"
                        />
                      ) : (
                        <input
                          type="text"
                          value={values[key] ?? ""}
                          placeholder={shipped}
                          onChange={(e) => set(key, e.target.value)}
                          className="mt-1.5 h-11 w-full rounded-lg border border-suth-border bg-suth-base px-3 text-sm text-suth-text outline-none transition-colors placeholder:text-suth-text-tertiary focus:border-suth-accent"
                        />
                      )}
                    </label>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>

      {/* Sticky, because the page is long and a save button at the bottom of
          twenty screens is a save button nobody finds. */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-suth-border-subtle bg-suth-base/95 px-4 py-3 backdrop-blur md:px-8">
        <div className="mx-auto flex max-w-[1480px] items-center justify-end gap-4">
          {error ? (
            <p role="alert" className="mr-auto text-sm text-suth-danger">
              {error}
            </p>
          ) : status === "saved" && !dirty ? (
            <p role="status" className="mr-auto text-sm text-suth-text-secondary">
              Saved. The quiz is using these words now.
            </p>
          ) : (
            <p className="mr-auto text-sm text-suth-text-tertiary">
              Clear a box to put the original text back.
            </p>
          )}
          <button
            type="button"
            onClick={save}
            disabled={!dirty || status === "saving"}
            className="inline-flex h-11 items-center justify-center rounded-pill bg-suth-accent px-6 text-sm font-semibold text-[#0A0A0A] transition-colors hover:bg-suth-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            {status === "saving" ? "Saving..." : "Save wording"}
          </button>
        </div>
      </div>
    </div>
  );
}
