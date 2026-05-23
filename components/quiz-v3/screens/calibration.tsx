"use client";

import { useState } from "react";
import { OptionCard } from "@/components/quiz-v3/option-card";
import { QuestionHeader } from "@/components/quiz-v3/question-header";
import { cn } from "@/lib/utils";
import type { SexValue, WeightUnit } from "@/lib/quiz-flow";

/**
 * Screen 8b. Calibration. Sex (men/women, framed as Hyrox standards) plus
 * body weight (kg/lb). Sex sets sled/wall-ball/farmers loads; weight sets
 * sandbag lunge load as a % of body weight.
 */
export function CalibrationScreen({
  sex,
  weightKg,
  unit,
  onSexChange,
  onWeightChange,
  onUnitChange,
}: {
  sex: SexValue | undefined;
  weightKg: number | undefined;
  unit: WeightUnit;
  onSexChange: (v: SexValue) => void;
  onWeightChange: (kg: number) => void;
  onUnitChange: (u: WeightUnit) => void;
}) {
  // `typed` is the user's in-flight string; `null` means "show the derived
  // value from props". We clear `typed` on blur so the input snaps back to
  // the canonical formatted value if the user left mid-edit.
  const [typed, setTyped] = useState<string | null>(null);

  const derived = (() => {
    if (weightKg === undefined) return "";
    if (unit === "lb") return String(Math.round(weightKg * 2.20462));
    return String(weightKg);
  })();

  const value = typed ?? derived;

  const onDraftChange = (raw: string) => {
    setTyped(raw);
    const n = Number(raw);
    if (!Number.isFinite(n) || n <= 0) return;
    const kg = unit === "lb" ? n / 2.20462: n;
    onWeightChange(Math.round(kg * 10) / 10);
  };

  const onBlur = () => setTyped(null);

  return (
    <div>
      <QuestionHeader
        question="Quick calibration"
        helper="We use this to set the right weights for sled, wall ball, and farmers carries."
      />

      <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.2em] text-vyrek-text-tertiary">
        [ Hyrox standards ]
      </p>
      <ul role="list" className="space-y-3">
        <li>
          <OptionCard
            label="Men's standards"
            detail="Sled 152kg · Wall ball 9kg · Farmers 24kg"
            selected={sex === "men"}
            onClick={() => onSexChange("men")}
          />
        </li>
        <li>
          <OptionCard
            label="Women's standards"
            detail="Sled 102kg · Wall ball 6kg · Farmers 16kg"
            selected={sex === "women"}
            onClick={() => onSexChange("women")}
          />
        </li>
      </ul>

      <hr className="my-8 border-t border-vyrek-border-subtle" />

      <p className="mb-3 text-sm text-vyrek-text-secondary">
        Your body weight (for sled load calculations):
      </p>

      <div className="flex items-stretch gap-3">
        <input
          type="number"
          inputMode="decimal"
          min={unit === "kg" ? 30: 65}
          max={unit === "kg" ? 200: 440}
          step={unit === "kg" ? 0.1: 1}
          placeholder={unit === "kg" ? "75": "165"}
          value={value}
          onChange={(e) => onDraftChange(e.target.value)}
          onBlur={onBlur}
          aria-label="Body weight"
          className="h-14 w-32 rounded-md border border-vyrek-border bg-vyrek-elevated px-4 text-lg font-medium text-vyrek-text outline-none transition-colors focus:border-vyrek-accent"
        />
        <div className="flex items-stretch gap-1 rounded-md border border-vyrek-border bg-vyrek-elevated p-1">
          {(["kg", "lb"] as const).map((u) => (
            <button
              key={u}
              type="button"
              onClick={() => onUnitChange(u)}
              aria-pressed={unit === u}
              className={cn(
                "flex h-full min-h-0 items-center justify-center rounded px-4 text-sm font-medium transition-colors",
                unit === u
                  ? "bg-vyrek-accent text-[#0A0A0A]": "text-vyrek-text-secondary hover:text-vyrek-text",
              )}
            >
              {u}
            </button>
          ))}
        </div>
      </div>

      <p className="mt-3 text-xs text-vyrek-text-tertiary">
        Stored as kilograms internally. Display in {unit === "kg" ? "kg": "lb"}.
      </p>
    </div>
  );
}

export function isCalibrationValid({
  sex,
  weightKg,
}: {
  sex: SexValue | undefined;
  weightKg: number | undefined;
}): boolean {
  if (!sex) return false;
  if (weightKg === undefined) return false;
  if (!Number.isFinite(weightKg)) return false;
  if (weightKg < 30 || weightKg > 200) return false;
  return true;
}
