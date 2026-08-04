import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { allCopyKeys } from "@/lib/quiz-copy/registry";

/**
 * READING AND WRITING THE QUIZ'S EDITED WORDS.
 *
 * NEVER THROWS ON READ. This is called while rendering the quiz, and the
 * quiz has to open whether or not the database answers. Every failure path
 * returns an empty override map, which is the shipped copy — so a database
 * outage costs Ben his edits for the duration and costs the visitor nothing.
 */

export type QuizCopyOverrides = Record<string, string>;

/**
 * A THIRTY-SECOND CACHE, BECAUSE THIS SITS ON THE HOTTEST PAGE.
 *
 * /quiz is the page every advert points at, and without this every visitor
 * costs a round trip to Postgres to fetch twenty short strings that change
 * a few times a year. Thirty seconds is chosen against the editor rather
 * than against load: Ben saves, switches tab, refreshes — and expects to
 * see his words. Half a minute is inside that gesture. It is per server
 * instance, so a save is visible everywhere within the same window.
 */
const CACHE_MS = 30_000;
let cached: { at: number; value: QuizCopyOverrides } | null = null;

/** Called after a save so the next render is the new text, not the old. */
export function invalidateQuizCopy(): void {
  cached = null;
}

export async function loadQuizCopy(): Promise<QuizCopyOverrides> {
  if (cached && Date.now() - cached.at < CACHE_MS) return cached.value;
  try {
    const { data, error } = await supabaseAdmin()
      .from("quiz_copy")
      .select("key, value");
    // A failure is cached too, briefly. Otherwise a missing table means
    // every single quiz load pays for a doomed round trip.
    if (error || !data) {
      cached = { at: Date.now(), value: {} };
      return {};
    }
    const out: QuizCopyOverrides = {};
    for (const row of data as { key: string; value: string }[]) {
      // A blank override is the same as no override. The editor deletes
      // rather than storing "", but a hand-edited row should not be able to
      // erase a question.
      if (row.value?.trim()) out[row.key] = row.value;
    }
    cached = { at: Date.now(), value: out };
    return out;
  } catch {
    return {};
  }
}

/**
 * Turn Postgres's answer into one Ben can act on.
 *
 * "relation \"quiz_copy\" does not exist" is exactly right and completely
 * useless to the person reading it, and it is the most likely error here:
 * the migration ships with the code but is applied by hand.
 */
function explain(message: string): string {
  if (/does not exist|schema cache/i.test(message)) {
    return "The wording table isn't in the database yet. Run supabase/migrations/0112_quiz_copy.sql in the Supabase SQL editor, then try again.";
  }
  return message;
}

export type SaveResult =
  | { ok: true; saved: number; cleared: number }
  | { ok: false; error: string };

/**
 * Save a batch. An empty string means "back to the default", which deletes
 * the row rather than storing a blank — the shipped copy stays the fallback
 * and Ben can always get back to it.
 *
 * Keys are checked against the registry, so a stale editor tab cannot write
 * rows for screens that no longer exist.
 */
export async function saveQuizCopy(
  entries: Record<string, string>,
  editor: string,
): Promise<SaveResult> {
  const allowed = new Set(allCopyKeys());
  const upserts: { key: string; value: string; updated_by: string; updated_at: string }[] = [];
  const deletes: string[] = [];

  for (const [key, raw] of Object.entries(entries)) {
    if (!allowed.has(key)) continue;
    const value = String(raw ?? "").trim();
    if (!value) {
      deletes.push(key);
    } else if (value.length > 400) {
      return { ok: false, error: `"${key}" is longer than 400 characters.` };
    } else {
      upserts.push({
        key,
        value,
        updated_by: editor,
        updated_at: new Date().toISOString(),
      });
    }
  }

  try {
    const sb = supabaseAdmin();
    if (deletes.length) {
      const { error } = await sb.from("quiz_copy").delete().in("key", deletes);
      if (error) return { ok: false, error: explain(error.message) };
    }
    if (upserts.length) {
      const { error } = await sb
        .from("quiz_copy")
        .upsert(upserts, { onConflict: "key" });
      if (error) return { ok: false, error: explain(error.message) };
    }
    invalidateQuizCopy();
    return { ok: true, saved: upserts.length, cleared: deletes.length };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Unknown error" };
  }
}
