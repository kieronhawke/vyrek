"use client";

/**
 * Race-date calendar screen. Inline native date input is the pragmatic
 * choice — works the same on iOS, Android, and desktop, no extra bundle.
 * If/when we want a custom calendar UI it can drop in here.
 */
export function CalendarScreen({
  value,
  onChange,
}: {
  value: Date | undefined;
  onChange: (date: Date | undefined) => void;
}) {
  const isoDate = value ? value.toISOString().slice(0, 10) : "";
  return (
    <div className="space-y-4">
      <input
        type="date"
        value={isoDate}
        min={new Date().toISOString().slice(0, 10)}
        onChange={(e) => {
          const raw = e.target.value;
          if (!raw) {
            onChange(undefined);
            return;
          }
          // Construct as midnight UTC so the date round-trips without
          // shifting due to timezone offsets.
          onChange(new Date(`${raw}T00:00:00.000Z`));
        }}
        className="h-14 w-full rounded-md border border-vyrek-border bg-vyrek-elevated px-4 text-base text-vyrek-text outline-none transition-colors focus:border-vyrek-accent"
      />
    </div>
  );
}
