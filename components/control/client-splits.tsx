"use client";

import { useState } from "react";
import { useCollection } from "@/lib/control/store";
import {
  SPLITS_KEY,
  emptySplits,
  formatTime,
  improvingCount,
  labelFor,
  parseTime,
  recordedCount,
  splitsFor,
  trendOf,
  type ClientSplits,
} from "@/lib/control/client-splits";

/**
 * BEN'S STATION BENCHMARKS FOR ONE CLIENT.
 *
 * The athlete's Progress screen showed eight station times with a delta
 * against each, and every one of them came from a fixture — the same eight
 * numbers for everybody, unchangeable. This is where they come from now.
 *
 * TWO COLUMNS AND NO THIRD. He types where they are now and where they were
 * at the start of the block. The change is calculated in front of him as he
 * types, and there is no field for it, because a hand-typed delta stops
 * matching the two times it describes the first time either one is edited —
 * and the athlete looking at three numbers has no way to tell which is wrong.
 *
 * NO PERCENTILE FIELD EITHER, and that one is not a matter of taste. A
 * percentile is a claim about thousands of other people's races. A coach
 * estimating one and typing it in produces a fabricated statistic on somebody
 * else's screen, presented as a measurement, which HARD-RULES §1 forbids.
 * Percentiles come from the results engine against a real distribution or
 * they do not appear.
 */
export function ClientSplitsEditor({ id, today }: { id: string; today: string }) {
  const all = useCollection<ClientSplits>(SPLITS_KEY, []);
  const record = splitsFor(all.items, id, today);
  const stored = all.items.some((s) => s.id === id);

  /* What is in the boxes, which is not the same as what is saved: somebody
     halfway through typing "4:1" has an unparseable value, and blanking the
     field while they type is how a form fights its user. */
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  function keyFor(station: string, which: "now" | "was") {
    return `${station}.${which}`;
  }

  function shown(station: string, which: "now" | "was", saved: number | null) {
    const draft = drafts[keyFor(station, which)];
    return draft ?? formatTime(saved);
  }

  function commit(station: string, which: "now" | "was", text: string) {
    setDrafts((d) => ({ ...d, [keyFor(station, which)]: text }));
    const seconds = parseTime(text);
    /* An unreadable string that is not empty is somebody mid-type. Leave the
       saved value alone until it parses or they clear the field. */
    if (seconds === null && text.trim() !== "") return;

    const next: ClientSplits = {
      ...record,
      updated: today,
      splits: record.splits.map((s) =>
        s.station !== station
          ? s
          : which === "now"
            ? { ...s, seconds }
            : { ...s, previousSeconds: seconds },
      ),
    };
    if (stored) all.update(id, next);
    else all.add(next);
  }

  const counted = improvingCount(record);
  const filled = recordedCount(record);

  return (
    <section className="cp-panel">
      <h2 className="cp-panel__title">Station benchmarks</h2>
      <div className="cp-panel__body">
        <p className="cp-hint">
          {filled === 0
            ? "Nothing recorded yet. Until a station has a time, it does not appear on their Progress screen."
            : `${filled} of 8 recorded${
                counted.of > 0
                  ? ` · ${counted.faster} of ${counted.of} faster this block`
                  : ""
              }`}
        </p>

      <table className="cp-splits">
        <thead>
          <tr>
            <th scope="col">Station</th>
            <th scope="col">Now</th>
            <th scope="col">Block start</th>
            <th scope="col">Change</th>
          </tr>
        </thead>
        <tbody>
          {record.splits.map((s) => {
            const t = trendOf(s);
            return (
              <tr key={s.station}>
                <th scope="row">{labelFor(s.station)}</th>
                <td>
                  <input
                    className="cp-splitinput"
                    inputMode="numeric"
                    placeholder="m:ss"
                    aria-label={`${labelFor(s.station)}, current`}
                    value={shown(s.station, "now", s.seconds)}
                    onChange={(e) => commit(s.station, "now", e.target.value)}
                  />
                </td>
                <td>
                  <input
                    className="cp-splitinput"
                    inputMode="numeric"
                    placeholder="m:ss"
                    aria-label={`${labelFor(s.station)}, start of block`}
                    value={shown(s.station, "was", s.previousSeconds)}
                    onChange={(e) => commit(s.station, "was", e.target.value)}
                  />
                </td>
                {/* Calculated, live, and not editable. See the header. */}
                <td className="cp-splitchange" data-dir={t.direction}>
                  {t.text ?? "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <p className="cp-hint">
        These are what the athlete sees on Progress, with the date you last
        changed them. There is no percentile field: a percentile is a
        measurement against thousands of other races, so it comes from the
        results engine or it is not shown.
      </p>
      </div>
    </section>
  );
}

export { emptySplits };
