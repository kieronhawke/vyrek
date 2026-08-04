"use client";

import { useState } from "react";
import { useFoodLog } from "@/hooks/use-food-log";
import { useCelebration } from "@/components/member/celebrate";
import { AddFood } from "@/components/member/add-food";
import {
  MEALS,
  totals,
  totalsForMeal,
  remaining,
  factFor,
  goalCrossing,
  clockTime,
  mealForHour,
  DEFAULT_TARGETS,
  type LoggedFood,
  type MealKey,
} from "@/lib/member/food";

/**
 * THE FOOD LOG.
 *
 * What this replaces: five number boxes over `useState`, rendering demo data,
 * losing everything on navigation. The screen said as much in its own footer —
 * "nothing here is stored yet".
 *
 * The shape here is the one the reference screenshots use, and it is the right
 * one: totals at the top so the answer to "how am I doing" needs no scrolling,
 * then the day broken into meals, then one persistent add button. The macro
 * bars are the existing ones — this is a rewrite of the plumbing, not a
 * redesign of a card that already worked.
 *
 * Logging fires the celebration hook, the same one used for finishing a
 * session. Adding a chicken breast is not a session, so it fires on the
 * *moments* — a fact worth knowing, or crossing a goal — rather than on every
 * tap. Confetti forty times a day is noise, and the fifth burst is already
 * annoying.
 */

const MACRO = {
  protein: { label: "Protein", colour: "#B3261E" },
  carbs: { label: "Carbs", colour: "#1F4FA8" },
  fat: { label: "Fat", colour: "#8A5A00" },
} as const;

function Bar({ value, target, colour }: { value: number; target: number; colour: string }) {
  const pct = target > 0 ? Math.min(100, Math.round((value / target) * 100)) : 0;
  return (
    <div className="fuel__bar">
      <span aria-hidden style={{ width: `${pct}%`, background: colour }} />
    </div>
  );
}

export function FoodLog({
  session,
}: {
  /** Today's training session, shown alongside the meals. */
  session?: { title: string; durationMin: number; time: string };
} = {}) {
  const { entries, all, add, remove } = useFoodLog();
  const { fire, node } = useCelebration();
  const [open, setOpen] = useState(false);
  const [meal, setMeal] = useState<MealKey>(() => mealForHour(new Date().getHours()));
  const [toast, setToast] = useState<string | null>(null);

  const eaten = totals(entries);
  const left = remaining(eaten, DEFAULT_TARGETS);

  function handleAdd(entry: LoggedFood) {
    const before = eaten;
    add(entry);

    // Two candidate messages, most significant first. A goal crossing beats a
    // fact about the food — hitting your protein for the day is the bigger news.
    const after = {
      kcal: before.kcal + entry.macros.kcal,
      protein: before.protein + entry.macros.protein,
      carbs: before.carbs + entry.macros.carbs,
      fat: before.fat + entry.macros.fat,
      fibre: before.fibre + entry.macros.fibre,
    };
    const crossing = goalCrossing(before, after, DEFAULT_TARGETS);
    const fact = factFor(entry);

    if (crossing) {
      fire(crossing);
      setToast(crossing);
    } else if (fact) {
      setToast(fact);
    } else {
      setToast(`${entry.name} logged.`);
    }
    window.setTimeout(() => setToast(null), 3200);
  }

  return (
    <div className="fuel">
      {node}

      {/* ── Totals ───────────────────────────────────────────────────── */}
      <section className="fuel__card">
        <div className="fuel__headline">
          <p>
            <span className="num fuel__kcal">{eaten.kcal}</span>
            <span className="fuel__target"> / {DEFAULT_TARGETS.kcal} kcal</span>
          </p>
          <span className="eyebrow">
            {left.kcal >= 0 ? `${left.kcal} left` : `${Math.abs(left.kcal)} over`}
          </span>
        </div>

        <Bar value={eaten.kcal} target={DEFAULT_TARGETS.kcal} colour="var(--text)" />

        <div className="fuel__macros">
          {(["protein", "carbs", "fat"] as const).map((k) => (
            <div key={k}>
              <div className="fuel__macro-head">
                <span className="eyebrow">{MACRO[k].label}</span>
                <span className="num">{Math.round(eaten[k])}/{DEFAULT_TARGETS[k]}</span>
              </div>
              <Bar value={eaten[k]} target={DEFAULT_TARGETS[k]} colour={MACRO[k].colour} />
            </div>
          ))}
        </div>
      </section>

      {/*
        ── Today's session, in the day ────────────────────────────────
        Carried over from the screen this replaced, because it was the best
        idea in it: putting the workout in the same column as the meals makes
        "eat before this, recover after this" positional rather than something
        the athlete has to work out. Dropping it when the demo timeline was
        replaced lost that for nothing.

        It sits above the meals rather than sorted into them: the meals are
        grouped by name now, not laid out against a clock, so there is no
        timeline to slot it into. Stating the time keeps the relationship
        legible.
      */}
      {session ? (
        <section className="fuel__session" aria-label="Today's session">
          <span className="fuel__session-time num">{session.time}</span>
          <span className="fuel__session-body">
            {session.title} · {session.durationMin} min
          </span>
        </section>
      ) : null}

      {/* ── The day, by meal ─────────────────────────────────────────── */}
      {MEALS.map((m) => {
        const rows = entries.filter((e) => e.meal === m.key);
        const mealTotal = totalsForMeal(entries, m.key);
        return (
          <section key={m.key} className="fuel__meal">
            <div className="fuel__meal-head">
              <h2>{m.label}</h2>
              <span className="num">{mealTotal.kcal ? `${mealTotal.kcal} kcal` : "—"}</span>
            </div>

            {rows.length === 0 ? (
              <button
                type="button"
                className="fuel__empty"
                onClick={() => { setMeal(m.key); setOpen(true); }}
              >
                Add {m.label.toLowerCase()}
              </button>
            ) : (
              <ul className="fuel__rows" role="list">
                {rows.map((e) => (
                  <li key={e.id} className="fuel__row">
                    <span className="num fuel__time">{clockTime(e.at)}</span>
                    <span className="fuel__row-body">
                      <span className="fuel__row-name">{e.name}</span>
                      <span className="fuel__row-detail">
                        {e.quantity} × {e.portionLabel}
                      </span>
                    </span>
                    <span className="fuel__row-macros num">
                      <span className="fuel__row-kcal">{e.macros.kcal}</span>
                      <span>P{Math.round(e.macros.protein)} C{Math.round(e.macros.carbs)} F{Math.round(e.macros.fat)}</span>
                    </span>
                    <button
                      type="button"
                      className="fuel__remove"
                      onClick={() => remove(e.id)}
                      aria-label={`Remove ${e.name}`}
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}

      {open ? (
        <AddFood
          meal={meal}
          onMeal={setMeal}
          history={all}
          onAdd={handleAdd}
          onClose={() => setOpen(false)}
        />
      ) : (
        <button type="button" className="fuel__add" onClick={() => setOpen(true)}>
          + Log food
        </button>
      )}

      {/*
        The toast. `role="status"` rather than `alert`: this is confirmation,
        not something needing immediate attention, and `alert` interrupts a
        screen reader mid-sentence.
      */}
      {toast ? <p className="fuel__toast" role="status">{toast}</p> : null}
    </div>
  );
}
