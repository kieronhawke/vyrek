"use client";

import { useState } from "react";
import type { FoodEntry } from "@/lib/member/demo";

export function FoodLog({ initial }: { initial: FoodEntry[] }) {
  const [entries, setEntries] = useState<FoodEntry[]>(initial);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [kcal, setKcal] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fat, setFat] = useState("");

  function add(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !kcal) return;
    const now = new Date();
    setEntries((es) => [
      ...es,
      {
        id: `local-${Date.now()}`,
        time: `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`,
        name: name.trim(),
        kcal: Number(kcal) || 0,
        protein: Number(protein) || 0,
        carbs: Number(carbs) || 0,
        fat: Number(fat) || 0,
      },
    ]);
    setName("");
    setKcal("");
    setProtein("");
    setCarbs("");
    setFat("");
    setOpen(false);
  }

  function remove(id: string) {
    setEntries((es) => es.filter((e) => e.id !== id));
  }

  return (
    <div className="space-y-2">
      <ol role="list" className="space-y-2">
        {entries.map((f) => (
          <li
            key={f.id}
            className="flex items-center gap-3 rounded-lg border border-suth-border-subtle bg-suth-elevated/60 px-3 py-2.5"
          >
            <span className="shrink-0 font-mono text-[10px] uppercase tracking-[0.18em] text-suth-text-tertiary w-12">
              {f.time}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-suth-text">
                {f.name}
              </p>
              {f.amount ? (
                <p className="truncate text-xs text-suth-text-secondary">
                  {f.amount}
                </p>
              ) : null}
            </div>
            <div className="shrink-0 text-right">
              <p className="font-mono text-xs tabular-nums text-suth-text">
                {f.kcal}
              </p>
              <p className="font-mono text-[10px] tabular-nums text-suth-text-tertiary">
                P{f.protein} C{f.carbs} F{f.fat}
              </p>
            </div>
            <button
              type="button"
              onClick={() => remove(f.id)}
              aria-label={`Remove ${f.name}`}
              className="ml-1 inline-flex size-7 shrink-0 items-center justify-center rounded-full text-suth-text-tertiary hover:bg-suth-base hover:text-suth-text"
            >
              ×
            </button>
          </li>
        ))}
      </ol>

      {open ? (
        <form
          onSubmit={add}
          className="rounded-lg border border-suth-accent/40 bg-suth-elevated p-4"
        >
          <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.22em] text-suth-accent">
            [ ADD FOOD ]
          </p>
          <label className="block">
            <span className="block text-xs font-medium text-suth-text-tertiary">
              Name
            </span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Chicken rice bowl"
              required
              className="mt-1 block h-10 w-full rounded-md border border-suth-border bg-suth-base px-3 text-sm text-suth-text"
            />
          </label>
          <div className="mt-3 grid grid-cols-4 gap-2">
            <NumField label="kcal" value={kcal} onChange={setKcal} required />
            <NumField label="Protein" value={protein} onChange={setProtein} />
            <NumField label="Carbs" value={carbs} onChange={setCarbs} />
            <NumField label="Fat" value={fat} onChange={setFat} />
          </div>
          <div className="mt-4 flex gap-2">
            <button
              type="submit"
              className="inline-flex h-10 flex-1 items-center justify-center rounded-pill bg-suth-accent px-4 text-sm font-semibold text-[#0A0A0A]"
            >
              Add
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="inline-flex h-10 items-center justify-center rounded-pill border border-suth-border bg-suth-base px-4 text-sm text-suth-text"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg border border-dashed border-suth-border bg-transparent px-4 text-sm font-medium text-suth-text-secondary hover:border-suth-accent hover:text-suth-accent"
        >
          + Add food
        </button>
      )}
    </div>
  );
}

function NumField({
  label,
  value,
  onChange,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="block text-[10px] font-medium uppercase tracking-[0.18em] text-suth-text-tertiary">
        {label}
      </span>
      <input
        type="number"
        inputMode="numeric"
        min="0"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="mt-1 block h-10 w-full rounded-md border border-suth-border bg-suth-base px-2 text-sm tabular-nums text-suth-text"
      />
    </label>
  );
}
