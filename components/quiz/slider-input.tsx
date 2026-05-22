"use client";

import { useEffect, useRef } from "react";

export function SliderInput({
  value,
  onChange,
  min,
  max,
  labels,
}: {
  value: number;
  onChange: (next: number) => void;
  min: number;
  max: number;
  labels: string[];
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  // Update accent fill width as native ::-webkit-slider-runnable-track does
  // not let us style "filled portion". Manage a CSS variable for the gradient.
  useEffect(() => {
    if (!inputRef.current) return;
    const pct = ((value - min) / (max - min)) * 100;
    inputRef.current.style.setProperty("--fill", `${pct}%`);
  }, [value, min, max]);

  return (
    <div className="space-y-4">
      <div className="text-center font-mono text-[11px] uppercase tracking-[0.18em] text-vyrek-text-tertiary">
        Days per week
      </div>
      <div className="text-center text-6xl font-black tabular-nums tracking-[-0.05em] text-vyrek-text">
        {value}
      </div>
      <input
        ref={inputRef}
        type="range"
        min={min}
        max={max}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label="Days per week"
        className="vyrek-range h-8 w-full appearance-none bg-transparent outline-none"
      />
      <div className="flex justify-between font-mono text-xs uppercase tracking-[0.18em] text-vyrek-text-tertiary">
        {labels.map((l) => (
          <span key={l}>{l}</span>
        ))}
      </div>
      <style>{`
        .vyrek-range::-webkit-slider-runnable-track {
          height: 4px;
          border-radius: 9999px;
          background: linear-gradient(to right,
            var(--vyrek-accent) 0%,
            var(--vyrek-accent) var(--fill, 0%),
            var(--vyrek-border-default) var(--fill, 0%),
            var(--vyrek-border-default) 100%);
        }
        .vyrek-range::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 28px;
          height: 28px;
          margin-top: -12px;
          border-radius: 9999px;
          background: var(--vyrek-text-primary);
          border: 3px solid var(--vyrek-accent);
          cursor: pointer;
          transition: transform var(--duration-fast) var(--ease-out);
        }
        .vyrek-range:active::-webkit-slider-thumb { transform: scale(1.08); }
        .vyrek-range::-moz-range-track {
          height: 4px;
          border-radius: 9999px;
          background: var(--vyrek-border-default);
        }
        .vyrek-range::-moz-range-progress {
          height: 4px;
          border-radius: 9999px;
          background: var(--vyrek-accent);
        }
        .vyrek-range::-moz-range-thumb {
          width: 28px;
          height: 28px;
          border-radius: 9999px;
          background: var(--vyrek-text-primary);
          border: 3px solid var(--vyrek-accent);
          cursor: pointer;
        }
      `}</style>
    </div>
  );
}
